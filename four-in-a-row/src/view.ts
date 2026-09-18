import { COLS, type FourState, isOver, landingRow, type Player, ROWS, type Scores } from './game'

export const PLAYER_NAMES: Record<Player, string> = { 1: 'Red', 2: 'Yellow' }

export function statusText(state: FourState): string {
  if (state.winner) return `${PLAYER_NAMES[state.winner]} wins!`
  if (state.draw) return 'Board full: it’s a draw.'
  return `${PLAYER_NAMES[state.turn]} to move`
}

// Builds the board as seven column buttons. The discs inside are decoration (aria-hidden); each
// button's label says what a press does, so the game is playable by keyboard and screen reader.
export function renderBoard(board: HTMLElement, state: FourState, onDrop: (col: number) => void): void {
  const focusedCol = Number((document.activeElement as HTMLElement | null)?.dataset?.col ?? -1)
  const columns = Array.from({ length: COLS }, (_, col) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'column'
    button.dataset.col = String(col)
    const free = landingRow(state, col) + 1
    button.disabled = isOver(state) || free === 0
    button.setAttribute('aria-label', free === 0 ? `Column ${col + 1}, full` : `Column ${col + 1}, ${free} free`)
    button.addEventListener('click', () => onDrop(col))

    for (let row = 0; row < ROWS; row++) {
      const index = row * COLS + col
      const cell = document.createElement('span')
      cell.className = 'cell'
      cell.setAttribute('aria-hidden', 'true')
      const owner = state.board[index]
      if (owner) {
        const disc = document.createElement('span')
        disc.className = `disc p${owner}`
        if (index === state.lastMove) {
          disc.classList.add('dropped')
          disc.style.setProperty('--fall', String(row + 1))
        }
        if (state.winLine.includes(index)) disc.classList.add('win')
        cell.append(disc)
      }
      button.append(cell)
    }
    return button
  })
  board.classList.toggle('p2-turn', state.turn === 2)
  board.replaceChildren(...columns)
  if (focusedCol >= 0) nearestOpen(columns, focusedCol)?.focus()
}

// The same column if it can still take a disc, otherwise the closest one that can, so keyboard
// players don't lose their place when a column fills up.
function nearestOpen(columns: HTMLButtonElement[], from: number): HTMLButtonElement | undefined {
  for (let distance = 0; distance < columns.length; distance++) {
    for (const col of [from - distance, from + distance]) {
      if (columns[col] && !columns[col].disabled) return columns[col]
    }
  }
  return undefined
}

export function renderScores(el: HTMLElement, scores: Scores): void {
  el.textContent = `${PLAYER_NAMES[1]} ${scores[1]} · ${PLAYER_NAMES[2]} ${scores[2]} · Draws ${scores.draws}`
}
