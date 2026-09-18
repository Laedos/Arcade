export const GRID = 16

const START_TICK_SECONDS = 0.14
const MIN_TICK_SECONDS = 0.07
const TICK_SPEEDUP = 0.003
const MIRROR_EVERY = 4
const MIRROR_SECONDS = 6
const MAX_QUEUED_TURNS = 2

export type Dir = 'up' | 'down' | 'left' | 'right'
export type Phase = 'ready' | 'playing' | 'over'

export interface Cell {
  x: number
  y: number
}

export interface SnakeState {
  phase: Phase
  // Head first.
  snake: Cell[]
  dir: Dir
  queue: Dir[]
  food: Cell | null
  score: number
  mirroredUntil: number
  time: number
  sinceTick: number
  rng: () => number
}

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const DELTA: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }

export function createSnake(rng: () => number = Math.random): SnakeState {
  const mid = Math.floor(GRID / 2)
  const state: SnakeState = {
    phase: 'ready',
    snake: [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ],
    dir: 'right',
    queue: [],
    food: null,
    score: 0,
    mirroredUntil: 0,
    time: 0,
    sinceTick: 0,
    rng,
  }
  state.food = randomEmptyCell(state)
  return state
}

export function isMirrored(state: SnakeState): boolean {
  return state.time < state.mirroredUntil
}

export function tickSeconds(score: number): number {
  return Math.max(MIN_TICK_SECONDS, START_TICK_SECONDS - score * TICK_SPEEDUP)
}

// Turns are queued so two quick presses between ticks (e.g. up then left to U-turn) both
// count, and each is checked against the direction before it rather than the current one.
export function turn(state: SnakeState, input: Dir): void {
  if (state.phase === 'over') return
  const wanted = isMirrored(state) ? OPPOSITE[input] : input
  const previous = state.queue[state.queue.length - 1] ?? state.dir
  if (state.phase === 'ready') state.phase = 'playing'
  if (wanted === previous || wanted === OPPOSITE[previous] || state.queue.length >= MAX_QUEUED_TURNS) return
  state.queue.push(wanted)
}

export function update(state: SnakeState, dt: number): void {
  if (state.phase !== 'playing') return
  state.time += dt
  state.sinceTick += dt
  while (state.phase === 'playing' && state.sinceTick >= tickSeconds(state.score)) {
    state.sinceTick -= tickSeconds(state.score)
    tick(state)
  }
}

export function tick(state: SnakeState): void {
  state.dir = state.queue.shift() ?? state.dir
  const head = state.snake[0]
  const next = { x: head.x + DELTA[state.dir].x, y: head.y + DELTA[state.dir].y }
  const eating = state.food !== null && next.x === state.food.x && next.y === state.food.y

  // The tail moves out of the way this tick unless the snake is growing, so it's safe to
  // move into the cell it's leaving.
  const body = eating ? state.snake : state.snake.slice(0, -1)
  const offGrid = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID
  if (offGrid || body.some((cell) => cell.x === next.x && cell.y === next.y)) {
    state.phase = 'over'
    return
  }

  state.snake = [next, ...body]
  if (!eating) return

  state.score += 1
  if (state.score % MIRROR_EVERY === 0) state.mirroredUntil = state.time + MIRROR_SECONDS
  state.food = randomEmptyCell(state)
  if (state.food === null) state.phase = 'over'
}

function randomEmptyCell(state: SnakeState): Cell | null {
  const taken = new Set(state.snake.map((cell) => cell.y * GRID + cell.x))
  const free: number[] = []
  for (let i = 0; i < GRID * GRID; i++) if (!taken.has(i)) free.push(i)
  if (free.length === 0) return null
  const index = free[Math.floor(state.rng() * free.length)]
  return { x: index % GRID, y: Math.floor(index / GRID) }
}
