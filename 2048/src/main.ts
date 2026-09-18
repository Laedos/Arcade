import '../../shared/src/page.css'
import './style.css'
import { loadBest, saveBest } from '../../shared/src/bestScore'
import { createGame, type Direction, move } from './game'
import { renderBoard, statusText } from './view'

const BEST_KEY = '2048.best'
const SWIPE_MIN_PX = 30
const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

const boardEl = document.querySelector<HTMLElement>('#board')!
const scoreEl = document.querySelector<HTMLElement>('#score')!
const bestEl = document.querySelector<HTMLElement>('#best')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const newGame = document.querySelector<HTMLButtonElement>('#new-game')!

let state = createGame()
let best = loadBest(BEST_KEY)

function render(justWon = false): void {
  renderBoard(boardEl, state)
  scoreEl.textContent = String(state.score)
  bestEl.textContent = String(Math.max(best, state.score))
  statusEl.textContent = statusText(state, justWon)
}

function play(direction: Direction): void {
  const wasWon = state.won
  if (!move(state, direction)) return
  // Saved as it's beaten, not just at the end, so closing the tab mid-game keeps it.
  if (state.score > best) best = saveBest(BEST_KEY, state.score)
  render(state.won && !wasWon)
}

window.addEventListener('keydown', (event) => {
  const direction = KEYS[event.code]
  // Arrows and WASD never activate a button, so they play even while "New game" has focus; only
  // the back link is left alone.
  if (!direction || event.target instanceof HTMLAnchorElement) return
  event.preventDefault()
  play(direction)
})

let swipeStart: { x: number; y: number } | null = null
boardEl.addEventListener('pointerdown', (event) => {
  swipeStart = { x: event.clientX, y: event.clientY }
})
boardEl.addEventListener('pointerup', (event) => {
  if (!swipeStart) return
  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y
  swipeStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return
  if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? 'right' : 'left')
  else play(dy > 0 ? 'down' : 'up')
})

newGame.addEventListener('click', () => {
  state = createGame()
  render()
})

render()
