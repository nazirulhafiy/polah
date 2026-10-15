# Design

The live page is one route, `/`, in `src/routes/index.tsx`. Styling is Tailwind v4 plus the tokens in `src/styles.css`. The theme is light only (`color-scheme: light` on `html`, `theme-color` `#fff4d8` in `src/routes/__root.tsx`). There is no dark-mode toggle.

## Layout

- Page background is cream. Text is ink. The column is `max-w-5xl`, padded `px-5` (`sm:px-8`).
- A skip link (“Skip to things”) sits off-screen until focused, then lands on `#things`.
- The hero is the wordmark, the line “means “do” in Sarawak Malay.”, and a short lede (`max-w-xl`).
- Featured projects (`featured` and `available` in `src/data/projects.ts`) sit in `.things-grid`: one column, two from 640px, three from 1024px.
- Further available projects, when any exist, are a “More things” list under a 3px ink divider. Unavailable projects are not rendered. None of the non-featured entries are available today, so that list is absent on the live page.
- The footer is a byline linking to `https://hafiy.my`, then a full-bleed teal hill (`div.ground`, 68px). The hill is `aria-hidden`.

Unknown URLs use the root `notFoundComponent`: wordmark, “Nothing here.”, and a butter “Back” link to `/`.

## Colour

Tokens in `src/styles.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#141414` | Text, 3px borders, hard shadows |
| `--color-cream` | `#fff4d8` | Page |
| `--color-paper` | `#fffaf0` | Cards |
| `--color-muted` | `#5a5146` | Lede, descriptions, byline |
| `--color-butter` | `#ffe566` | Wordmark dot, play chip, not-found button |
| `--color-navy` | `#16224a` | Card image well |
| `--color-teal` | `#2ee0b2` | Footer hill |
| `--color-sky` | `#3d7dff` | Defined, unused on the homepage |
| `--color-gold` | `#ffc107` | Defined, unused on the homepage |
| `--color-pink` | `#ff6ea8` | Defined, unused on the homepage |
| `--color-peach` | `#ffc8a0` | Defined, unused on the homepage |
| `--color-ok` | `#39e07a` | Defined, unused on the homepage |
| `--color-bad` | `#ff4d6a` | Defined, unused on the homepage |

Shadows are offset ink blocks, not blurs: `--shadow-ink` is `4px 5px 0 #141414`. Cards and the play chip use a 3px (chip: 2.5px) solid ink border.

Radii: cards 18px, media and buttons 14px, chips fully round.

## Type

Loaded from Google Fonts in `src/routes/__root.tsx` (preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`):

- Display: **Fredoka** 500–700 (`--font-display`). Wordmark, headings, kicker, play chip.
- Body: **Bricolage Grotesk** opsz 12–96, weights 400–800 (`--font-sans`).

The wordmark is `POLAH` plus a butter circle (`.wordmark-dot`). The accessible name includes the period via `.sr-only`. Size is `clamp(3.4rem, 16vw, 7.5rem)`.

## Components

- `Wordmark` (`src/components/wordmark.tsx`) — the title lockup. The hero renders it as `h1`.
- `FeaturedCard` (`src/components/project-card.tsx`) — image at 1200×540 (object-cover, navy well, 3px bottom border), name, description, butter chip. The whole card is a link, `target="_blank"`.
- `ProjectRow` — name, description, and an arrow. Also `target="_blank"`. Used only when a non-featured available project exists.

Card copy and images come from `src/data/projects.ts` and `public/projects/`. Href defaults to `/${slug}/` when `href` is omitted. The three live cards set absolute `https://polah.app/...` hrefs.

## Motion

`.home-enter` stamps the wordmark and cards in, rises the kicker, lede, and byline, pops the wordmark dot, and slides the hill up. Delays stagger the three cards.

Hover (only when `hover: hover`): `.lift` shifts up-left and grows the shadow; the chip arrow moves 4px right; the wordmark dot tilts. Press sinks the card into a smaller shadow.

`prefers-reduced-motion: reduce` collapses animation and those transforms.

## Notable behaviour

- Featured cards leave the origin in a new tab. Where `/kracked`, `/sifir`, and `/balls` actually go is documented in the README routing section, not in this stylesheet.
- Focus visible is a 3px ink outline, 3px offset.
- Open Graph copy is `src/lib/og/site.json` (`title` `POLAH.`, `card` `custom`). The PWA middleware in `server/middleware/grok-pwa.ts` can inject head tags and serve `/__grok/manifest.webmanifest`. It does not run for `/balls`.

## Stack

Built with TanStack Start `@tanstack/react-start` `^1.168.60`, `@tanstack/react-router` `^1.170.41`, and `@tanstack/router-plugin` `^1.168.42`. `1.168.60` is the patched release for CVE-2026-102989. The layout, colour, type, and motion on this page are the same as before that bump.

## Analytics

- Google Analytics 4: measurement ID `G-B3BZXWWDH9` (one property for all of polah.app, shared with sifir-sprint at /sifir/, cat-pinball-game at /balls/ and kracked-quest), rendered in `<head>` by `RootDocument` in `src/routes/__root.tsx`.
- Cloudflare Web Analytics: polah.app is proxied by Cloudflare with Web Analytics auto-install enabled, so the beacon is injected at the edge; no snippet in code.
- No Content-Security-Policy is set for app pages; if one is added, allow `www.googletagmanager.com` and `*.google-analytics.com`.
