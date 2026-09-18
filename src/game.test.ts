import { describe, expect, it } from 'vitest'
import { angularSpeed, createGame, type GameState, makePlanet, mulberry32, type Planet, release, step, VIEW_HEIGHT, WORLD_WIDTH } from './game'

const DT = 1 / 120

function runUntil(state: GameState, done: (s: GameState) => boolean, maxSeconds = 5) {
  for (let t = 0; t < maxSeconds && !done(state); t += DT) step(state, DT)
}

// A hand-placed layout instead of a generated one. The sentinel sits far above, off the flight
// paths, so the generator never spawns random planets into a test.
function layout(...planets: Planet[]): GameState {
  const state = createGame(1)
  state.planets = [...planets, makePlanet(9999, 20, -1_000_000, 10)]
  state.currentId = planets[0].id
  state.highestId = planets[0].id
  state.phase = 'orbiting'
  state.cameraY = planets[0].y - VIEW_HEIGHT * 0.62
  return state
}

// At angle 0 (right of the planet) with spin -1 the tangent points up the screen (-y).
function launchUpward(state: GameState) {
  state.angle = 0
  state.spin = -1
  step(state, 0)
  release(state)
}

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('createGame', () => {
  it('starts ready on the first planet, with planets generated ahead inside the world', () => {
    const state = createGame(7)
    expect(state.phase).toBe('ready')
    expect(state.score).toBe(0)
    expect(Math.min(...state.planets.map((p) => p.y))).toBeLessThanOrEqual(state.cameraY - VIEW_HEIGHT * 0.5)
    for (const planet of state.planets) {
      expect(planet.x - planet.orbit).toBeGreaterThanOrEqual(0)
      expect(planet.x + planet.orbit).toBeLessThanOrEqual(WORLD_WIDTH)
    }
  })

  it('generates the same world for the same seed', () => {
    expect(createGame(99).planets).toEqual(createGame(99).planets)
  })
})

describe('orbiting', () => {
  it('circles the current planet at its orbit radius', () => {
    const state = createGame(3)
    const planet = state.planets[0]
    const startAngle = state.angle
    step(state, 0.5)
    expect(state.angle).toBeCloseTo(startAngle + angularSpeed(0) * 0.5)
    expect(Math.hypot(state.pos.x - planet.x, state.pos.y - planet.y)).toBeCloseTo(planet.orbit)
  })

  it('speeds up with score, up to a cap', () => {
    expect(angularSpeed(10)).toBeGreaterThan(angularSpeed(0))
    expect(angularSpeed(1000)).toBe(angularSpeed(500))
  })
})

describe('release', () => {
  it('launches along the tangent, perpendicular to the radius', () => {
    const state = createGame(5)
    step(state, 0.3)
    const planet = state.planets[0]
    expect(release(state)).toBe(true)
    expect(state.phase).toBe('flying')
    const radius = { x: state.pos.x - planet.x, y: state.pos.y - planet.y }
    expect(radius.x * state.vel.x + radius.y * state.vel.y).toBeCloseTo(0, 6)
  })

  it('does nothing while already flying or after the game is over', () => {
    const state = createGame(5)
    release(state)
    const velocity = { ...state.vel }
    expect(release(state)).toBe(false)
    expect(state.vel).toEqual(velocity)
    state.phase = 'over'
    expect(release(state)).toBe(false)
  })
})

