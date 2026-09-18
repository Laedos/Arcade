import '../../shared/src/page.css'
import './style.css'
import { loadBest, saveBest } from '../../shared/src/bestScore'
import { createLevel, type LightsOutState, pressCell, SIZE } from './game'

const BEST_KEY = 'lights-out.best'

const boardEl = document.querySelector<HTMLElement>('#board')!
const levelEl = document.querySelector<HTMLElement>('#level')!
const movesEl = document.querySelector<HTMLElement>('#moves')!
const bestEl = document.querySelector<HTMLElement>('#best')!
const resultEl = document.querySelector<HTMLElement>('#result')!
const nextButton = document.querySelector<HTMLButtonElement>('#next')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!

let best = loadBest(BEST_KEY)
// Pick up where the player left off: the level after the best one solved.
let state: LightsOutState = createLevel(best + 1)
let levelStart = [...state.board]

const lights = Array.from({ length: SIZE * SIZE }, (_, index) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'light'
  button.setAttribute('aria-label', `Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}`)
  button.addEventListener('click', () => {
    pressCell(state, index)
    if (state.solved) best = saveBest(BEST_KEY, state.level)
    render()
    if (state.solved) nextButton.focus()
  })
  boardEl.appendChild(button)
  return button
})

function startLevel(level: number): void {
  state = createLevel(level)
  levelStart = [...state.board]
  render()
}

function render(): void {
  state.board.forEach((lit, i) => {
    lights[i].setAttribute('aria-pressed', String(lit))
    lights[i].disabled = state.solved
  })
  levelEl.textContent = `Level ${state.level}`
  movesEl.textContent = `Moves ${state.moves} / par ${state.par}`
  bestEl.textContent = `Best level ${best}`
  nextButton.hidden = !state.solved
  resultEl.textContent = state.solved ? verdict(state) : ''
}

function verdict({ moves, par }: LightsOutState): string {
  if (moves < par) return `Solved in ${moves}, under par!`
  if (moves === par) return `Solved in ${moves}, right on par.`
  return `Solved in ${moves}. Par was ${par}.`
}

nextButton.addEventListener('click', () => {
  startLevel(state.level + 1)
  lights[0].focus()
})
restartButton.addEventListener('click', () => {
  state = { ...state, board: [...levelStart], moves: 0, solved: false }
  render()
})
resetButton.addEventListener('click', () => startLevel(1))

render()
