import { describe, expect, it } from 'vitest'
import { COLS, createGame, drop, type FourState, isOver, landingRow, nextStarter, recordResult, ROWS, winLineThrough } from './game'

const at = (row: number, col: number) => row * COLS + col

function play(state: FourState, cols: number[]) {
  for (const col of cols) expect(drop(state, col)).toBe(true)
}

describe('createGame', () => {
  it('starts empty with the chosen player to move', () => {
    const state = createGame(2)
    expect(state.board).toHaveLength(COLS * ROWS)
    expect(state.board.every((c) => c === 0)).toBe(true)
    expect(state.turn).toBe(2)
    expect(isOver(state)).toBe(false)
    expect(createGame().turn).toBe(1)
  })
})

describe('drop', () => {
  it('stacks discs from the bottom and alternates turns', () => {
    const state = createGame()
    play(state, [3, 3])
    expect(state.board[at(ROWS - 1, 3)]).toBe(1)
    expect(state.board[at(ROWS - 2, 3)]).toBe(2)
    expect(state.turn).toBe(1)
    expect(state.lastMove).toBe(at(ROWS - 2, 3))
    expect(landingRow(state, 3)).toBe(ROWS - 3)
  })

  it('refuses a full column, a column off the board, and a non-integer column', () => {
    const state = createGame()
    play(state, [0, 0, 0, 0, 0, 0])
    expect(landingRow(state, 0)).toBe(-1)
    expect(drop(state, 0)).toBe(false)
    expect(drop(state, -1)).toBe(false)
    expect(drop(state, COLS)).toBe(false)
    expect(drop(state, 1.5)).toBe(false)
    expect(state.turn).toBe(1)
  })

  it('wins on a horizontal line', () => {
    const state = createGame()
    play(state, [0, 0, 1, 1, 2, 2, 3])
    expect(state.winner).toBe(1)
    expect(state.winLine).toEqual([at(5, 0), at(5, 1), at(5, 2), at(5, 3)])
    expect(state.turn).toBe(1)
  })

  it('wins on a vertical line', () => {
    const state = createGame()
    play(state, [6, 0, 6, 0, 6, 0, 6])
    expect(state.winner).toBe(1)
    expect(state.winLine).toEqual([at(2, 6), at(3, 6), at(4, 6), at(5, 6)])
  })

  it('wins on both diagonals', () => {
    const rising = createGame()
    play(rising, [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])
    expect(rising.winner).toBe(1)
    expect(rising.winLine).toEqual([at(2, 3), at(3, 2), at(4, 1), at(5, 0)])

    const falling = createGame()
    play(falling, [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3])
    expect(falling.winner).toBe(1)
    expect(falling.winLine).toEqual([at(2, 3), at(3, 4), at(4, 5), at(5, 6)])
  })

  it('highlights every cell when one disc completes two lines', () => {
    const board = createGame().board
    for (const i of [at(5, 0), at(5, 1), at(5, 2), at(5, 3), at(4, 3), at(3, 3), at(2, 3)]) board[i] = 1
    expect(winLineThrough(board, 5, 3)).toEqual([at(2, 3), at(3, 3), at(4, 3), at(5, 0), at(5, 1), at(5, 2), at(5, 3)])
  })

  it('declares a draw on a full board with no line', () => {
    const state = createGame()
    // Columns filled in pairs so colours alternate in 2-high bands; no four ever line up.
    const order = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 2, 3, 2, 3, 3, 2, 3, 2, 2, 3, 2, 3, 4, 5, 4, 5, 5, 4, 5, 4, 4, 5, 4, 5, 6, 6, 6, 6, 6, 6]
    play(state, order)
    expect(state.winner).toBeNull()
    expect(state.draw).toBe(true)
    expect(isOver(state)).toBe(true)
  })

  it('stops accepting moves once someone has won', () => {
    const state = createGame()
    play(state, [0, 0, 1, 1, 2, 2, 3])
    expect(drop(state, 4)).toBe(false)
  })
})

describe('winLineThrough', () => {
  it('finds nothing on an empty cell or a short run', () => {
    const state = createGame()
    play(state, [0, 6, 1, 6, 2])
    expect(winLineThrough(state.board, 0, 0)).toEqual([])
    expect(winLineThrough(state.board, 5, 1)).toEqual([])
  })
})

describe('scores', () => {
  const zero = { 1: 0, 2: 0, draws: 0 }

  it('counts a win for the winner and a draw as a draw', () => {
    const won = createGame()
    play(won, [0, 0, 1, 1, 2, 2, 3])
    expect(recordResult(zero, won)).toEqual({ 1: 1, 2: 0, draws: 0 })

    const drawn = createGame()
    drawn.draw = true
    expect(recordResult(zero, drawn)).toEqual({ 1: 0, 2: 0, draws: 1 })
  })

  it('leaves the tally alone while a round is still going', () => {
    expect(recordResult(zero, createGame())).toBe(zero)
  })

  it('alternates who starts', () => {
    expect(nextStarter(1)).toBe(2)
    expect(nextStarter(2)).toBe(1)
  })
})
