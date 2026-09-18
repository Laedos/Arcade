import { describe, expect, it } from 'vitest'
import {
  BALL_RADIUS,
  type BreakerState,
  buildBricks,
  createGame,
  launch,
  PADDLE_WIDTH,
  PADDLE_Y,
  type PaddleInput,
  rowsForLevel,
  START_LIVES,
  step,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './game'

const still: PaddleInput = { targetX: null, direction: 0 }
const DT = 1 / 120

// A game with no bricks in the way, the ball placed and moving as given.
function flying(ball: { x: number; y: number; vx: number; vy: number }): BreakerState {
  const state = createGame()
  state.bricks = [{ x: -100, y: -100, width: 1, height: 1, row: 0, points: 0, alive: true }]
  state.phase = 'playing'
  state.ball = { ...ball }
  return state
}

describe('bricks', () => {
  it('adds a row per level up to eight, with top rows worth more, inside the walls', () => {
    expect(rowsForLevel(1)).toBe(5)
    expect(rowsForLevel(10)).toBe(8)
    const bricks = buildBricks(1)
    expect(bricks).toHaveLength(40)
    expect(bricks[0].points).toBe(50)
    expect(bricks.at(-1)!.points).toBe(10)
    for (const b of bricks) {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(WORLD_WIDTH + 1e-9)
    }
  })
})

describe('before launch', () => {
  it('holds the ball on the paddle as it moves', () => {
    const state = createGame()
    step(state, DT, { targetX: 100, direction: 0 })
    expect(state.paddleX).toBe(100)
    expect(state.ball).toEqual({ x: 100, y: PADDLE_Y - BALL_RADIUS, vx: 0, vy: 0 })
  })

  it('launches up and to the right, once', () => {
    const state = createGame()
    expect(launch(state)).toBe(true)
    expect(state.ball.vy).toBeLessThan(0)
    expect(state.ball.vx).toBeGreaterThan(0)
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeCloseTo(state.speed)
    expect(launch(state)).toBe(false)
  })
})

describe('paddle', () => {
  it('moves with keys and stops at the walls', () => {
    const state = createGame()
    step(state, 0.1, { targetX: null, direction: 1 })
    expect(state.paddleX).toBeCloseTo(WORLD_WIDTH / 2 + 52)
    step(state, 10, { targetX: null, direction: 1 })
    expect(state.paddleX).toBe(WORLD_WIDTH - PADDLE_WIDTH / 2)
    step(state, 10, { targetX: -50, direction: 0 })
    expect(state.paddleX).toBe(PADDLE_WIDTH / 2)
  })
})

describe('ball', () => {
  it('bounces off the side walls and the ceiling', () => {
    const left = flying({ x: 8, y: 300, vx: -300, vy: 0 })
    step(left, 0.02, still)
    expect(left.ball.vx).toBeGreaterThan(0)

    const right = flying({ x: WORLD_WIDTH - 8, y: 300, vx: 300, vy: 0 })
    step(right, 0.02, still)
    expect(right.ball.vx).toBeLessThan(0)

    const top = flying({ x: 200, y: 8, vx: 0, vy: -300 })
    step(top, 0.02, still)
    expect(top.ball.vy).toBeGreaterThan(0)
  })

  it('leaves the paddle steeper the further from centre it lands', () => {
    const centre = flying({ x: 200, y: PADDLE_Y - 10, vx: 0, vy: 300 })
    step(centre, 0.02, still)
    expect(centre.ball.vy).toBeLessThan(0)
    expect(centre.ball.vx).toBeCloseTo(0)

    const edge = flying({ x: 200 + PADDLE_WIDTH / 2, y: PADDLE_Y - 10, vx: 0, vy: 300 })
    step(edge, 0.02, still)
    expect(edge.ball.vx).toBeGreaterThan(Math.abs(edge.ball.vy))
  })

  it('ignores the paddle when moving up through it or missing it sideways', () => {
    const rising = flying({ x: 200, y: PADDLE_Y + 4, vx: 0, vy: -300 })
    step(rising, DT, still)
    expect(rising.ball.vy).toBeLessThan(0)

    const wide = flying({ x: 20, y: PADDLE_Y - 10, vx: 0, vy: 300 })
    step(wide, 0.02, still)
    expect(wide.ball.vy).toBeGreaterThan(0)
  })

  it('breaks a brick, scores it, bounces, and speeds up a little', () => {
    const state = flying({ x: 100, y: 130, vx: 0, vy: -330 })
    state.bricks = [
      { x: 80, y: 100, width: 40, height: 16, row: 0, points: 50, alive: true },
      { x: 300, y: 100, width: 40, height: 16, row: 0, points: 50, alive: true },
    ]
    const speed = state.speed
    step(state, 0.05, still)
    expect(state.bricks[0].alive).toBe(false)
    expect(state.score).toBe(50)
    expect(state.ball.vy).toBeGreaterThan(0)
    expect(state.speed).toBeGreaterThan(speed)
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeCloseTo(state.speed)
  })

  it('bounces sideways off the side of a brick', () => {
    const state = flying({ x: 70, y: 108, vx: 330, vy: 0 })
    state.bricks = [
      { x: 80, y: 100, width: 40, height: 16, row: 0, points: 10, alive: true },
      { x: 300, y: 100, width: 40, height: 16, row: 0, points: 10, alive: true },
    ]
    step(state, 0.02, still)
    expect(state.ball.vx).toBeLessThan(0)
  })

  it('costs a life when it falls past the paddle, and ends the game on the last one', () => {
    const state = flying({ x: 20, y: WORLD_HEIGHT, vx: 0, vy: 400 })
    step(state, 0.1, still)
    expect(state.lives).toBe(START_LIVES - 1)
    expect(state.phase).toBe('ready')
    expect(state.ball.vy).toBe(0)

    state.lives = 1
    state.phase = 'playing'
    state.ball = { x: 20, y: WORLD_HEIGHT, vx: 0, vy: 400 }
    step(state, 0.1, still)
    expect(state.phase).toBe('over')
    const frozen = { ...state.ball }
    step(state, 0.1, { targetX: 50, direction: 0 })
    expect(state.ball).toEqual(frozen)
  })

  it('moves to the next level, with more rows and a faster ball, when the last brick breaks', () => {
    const state = flying({ x: 100, y: 130, vx: 0, vy: -330 })
    state.bricks = [{ x: 80, y: 100, width: 40, height: 16, row: 0, points: 10, alive: true }]
    step(state, 0.05, still)
    expect(state.level).toBe(2)
    expect(state.phase).toBe('ready')
    expect(state.bricks).toHaveLength(rowsForLevel(2) * 8)
    expect(state.speed).toBeGreaterThan(createGame().speed)
  })

  it('does not tunnel through a brick at top speed in one big frame', () => {
    const state = flying({ x: 100, y: 200, vx: 0, vy: -620 })
    state.bricks = [
      { x: 80, y: 100, width: 40, height: 16, row: 0, points: 10, alive: true },
      { x: 300, y: 100, width: 40, height: 16, row: 0, points: 10, alive: true },
    ]
    step(state, 0.2, still)
    expect(state.bricks[0].alive).toBe(false)
  })
})