describe('flight', () => {
  it('captures the next planet, scores one, and keeps circling the way it arrived', () => {
    const state = layout(makePlanet(0, 200, 0, 60), makePlanet(1, 300, -250, 60))
    launchUpward(state)
    runUntil(state, (s) => s.phase !== 'flying')

    expect(state.phase).toBe('orbiting')
    expect(state.currentId).toBe(1)
    expect(state.score).toBe(1)
    // Arriving on the planet's left side moving up is clockwise on screen, which with the
    // canvas's y-down axis is an increasing angle.
    expect(state.spin).toBe(1)
    expect(state.trail).toEqual([])
  })

  it('awards a point per planet skipped', () => {
    const state = layout(makePlanet(0, 200, 0, 60), makePlanet(1, 40, -200, 40), makePlanet(2, 260, -420, 60))
    launchUpward(state)
    runUntil(state, (s) => s.phase !== 'flying')

    expect(state.currentId).toBe(2)
    expect(state.score).toBe(2)
    expect(state.lastGain).toBe(2)
  })

  it('does not score for returning to a planet already reached', () => {
    const state = layout(makePlanet(1, 260, 0, 60), makePlanet(0, 300, -250, 60))
    state.highestId = 5
    launchUpward(state)
    runUntil(state, (s) => s.phase !== 'flying')

    expect(state.currentId).toBe(0)
    expect(state.score).toBe(0)
  })

  it('picks the nearest planet when two orbits overlap the player', () => {
    const state = layout(makePlanet(0, 200, 200, 60), makePlanet(2, 300, -150, 60), makePlanet(1, 240, -150, 30))
    state.phase = 'flying'
    state.pos = { x: 260, y: -150 }
    state.vel = { x: 0, y: -1 }
    step(state, DT)

    expect(state.currentId).toBe(1)
  })

  it('is lost when flying off the side of the world', () => {
    const state = layout(makePlanet(0, 200, 0, 60))
    state.angle = -Math.PI / 2
    state.spin = 1
    step(state, 0)
    release(state)
    runUntil(state, (s) => s.phase !== 'flying')

    expect(state.phase).toBe('over')
    expect(state.pos.x).toBeGreaterThan(WORLD_WIDTH)
  })

  it('is lost after drifting too long without reaching anything', () => {
    const state = layout(makePlanet(0, 200, 0, 60))
    launchUpward(state)
    runUntil(state, (s) => s.phase !== 'flying')

    expect(state.phase).toBe('over')
    expect(state.flightTime).toBeGreaterThan(2)
  })

  it('freezes the world once over', () => {
    const state = layout(makePlanet(0, 200, 0, 60))
    state.phase = 'over'
    const pos = { ...state.pos }
    step(state, 1)
    expect(state.pos).toEqual(pos)
  })
})

describe('world generation', () => {
  function jumpAhead(state: GameState, distance: number) {
    state.cameraY -= distance
    state.pos = { x: -1000, y: state.pos.y - distance }
    state.phase = 'flying'
    state.vel = { x: 0, y: 0 }
    step(state, DT)
  }

  it('keeps spawning ahead and prunes planets far behind', () => {
    const state = createGame(11)
    jumpAhead(state, 5000)

    expect(Math.min(...state.planets.map((p) => p.y))).toBeLessThanOrEqual(state.cameraY - VIEW_HEIGHT * 0.5)
    expect(state.planets.every((p) => p.id === state.currentId || p.y <= state.cameraY + VIEW_HEIGHT + 300)).toBe(true)
  })

  it('only drifts planets further up, and keeps drifting orbits inside the world', () => {
    expect(createGame(2024).planets.every((p) => p.driftAmplitude === 0)).toBe(true)

    const state = createGame(2024)
    jumpAhead(state, 20000)
    const drifting = state.planets.filter((p) => p.driftAmplitude > 0)
    expect(drifting.length).toBeGreaterThan(0)
    for (const planet of drifting) {
      expect(planet.id).toBeGreaterThanOrEqual(8)
      expect(planet.baseX - planet.driftAmplitude - planet.orbit).toBeGreaterThanOrEqual(0)
      expect(planet.baseX + planet.driftAmplitude + planet.orbit).toBeLessThanOrEqual(WORLD_WIDTH)
    }
  })

  it('moves drifting planets and carries an orbiting player with them', () => {
    const planet = makePlanet(0, 200, 0, 50, { driftAmplitude: 40, driftSpeed: 1, driftPhase: 0 })
    const state = layout(planet)
    step(state, 1)
    expect(planet.x).toBeCloseTo(200 + Math.sin(state.time) * 40)
    expect(Math.hypot(state.pos.x - planet.x, state.pos.y - planet.y)).toBeCloseTo(50)
  })
})
