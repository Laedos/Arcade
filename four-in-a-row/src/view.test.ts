// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { COLS, createGame, drop } from './game'
import { renderBoard, renderScores, statusText } from './view'

function mount() {
  const board = document.createElement('div')
  document.body.replaceChildren(board)
  return board
}

const columns = (board: HTMLElement) => [...board.querySelectorAll<HTMLButtonElement>('button.column')]

describe('statusText', () => {
  it('names whose turn it is, the winner, or a draw', () => {
    const state = createGame()
    expect(statusText(state)).toBe('Red to move')
    drop(state, 0)
    expect(statusText(state)).toBe('Yellow to move')
    state.winner = 2
    expect(statusText(state)).toBe('Yellow wins!')
    state.winner = null
    state.draw = true
    expect(statusText(state)).toBe('Board full: it’s a draw.')
  })
})

describe('renderBoard', () => {
  it('renders one labelled button per column and drops on click', () => {
    const board = mount()
    const onDrop = vi.fn()
    renderBoard(board, createGame(), onDrop)
    const buttons = columns(board)
    expect(buttons).toHaveLength(COLS)
    expect(buttons[2].getAttribute('aria-label')).toBe('Column 3, 6 free')
    buttons[2].click()
    expect(onDrop).toHaveBeenCalledWith(2)
  })

  it('shows discs, animates the last one, and disables a full column', () => {
    const board = mount()
    const state = createGame()
    for (let i = 0; i < 6; i++) drop(state, 0)
    renderBoard(board, state, vi.fn())
    const first = columns(board)[0]
    expect(first.disabled).toBe(true)
    expect(first.getAttribute('aria-label')).toBe('Column 1, full')
    expect(first.querySelectorAll('.disc.p1')).toHaveLength(3)
    expect(first.querySelectorAll('.disc.p2')).toHaveLength(3)
    const dropped = first.querySelector<HTMLElement>('.dropped')!
    expect(dropped.style.getPropertyValue('--fall')).toBe('1')
    expect(board.classList.contains('p2-turn')).toBe(false)
  })

  it('marks the winning discs and disables every column once the round is over', () => {
    const board = mount()
    const state = createGame()
    for (const col of [0, 0, 1, 1, 2, 2, 3]) drop(state, col)
    renderBoard(board, state, vi.fn())
    expect(board.querySelectorAll('.win')).toHaveLength(4)
    expect(columns(board).every((b) => b.disabled)).toBe(true)
  })

  it('keeps keyboard focus on the same column after re-rendering', () => {
    const board = mount()
    const state = createGame()
    renderBoard(board, state, vi.fn())
    columns(board)[4].focus()
    drop(state, 4)
    renderBoard(board, state, vi.fn())
    expect((document.activeElement as HTMLElement).dataset.col).toBe('4')
    expect(board.classList.contains('p2-turn')).toBe(true)
  })
})

describe('renderScores', () => {
  it('shows both players and draws', () => {
    const el = document.createElement('p')
    renderScores(el, { 1: 2, 2: 1, draws: 3 })
    expect(el.textContent).toBe('Red 2 · Yellow 1 · Draws 3')
  })
})
