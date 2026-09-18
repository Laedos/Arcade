import '../../shared/src/page.css'
import '../../shared/src/canvas-page.css'
import { loadBest, saveBest } from '../../shared/src/bestScore'
import { createStacker, drop, step } from './game'
import { cameraY, draw, fitViewport } from './render'

const MAX_FRAME_SECONDS = 0.1
const RESTART_DELAY_MS = 400
const BEST_KEY = 'stacker.best'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const status = document.querySelector<HTMLElement>('#status')!
const ctx = canvas.getContext('2d')!

let state = createStacker()
let best = loadBest(BEST_KEY)
let overSince = 0
let camera = cameraY(state)
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
    state = createStacker()
    status.textContent = 'New tower.'
    return
  }
  if (drop(state) === 'miss') {
    overSince = performance.now()
    best = saveBest(BEST_KEY, state.score)
    status.textContent = `Toppled at height ${state.score}, best ${best}. Press Space to build again.`
  }
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  act()
})
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') return
  if (event.target instanceof HTMLAnchorElement) return
  event.preventDefault()
  if (!event.repeat) act()
})
window.addEventListener('resize', resize)
resize()

let last = performance.now()

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS)
  last = now
  step(state, dt)
  camera += (cameraY(state) - camera) * Math.min(1, dt * 6)
  draw(ctx, state, viewport, camera, Math.max(best, state.score))
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
