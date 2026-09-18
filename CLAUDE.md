# Arcade

A collection of small browser games, served at `https://play.sbdevworks.com`. The root is a menu
page listing every game, and each game lives in its own folder, served at `/<game>/`. This
started as a single game, Slingwell, and became the parent project on 2026-09-18.

Shared engineering conventions live in the root [`CLAUDE.md`](../CLAUDE.md); this file covers only
what's specific to Arcade.

@../CLAUDE-web.md

## Stack

TypeScript + Vite, plain Canvas 2D / DOM, no framework and no runtime dependencies. Multiplayer games
also have a Cloudflare Worker backend in `server/` (Durable Objects, TypeScript), the one part of
Arcade not hosted on GitHub Pages; see Doodle Telephone below. One
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
- `server/`: the multiplayer backend (own `tsconfig.json` for Workers types; the root one excludes it).
- `public/CNAME`: the Pages custom domain.

**Adding a game** takes three things, and the menu test fails until all three agree: a
`<game>/index.html` with its `src/`, an entry in `vite.config.ts`'s `input` (keyed by the folder
name), and a card in `index.html`.

Each game keeps its rules in `src/game.ts`: plain state, no DOM access, fully unit-tested.
`main.ts` (input, loop, DOM) and, for canvas games, `render.ts` (drawing) stay thin and are left
out of coverage.

## Online games: the shared room kit and preview mode

Every online game (the Multiplayer shelf, except Four in a Row) is built on `shared/src/rooms/`:

- `protocol.ts`: what every room has, `BaseRoomView` (code, you, phase, players), and the
  `state`/`error` server messages. Each game's own `protocol.ts` extends it.
- `connection.ts`: one WebSocket per room, keyed by game slug (`/<slug>/rooms/<code>/ws`). It
  reconnects with backoff and keeps a per-game, per-room seat token in `localStorage`.
- `lobby.ts`: the home screen (name, then create or join by code) and the lobby (code, invite
  link, players, Start for the host).
