import '../../shared/src/page.css'
import '../../shared/src/canvas-page.css'
import { loadBest, saveBest } from '../../shared/src/bestScore'
import { createSnake, type Dir, isMirrored, turn, update } from './game'
import { draw, fitBoard } from './render'

const MAX_FRAME_SECONDS = 0.1
const RESTART_DELAY_MS = 400
const SWIPE_MIN_PX = 24
const BEST_KEY = 'snake.best'

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const status = document.querySelector<HTMLElement>('#status')!
const ctx = canvas.getContext('2d')!

let state = createSnake()
let best = loadBest(BEST_KEY)
let overSince = 0
let wasMirrored = false
let board = fitBoard(1, 1)

function resize(): void {
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(canvas.clientWidth * ratio)
  canvas.height = Math.round(canvas.clientHeight * ratio)
  board = fitBoard(canvas.width, canvas.height)
}

function restartIfOver(): boolean {
  if (state.phase !== 'over') return false
  if (performance.now() - overSince >= RESTART_DELAY_MS) {
    state = createSnake()
    status.textContent = 'New game.'
  }
  return true
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLAnchorElement) return
  const dir = KEYS[event.code]
  if (dir) {
    event.preventDefault()
    if (state.phase !== 'over') turn(state, dir)
  } else if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault()
    restartIfOver()
  }
})

function swipeDirection(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

let swipeStart: { x: number; y: number } | null = null
canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  if (restartIfOver()) return
  swipeStart = { x: event.clientX, y: event.clientY }
})
canvas.addEventListener('pointermove', (event) => {
  if (!swipeStart) return
  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return
  turn(state, swipeDirection(dx, dy))
  // Chain swipes without lifting the finger: measure the next one from here.
  swipeStart = { x: event.clientX, y: event.clientY }
})
canvas.addEventListener('pointerup', () => {
  swipeStart = null
})
canvas.addEventListener('pointercancel', () => {
  swipeStart = null
})
window.addEventListener('resize', resize)
resize()

let last = performance.now()

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS)
  last = now
  const wasOver = state.phase === 'over'
  update(state, dt)

  const mirrored = isMirrored(state)
  if (mirrored !== wasMirrored) status.textContent = mirrored ? 'Controls mirrored.' : 'Controls back to normal.'
  wasMirrored = mirrored

  if (!wasOver && state.phase === 'over') {
    overSince = performance.now()
    best = saveBest(BEST_KEY, state.score)
    status.textContent = `Game over. Score ${state.score}, best ${best}. Press Space to play again.`
  }
  draw(ctx, state, board, canvas.width, canvas.height, Math.max(best, state.score))
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
