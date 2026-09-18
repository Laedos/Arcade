export const WORLD_WIDTH = 400
export const VIEW_HEIGHT = 700

const LAUNCH_SPEED = 430
const MAX_FLIGHT_SECONDS = 2.2
const SIDE_MARGIN = 30
const TRAIL_LENGTH = 16
const DRIFT_FROM_LEVEL = 8
const MIN_HORIZONTAL_SHIFT = 50

export type Phase = 'ready' | 'orbiting' | 'flying' | 'over'

export interface Vec {
  x: number
  y: number
}

export interface Planet {
  id: number
  baseX: number
  x: number
  y: number
  radius: number
  orbit: number
  driftAmplitude: number
  driftSpeed: number
  driftPhase: number
}

export interface GameState {
  phase: Phase
  planets: Planet[]
  currentId: number
  highestId: number
  angle: number
  spin: 1 | -1
  pos: Vec
  vel: Vec
  trail: Vec[]
  flightTime: number
  score: number
  lastGain: number
  lastGainAt: number
  time: number
  cameraY: number
  nextId: number
  rng: () => number
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makePlanet(id: number, x: number, y: number, orbit: number, drift?: Pick<Planet, 'driftAmplitude' | 'driftSpeed' | 'driftPhase'>): Planet {
  return {
    id,
    baseX: x,
    x,
    y,
    orbit,
    radius: orbit * 0.42,
    driftAmplitude: drift?.driftAmplitude ?? 0,
    driftSpeed: drift?.driftSpeed ?? 0,
    driftPhase: drift?.driftPhase ?? 0,
  }
}

export function createGame(seed: number): GameState {
  const first = makePlanet(0, WORLD_WIDTH / 2, 0, 64)
  const state: GameState = {
    phase: 'ready',
    planets: [first],
    currentId: 0,
    highestId: 0,
    angle: Math.PI,
    spin: 1,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    trail: [],
    flightTime: 0,
    score: 0,
    lastGain: 0,
    lastGainAt: Number.NEGATIVE_INFINITY,
    time: 0,
    cameraY: -VIEW_HEIGHT * 0.62,
    nextId: 1,
    rng: mulberry32(seed),
  }
  placeOnOrbit(state, first)
  spawnAhead(state)
  return state
}

export function angularSpeed(score: number): number {
  return 2.4 + Math.min(score * 0.06, 1.6)
}

export function currentPlanet(state: GameState): Planet | undefined {
  return state.planets.find((p) => p.id === state.currentId)
}

export function release(state: GameState): boolean {
  if (state.phase !== 'ready' && state.phase !== 'orbiting') return false
  const tangent = { x: -Math.sin(state.angle), y: Math.cos(state.angle) }
  state.vel = { x: state.spin * tangent.x * LAUNCH_SPEED, y: state.spin * tangent.y * LAUNCH_SPEED }
  state.phase = 'flying'
  state.flightTime = 0
  state.trail = []
  return true
}

export function step(state: GameState, dt: number): void {
  state.time += dt
  if (state.phase === 'over') return

  for (const planet of state.planets) {
    planet.x = planet.baseX + Math.sin(state.time * planet.driftSpeed + planet.driftPhase) * planet.driftAmplitude
  }

  if (state.phase === 'flying') {
    fly(state, dt)
  } else {
    const planet = currentPlanet(state)
    if (planet) {
      state.angle += state.spin * angularSpeed(state.score) * dt
      placeOnOrbit(state, planet)
    }
  }

  followCamera(state, dt)
  spawnAhead(state)
  prune(state)
}

function fly(state: GameState, dt: number): void {
  state.pos = { x: state.pos.x + state.vel.x * dt, y: state.pos.y + state.vel.y * dt }
  state.flightTime += dt
  state.trail.push({ ...state.pos })
  if (state.trail.length > TRAIL_LENGTH) state.trail.shift()

  const target = captureTarget(state)
  if (target) {
    capture(state, target)
    return
  }

  const offSide = state.pos.x < -SIDE_MARGIN || state.pos.x > WORLD_WIDTH + SIDE_MARGIN
  if (offSide || state.flightTime > MAX_FLIGHT_SECONDS) state.phase = 'over'
}

function captureTarget(state: GameState): Planet | undefined {
  let best: Planet | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const planet of state.planets) {
    if (planet.id === state.currentId) continue
    const distance = Math.hypot(state.pos.x - planet.x, state.pos.y - planet.y)
    if (distance <= planet.orbit && distance < bestDistance) {
      best = planet
      bestDistance = distance
    }
  }
  return best
}

function capture(state: GameState, planet: Planet): void {
  const dx = state.pos.x - planet.x
  const dy = state.pos.y - planet.y
  // Sign of radius x velocity is the sign of the angular velocity, so the player keeps
  // circling the way they arrived instead of snapping into a reversal.
  state.spin = dx * state.vel.y - dy * state.vel.x >= 0 ? 1 : -1
  state.angle = Math.atan2(dy, dx)

  // Only new ground scores: hopping back to a planet already reached is free, and skipping past
  // one to reach a further planet earns a point for each.
  const gain = Math.max(0, planet.id - state.highestId)
  state.highestId = Math.max(state.highestId, planet.id)
  state.score += gain
  if (gain > 0) {
    state.lastGain = gain
    state.lastGainAt = state.time
  }

  state.currentId = planet.id
  state.phase = 'orbiting'
  state.trail = []
  placeOnOrbit(state, planet)
}

function placeOnOrbit(state: GameState, planet: Planet): void {
  state.pos = { x: planet.x + Math.cos(state.angle) * planet.orbit, y: planet.y + Math.sin(state.angle) * planet.orbit }
}

function followCamera(state: GameState, dt: number): void {
  const target = state.pos.y - VIEW_HEIGHT * 0.62
  state.cameraY += (target - state.cameraY) * Math.min(1, dt * 3)
}

function spawnAhead(state: GameState): void {
  let top = state.planets.reduce((highest, p) => (p.y < highest.y ? p : highest), state.planets[0])
  while (top.y > state.cameraY - VIEW_HEIGHT * 0.5) {
    top = nextPlanet(state, top)
    state.planets.push(top)
  }
}

function nextPlanet(state: GameState, previous: Planet): Planet {
  const { rng } = state
  const level = state.nextId
  const gap = 170 + rng() * 60 + Math.min(level * 2.5, 70)
  const orbit = Math.max(36, 66 - level * 1.1) * (0.85 + rng() * 0.3)
  const minX = orbit + 10
  const maxX = WORLD_WIDTH - orbit - 10

  let x = minX + rng() * (maxX - minX)
  for (let tries = 0; tries < 5 && Math.abs(x - previous.baseX) < MIN_HORIZONTAL_SHIFT; tries++) {
    x = minX + rng() * (maxX - minX)
  }

  let drift: Pick<Planet, 'driftAmplitude' | 'driftSpeed' | 'driftPhase'> | undefined
  if (level >= DRIFT_FROM_LEVEL && rng() < Math.min(0.6, (level - DRIFT_FROM_LEVEL + 1) * 0.06)) {
    const amplitude = Math.min(60, x - minX, maxX - x)
    if (amplitude >= 15) {
      drift = { driftAmplitude: amplitude, driftSpeed: 0.8 + rng() * 0.8, driftPhase: rng() * Math.PI * 2 }
    }
  }

  return makePlanet(state.nextId++, x, previous.y - gap, orbit, drift)
}

function prune(state: GameState): void {
  const floor = state.cameraY + VIEW_HEIGHT + 300
  state.planets = state.planets.filter((p) => p.id === state.currentId || p.y <= floor)
}
