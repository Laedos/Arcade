import {
  BRUSH_SIZES,
  CANVAS_SIZE,
  type Entry,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_TEXT_LENGTH,
  MIN_PLAYERS,
  PALETTE,
  type RoomView,
  type Stroke,
  type Task,
  type TaskKind,
} from '../../../doodle-telephone/src/protocol'

export const TASK_SECONDS: Record<TaskKind, number> = { write: 45, draw: 75, guess: 30 }
// Clients submit whatever they have when their own countdown hits zero; the server waits this
// much longer before filling in blanks, so a slow connection doesn't lose a finished drawing.
export const GRACE_MS = 3000
const MAX_STROKES = 1500
const MAX_POINTS = 30000
const BLANK_TEXT = '…'

export interface Player {
  id: string
  name: string
  token: string
  connected: boolean
}

export interface Room {
  code: string
  players: Player[]
  hostId: string | null
  phase: RoomView['phase']
  // Player ids in seat order, fixed when a game starts. Chain i starts with seat i's prompt.
  seating: string[]
  chains: { ownerId: string; entries: Entry[] }[]
  step: number
  deadline: number | null
  submitted: string[]
  reveal: { chain: number; entry: number; finished: boolean }
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string }

export interface IdSource {
  newId(): string
  newToken(): string
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string): Result<never> => ({ ok: false, error })

export function createRoom(code: string): Room {
  return {
    code,
    players: [],
    hostId: null,
    phase: 'lobby',
    seating: [],
    chains: [],
    step: 0,
    deadline: null,
    submitted: [],
    reveal: { chain: 0, entry: 0, finished: false },
  }
}

export function join(room: Room, name: string, token: string | null, ids: IdSource): Result<Player> {
  const returning = token ? room.players.find((p) => p.token === token) : undefined
  if (returning) {
    returning.connected = true
    ensureHost(room)
    return ok(returning)
  }
  if (room.phase !== 'lobby') return fail('This game has already started.')
  if (room.players.length >= MAX_PLAYERS) return fail('This room is full.')

  const player = { id: ids.newId(), name: uniqueName(room, name), token: ids.newToken(), connected: true }
  room.players.push(player)
  ensureHost(room)
  return ok(player)
}

// In the lobby a player who drops simply leaves. Mid-game their seat is kept so they can
// rejoin, and their turns are filled with blanks when the clock runs out.
export function disconnect(room: Room, playerId: string, now: number): void {
  const player = room.players.find((p) => p.id === playerId)
  if (!player) return
  if (room.phase === 'lobby') {
    room.players = room.players.filter((p) => p.id !== playerId)
  } else {
    player.connected = false
  }
  if (room.hostId === playerId) room.hostId = null
  ensureHost(room)
  if (room.phase === 'playing') advanceIfEveryoneDone(room, now)
}

export function start(room: Room, playerId: string, now: number): Result {
  if (room.hostId !== playerId) return fail('Only the host can start the game.')
  if (room.phase !== 'lobby') return fail('The game has already started.')
  const seated = room.players.filter((p) => p.connected)
  if (seated.length < MIN_PLAYERS) return fail(`You need at least ${MIN_PLAYERS} players.`)

  room.seating = seated.map((p) => p.id)
  room.chains = room.seating.map((ownerId) => ({ ownerId, entries: [] }))
  room.phase = 'playing'
  room.step = 0
  room.submitted = []
  room.deadline = now + TASK_SECONDS.write * 1000
  room.reveal = { chain: 0, entry: 0, finished: false }
  return ok(undefined)
}

export function taskKind(step: number): TaskKind {
  if (step === 0) return 'write'
  return step % 2 === 1 ? 'draw' : 'guess'
}

// Seat i works on chain (i - step) mod N: everyone starts on their own chain and passes it one
// seat along each step, so over N steps every player touches every chain exactly once.
export function chainIndexFor(room: Room, playerId: string): number {
  const seat = room.seating.indexOf(playerId)
  if (seat < 0) return -1
  const n = room.seating.length
  return (((seat - room.step) % n) + n) % n
}

export function taskFor(room: Room, playerId: string): Task | null {
  if (room.phase !== 'playing') return null
  const chain = chainIndexFor(room, playerId)
  if (chain < 0) return null
  return {
    kind: taskKind(room.step),
    step: room.step,
    previous: room.step === 0 ? null : room.chains[chain].entries[room.step - 1],
  }
}

export function submit(room: Room, playerId: string, step: number, content: { text: string } | { strokes: Stroke[] }, now: number): Result {
  if (room.phase !== 'playing') return fail('There is nothing to submit right now.')
  if (step !== room.step) return fail('That turn is already over.')
  const chain = chainIndexFor(room, playerId)
  if (chain < 0) return fail('You are not in this game.')
  if (room.submitted.includes(playerId)) return fail('You already submitted this turn.')

  const kind = taskKind(step)
  let entry: Entry
  if (kind === 'draw') {
    if (!('strokes' in content)) return fail('This turn needs a drawing.')
    entry = { kind: 'drawing', authorId: playerId, strokes: cleanStrokes(content.strokes) }
  } else {
    if (!('text' in content)) return fail('This turn needs text.')
    entry = { kind: kind === 'write' ? 'prompt' : 'guess', authorId: playerId, text: cleanText(content.text) }
  }

  room.chains[chain].entries[step] = entry
  room.submitted.push(playerId)
  advanceIfEveryoneDone(room, now)
  return ok(undefined)
}

