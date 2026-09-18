# Slingwell

A one-button orbital slingshot game for the browser. You circle a planet; let go to fly off at a
tangent and get caught in the next planet's orbit. Miss and you're lost in space. Skipping past a
planet to reach a further one scores a point for each planet passed. Past planet 8, some planets
start drifting sideways. Best score is kept in `localStorage`.

Shared engineering conventions live in the root [`CLAUDE.md`](../CLAUDE.md); this file covers only
what's specific to Slingwell.

@../CLAUDE-web.md

## Stack

TypeScript + Vite, plain Canvas 2D, no framework and no runtime dependencies. Vitest for tests,
oxlint for lint. Versions follow the web baseline in `CLAUDE-web.md`. `.npmrc` sets
`legacy-peer-deps`, because npm's resolver crashes (`edgesOut`) on vitest 4.1.11 here, the same
bug Tenanza hit.

## Layout

- `src/game.ts`: all game rules as pure, deterministic state + `step(state, dt)`, with a seeded
  RNG (`mulberry32`) so a seed always generates the same world. No DOM access. This is where
  behaviour changes go, and it is fully unit-tested.
- `src/render.ts`: Canvas drawing only, reading state and never changing it. Excluded from
  coverage.
- `src/main.ts`: wiring. Canvas sizing, input (pointer, Space, Enter), a fixed 120 Hz step
  loop, best-score saving, and the `aria-live` status line. Excluded from coverage.
- `src/storage.ts`: best score. Tolerates missing or throwing storage.

The world is 400 logical units wide and 700 tall (`WORLD_WIDTH`/`VIEW_HEIGHT`). Canvas y points
down, so "up the screen" is negative y and an increasing angle is clockwise.

## Commands

- `npm run dev`: dev server
- `npm test`: unit tests (`npx vitest run --coverage` for coverage)
- `npm run lint`, `npm run build` (type-checks, then bundles to `dist/`)

## Not built yet

Sound, a pause key, mobile haptics, and a daily-seed mode (the seeded generator already supports
one).

## Deployment

Live at `https://play.sbdevworks.com` through GitHub Pages. The repo is public because the free
plan only serves Pages from public repos. `.github/workflows/deploy-pages.yml` builds and
publishes `dist/` on every push to `main`. That workflow is deploy only; CI is the Jenkins job
`job/Slingwell`. The custom domain comes from `public/CNAME` plus the repo's Pages setting. DNS is
a Cloudflare CNAME `play` to `laedos.github.io`, set to "DNS only" (not proxied), for the same
reason as the root domain.
