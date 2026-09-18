// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { State2048 } from './game'
import { renderBoard, statusText, tileClass } from './view'

function state(extra: Partial<State2048> = {}): State2048 {
  return { cells: [2, 0, 4, 2048, 8192, ...new Array(11).fill(0)], score: 10, won: false, over: false, spawned: null, merged: [], ...extra }
}

describe('tileClass', () => {
  it('styles by value and caps the colour at 4096', () => {
    expect(tileClass(0)).toBe('tile empty')
    expect(tileClass(8)).toBe('tile v8')
    expect(tileClass(8192)).toBe('tile v4096')
  })
})

describe('renderBoard', () => {
  it('draws sixteen tiles with their numbers, marking new and merged ones', () => {
    const board = document.createElement('div')
    renderBoard(board, state({ spawned: 1, merged: [2] }))
    const tiles = [...board.children] as HTMLElement[]
    expect(tiles).toHaveLength(16)
    expect(tiles[0].textContent).toBe('2')
    expect(tiles[1].className).toBe('tile empty new')
    expect(tiles[1].textContent).toBe('')
    expect(tiles[2].classList.contains('merged')).toBe(true)
    expect(tiles[4].textContent).toBe('8192')
  })
})

describe('statusText', () => {
  it('announces the end, the first 2048, or nothing', () => {
    expect(statusText(state({ over: true }), false)).toBe('No moves left. Final score 10.')
    expect(statusText(state(), true)).toBe('You made 2048! Keep going for a bigger tile.')
    expect(statusText(state(), false)).toBe('')
  })
})