// Called on the room's alarm. Returns whether anything changed.
export function tick(room: Room, now: number): boolean {
  if (room.phase !== 'playing' || room.deadline === null || now < room.deadline + GRACE_MS) return false
  fillMissing(room)
  advance(room, now)
  return true
}

export function revealNext(room: Room, playerId: string): Result {
  if (room.hostId !== playerId) return fail('Only the host can move the reveal on.')
  if (room.phase !== 'reveal' || room.reveal.finished) return fail('Nothing left to reveal.')
  const reveal = room.reveal
  const lastEntry = room.seating.length - 1
  if (reveal.entry < lastEntry) {
    reveal.entry += 1
  } else if (reveal.chain < room.chains.length - 1) {
    reveal.chain += 1
    reveal.entry = 0
  } else {
    reveal.finished = true
  }
  return ok(undefined)
}

export function playAgain(room: Room, playerId: string): Result {
  if (room.hostId !== playerId) return fail('Only the host can start a new round.')
  if (room.phase !== 'reveal' || !room.reveal.finished) return fail('Finish the reveal first.')
  room.players = room.players.filter((p) => p.connected)
  room.phase = 'lobby'
  room.seating = []
  room.chains = []
  room.step = 0
  room.deadline = null
  room.submitted = []
  ensureHost(room)
  return ok(undefined)
}

export function viewFor(room: Room, playerId: string): RoomView {
  const inGame = room.phase === 'playing'
  return {
    code: room.code,
    youId: playerId,
    phase: room.phase,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isHost: p.id === room.hostId,
      submitted: inGame && room.submitted.includes(p.id),
    })),
    step: room.step,
    totalSteps: room.seating.length,
    deadline: room.deadline,
    task: room.submitted.includes(playerId) ? null : taskFor(room, playerId),
    reveal: room.phase === 'reveal' ? { ...room.reveal, chains: revealedChains(room) } : null,
  }
}

function revealedChains(room: Room) {
  const { chain, entry } = room.reveal
  return room.chains.slice(0, chain + 1).map((c, i) => ({ ownerId: c.ownerId, entries: i < chain ? c.entries : c.entries.slice(0, entry + 1) }))
}

function advanceIfEveryoneDone(room: Room, now: number): void {
  const waitingOn = room.seating.filter((id) => !room.submitted.includes(id) && room.players.some((p) => p.id === id && p.connected))
  if (waitingOn.length > 0) return
  fillMissing(room)
  advance(room, now)
}

function fillMissing(room: Room): void {
  const kind = taskKind(room.step)
  for (const playerId of room.seating) {
    if (room.submitted.includes(playerId)) continue
    const chain = chainIndexFor(room, playerId)
    room.chains[chain].entries[room.step] =
      kind === 'draw' ? { kind: 'drawing', authorId: playerId, strokes: [] } : { kind: kind === 'write' ? 'prompt' : 'guess', authorId: playerId, text: BLANK_TEXT }
  }
}

function advance(room: Room, now: number): void {
  room.step += 1
  room.submitted = []
  if (room.step >= room.seating.length) {
    room.phase = 'reveal'
    room.deadline = null
    room.reveal = { chain: 0, entry: 0, finished: false }
  } else {
    room.deadline = now + TASK_SECONDS[taskKind(room.step)] * 1000
  }
}

function ensureHost(room: Room): void {
  const current = room.players.find((p) => p.id === room.hostId)
  if (current?.connected) return
  room.hostId = room.players.find((p) => p.connected)?.id ?? null
}

function uniqueName(room: Room, requested: string): string {
  const base = requested.replaceAll(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH) || 'Player'
  const taken = new Set(room.players.map((p) => p.name))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, MAX_NAME_LENGTH - String(n).length - 1)} ${n}`
    if (!taken.has(candidate)) return candidate
  }
}

export function cleanText(text: string): string {
  return String(text).replaceAll(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH) || BLANK_TEXT
}

// Untrusted input from the network: keep only well-formed strokes in the allowed colours and
// sizes, clamp every point onto the canvas, and cap the total so one drawing can't bloat a room.
export function cleanStrokes(strokes: unknown): Stroke[] {
  if (!Array.isArray(strokes)) return []
  const clean: Stroke[] = []
  let budget = MAX_POINTS
  for (const raw of strokes.slice(0, MAX_STROKES)) {
    if (!isStrokeShape(raw) || budget <= 0) continue
    const pairs = Math.min(Math.floor(raw.points.length / 2), budget)
    if (pairs < 1) continue
    const points: number[] = []
    for (let i = 0; i < pairs * 2; i++) points.push(clampCoordinate(raw.points[i]))
    budget -= pairs
    clean.push({ color: raw.color, size: raw.size, points })
  }
  return clean
}

function isStrokeShape(value: unknown): value is Stroke {
  if (typeof value !== 'object' || value === null) return false
  const stroke = value as Partial<Stroke>
  return (
    typeof stroke.color === 'string' &&
    (PALETTE as readonly string[]).includes(stroke.color) &&
    typeof stroke.size === 'number' &&
    (BRUSH_SIZES as readonly number[]).includes(stroke.size) &&
    Array.isArray(stroke.points)
  )
}

function clampCoordinate(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0
  return Math.min(CANVAS_SIZE, Math.max(0, n))
}
