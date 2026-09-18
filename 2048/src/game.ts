export const SIZE = 4
export const WIN_TILE = 2048

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface State2048 {
  // Row-major; 0 is empty.
  cells: number[]
  score: number
  won: boolean
  over: boolean
  // For animation only: where the last tile appeared, and which cells merged on the last move.
  spawned: number | null
  merged: number[]
}

export function createGame(rng: () => number = Math.random): State2048 {
  const state: State2048 = { cells: new Array<number>(SIZE * SIZE).fill(0), score: 0, won: false, over: false, spawned: null, merged: [] }
  spawn(state, rng)
  spawn(state, rng)
  return state
}

// Slides one line toward index 0, merging equal neighbours once each, so [2, 2, 2, 2] becomes
// [4, 4, 0, 0] and [4, 4, 8] becomes [8, 8, 0], never [16].
export function slideLine(line: readonly number[]): { line: number[]; gained: number; mergedAt: number[] } {
  const tiles = line.filter((v) => v !== 0)
  const out: number[] = []
  const mergedAt: number[] = []
  let gained = 0
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      const value = tiles[i] * 2
      mergedAt.push(out.length)
      out.push(value)
      gained += value
      i++
    } else {
      out.push(tiles[i])
    }
  }
  while (out.length < line.length) out.push(0)
  return { line: out, gained, mergedAt }
}

// The cell indices of each line in the order tiles slide toward, for one direction.
function linesFor(direction: Direction): number[][] {
  const lines: number[][] = []
  for (let a = 0; a < SIZE; a++) {
    const line: number[] = []
    for (let b = 0; b < SIZE; b++) {
      if (direction === 'left') line.push(a * SIZE + b)
      else if (direction === 'right') line.push(a * SIZE + (SIZE - 1 - b))
      else if (direction === 'up') line.push(b * SIZE + a)
      else line.push((SIZE - 1 - b) * SIZE + a)
    }
    lines.push(line)
  }
  return lines
}

export function move(state: State2048, direction: Direction, rng: () => number = Math.random): boolean {
  if (state.over) return false
  const next = [...state.cells]
  const merged: number[] = []
  let gained = 0
  for (const indices of linesFor(direction)) {
    const result = slideLine(indices.map((i) => state.cells[i]))
    indices.forEach((cell, k) => (next[cell] = result.line[k]))
    for (const k of result.mergedAt) merged.push(indices[k])
    gained += result.gained
  }
  if (next.every((v, i) => v === state.cells[i])) return false

  state.cells = next
  state.score += gained
  state.merged = merged
  if (!state.won && next.includes(WIN_TILE)) state.won = true
  spawn(state, rng)
  state.over = !canMove(state.cells)
  return true
}

export function canMove(cells: readonly number[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 0) return true
    const right = (i + 1) % SIZE !== 0 ? cells[i + 1] : undefined
    const below = cells[i + SIZE]
    if (cells[i] === right || cells[i] === below) return true
  }
  return false
}

// A new tile goes in a random empty cell: a 2 nine times in ten, otherwise a 4.
function spawn(state: State2048, rng: () => number): void {
  const empty = state.cells.flatMap((v, i) => (v === 0 ? [i] : []))
  if (empty.length === 0) {
    state.spawned = null
    return
  }
  const at = empty[Math.floor(rng() * empty.length)]
  state.cells[at] = rng() < 0.9 ? 2 : 4
  state.spawned = at
}
