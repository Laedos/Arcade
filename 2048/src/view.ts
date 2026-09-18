import type { State2048 } from './game'

// Tiles past 2048 share the top colour.
export function tileClass(value: number): string {
  if (value === 0) return 'tile empty'
  return `tile v${Math.min(value, 4096)}`
}

export function renderBoard(board: HTMLElement, state: State2048): void {
  const tiles = state.cells.map((value, i) => {
    const tile = document.createElement('div')
    tile.className = tileClass(value)
    if (value !== 0) tile.textContent = String(value)
    if (i === state.spawned) tile.classList.add('new')
    if (state.merged.includes(i)) tile.classList.add('merged')
    return tile
  })
  board.replaceChildren(...tiles)
}

export function statusText(state: State2048, justWon: boolean): string {
  if (state.over) return `No moves left. Final score ${state.score}.`
  if (justWon) return 'You made 2048! Keep going for a bigger tile.'
  return ''
}
