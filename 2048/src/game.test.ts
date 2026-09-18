import { describe, expect, it } from 'vitest'
import { canMove, createGame, move, SIZE, slideLine, type State2048, WIN_TILE } from './game'

// rng 0 always picks the first empty cell and a 2.
const first = () => 0

function withCells(cells: number[]): State2048 {
  return { cells, score: 0, won: false, over: false, spawned: null, merged: [] }
}

describe('createGame', () => {
  it('starts with two tiles', () => {
    const state = createGame(first)
    expect(state.cells.filter((v) => v !== 0)).toEqual([2, 2])
    expect(state.cells.slice(0, 2)).toEqual([2, 2])
    expect(state.score).toBe(0)
  })

  it('spawns a 4 one time in ten', () => {
    const values = [0, 0.95, 0, 0.95]
    let i = 0
    const state = createGame(() => values[i++])
    expect(state.cells.slice(0, 2)).toEqual([4, 4])
  })
})

describe('slideLine', () => {
  it('packs tiles toward the front', () => {
    expect(slideLine([0, 2, 0, 4]).line).toEqual([2, 4, 0, 0])
  })

  it('merges each pair once, front first', () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8, mergedAt: [0, 1] })
    expect(slideLine([2, 2, 2, 0]).line).toEqual([4, 2, 0, 0])
    expect(slideLine([4, 4, 8, 0]).line).toEqual([8, 8, 0, 0])
  })

  it('leaves a full line with no pairs alone', () => {
    expect(slideLine([2, 4, 2, 4])).toEqual({ line: [2, 4, 2, 4], gained: 0, mergedAt: [] })
  })
})

describe('move', () => {
  const grid = [
    2, 0, 2, 0,
    0, 4, 0, 4,
    0, 0, 0, 0,
    8, 0, 0, 8,
  ]

  it('slides every row left and scores the merges', () => {
    const state = withCells([...grid])
    expect(move(state, 'left', first)).toBe(true)
    expect(state.cells.slice(0, 4)).toEqual([4, 2, 0, 0])
    expect(state.cells.slice(4, 8)).toEqual([8, 0, 0, 0])
    expect(state.cells.slice(12, 16)).toEqual([16, 0, 0, 0])
    expect(state.score).toBe(4 + 8 + 16)
    expect(state.merged).toEqual([0, 4, 12])
    expect(state.spawned).toBe(1)
  })

  it('slides right, up and down along the right axis', () => {
    const right = withCells([...grid])
    move(right, 'right', first)
    expect(right.cells[3]).toBe(4)
    expect(right.cells[15]).toBe(16)

    const up = withCells([...grid])
    move(up, 'up', first)
    expect(up.cells[0]).toBe(2)
    expect(up.cells[4]).toBe(8)
    expect(up.cells[1]).toBe(4)

    const down = withCells([...grid])
    move(down, 'down', first)
    expect(down.cells[12]).toBe(8)
    expect(down.cells[8]).toBe(2)
    expect(down.cells[13]).toBe(4)
  })

  it('does nothing, and adds no tile, when nothing can slide that way', () => {
    const state = withCells([2, 4, 0, 0, ...new Array(12).fill(0)])
    expect(move(state, 'left', first)).toBe(false)
    expect(state.cells.filter((v) => v !== 0)).toHaveLength(2)
  })

  it('marks the game won on reaching 2048, once, and lets play continue', () => {
    const state = withCells([1024, 1024, 0, 0, ...new Array(12).fill(0)])
    move(state, 'left', first)
    expect(state.won).toBe(true)
    expect(state.cells[0]).toBe(WIN_TILE)
    expect(state.over).toBe(false)
    expect(move(state, 'right', first)).toBe(true)
  })

  it('ends the game when the board is full with no merges, and ignores further moves', () => {
    const cells = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      2, 4, 2, 0,
    ]
    const state = withCells(cells)
    // Sliding right opens the corner; a 4 lands there and the board is a dead checkerboard.
    const rolls = [0, 0.95]
    expect(move(state, 'right', () => rolls.shift()!)).toBe(true)
    expect(state.cells.slice(12)).toEqual([4, 2, 4, 2])
    expect(state.over).toBe(true)
    expect(move(state, 'left', first)).toBe(false)
  })
})

describe('canMove', () => {
  it('sees an empty cell, a horizontal pair or a vertical pair', () => {
    const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
    expect(canMove(full)).toBe(false)
    expect(canMove(full.map((v, i) => (i === 5 ? 0 : v)))).toBe(true)
    expect(canMove(full.map((v, i) => (i === 1 ? 2 : v)))).toBe(true)
    expect(canMove(full.map((v, i) => (i === 4 ? 2 : v)))).toBe(true)
  })

  it('does not wrap a row end onto the next row', () => {
    const cells = [2, 4, 2, 8, 8, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
    expect(cells.length).toBe(SIZE * SIZE)
    expect(canMove(cells)).toBe(false)
  })
})
