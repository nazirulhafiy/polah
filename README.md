# POLAH.

[polah.app](https://polah.app) — means “do” in Sarawak Malay.

Small things I make while learning, experimenting, and occasionally solving problems. This repository is the homepage (TanStack Start, React, Vite, Nitro). The live games are separate sites, reached through Cloudflare and, for Cat Balls, a proxy in this app.

## Live

- [Kracked Quest](https://polah.app/kracked/) — a tiny doodle platformer
- [Sifir Sprint](https://polah.app/sifir/) — a 60-second times-tables race
- [Cat Balls](https://polah.app/balls/) — house-cat pinball

How those paths are served is in [Routing](#routing). It is not “three apps inside this repo.”

## Related repos

- [nazirulhafiy/cat-pinball-game](https://github.com/nazirulhafiy/cat-pinball-game) — Cat Balls, GitHub Pages at https://hafiy.my/cat-pinball-game, proxied at https://polah.app/balls
- [nazirulhafiy/sifir-sprint](https://github.com/nazirulhafiy/sifir-sprint) — GitHub Pages, public at https://polah.app/sifir
- [nazirulhafiy/kracked-quest](https://github.com/nazirulhafiy/kracked-quest) — GitHub Pages, public at https://polah.app/kracked

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on `0.0.0.0:8080` (`vite.config.ts`, `strictPort`). Open `http://127.0.0.1:8080/`.

`npm run dev` is `node scripts/with-app-env.mjs vite dev …`. The wrapper merges `VITE_` keys from `.grok/app-env.json` when that file exists. The file is gitignored and is not in this repository. A real environment variable wins over the file. With the file absent, no `VITE_` overrides are applied.

Other local commands:

```bash
npm run typecheck
npm run lint
npm test
npm run preview          # built output, 127.0.0.1:8081
```

## Build

```bash
npm run build
```

That is `node scripts/with-app-env.mjs vite build && npm run db:migrate`.

Vite builds the client and the server. Nitro uses the `vercel` preset and reads `server/` (`vite.config.ts`). Then `scripts/migrate.mjs` runs. See [Database](#database).

The homepage depends on `@tanstack/react-start` `^1.168.60`. That release patches CVE-2026-102989. It requires `@tanstack/react-router` `1.170.41` and `@tanstack/router-plugin` `1.168.42`, so those two ranges moved with it. `@tanstack/react-query` and `@tanstack/react-table` did not. The page itself is unchanged.

`npm run build:dev` builds with Vite’s development mode and does not run migrations.

## Deploy

Production is the Vercel project `polah` (framework `tanstack-start`, Node.js 24.x). Pushes to `main` deploy from Git. The latest production build ran `npm run build` (Vite, then `scripts/migrate.mjs`). There is no deploy workflow in `.github/workflows/`.

Vercel hostnames include `polah.vercel.app`. The public site is [polah.app](https://polah.app), which Cloudflare sends to that Vercel app except for the game paths below.

`vercel.json` sets the build env name `VITE_PUBLIC_HOSTNAME` to the public hostname, and permanently redirects `/balls` to `/balls/`.

## Analytics

The homepage loader, registry, and dist check are described in [`docs/design.md`](docs/design.md) (Analytics). Short version: `data/analytics.json` holds the host, GA4 id `G-B3BZXWWDH9`, this zone's Cloudflare Web Analytics token, and the internal cookie `sn_internal`. One script in `src/lib/analytics/loader.ts` is rendered by the root document.

On the live site, open `https://polah.app/?internal=1` so that visit is marked internal (GA4 `traffic_type: 'internal'`, Cloudflare beacon skipped). `?internal=0` clears the cookie. The loader does not run on localhost or `*.vercel.app`.

Pull requests run `.github/workflows/analytics-dist.yml`: `npm run build`, then `node scripts/check-analytics-dist.mjs` (also `npm run check:analytics`). That check fails if the built homepage has zero analytics loaders, two loaders, a GA4 id that is not in the registry, or the wrong cookie.

## Environment variables

Names only. Do not commit values. `.env` and `.env.*` are gitignored (`.env.example` is allowed; this repo has no example file).

The Vercel project’s env list was empty when these docs were written, and the latest production build logged that `DATABASE_URL` was unset, so migrations skipped.

| Name | Role |
| --- | --- |
| `DATABASE_URL` | Neon (Postgres) connection string. Unset or blank selects the embedded PGLite fallback. |
| `VITE_PUBLIC_HOSTNAME` | Public hostname for canonical and Open Graph URLs. Set in `vercel.json` for this app. |
| `VITE_AUTH_ENABLED` | The string `false` turns federated sign-in off. Any other value, including unset, leaves it on. |
| `VITE_PROJECT_ID` | Optional project id read by the PWA helper. |
| `VITE_OG_SERVICE_URL` | Optional Open Graph service URL read by the PWA helper. |
| `VITE_STUN_URLS` | Optional comma-separated STUN URLs for `src/lib/multiplayer/p2p.ts`. The homepage does not use it. |
| `GROK_PROJECT_ID` | Set on a published deploy. Absent means workspace preview (`src/lib/env.server.ts`). |
| `GROK_AUTH_ISSUER` | Auth broker origin. Code falls back to the broker default in `src/lib/auth/preview.ts` when unset. |
| `GROK_AUTH_CLIENT_ID` | Per-app broker client id. Preview falls back to a baked preview client. |
| `GROK_AUTH_CLIENT_SECRET` | Per-app broker client secret. Preview falls back to a baked preview secret. |
| `BETTER_AUTH_URL` | Public origin for Better Auth. Unset uses a per-request base URL. |
| `BETTER_AUTH_SECRET` | Session signing secret. Unset in preview mints a process-local secret. |
| `GROK_GATE_ORIGIN` | Optional gate issuer origin (`src/lib/auth/gate-identity.server.ts`). |
| `GROK_CONNECTORS_URL` | Optional connectors API origin. |
| `GROK_CONNECTOR_ACCESS_TOKEN` | Connector token. Production does not read this from the environment the same way preview does (`src/lib/app-data/client.server.ts`). |
| `NODE_ENV` | Standard Node mode. |

Script timeouts and guards, not app secrets: `PREVIEW_READY_TIMEOUT_MS`, `PREVIEW_THUMBNAIL_TIMEOUT_MS`, `BROWSER_SMOKE_TIMEOUT_MS`, `BROWSER_ALLOW_EXTERNAL_HOST`.

## Database

Two backends, chosen in `src/lib/db.ts`:

- **Neon** when `DATABASE_URL` is set (whitespace-only counts as unset). Queries use `pg`.
- **PGLite** otherwise: in-memory Postgres from `@electric-sql/pglite`, one instance per process. A dev-server restart clears it.

`getSql()` is server-only. Schema is `migrations/*.sql` in that directory only. Neither applier descends into subfolders (`scripts/migration-plan.mjs`).

**During `npm run build`**, `scripts/migrate.mjs` applies pending top-level `migrations/*.sql` files to `DATABASE_URL`. Each file runs in one transaction and is recorded in `_migrations`. No `DATABASE_URL` skips the step (the production build on `main` did this). No top-level `.sql` files also skips it, without opening a connection.

**On PGLite**, `src/lib/db.ts` applies the same top-level glob before the first query. In dev, `vite.config.ts` awaits that bootstrap when those files exist. With none, it skips PGLite startup.

The only SQL file in the repo today is `migrations/auth/0001_auth.sql` (Better Auth tables). It stays out of both appliers until it is copied to `migrations/`. Copying it up is how sign-in persistence is turned on. A file already recorded under that basename is not applied again.

## Sign-in

The homepage does not render a sign-in control. `AuthProvider` in `src/routes/__root.tsx` is a passthrough. `SignInButtons` in `src/lib/auth/gates.tsx` is not mounted by any route. The generated route tree is only `/`.

The sign-in library is still in the repo. `src/lib/auth/server.ts` builds a Better Auth instance (default base path `/api/auth`). There is no route file that mounts `auth.handler`, so this app does not serve `/api/auth/*` today.

What the code does when auth is used:

- Providers are Google (`grok-google`) and X (`grok-x`), in `src/lib/auth/providers.ts`. They go through the broker (`GROK_AUTH_ISSUER`). This app does not hold the Google or X client secrets.
- `VITE_AUTH_ENABLED=false` disables that federation. `requireUserId` then returns the shared id `dev-user` only when `DATABASE_URL` is also unset. With a real database and auth off, it refuses (`src/lib/auth/verify.server.ts`).
- Email and password are off (`emailAndPasswordEnabled` in `src/lib/auth/email-password.ts`).
- Deployed sign-in, in `signIn()` (`src/lib/auth/client.ts`), is a full-page redirect via `authClient.signIn.oauth2`. That calls `/api/auth/*`, which is not mounted here.
- On a `*.grok-sandbox.com` host, `signIn()` opens `/auth/popup`. That path exists only in `npm run dev`: the Vite plugin `authPopupPlugin` (`apply: "serve"`) handles it and calls `handleAuthPopupRequest`. The popup is not a React route, and the plugin is not part of the production build.
- Session cookies use the `__Host-grok-auth.*` names. Live preview can also send `Authorization: Bearer` because iframe cookies are partitioned.
- Preview without `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` uses the baked preview client in `src/lib/auth/preview.ts`. Do not copy that secret into docs or chat.

## Routing

Checked against `server/middleware/balls-proxy.ts`, `vercel.json`, and the live Cloudflare worker `polah-sifir-sprint-proxy` on the `polah.app` zone (script is not in this repository).

**This does not match the shorthand “the Cloudflare worker proxies `/balls` to `hafiy.my/cat-pinball-game/`.”** The worker does not mention `/balls` or `cat-pinball-game`. Cat Balls is proxied by this repo, on Vercel, after Cloudflare has already forwarded the request.

Cloudflare worker `polah-sifir-sprint-proxy` (routes cover `polah.app`, `polah.app/`, and `polah.app/*`, plus the path patterns below):

| Request | What the worker does |
| --- | --- |
| `/sifir` and `/sifir/*` | Proxies to `https://hafiy.my` with the path rewritten to `/sifir-sprint` plus the rest. |
| `/kracked` and `/kracked/*` | Proxies to `https://hafiy.my` with the path rewritten to `/kracked-quest` plus the rest. |
| `/sifir-sprint` and `/sifir-sprint/*` | 301 to `/sifir` (same suffix). |
| `/kracked-quest` and `/kracked-quest/*` | 301 to `/kracked` (same suffix). |
| Everything else, including `/` and `/balls` | Proxies to `https://polah.vercel.app` with the same path and query. `Host` is set to `polah.vercel.app`. Redirect `Location` headers that point at that Vercel host are rewritten back to the `polah.app` host. |

On Vercel, `server/middleware/balls-proxy.ts` (Nitro, because `serverDir` is `./server`):

- `GET` and `HEAD` for `/balls/` and anything under it are fetched from `https://hafiy.my/cat-pinball-game/` plus the suffix and query.
- HTML, CSS, JavaScript, JSON, and SVG responses are rewritten so root-absolute `/assets/` and `/favicon.svg` stay under `/balls/`.
- A path that escapes that origin (for example `..`) is rejected with 400.
- The bare path `/balls` is a 301 to `/balls/` plus the query, if the request reaches the middleware.
- Other methods are not proxied.

`vercel.json` also permanently redirects `/balls` to `/balls/`.

`/sifir` and `/kracked` never reach this app. The worker handles them first.

## Add a thing

Edit [`src/data/projects.ts`](src/data/projects.ts). One object. Set `available: true` when the path exists. Unavailable entries are not rendered. That file is content: the docs check does not watch `src/data/`.

## Documentation

- [`docs/design.md`](docs/design.md) — layout, colour, type, components, motion
- [`docs/ci-docs-check.md`](docs/ci-docs-check.md) — the pull-request docs check
- [`AGENTS.md`](AGENTS.md) — agent rules, including when `docs/` must change
