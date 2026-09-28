# GitHub Actions CI/CD

Everything that runs automatically for this repository lives in `.github/`.
This document explains what each workflow does, how to turn the optional pieces
on, and how to run the same checks locally before pushing.

---

## 1. Workflow catalogue

| Workflow | File | Triggers | Jobs |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | push to `main`, PRs into `main`, merge queue, manual | `lint`, `workflow-lint`, `unit-tests` (Node 22 + 24), `build`, `smoke-tests`, `security-audit`, `ci-success` |
| **CodeQL** | `.github/workflows/codeql.yml` | push/PR on `main`, weekly cron `27 3 * * 1`, manual | `analyze` (`javascript-typescript`, `security-and-quality` queries) |
| **Dependency review** | `.github/workflows/dependency-review.yml` | PRs into `main` | `dependency-review` (fails on high/critical severity) |
| **Deploy to Vercel** | `.github/workflows/deploy-vercel.yml` | CI success on `main`, `v*` tags, manual dispatch | `deploy` (production or preview) |
| **Release** | `.github/workflows/release.yml` | `v*` tags, manual dispatch with an existing tag | `release` (build check + GitHub release with generated notes) |
| **Security audit** | `.github/workflows/security-audit.yml` | weekly cron `0 6 * * 1`, pushes that touch the lockfile, manual | `audit` (`npm audit`) |

Supporting files:

| File | Purpose |
|---|---|
| `.github/dependabot.yml` | Weekly npm and GitHub Actions dependency PRs, grouped and labelled |
| `.github/pull_request_template.md` | PR checklist mirroring the CI gates |
| `.nvmrc` | Pins the Node major used by `setup-node` and by developers |

---

## 2. The CI pipeline in detail

```text
push / PR ─┬─ lint ─────────────── npm run lint (ESLint, fails on errors)
           ├─ workflow-lint ────── actionlint in Docker over .github/workflows
           ├─ unit-tests ───────── node:test on Node 22.x and 24.x
           │                      (Node 22 also prints a coverage table)
           ├─ build ────────────── npm run build, uploads the compiled .next
           │        │
           │        └─ smoke-tests ─ downloads that .next, boots `next start`
           │                          and exercises the real HTTP API
           └─ security-audit ───── npm audit --omit=dev --audit-level=high
                                     + full JSON report artifact
```

Key design points:

- **The artifact that is tested is the artifact that was built.** `build`
  uploads `.next`; `smoke-tests` downloads it instead of rebuilding, so a broken
  build can never silently pass.
- **One aggregate status check.** `ci-success` fails whenever any required job
  failed, was cancelled or was skipped. Point branch protection at this single
  check instead of five separate ones.
- **Least privilege.** Every workflow sets `permissions: contents: read` at the
  top; only CodeQL (`security-events: write`), dependency review
  (`pull-requests: write`) and the release job (`contents: write`) widen it, and
  only for the job that needs it.
- **Concurrency control.** Superseded runs on the same ref are cancelled;
  Vercel deployments are serialised instead (`cancel-in-progress: false`) so two
  runs never race for the production alias.
- **No `npm audit` inside `npm ci`.** Installs run with `--no-audit --no-fund`
  for speed and determinism; auditing is its own job so it can fail
  independently and upload a report.

---

## 3. Branch protection (recommended setup)

1. Open **Settings → Branches → Add branch ruleset / protection rule** for `main`.
2. Enable **Require status checks to pass** and select:
   - `CI success` (the aggregate gate — required)
   - `Analyze javascript-typescript` (CodeQL)
   - `Review dependency changes` (optional, PRs only)
3. Enable **Require branches to be up to date before merging**.
4. Optional, and only once a second maintainer exists: **Require a pull request
   before merging** with 1 approval. GitHub never lets you approve your own pull
   request, so on a single-maintainer repository keep the approval count at `0`
   (or leave the rule off) — the status checks above still gate every pull
   request, and direct pushes by the owner keep working.
5. If you want a fully serialised `main`, add **Require merge queue** as well:
   CI already listens to `merge_group`.

The same configuration through the CLI — this is what is configured on this
repository today (status checks only, so the owner can still push to `main`):

```bash
cat > /tmp/protection.json <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI success", "Analyze javascript-typescript"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON

gh api -X PUT repos/OWNER/REPO/branches/main/protection \
  --input /tmp/protection.json
```

Verify with:

```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --jq '.required_status_checks.contexts'
```

---

## 4. Vercel deployments

The deploy job is **opt-in**: without the three secrets below, the workflow still
runs, logs a `::notice::` and writes a "deployment skipped" job summary. Nothing
fails, so the repository is green before Vercel is ever configured.

### 4.1 Create the secrets

