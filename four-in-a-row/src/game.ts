export const COLS = 7
export const ROWS = 6
const CONNECT = 4
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export type Player = 1 | 2
export type Cell = 0 | Player

export interface FourState {
  // Row-major, row 0 at the top.
  board: Cell[]
  turn: Player
  winner: Player | null
  winLine: number[]
  draw: boolean
  lastMove: number | null
}

export function createGame(starter: Player = 1): FourState {
  return { board: new Array<Cell>(COLS * ROWS).fill(0), turn: starter, winner: null, winLine: [], draw: false, lastMove: null }
}

export function isOver(state: FourState): boolean {
  return state.winner !== null || state.draw
}

// The row a disc dropped in this column would land on, or -1 if the column is full.
export function landingRow(state: FourState, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) if (state.board[row * COLS + col] === 0) return row
  return -1
}

export function drop(state: FourState, col: number): boolean {
  if (isOver(state) || !Number.isInteger(col) || col < 0 || col >= COLS) return false
  const row = landingRow(state, col)
  if (row < 0) return false

  const index = row * COLS + col
  state.board[index] = state.turn
  state.lastMove = index
  const line = winLineThrough(state.board, row, col)
  if (line.length > 0) {
    state.winner = state.turn
    state.winLine = line
  } else if (state.board.every((cell) => cell !== 0)) {
    state.draw = true
  } else {
    state.turn = state.turn === 1 ? 2 : 1
  }
  return true
}

// Every cell in a run of four or more through (row, col), across all four directions, so a move
// that completes two lines at once highlights both.
export function winLineThrough(board: readonly Cell[], row: number, col: number): number[] {
  const player = board[row * COLS + col]
  if (player === 0) return []
  const cells = new Set<number>()
  for (const [dr, dc] of DIRECTIONS) {
    const run = [row * COLS + col]
    for (const sign of [1, -1]) {
      let r = row + dr * sign
      let c = col + dc * sign
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === player) {
        run.push(r * COLS + c)
        r += dr * sign
        c += dc * sign
      }
    }
    if (run.length >= CONNECT) for (const i of run) cells.add(i)
  }
  return [...cells].sort((a, b) => a - b)
}

export interface Scores {
  1: number
  2: number
  draws: number
}

export function recordResult(scores: Scores, state: FourState): Scores {
  if (state.winner) return { ...scores, [state.winner]: scores[state.winner] + 1 }
  if (state.draw) return { ...scores, draws: scores.draws + 1 }
  return scores
}

// Whoever didn't start last round starts the next, so neither player keeps the first-move edge.
export function nextStarter(previous: Player): Player {
  return previous === 1 ? 2 : 1
}
