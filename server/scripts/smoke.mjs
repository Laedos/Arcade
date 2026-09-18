// End-to-end check against a running room server: three scripted players create a room, play a
// whole game (prompt, draw, guess), and walk the reveal. Not part of CI; run it by hand:
//   npm run dev:server        (in one terminal)
//   node server/scripts/smoke.mjs [http://127.0.0.1:8787]
const API = process.argv[2] ?? 'http://127.0.0.1:8787'
const ORIGIN = 'http://localhost:5173'
const STROKE = { color: '#1b1b1f', size: 10, points: [100, 100, 900, 900] }

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

class Player {
  constructor(name) {
    this.name = name
    this.states = []
    this.errors = []
  }

  connect(code, token) {
    const params = new URLSearchParams({ name: this.name })
    if (token) params.set('token', token)
    const url = `${API.replace(/^http/, 'ws')}/doodle/rooms/${code}/ws?${params}`
    this.socket = new WebSocket(url, { headers: { Origin: ORIGIN } })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'state') {
        this.token = message.token
        this.states.push(message.room)
      } else {
        this.errors.push(message.message)
      }
    })
    return new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', () => reject(new Error(`${this.name} could not connect`)), { once: true })
    })
  }

  get room() {
    return this.states.at(-1)
  }

  send(message) {
    this.socket.send(JSON.stringify(message))
  }

  async until(check, what) {
    for (let i = 0; i < 100; i++) {
      if (this.room && check(this.room)) return this.room
      await new Promise((r) => setTimeout(r, 50))
    }
    fail(`${this.name} never saw: ${what} (last: ${JSON.stringify(this.room)?.slice(0, 300)})`)
  }
}

const refused = await fetch(`${API}/doodle/rooms`, { method: 'POST', headers: { Origin: 'https://evil.example' } })
if (refused.status !== 403) fail(`foreign origin got ${refused.status}, expected 403`)

const created = await fetch(`${API}/doodle/rooms`, { method: 'POST', headers: { Origin: ORIGIN } })
if (created.status !== 201) fail(`create returned ${created.status}`)
const { code } = await created.json()
console.log(`room ${code}`)

const players = [new Player('Ana'), new Player('Ben'), new Player('Cy')]
for (const p of players) await p.connect(code)
await players[0].until((r) => r.players.length === 3, 'three players in the lobby')
if (!players[0].room.players[0].isHost) fail('first player is not host')

players[1].send({ type: 'start' })
await players[1].until(() => players[1].errors.length > 0, 'non-host start refused')

players[0].send({ type: 'start' })
for (let step = 0; step < 3; step++) {
  for (const p of players) {
    const room = await p.until((r) => r.phase === 'playing' && r.step === step && r.task, `a task at step ${step}`)
    if (room.task.kind === 'draw') p.send({ type: 'submit', step, strokes: [STROKE] })
    else p.send({ type: 'submit', step, text: `${p.name} step ${step}` })
  }
  console.log(`step ${step} done`)
}

// Refresh mid-reveal: Ben reconnects with his token and gets the same seat back.
const benToken = players[1].token
const benId = players[1].room.youId
players[1].socket.close()
const again = new Player('Ben')
await again.connect(code, benToken)
const rejoined = await again.until((r) => r.phase === 'reveal', 'reveal after rejoining')
if (rejoined.youId !== benId) fail('rejoin gave a new seat')

const host = players[0]
await host.until((r) => r.phase === 'reveal', 'the reveal')
while (!host.room.reveal.finished) {
  const before = JSON.stringify(host.room.reveal)
  host.send({ type: 'revealNext' })
  await host.until((r) => JSON.stringify(r.reveal) !== before, 'reveal to move on')
}
const chains = host.room.reveal.chains
if (chains.length !== 3 || chains.some((c) => c.entries.length !== 3)) fail('reveal does not show 3 chains of 3')
if (chains[0].entries[1].kind !== 'drawing' || chains[0].entries[1].strokes.length !== 1) fail('drawing lost on the way')
console.log(`chain 1: ${chains[0].entries.map((e) => e.text ?? `[drawing, ${e.strokes.length} stroke]`).join(' -> ')}`)

host.send({ type: 'playAgain' })
await host.until((r) => r.phase === 'lobby', 'back to the lobby')

const missing = new Player('Dee')
await missing.connect('ZZZZ').catch(() => {})
await new Promise((r) => setTimeout(r, 300))
if (!missing.errors.some((e) => e.includes('does not exist'))) fail(`unknown room not refused: ${missing.errors}`)

for (const p of [...players, again, missing]) p.socket.close()
console.log('PASS')
process.exit(0)