```bash
# 1. Link the local checkout to the Vercel project (creates .vercel/project.json)
npx vercel@latest link

# 2. Read the ids out of it
cat .vercel/project.json
# → { "orgId": "team_xxx", "projectId": "prj_xxx" }

# 3. Create an access token: https://vercel.com/account/tokens
```

Then add repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Personal/team access token from the Vercel dashboard |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

Never commit `.vercel/` — it is ignored by `.gitignore`.

### 4.2 When deployments happen

| Event | Target | Comment |
|---|---|---|
| CI finishes successfully on `main` | production | The deploy waits for the whole CI pipeline (`workflow_run`) |
| `v*` tag pushed | production | The tag must build; the Release workflow also runs |
| Manual dispatch, target `production` | production | Optional `ref` input (branch/tag/SHA) |
| Manual dispatch, target `preview` | preview | Useful for testing a branch without merging |

The environment shown next to the run is a real GitHub **environment**
(`production` or `preview`). Add required reviewers to the `production`
environment to turn every production deploy into an approval gate.

### 4.3 Security model

- A job-level `if` cannot read secrets, so the job first inspects the
  configuration and skips the remaining steps when it is absent.
- The deploy only reacts to **push-triggered** CI runs from **this** repository
  (`workflow_run.event == 'push'`, `head_repository.full_name == github.repository`),
  so a fork cannot deploy — not even a fork pushing a branch called `main`.
- Fork PRs never receive secrets; PR previews are expected to come from the
  Vercel Git integration.

### 4.4 Avoid double deployments

If the project is still connected to Vercel's Git integration, `main` would
deploy twice (once by Vercel, once by Actions). Choose one:

- **Keep the Git integration** and use this workflow for tagged releases only
  (delete the `workflow_run` trigger), or
- **Let Actions own production** and disable the production branch deployment:

  ```json
  {
    "git": { "deploymentEnabled": { "main": false } }
  }
  ```

  Saved as `vercel.json`. (Not committed here on purpose — it would change how
  the existing live demo is built.)

**State of this repository (verified 2026-09-28):** the Vercel Git integration
*is* connected — pull requests get a `Vercel` preview check and pushes to `main`
deploy production on their own, with no repository secret involved (checked with
`https://product-dashboard-steel-two.vercel.app/api/products`, which answers with
the full 194-row catalogue). The `VERCEL_*` secrets are therefore deliberately
left unset: this workflow reports a *skipped* deployment instead of publishing the
same commit a second time.

---

## 5. Dependabot

`.github/dependabot.yml` opens **one grouped PR per ecosystem and week**:

- npm: production minor/patch updates in one PR, dev minor/patch in another;
  major bumps of `next`, `react` and `react-dom` are ignored because they need a
  planned migration.
- `github-actions`: keeps `actions/checkout`, `actions/setup-node`,
  `actions/upload-artifact`, `github/codeql-action`, … on current majors.

The first `github-actions` update run failed with
`RuntimeError … No files changed!` inside Dependabot's own
`GithubActions::FileUpdater`: it resolves an action that already sits on the
newest major tag and then has nothing to rewrite. That is an upstream Dependabot
bug, not a problem with this configuration — the two `npm` groups are unaffected
and opened their pull requests normally.

Every Dependabot PR runs the full CI pipeline, so a green PR is safe to merge.
If a pipeline fix lands *after* a Dependabot PR was opened, that PR still carries
the old workflow and stays red, so it cannot pass the required `CI success` check.
Comment `@dependabot rebase` (or enable Dependabot auto-rebase in the project
settings) to move it onto the new revision before merging it.
Note that workflows triggered by Dependabot get a **read-only** `GITHUB_TOKEN`
unless *Settings → Actions → General → "Send write tokens to workflows from pull
requests"* is enabled; the dependency-review job's PR comment is therefore
best-effort on those PRs.

---

## 6. Running the same checks locally

```bash
npm ci                 # reproducible install from package-lock.json
npm run verify         # lint + unit tests + production build
```

| Command | What it does |
|---|---|
| `npm run lint` | ESLint (`eslint-config-next`, 0 errors required) |
| `npm run lint:fix` | Same, with `--fix` |
| `npm run test:unit` | Node built-in test runner over `tests/unit/*.test.js` |
| `npm run test:coverage` | Unit tests + `--experimental-test-coverage` table |
| `npm run build` | `next build` (required before the API tests) |
| `npm run test:api` | Boots `next start` and runs the HTTP smoke tests |
| `npm test` | Alias for `npm run test:unit` |
| `npm run verify` | The exact sequence the CI pipeline enforces |

Notes:

- **Node 22 or newer is required.** The test scripts use the built-in test
  runner with glob patterns (`node --test "tests/unit/*.test.js"`); CI covers
  Node 22.x and 24.x.
