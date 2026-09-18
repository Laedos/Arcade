export const WORLD_WIDTH = 400
export const VIEW_HEIGHT = 700
export const BLOCK_HEIGHT = 26
export const BASE_WIDTH = 200

const PERFECT_TOLERANCE = 5
const GROW_EVERY = 3
const GROW_BY = 12
const START_SPEED = 170
const SPEED_STEP = 6
const MAX_SPEED = 520
const GRAVITY = 1400
const DEBRIS_FLOOR = 2000

export type Phase = 'ready' | 'playing' | 'over'
export type DropResult = 'perfect' | 'cut' | 'miss' | 'ignored'

export interface Block {
  x: number
  width: number
}

export interface MovingBlock extends Block {
  dir: 1 | -1
}

// A sliced-off piece falling away. `y` is in world units (up is negative), like the stack.
export interface Debris extends Block {
  level: number
  y: number
  vy: number
}

export interface StackerState {
  phase: Phase
  stack: Block[]
  moving: MovingBlock
  speed: number
  score: number
  combo: number
  lastDrop: DropResult | null
  lastDropAt: number
  debris: Debris[]
  time: number
}

export function levelY(level: number): number {
  return -level * BLOCK_HEIGHT
}

export function createStacker(): StackerState {
  const base = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, width: BASE_WIDTH }
  return {
    phase: 'ready',
    stack: [base],
    moving: spawn(base, 1),
    speed: START_SPEED,
    score: 0,
    combo: 0,
    lastDrop: null,
    lastDropAt: Number.NEGATIVE_INFINITY,
    debris: [],
    time: 0,
  }
}

function spawn(top: Block, level: number): MovingBlock {
  // Alternate the side each new block enters from, so the rhythm changes every drop.
  const fromLeft = level % 2 === 1
  return { x: fromLeft ? 0 : WORLD_WIDTH - top.width, width: top.width, dir: fromLeft ? 1 : -1 }
}

export function step(state: StackerState, dt: number): void {
  state.time += dt

  for (const piece of state.debris) {
    piece.vy += GRAVITY * dt
    piece.y += piece.vy * dt
  }
  state.debris = state.debris.filter((piece) => piece.y < DEBRIS_FLOOR)

  if (state.phase === 'over') return

  const moving = state.moving
  moving.x += moving.dir * state.speed * dt
  if (moving.x <= 0) {
    moving.x = 0
    moving.dir = 1
  } else if (moving.x + moving.width >= WORLD_WIDTH) {
    moving.x = WORLD_WIDTH - moving.width
    moving.dir = -1
  }
}

export function drop(state: StackerState): DropResult {
  if (state.phase === 'over') return 'ignored'

  const top = state.stack.at(-1)!
  const moving = state.moving
  const level = state.stack.length
  let placed: Block
  let result: DropResult

  if (Math.abs(moving.x - top.x) <= PERFECT_TOLERANCE) {
    state.combo += 1
    placed = { x: top.x, width: top.width }
    if (state.combo % GROW_EVERY === 0) placed = grow(placed)
    result = 'perfect'
  } else {
    const left = Math.max(moving.x, top.x)
    const right = Math.min(moving.x + moving.width, top.x + top.width)
    if (right - left <= 0) {
      fall(state, { x: moving.x, width: moving.width }, level)
      state.phase = 'over'
      return record(state, 'miss')
    }
    const overhang = moving.x < top.x ? { x: moving.x, width: left - moving.x } : { x: right, width: moving.x + moving.width - right }
    fall(state, overhang, level)
    state.combo = 0
    placed = { x: left, width: right - left }
    result = 'cut'
  }

  state.stack.push(placed)
  state.score = state.stack.length - 1
  state.speed = Math.min(MAX_SPEED, state.speed + SPEED_STEP)
  state.moving = spawn(placed, state.stack.length)
  state.phase = 'playing'
  return record(state, result)
}

// A streak of perfect drops earns width back, centred on the block, never past the base width
// and never off the edge of the world.
function grow(block: Block): Block {
  const width = Math.min(BASE_WIDTH, block.width + GROW_BY)
  const x = Math.min(Math.max(block.x - (width - block.width) / 2, 0), WORLD_WIDTH - width)
  return { x, width }
}

function fall(state: StackerState, piece: Block, level: number): void {
  state.debris.push({ ...piece, level, y: levelY(level), vy: 0 })
}

function record(state: StackerState, result: DropResult): DropResult {
  state.lastDrop = result
  state.lastDropAt = state.time
  return result
}