- `page.ts`: `startRoomPage()` wires the whole page: create/join, reconnect, leave, errors, the
  lobby, a countdown in any `#timer` element (using the server's clock), and preview mode. A game
  only supplies `render` for its phases after the lobby, plus optional `afterRender`/`tick`
  hooks.
- `rooms.css`: the shared look. A game sets the colour variables and styles its own screens.
- `config.ts`: `ROOMS_API` (`VITE_ROOMS_URL`) and `ONLINE` (`VITE_ROOMS_ONLINE === 'true'`).

**`ONLINE` is off in production**, because the room server has never been deployed. While it's
off, a game's home screen says so and offers **preview mode** instead of room create/join.

- Preview mode is a bar of buttons that steps through that game's sample states
  (`<game>/src/fixtures.ts`). Every action inside it does nothing.
- `?preview` or `?preview=N` opens it directly at screen N, which is handy for sharing one
  screen.
- `.env.development` sets `VITE_ROOMS_ONLINE=true` for local play against `npm run dev:server`.
- Going live means deploying the server, then building with `VITE_ROOMS_ONLINE=true`, for
  example via a `.env.production`.

**Only Doodle Telephone has a server side.** Quiz Night, Imposter and Rock Paper Scissors so far
have only their page: protocol, screens and preview, with no room logic yet. Each one's
`protocol.ts` is the contract its future Durable Object has to implement. Follow Doodle's
pattern: a pure, tested state machine in `server/src/<game>/`, wired through a Durable Object,
plus a route in `server/src/index.ts`.

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

### 2048 (`2048/`)

The sliding-tile puzzle on a 4x4 board. Moves use the arrow keys, WASD, or a swipe on the board.
`slideLine` merges each pair once, front first (`[2,2,2,2]` becomes `[4,4]`, and `[4,4,8]` becomes
`[8,8]`, not 16). A move that changes nothing adds no tile. New tiles are a 2 nine times in ten,
otherwise a 4. Reaching 2048 sets `won` once and play continues; the game ends only when no move
is possible. `state.spawned` and `state.merged` exist only to drive the pop animations in
`view.ts`. Best score key: `2048.best`.

### Brick Breaker (`brick-breaker/`)

Paddle and ball on a 400x600 world. The paddle follows the pointer, or the arrow keys / A-D;
keys take over until the pointer moves again. Space, Enter or a tap launches the ball.

- Where the ball lands on the paddle sets its exit angle, up to 60° either side, which is how the
  player aims.
- A brick hit reflects off the face the ball is least pushed into, scores the brick's row value
  (higher rows are worth more), and speeds the ball up 1% (capped).
- The ball moves in sub-steps of at most 3 units, so it can't tunnel through a brick even in a
  long frame.
- 3 lives. Clearing the board starts the next level with one more row (up to 8) and a faster
  base speed.
- Best score key: `brick-breaker.best`.

### Four in a Row (`four-in-a-row/`), multiplayer on one device

Two players take turns on the same screen; the first to line up four discs wins. `game.ts` holds
the rules: drop, win detection in all four directions, and draws. A disc that completes two lines
at once highlights both. It also keeps the score tally for the session, and whoever didn't start
the last round starts the next. `view.ts` renders seven real column buttons, each labelled with
how many free slots it has, and keeps keyboard focus on the same column across re-renders. Keys:
1–7 drop into a column, and the arrow keys move between columns. Yellow discs have a ring, so the
two sides differ in shape as well as colour.

### Doodle Telephone (`doodle-telephone/` + `server/`), online — preview until the server is deployed

The page and the server are both complete and tested; only the Worker deploy is missing
(`npx wrangler login` hasn't been run on this machine yet). To launch: deploy the server, run
`npm run smoke:server -- https://rooms.sbdevworks.com`, then build with `VITE_ROOMS_ONLINE=true`
(see "Online games" above).

A Gartic Phone-style party game for 2 to 12 players. Someone creates a room (4-letter code, no I
or O) and friends join with the code and a nickname. There are no accounts. Everyone writes a
prompt; then the chains pass one seat along each turn, alternating draw (75 s) and guess (30 s),
until every chain has been through every player. The host then steps through the reveal, where
each drawing replays stroke by stroke.

- **Server** (`server/`): a Cloudflare Worker with one Durable Object per room
  (`DoodleRoom`), deployed as `arcade-rooms` on the custom domain `rooms.sbdevworks.com`.
  - `src/doodle/room.ts` holds all the rules as a plain state machine, fully tested.
    `DoodleRoom.ts` is only wiring: sockets, a broadcast after every change, and an alarm at
    each turn's deadline.
  - `src/http.ts` covers room codes, the origin allow-list and message parsing.
    `src/index.ts` routes `POST /doodle/rooms` (create) and `GET /doodle/rooms/:code/ws` (join).
- **Server-authoritative.** Seat i works on chain `(i - step) mod N`. Clients hand in whatever
  they have when their countdown hits zero. The server waits 3 more seconds (`GRACE_MS`), then
  fills any missing entry with "…" or an empty drawing and moves on. It also moves on as soon as
  every connected player has submitted. Countdowns use the server's clock (`now` in every state
  message), not the device's.
- **Rooms live in memory only, with no storage.** A room is gone once Cloudflare evicts the
  object after everyone leaves, or on a deploy. Fine for a party game; don't deploy mid-party.
  - In the lobby, a player who disconnects leaves.
  - Mid-game their seat is kept; the page stores a per-room token in `localStorage`, so a refresh
    rejoins the same seat.
  - The same player in a second tab replaces the first connection (close code 4000). A refused
    join closes with code 4004. The client doesn't retry either code.
- **Untrusted input.** Every drawing is cleaned server-side: only palette colours and brush sizes
  are kept, points are clamped to the 1000x1000 grid, and totals are capped at 1,500 strokes and
  30,000 points. Text is capped at 80 characters, names at 20. The Worker only accepts the
  origins in `ALLOWED_ORIGINS` (`server/wrangler.jsonc`).
- **Wire format:** `doodle-telephone/src/protocol.ts`, imported by both sides.
- **Page code:**
  - `views.ts`: the playing and reveal screens, tested in jsdom. Home, lobby and the connection
    come from the shared room kit.
  - `fixtures.ts`: sample states for preview mode.
  - `strokes.ts`: stroke maths and painting, tested with a recording context.
  - `pad.ts` (canvas input) and `main.ts` (glue) are left out of coverage.
  - A half-finished drawing or guess survives re-renders, because `main.ts` owns those elements
    per turn and slots them into each render.
- **Server URL:** set by `VITE_ROOMS_URL`. It defaults to `https://rooms.sbdevworks.com`;
  `.env.development` points it at `http://localhost:8787`.

**Running it locally:** `npm run dev:server` (Wrangler, port 8787) plus `npm run dev`.
`npm run smoke:server` plays a whole 3-player game against the running server, including a
mid-game rejoin, a foreign origin, and an unknown room code. It isn't in CI.

**Deploying the server:** `npm run deploy:server`. This needs `npx wrangler login` once on the
machine, and it isn't in Jenkins yet: automating it needs a Cloudflare API token stored in
Jenkins. The Worker has to be deployed before a page change that depends on a protocol change
goes out.

### Quiz Night (`quiz-night/`), online — page only

Timed multiple-choice trivia for 2 to 12 players. Server slug: `quiz`. The host moves the game on
with `next`. Phases:

- `question`: four choices, each marked with a letter and a shape as well as a colour, locked once
  picked.
- `answer`: the correct choice, how many players picked each, and your points.
- `scores`: the leaderboard, with this round's gains.
- `final`: a podium.

### Imposter (`imposter/`), online — page only

3 to 10 players. Server slug: `imposter`. Everyone but the imposter sees the secret word and its
category; the imposter sees only the category. The imposter's own view must never carry the
word: that's the server's job, and the page only renders `role`. Phases:

- `clues`: one clue each, in turn order. The input is kept per turn, so a half-typed clue
  survives re-renders.
- `vote`: pick anyone but yourself; locked once cast.
- `result`: who it was, the word, and the vote tally.

### Rock Paper Scissors (`rock-paper-scissors/`), online — page only

A best-of-five duel for exactly 2 players. Server slug: `rps`. Phases:

- `choose`: three moves. You see whether the opponent has locked in, never what they picked.
- `reveal`: both hands, and who took the round.
- `over`: the match winner, and a rematch.

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
