import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const POLL_INTERVAL_MS = 500;
const DEFAULT_READY_TIMEOUT_MS = 120_000;
const isWindows = process.platform === 'win32';

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/products?limit=1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;

  child.kill('SIGTERM');

  if (isWindows) {
    // Ensure the server is gone even if SIGTERM was ignored on Windows
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}

/**
 * Boots the production server (`next start`) used by the API smoke tests.
 *
 * Requires a completed `npm run build`. If a server already answers on the
 * target port it is reused and left running (handy for local debugging).
 */
export async function startNextServer({
  port = Number(process.env.TEST_PORT || 3100),
  cwd = process.cwd(),
  readyTimeoutMs = Number(process.env.TEST_READY_TIMEOUT_MS || DEFAULT_READY_TIMEOUT_MS),
} = {}) {
  const baseUrl = `http://127.0.0.1:${port}`;

  if (await isServerReady(baseUrl)) {
    return { baseUrl, reused: true, stop: async () => {} };
  }

  const output = [];
  const nextBin = join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');

  if (!existsSync(nextBin)) {
    throw new Error(
      `Could not find the Next.js CLI at ${nextBin}. Run \`npm ci\` before \`npm run test:api\`.`
    );
  }

  // The CLI is started directly with the current Node binary: no npm or shell
  // in between, so the process the tests own is the server itself.
  const child = spawn(process.execPath, [nextBin, 'start', '--port', String(port)], {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let exit = null;
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  child.on('exit', (code, signal) => {
    exit = { code, signal };
  });

  const deadline = Date.now() + readyTimeoutMs;

  while (Date.now() < deadline) {
    if (exit) {
      throw new Error(
        `\`next start\` exited before serving requests (code ${exit.code}, signal ${exit.signal}).\n` +
          'Run `npm run build` before `npm run test:api`.\n\n' +
          output.join('')
      );
    }

    if (await isServerReady(baseUrl)) {
      return { baseUrl, reused: false, stop: () => stopProcess(child) };
    }

    await delay(POLL_INTERVAL_MS);
  }

  stopProcess(child);
  throw new Error(
    `Timed out after ${readyTimeoutMs}ms waiting for ${baseUrl} to become ready.\n\n${output.join('')}`
  );
}