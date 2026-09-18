import './style.css'
import { createGame, release, step } from './game'
import { draw, fitViewport } from './render'
import { loadBest, saveBest } from './storage'

const FIXED_DT = 1 / 120
const MAX_FRAME_SECONDS = 0.25
const RESTART_DELAY_MS = 400

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const status = document.querySelector<HTMLElement>('#status')!
const ctx = canvas.getContext('2d')!

let state = createGame(Date.now())
let best = loadBest()
let overSince = 0
let viewport = fitViewport(1, 1)

function resize(): void {
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(canvas.clientWidth * ratio)
  canvas.height = Math.round(canvas.clientHeight * ratio)
  viewport = fitViewport(canvas.width, canvas.height)
}

function act(): void {
  if (state.phase === 'over') {
    if (performance.now() - overSince < RESTART_DELAY_MS) return
    state = createGame(Date.now())
    status.textContent = 'New game.'
    return
  }
  release(state)
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  act()
})
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') return
  event.preventDefault()
  if (!event.repeat) act()
})
window.addEventListener('resize', resize)
resize()

let last = performance.now()
let accumulator = 0

function frame(now: number): void {
  accumulator += Math.min((now - last) / 1000, MAX_FRAME_SECONDS)
  last = now
  const wasOver = state.phase === 'over'
  while (accumulator >= FIXED_DT) {
    step(state, FIXED_DT)
    accumulator -= FIXED_DT
  }
  if (!wasOver && state.phase === 'over') {
    overSince = performance.now()
    best = saveBest(state.score)
    status.textContent = `Lost in space. Score ${state.score}, best ${best}. Press Space to fly again.`
  }
  draw(ctx, state, viewport, Math.max(best, state.score))
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