- `npm run test:api` needs a completed build. It starts the server on
  `TEST_PORT` (default `3100`), waits until `/api/products` answers, and shuts
  the server down afterwards. If a server already listens on that port it is
  reused and left running, which is handy when debugging.
  Override with `TEST_PORT=3200 npm run test:api`.
- Reproduce the workflow linter locally with Docker:

  ```bash
  docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12
  ```

---

## 7. Test strategy

| Layer | File | Covers |
|---|---|---|
| Unit | `tests/unit/validation.test.js` | Every rule in `utils/validation.js` (title, category, price, stock, thumbnail, cost price, error result shape) |
| Unit | `tests/unit/api-client.test.js` | `lib/api.js` URL building, encoding, methods, JSON bodies, error mapping |
| Unit | `tests/unit/seed-products.test.js` | Integrity of `lib/seedProducts.json` (194 rows, unique ids, renderable fields, non-negative integers) |
| Integration | `tests/api/smoke.test.js` | Real HTTP surface of `next start`: catalogue, limit/search/category filters, store stats, create → search → update → delete round trip, malformed-body handling, `/api/categories`, SSR HTML of `/` |

The API tests deliberately go through HTTP instead of importing `lib/store.js`:
that keeps the store's JSON import out of the test loader and proves the routes
behave for real clients.

Not covered yet (good next steps):

- Client-side pagination/sorting/filtering logic in `app/page.js` — extract it
  into `utils/` to make it unit testable.
- Browser end-to-end flows (add/edit/delete through the UI modal, PDF export) —
  add Playwright once a browser test runner is worth the CI minutes.
- Coverage thresholds: Node's runner prints coverage but cannot fail a build on
  a threshold yet; enforce it when more modules are covered.

---

## 8. Release and deploy flow

```bash
npm version patch            # or minor / major — bumps package.json + tag
git push --follow-tags       # triggers Release + Vercel production deploy
```

`Release` re-runs the production build for the tagged commit and publishes a
GitHub Release with generated notes. `Deploy to Vercel` deploys the tagged
commit to production. Both are safe to re-run from the Actions tab
(**Deploy to Vercel → Run workflow**).

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Deploy job says "Vercel deployment skipped" | `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` missing (see §4.1) |
| `next start exited before serving requests` | No production build — run `npm run build` first |
| `Timed out … waiting for http://127.0.0.1:3100` | Something else uses the port; run with `TEST_PORT=3200` |
| `npm ci` fails with `EBADENGINE` | Node older than 22 — `nvm use` (see `.nvmrc`) |
| CodeQL: "CodeQL is already enabled" / conflicting default setup | Disable **default setup** under *Settings → Code security* before using the advanced workflow |
| Dependency review: "Dependency review is not supported on this repository" | The dependency graph is off. Turn it on with `gh api -X PUT repos/OWNER/REPO/vulnerability-alerts` (or *Settings → Code security → Dependency graph*) and re-run the failed job — the pull request itself is fine |
| `npm error Missing script: "test:api"` in the smoke-test job | The `.next` artifact was unpacked into the repository root, where Next's own `.next/package.json` (`{"type":"commonjs"}`) overwrote the project's `package.json`. Keep `path: .next` on `download-artifact`; the `Verify the restored build` step fails loudly if this ever regresses |
| Dependabot's `github_actions` job reports `RuntimeError … No files changed!` | Upstream bug in Dependabot's `GithubActions::FileUpdater`: it resolves an action that already sits on its newest major tag and then has nothing to rewrite. The `npm` ecosystem is unaffected and no repository change fixes it |
| Dependabot's ESLint major PR fails lint with `TypeError: scopeManager.addGlobals is not a function` | ESLint 10 changed the scope-manager API and the current `eslint-config-next` does not support it yet. Like `next` and `react`, an ESLint major needs a planned migration — stay on `eslint@^9` and close that PR for now |
| `compatible lockfile` error in CI | `package-lock.json` out of sync with `package.json` — run `npm install` and commit the lockfile |
| Vercel build differs from `next build` | `vercel build` uses the project's build settings; keep them in sync under *Project → Settings → Build & Development* |

---

## 10. Optional hardening

- **Pin actions to commit SHAs.** Major tags track security fixes but are
  mutable; `pin-github-action` or Renovate can rewrite them to SHAs while
  keeping updates automated.
- **Add `CODEOWNERS`** so workflow changes require review by whoever owns CI.
- **Enable secret scanning + push protection** (*Settings → Code security*) —
  no secrets are needed for CI, so any detected token is a mistake.
- **Enforce "Require branches to be up to date"** together with grouped
  (merge-queue) merges for a fully serialised main branch.