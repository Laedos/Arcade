import '../../shared/src/page.css'
import './style.css'
import { COLS, createGame, drop, isOver, nextStarter, type Player, recordResult, type Scores } from './game'
import { renderBoard, renderScores, statusText } from './view'

const boardEl = document.querySelector<HTMLElement>('#board')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const scoresEl = document.querySelector<HTMLElement>('#scores')!
const newRound = document.querySelector<HTMLButtonElement>('#new-round')!

let starter: Player = 1
let state = createGame(starter)
let scores: Scores = { 1: 0, 2: 0, draws: 0 }

function play(col: number): void {
  if (!drop(state, col)) return
  if (isOver(state)) scores = recordResult(scores, state)
  render()
}

function render(): void {
  renderBoard(boardEl, state, play)
  statusEl.textContent = statusText(state)
  renderScores(scoresEl, scores)
  newRound.textContent = isOver(state) ? 'Next round' : 'Restart round'
}

newRound.addEventListener('click', () => {
  starter = nextStarter(starter)
  state = createGame(starter)
  render()
  boardEl.querySelector<HTMLButtonElement>('button.column')?.focus()
})

// Number keys drop straight into a column; arrow keys move between columns.
window.addEventListener('keydown', (event) => {
  const digit = Number(event.key)
  if (Number.isInteger(digit) && digit >= 1 && digit <= COLS) {
    play(digit - 1)
    return
  }
  const focused = (document.activeElement as HTMLElement | null)?.dataset?.col
  if (focused === undefined || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
  event.preventDefault()
  const next = (Number(focused) + (event.key === 'ArrowRight' ? 1 : COLS - 1)) % COLS
  boardEl.querySelector<HTMLButtonElement>(`[data-col="${next}"]`)?.focus()
})

render()
