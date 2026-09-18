import '../../shared/src/page.css'
import '../../shared/src/canvas-page.css'
import { loadBest, saveBest } from '../../shared/src/bestScore'
import { createGame, launch, type PaddleInput, step } from './game'
import { draw, fitViewport, toWorldX } from './render'

const MAX_FRAME_SECONDS = 0.05
const RESTART_DELAY_MS = 500
const BEST_KEY = 'brick-breaker.best'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const status = document.querySelector<HTMLElement>('#status')!
const ctx = canvas.getContext('2d')!

let state = createGame()
let best = loadBest(BEST_KEY)
let overSince = 0
let viewport = fitViewport(1, 1)
const input: PaddleInput = { targetX: null, direction: 0 }
const held = new Set<string>()

function resize(): void {
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(canvas.clientWidth * ratio)
  canvas.height = Math.round(canvas.clientHeight * ratio)
  viewport = fitViewport(canvas.width, canvas.height)
}

function act(): void {
  if (state.phase === 'over') {
    if (performance.now() - overSince < RESTART_DELAY_MS) return
    state = createGame()
    status.textContent = 'New game.'
    return
  }
  launch(state)
}

function pointerX(event: PointerEvent): number {
  return toWorldX(event.clientX, canvas.getBoundingClientRect().left, window.devicePixelRatio || 1, viewport)
}

canvas.addEventListener('pointermove', (event) => {
  input.targetX = pointerX(event)
})
canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  input.targetX = pointerX(event)
  act()
})

// Keys take over from the pointer until it moves again.
function updateDirection(): void {
  const left = held.has('ArrowLeft') || held.has('KeyA')
  const right = held.has('ArrowRight') || held.has('KeyD')
  if (left === right) input.direction = 0
  else input.direction = left ? -1 : 1
  if (input.direction !== 0) input.targetX = null
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLAnchorElement) return
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault()
    if (!event.repeat) act()
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) return
  event.preventDefault()
  held.add(event.code)
  updateDirection()
})
window.addEventListener('keyup', (event) => {
  held.delete(event.code)
  updateDirection()
})
window.addEventListener('resize', resize)
resize()

let last = performance.now()
let lastLevel = state.level

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS)
  last = now
  const wasOver = state.phase === 'over'
  step(state, dt, input)
  if (state.level !== lastLevel) {
    lastLevel = state.level
    status.textContent = `Level ${state.level}.`
  }
  if (!wasOver && state.phase === 'over') {
    overSince = performance.now()
    best = saveBest(BEST_KEY, state.score)
    status.textContent = `Game over. Score ${state.score}, best ${best}. Press Space to play again.`
  }
  draw(ctx, state, viewport, Math.max(best, state.score))
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
