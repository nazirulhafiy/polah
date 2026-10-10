# AGENTS.md

POLAH. is the homepage at [polah.app](https://polah.app). Operational detail is in [`README.md`](README.md). Visual detail is in [`docs/design.md`](docs/design.md). Do not contradict those.

## Docs rule

Design or behaviour changes (CSS, templates, app JS, build scripts, config) must update docs/ (usually docs/design.md) in the same PR. Use the `no-docs-needed` label only for changes that truly need no docs.

The docs check (`.github/workflows/docs-check.yml`) enforces that on the watched paths in [`docs/ci-docs-check.md`](docs/ci-docs-check.md). It does not watch content files such as `src/data/` or `public/projects/`.

## First scaffold

`npm run dev` listens on `0.0.0.0:8080` (`vite.config.ts`). The dev server is the TanStack Start app: `src/router.tsx` and `src/routes/` are already in the tree. The only page route is `/` (`src/routes/index.tsx`).

Do not add `src/routes/auth/popup.tsx`. `/auth/popup` is a dev-only Vite middleware (`authPopupPlugin` in `vite.config.ts`). A React page on that path would paint the app shell inside the sign-in popup.

## Local commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

## What not to invent

- Do not document secret values. Environment docs list names only.
- Cloudflare routing for `/sifir` and `/kracked` lives in the worker `polah-sifir-sprint-proxy`, which is not in this repo. `/balls` is proxied here, in `server/middleware/balls-proxy.ts`, to `https://hafiy.my/cat-pinball-game/`. The worker does not do that. See README § Routing.
- `migrations/auth/0001_auth.sql` is not applied until it is copied to `migrations/`.

## Brand-asset note

`scripts/brand-check.test.mjs` requires the marker path and the wording in the next section to stay in this file.

The pending Open Graph marker is `/workspace/.grok/og-pending`. `scripts/brand-check.mjs` treats a marker older than 10 minutes as stale.

## Execution notes pinned by the brand check

6. **Brand-asset pass.** Never `wait_tasks` and never `get_task_output` for this pass.

7. **Docs.** Design or behaviour changes still update `docs/` in the same pull request.
