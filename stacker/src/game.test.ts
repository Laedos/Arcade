import { describe, expect, it } from 'vitest'
import { BASE_WIDTH, createStacker, drop, levelY, type StackerState, step, WORLD_WIDTH } from './game'

function placeMovingAt(state: StackerState, x: number) {
  state.moving.x = x
}

function topBlock(state: StackerState) {
  return state.stack[state.stack.length - 1]
}

describe('createStacker', () => {
  it('starts ready with a centred base and a block entering from the left', () => {
    const state = createStacker()
    expect(state.phase).toBe('ready')
    expect(state.stack).toEqual([{ x: (WORLD_WIDTH - BASE_WIDTH) / 2, width: BASE_WIDTH }])
    expect(state.moving).toEqual({ x: 0, width: BASE_WIDTH, dir: 1 })
  })
})

describe('step', () => {
  it('slides the block and bounces it off both edges', () => {
    const state = createStacker()
    step(state, 0.5)
    expect(state.moving.x).toBeCloseTo(85)

    state.moving.x = WORLD_WIDTH - state.moving.width - 1
    step(state, 0.1)
    expect(state.moving.x).toBe(WORLD_WIDTH - state.moving.width)
    expect(state.moving.dir).toBe(-1)

    state.moving.x = 1
    step(state, 0.1)
    expect(state.moving.x).toBe(0)
    expect(state.moving.dir).toBe(1)
  })

  it('stops the block once the game is over, but lets debris finish falling', () => {
    const state = createStacker()
    placeMovingAt(state, 350)
    drop(state)
    const x = state.moving.x
    const y = state.debris[0].y
    step(state, 0.2)
    expect(state.moving.x).toBe(x)
    expect(state.debris[0].y).toBeGreaterThan(y)
  })

  it('drops debris once it has fallen far enough', () => {
    const state = createStacker()
    placeMovingAt(state, 350)
    drop(state)
    for (let i = 0; i < 300; i++) step(state, 1 / 60)
    expect(state.debris).toEqual([])
  })
})

describe('drop', () => {
  it('snaps a near-perfect drop onto the block below and counts the combo', () => {
    const state = createStacker()
    placeMovingAt(state, topBlock(state).x + 4)
    expect(drop(state)).toBe('perfect')
    expect(topBlock(state)).toEqual(state.stack[0])
    expect(state.combo).toBe(1)
    expect(state.score).toBe(1)
    expect(state.phase).toBe('playing')
    expect(state.debris).toEqual([])
  })

  it('cuts off an overhang on the right and lets it fall', () => {
    const state = createStacker()
    placeMovingAt(state, 140)
    expect(drop(state)).toBe('cut')
    expect(topBlock(state)).toEqual({ x: 140, width: 160 })
    expect(state.debris).toEqual([{ x: 300, width: 40, level: 1, y: levelY(1), vy: 0 }])
    expect(state.combo).toBe(0)
  })

  it('cuts off an overhang on the left', () => {
    const state = createStacker()
    placeMovingAt(state, 60)
    drop(state)
    expect(topBlock(state)).toEqual({ x: 100, width: 160 })
    expect(state.debris[0]).toMatchObject({ x: 60, width: 40 })
  })

  it('ends the game when the block misses entirely', () => {
    const state = createStacker()
    placeMovingAt(state, 300)
    expect(drop(state)).toBe('miss')
    expect(state.phase).toBe('over')
    expect(state.stack).toHaveLength(1)
    expect(state.debris[0]).toMatchObject({ x: 300, width: BASE_WIDTH })
    expect(drop(state)).toBe('ignored')
  })

  it('breaks the combo on a cut', () => {
    const state = createStacker()
    placeMovingAt(state, topBlock(state).x)
    drop(state)
    placeMovingAt(state, topBlock(state).x + 30)
    drop(state)
    expect(state.combo).toBe(0)
  })

  it('grows the block back every third perfect drop, capped at the base width', () => {
    const state = createStacker()
    placeMovingAt(state, 140)
    drop(state)
    for (let i = 0; i < 3; i++) {
      placeMovingAt(state, topBlock(state).x)
      drop(state)
    }
    expect(topBlock(state).width).toBe(172)

    for (let i = 0; i < 30; i++) {
      placeMovingAt(state, topBlock(state).x)
      drop(state)
    }
    expect(topBlock(state).width).toBe(BASE_WIDTH)
  })

  it('keeps a grown block inside the world', () => {
    const state = createStacker()
    state.stack = [{ x: WORLD_WIDTH - 50, width: 50 }]
    state.combo = 2
    placeMovingAt(state, WORLD_WIDTH - 50)
    drop(state)
    expect(topBlock(state)).toEqual({ x: WORLD_WIDTH - 62, width: 62 })
  })

  it('speeds up with every block, up to a cap, and alternates the entry side', () => {
    const state = createStacker()
    const startSpeed = state.speed
    placeMovingAt(state, topBlock(state).x)
    drop(state)
    expect(state.speed).toBeGreaterThan(startSpeed)
    expect(state.moving.dir).toBe(-1)
    expect(state.moving.x).toBe(WORLD_WIDTH - state.moving.width)

    for (let i = 0; i < 200; i++) {
      placeMovingAt(state, topBlock(state).x)
      drop(state)
    }
    const capped = state.speed
    placeMovingAt(state, topBlock(state).x)
    drop(state)
    expect(state.speed).toBe(capped)
  })
})
