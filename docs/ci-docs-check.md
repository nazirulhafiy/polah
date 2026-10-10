# CI: docs check

Pull requests run **docs-check** (`.github/workflows/docs-check.yml`) on `opened`, `synchronize`, `reopened`, `labeled`, and `unlabeled`.

The job name is `docs-check`. It diffs `base.sha...head.sha` (three dots) with a full fetch.

## Watched paths

Same list as the comment at the top of the workflow and the constants in [`scripts/docs_check_pr.py`](../scripts/docs_check_pr.py):

- `src/**/*.css`
- `src/**/*.js`
- `src/**/*.jsx`
- `src/**/*.ts`
- `src/**/*.tsx`
- `server/**/*.js`
- `server/**/*.ts`
- `public/favicon.ico`
- `public/favicon.svg`
- `scripts/install-page.html`
- `scripts/migrate.mjs`
- `scripts/migration-plan.mjs`
- `scripts/with-app-env.mjs`
- `scripts/app-env-plugin.mjs`
- `scripts/grok-pwa-plugin.mjs`
- `scripts/grok-pwa-shared.mjs`
- `scripts/grok-pwa-shared.d.mts`
- `scripts/preview.mjs`
- `vite.config.ts`
- `vercel.json`

Excluded even when the suffix would match:

- `src/data/**` (project copy and other content)
- `*.test.ts`, `*.test.tsx`, `*.test.js`, `*.test.jsx`, `*.test.mjs`

Not watched: `public/projects/**`, `public/og.jpg`, `public/sitemap.xml`, `public/robots.txt`, `migrations/**`, `tests/**`, `package.json`, `package-lock.json`.

## What fails

If a watched path changes and nothing under `docs/` changes, the check fails:

> This PR changes how the site looks or behaves but doesn't update docs/. Update docs/design.md, or add the no-docs-needed label if no doc change is needed.

## Escape hatch

The label `no-docs-needed` skips the check. The workflow creates the label when it is missing (`issues: write`). Use it only when the change truly needs no docs. See `AGENTS.md`.
