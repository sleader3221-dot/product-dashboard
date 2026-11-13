import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { buildLiveConfig } from '@/lib/voice/liveConfig';

// Mints a single-use, short-lived token so the browser can open a Gemini Live
// WebSocket directly. The API key never leaves the server, and the persona,
// tools and model are locked into the token so the client cannot change them.

export const dynamic = 'force-dynamic';

const Body = z.object({
  language: z.enum(['auto', 'hi', 'kn', 'en']).default('auto'),
});

// Best-effort per-instance rate limit (serverless instances don't share it).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 20;
const hits = globalThis.__VAANI_TOKEN_HITS__ || new Map();
globalThis.__VAANI_TOKEN_HITS__ = hits;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_TOKENS_PER_WINDOW;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { code: 'NO_KEY', error: 'GEMINI_API_KEY is not set on the server. Using offline voice mode.' },
      { status: 503 }
    );
  }

  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (rateLimited(ip)) {
    return NextResponse.json({ code: 'RATE_LIMIT', error: 'Too many voice sessions. Try again in a few minutes.' }, { status: 429 });
  }

  let language = 'auto';
  try {
    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (parsed.success) language = parsed.data.language;
  } catch {
    // default language
  }

  const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  const config = buildLiveConfig(language);

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 8000 } });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();
    // Keep lockAdditionalFields unset; [] makes this SDK version emit an invalid field mask.
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: { model, config },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });
    return NextResponse.json({ token: token.name, model, config, expireTime });
  } catch (err) {
    const message = String(err?.message || err);
    const status = Number(err?.status) || (/quota|exhausted|429/i.test(message) ? 429 : /abort|timeout|timed out/i.test(message) ? 504 : 502);
    return NextResponse.json(
      {
        code: status === 429 ? 'QUOTA' : 'TOKEN_FAILED',
        error: status === 429
          ? 'Gemini free-tier limit reached. Using offline voice mode.'
          : `Could not start a Gemini Live session (${message.slice(0, 160)}). Check GEMINI_API_KEY and GEMINI_LIVE_MODEL.`,
      },
      { status }
    );
  }
}
