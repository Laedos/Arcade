# Arcade

A collection of small browser games, served at `https://play.sbdevworks.com`. The root is a menu
page listing every game, and each game lives in its own folder, served at `/<game>/`. This
started as a single game, Slingwell, and became the parent project on 2026-09-18.

Shared engineering conventions live in the root [`CLAUDE.md`](../CLAUDE.md); this file covers only
what's specific to Arcade.

@../CLAUDE-web.md

## Stack

TypeScript + Vite, plain Canvas 2D / DOM, no framework and no runtime dependencies. One
`package.json`, one Vitest run, one oxlint run and one multi-page Vite build for the whole
collection; games share tooling, not code. Versions follow the web baseline in `CLAUDE-web.md`.
`.npmrc` sets `legacy-peer-deps`, because npm 9's resolver crashes (`edgesOut`) on vitest 4.1.11,
the same bug Tenanza hit (npm 10 in CI is fine either way).

## Layout

- `index.html` + `menu.css`: the menu. Static HTML, one `<a class="card">` per game.
- `<game>/index.html` + `<game>/src/`: one game. Each game page links back to the menu (`href="/"`).
- `vite.config.ts`: the build's page list (`rollupOptions.input`) and the test coverage config.
- `tests/menu.test.ts`: keeps the menu cards, the build's page list and the game folders in sync,
  and checks every game links back to the menu.
- `public/CNAME`: the Pages custom domain.

**Adding a game** takes three things, and the menu test fails until all three agree: a
`<game>/index.html` with its `src/`, an entry in `vite.config.ts`'s `input`, and a card in
`index.html`.

Coverage counts `*/src/**/*.ts` minus each game's `main.ts`/`render.ts` (DOM and canvas wiring).
Keep game rules in plain modules with no DOM access, so they stay unit-testable. Slingwell's
`game.ts` is the pattern to follow.

## Games

### Slingwell (`slingwell/`)

A one-button orbital slingshot game. You circle a planet and let go to fly off at a tangent. Get
caught in another planet's orbit and you keep going; fly off the side, or drift for more than
2.2 s, and you're lost. Skipping past planets scores a point for each one skipped. Past planet 8,
some planets drift sideways. Best score is kept in `localStorage` (`slingwell.best`).

- `src/game.ts`: pure, deterministic state + `step(state, dt)`, seeded by `mulberry32`, so a seed
  always generates the same world.
- `src/render.ts`: drawing only; `src/main.ts`: sizing, input (pointer, Space, Enter), a fixed
  120 Hz loop, and the `aria-live` status line; `src/storage.ts`: best score, tolerant of
  missing or throwing storage.
- The world is 400 x 700 logical units. Canvas y points down, so "up" is negative y and an
  increasing angle is clockwise.
- Named Slingwell because "Orbit Hop" was already a live game with the same mechanic.
- Not built: sound, pause, haptics, a daily-seed mode (the seeded generator already supports
  one).

## Commands

- `npm run dev`: dev server (menu at `/`, games at `/<game>/`)
- `npm test`: unit tests (`npx vitest run --coverage` for coverage)
- `npm run lint`, `npm run build` (type-checks, then bundles every page into `dist/`)

## Deployment

GitHub Pages from the public repo `Laedos/Arcade` (renamed from `Laedos/Slingwell`). It has to be
public because the free plan only serves Pages from public repos.
`.github/workflows/deploy-pages.yml` builds and publishes `dist/` on every push to `main`. That
workflow is deploy only; CI is the Jenkins job `job/Arcade`. The custom domain comes from
`public/CNAME` plus the repo's Pages setting. DNS is a Cloudflare CNAME `play` to
`laedos.github.io`, set to "DNS only" (not proxied), for the same reason as the root domain.
