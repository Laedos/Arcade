import { describe, expect, it } from 'vitest'
import { createLevel, isSolved, press, pressCell, scrambleSize, SIZE } from './game'

const off = () => Array<boolean>(SIZE * SIZE).fill(false)
const lit = (board: boolean[]) => board.flatMap((on, i) => (on ? [i] : []))

// One of the 5x5 board's "quiet" patterns: pressing all of these cells changes nothing.
const QUIET_PATTERN = [0, 2, 4, 5, 7, 9, 15, 17, 19, 20, 22, 24]

// An rng that makes createLevel's partial Fisher-Yates shuffle pick exactly these cells, one
// scramble attempt per list, by replaying the shuffle to find where each wanted cell sits.
function pickCells(attempts: number[][]): () => number {
  const draws: number[] = []
  for (const wanted of attempts) {
    const cells = Array.from({ length: SIZE * SIZE }, (_, i) => i)
    wanted.forEach((cell, i) => {
      const at = cells.indexOf(cell)
      draws.push((at - i + 0.5) / (cells.length - i))
      ;[cells[i], cells[at]] = [cells[at], cells[i]]
    })
  }
  let next = 0
  return () => draws[next++]
}

describe('press', () => {
  it('flips the cell and its four neighbours', () => {
    expect(lit(press(off(), 12))).toEqual([7, 11, 12, 13, 17])
  })

  it('stays on the board at corners and edges', () => {
    expect(lit(press(off(), 0))).toEqual([0, 1, 5])
    expect(lit(press(off(), 24))).toEqual([19, 23, 24])
    expect(lit(press(off(), 4))).toEqual([3, 4, 9])
    expect(lit(press(off(), 10))).toEqual([5, 10, 11, 15])
  })

  it('undoes itself when pressed twice, without touching the input', () => {
    const board = off()
    const once = press(board, 6)
    expect(board).toEqual(off())
    expect(press(once, 6)).toEqual(off())
  })
})

describe('createLevel', () => {
  it('scrambles more cells each level, up to a cap', () => {
    expect(scrambleSize(1)).toBe(3)
    expect(scrambleSize(5)).toBe(7)
    expect(scrambleSize(100)).toBe(15)
  })

  it('starts unsolved with par equal to the scramble size', () => {
    for (let level = 1; level <= 20; level++) {
      const state = createLevel(level)
      expect(isSolved(state.board)).toBe(false)
      expect(state.par).toBe(scrambleSize(level))
      expect(state.moves).toBe(0)
      expect(state.solved).toBe(false)
    }
  })

  it('is solvable by pressing the scrambled cells again', () => {
    // rng 0 always picks the next unused cell, so the scramble is cells 0, 1, 2.
    const state = createLevel(1, () => 0)
    for (const cell of [0, 1, 2]) pressCell(state, cell)
    expect(state.solved).toBe(true)
    expect(state.moves).toBe(3)
  })

  it('rerolls a scramble that cancels out to a dark board', () => {
    expect(QUIET_PATTERN).toHaveLength(scrambleSize(10))
    expect(isSolved(QUIET_PATTERN.reduce(press, off()))).toBe(true)

    const second = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const state = createLevel(10, pickCells([QUIET_PATTERN, second]))
    expect(state.board).toEqual(second.reduce(press, off()))
  })
})

describe('pressCell', () => {
  it('counts moves and notices a solved board', () => {
    const state = createLevel(1, () => 0)
    pressCell(state, 0)
    expect(state.moves).toBe(1)
    expect(state.solved).toBe(false)
  })

  it('ignores presses once solved or off the board', () => {
    const state = createLevel(1, () => 0)
    pressCell(state, -1)
    pressCell(state, SIZE * SIZE)
    expect(state.moves).toBe(0)
    for (const cell of [0, 1, 2]) pressCell(state, cell)
    const board = [...state.board]
    pressCell(state, 7)
    expect(state.moves).toBe(3)
    expect(state.board).toEqual(board)
  })
})
