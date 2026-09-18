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
collection. Games share tooling and a small `shared/src/` (best-score storage, page CSS), never
game logic. Versions follow the web baseline in `CLAUDE-web.md`. `.npmrc` sets
`legacy-peer-deps`, because npm 9's resolver crashes (`edgesOut`) on vitest 4.1.11, the same bug
Tenanza hit (npm 10 in CI is fine either way).

## Layout

- `index.html` + `menu.css`: the menu. Static HTML, one `<a class="card">` per game, each with an
  inline SVG thumbnail.
- `<game>/index.html` + `<game>/src/`: one game. Each game page links back to the menu (`href="/"`).
- `shared/src/`: `bestScore.ts` stores a best score per `localStorage` key and tolerates missing or
  throwing storage. `page.css` has the "← Games" link and `.sr-only`. `canvas-page.css` is the
  full-window `#game` canvas; set `--page-bg` on `<body>` to match the game's art.
- `vite.config.ts`: the build's page list (`rollupOptions.input`) and the test coverage config.
- `tests/menu.test.ts`: keeps the menu cards, the build's page list and the game folders in sync,
  and checks every game links back to the menu.
- `public/CNAME`: the Pages custom domain.

**Adding a game** takes three things, and the menu test fails until all three agree: a
`<game>/index.html` with its `src/`, an entry in `vite.config.ts`'s `input` (keyed by the folder
name), and a card in `index.html`.

Each game keeps its rules in `src/game.ts`: plain state, no DOM access, fully unit-tested.
`main.ts` (input, loop, DOM) and, for canvas games, `render.ts` (drawing) stay thin and are left
out of coverage.

## Games

### Slingwell (`slingwell/`)

A one-button orbital slingshot game. You circle a planet and let go to fly off at a tangent. Get
caught in another planet's orbit and you keep going; fly off the side, or drift for more than
2.2 s, and you're lost. Skipping past planets scores a point for each one skipped. Past planet 8,
some planets drift sideways.

- `game.ts` is deterministic: `step(state, dt)`, with the world seeded by `mulberry32`, so a seed
  always generates the same world. `main.ts` runs a fixed 120 Hz step loop.
- The world is 400 x 700 logical units. Canvas y points down, so "up" is negative y and an
  increasing angle is clockwise.
- Best score key: `slingwell.best`.

### Stacker (`stacker/`)

A block slides back and forth above the tower. Drop it and any overhang is cut off, so the tower
narrows. A drop within 5 units of the block below is "perfect": it snaps into place, and every
third perfect in a row grows the block back by 12 units (never past the base width). A complete
miss ends the game. Blocks speed up with height and enter from alternate sides.

- `drop()` returns `perfect`, `cut`, `miss` or `ignored`. `render.ts` owns the camera.
- Best score key: `stacker.best`.

### Mirror Snake (`snake/`)

Snake on a 16x16 grid with walls. Every 4th apple mirrors the controls for 6 seconds, shown by a
magenta board and a countdown.

- Turns are queued (up to 2 per tick), so a quick U-turn between ticks works. A reversal straight
  into the body is ignored.
- The snake may move into the cell its tail is leaving on the same tick.
- Filling the board ends the game as "Board cleared".
- Controls: arrows, WASD, or swipe. Swipes chain without lifting the finger.
- Best score key: `snake.best`.

### Lights Out (`lights-out/`)

The classic 5x5 puzzle: pressing a light flips it and its four neighbours.

- Each level is built backwards from a dark board by pressing `min(15, level + 2)` distinct cells,
  so it is always solvable. "Par" is that press count; a cleverer route can beat it.
- A scramble that cancels itself out is rerolled. The 5x5 board has "quiet" patterns, groups of
  cells that change nothing when all are pressed.
- It's DOM, not canvas: 25 real `<button>`s with `aria-pressed`, so it works with keyboard and
  screen readers.
- Best score is the highest level solved (`lights-out.best`). Play resumes at the level after it.

### Not built yet, any game

Sound, pause, haptics, and a daily-seed mode (Slingwell's seeded generator already supports one).

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
