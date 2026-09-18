export const SIZE = 5

const MIN_SCRAMBLE = 3
const MAX_SCRAMBLE = 15

export interface LightsOutState {
  level: number
  // Row-major, SIZE x SIZE; true = lit.
  board: boolean[]
  moves: number
  // How many presses built the puzzle. Pressing those same cells again solves it, so this is
  // always achievable, though a cleverer route can sometimes beat it.
  par: number
  solved: boolean
}

export function press(board: readonly boolean[], index: number): boolean[] {
  const next = [...board]
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const flip = (r: number, c: number) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) next[r * SIZE + c] = !next[r * SIZE + c]
  }
  flip(row, col)
  flip(row - 1, col)
  flip(row + 1, col)
  flip(row, col - 1)
  flip(row, col + 1)
  return next
}

export function isSolved(board: readonly boolean[]): boolean {
  return board.every((lit) => !lit)
}

export function scrambleSize(level: number): number {
  return Math.min(MAX_SCRAMBLE, MIN_SCRAMBLE + level - 1)
}

// Built backwards from the solved board, so every puzzle is solvable. Distinct cells only:
// pressing a cell twice cancels out and would quietly make the puzzle easier than its par.
export function createLevel(level: number, rng: () => number = Math.random): LightsOutState {
  const count = scrambleSize(level)
  let board: boolean[]
  do {
    const cells = Array.from({ length: SIZE * SIZE }, (_, i) => i)
    board = Array<boolean>(SIZE * SIZE).fill(false)
    for (let i = 0; i < count; i++) {
      const pick = i + Math.floor(rng() * (cells.length - i))
      ;[cells[i], cells[pick]] = [cells[pick], cells[i]]
      board = press(board, cells[i])
    }
  } while (isSolved(board))
  return { level, board, moves: 0, par: count, solved: false }
}

export function pressCell(state: LightsOutState, index: number): void {
  if (state.solved || index < 0 || index >= SIZE * SIZE) return
  state.board = press(state.board, index)
  state.moves += 1
  state.solved = isSolved(state.board)
}
