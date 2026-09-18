import '../../shared/src/page.css'
import './style.css'
import { createRoom, localTokenStore, RoomConnection } from './connection'
import { DrawingPad } from './pad'
import { BRUSH_SIZES, type Entry, PALETTE, type RoomView, type Stroke } from './protocol'
import { countPoints, paintStrokes } from './strokes'
import { formatSeconds, h, homeView, roomView, type TurnSlots } from './views'

const API = import.meta.env.VITE_ROOMS_URL ?? 'https://rooms.sbdevworks.com'
const NAME_KEY = 'doodle-telephone.name'
const REPLAY_MS = 2500
const COLOR_NAMES = ['black', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown']

const app = document.querySelector<HTMLElement>('#app')!
const statusEl = document.querySelector<HTMLElement>('#status')!
const errorEl = document.querySelector<HTMLElement>('#error')!

let connection: RoomConnection | null = null
let room: RoomView | null = null
let serverOffset = 0
let turnKey = ''
let slots: TurnSlots | null = null
let pad: DrawingPad | null = null
let autoSubmitted = false
const replayed = new Set<string>()

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function rememberName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Not remembered next time; nothing else depends on it.
  }
}

function showError(message: string): void {
  errorEl.textContent = message
  errorEl.hidden = message === ''
}

function showHome(busy = false): void {
  const code = new URLSearchParams(location.search).get('room') ?? ''
  app.replaceChildren(homeView({ name: storedName(), code }, busy, { create, join }))
}

async function create(name: string): Promise<void> {
  if (!name) return showError('Pick a name first.')
  showError('')
  showHome(true)
  try {
    join(name, await createRoom(API))
  } catch (error) {
    showHome()
    showError(error instanceof Error ? error.message : 'Could not create a room.')
  }
}

function join(name: string, code: string): void {
  if (!name) return showError('Pick a name first.')
  if (!/^[A-Z]{4}$/.test(code)) return showError('Room codes are 4 letters.')
  showError('')
  rememberName(name)
  history.replaceState(null, '', `?room=${code}`)
  connection?.close()
  connection = new RoomConnection(API, code, name, localTokenStore(), {
    onState(next, offset) {
      room = next
      serverOffset = offset
      showError('')
      render()
    },
    onError: showError,
    onStatus(status, reason) {
      statusEl.textContent = { connecting: 'Connecting…', connected: '', reconnecting: 'Reconnecting…', closed: '' }[status]
      if (status === 'closed') leave(reason)
    },
  })
  connection.connect()
}

function leave(reason?: string): void {
  connection?.close()
  connection = null
  room = null
  turnKey = ''
  history.replaceState(null, '', location.pathname)
  showHome()
  if (reason) showError(reason)
}

function newSlots(): TurnSlots {
  const canvas = h('canvas', { class: 'pad', 'aria-label': 'Drawing area' })
  const toolbar = h('div', { class: 'toolbar' })
  const padEl = h('div', { class: 'pad-wrap' }, toolbar, canvas)
  pad = new DrawingPad(canvas)
  const activePad = pad

  const swatches = PALETTE.map((color, i) => {
    const swatch = h('button', { type: 'button', class: 'swatch', style: `--swatch: ${color}`, 'aria-label': COLOR_NAMES[i], 'aria-pressed': String(i === 0) })
    swatch.addEventListener('click', () => {
      activePad.color = color
      for (const s of swatches) s.setAttribute('aria-pressed', String(s === swatch))
    })
    return swatch
  })
  const sizes = BRUSH_SIZES.map((size) => {
    const b = h('button', { type: 'button', class: 'size', 'aria-label': `Brush size ${size}`, 'aria-pressed': String(size === activePad.size) }, h('span', { style: `--dot: ${Math.max(4, size / 2)}px` }))
    b.addEventListener('click', () => {
      activePad.size = size
      for (const s of sizes) s.setAttribute('aria-pressed', String(s === b))
    })
    return b
  })
  const undo = h('button', { type: 'button', class: 'tool' }, 'Undo')
  undo.addEventListener('click', () => activePad.undo())
  const clear = h('button', { type: 'button', class: 'tool' }, 'Clear')
  clear.addEventListener('click', () => activePad.clear())
  toolbar.append(h('div', { class: 'swatches' }, ...swatches), h('div', { class: 'sizes' }, ...sizes, undo, clear))

  return { pad: padEl, text: h('input', { type: 'text', class: 'answer-input', autocomplete: 'off' }) }
}

const actions = {
  start: () => connection?.send({ type: 'start' }),
  copyLink: async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      statusEl.textContent = 'Invite link copied.'
    } catch {
      statusEl.textContent = `Share this link: ${location.href}`
    }
  },
  submitText: (text: string) => room && connection?.send({ type: 'submit', step: room.step, text }),
  submitDrawing: () => room && pad && connection?.send({ type: 'submit', step: room.step, strokes: pad.strokes }),
  revealNext: () => connection?.send({ type: 'revealNext' }),
  playAgain: () => connection?.send({ type: 'playAgain' }),
}

function render(): void {
  if (!room) return
  // Chains are keyed by position, so a new round would otherwise skip its replays.
  if (room.phase !== 'reveal') replayed.clear()
  const key = `${room.code}:${room.phase}:${room.step}:${room.task ? 'task' : 'wait'}`
  if (key !== turnKey || !slots) {
    turnKey = key
    slots = newSlots()
    autoSubmitted = false
  }
  const leaveButton = h('button', { type: 'button', class: 'leave' }, 'Leave room')
  leaveButton.addEventListener('click', () => leave())
  app.replaceChildren(roomView(room, slots, actions), leaveButton)
  if (room.task?.kind === 'draw') pad?.resize()
  paintDrawings()
  updateTimer()
}

function strokesFor(key: string): Stroke[] {
  if (!room) return []
  let entry: Entry | null | undefined
  if (key === 'task') {
    entry = room.task?.previous
  } else {
    const [chain, index] = key.split('-').map(Number)
    entry = room.reveal?.chains[chain]?.entries[index]
  }
  return entry?.kind === 'drawing' ? entry.strokes : []
}

function paintDrawings(): void {
  for (const canvas of app.querySelectorAll<HTMLCanvasElement>('canvas[data-drawing]')) {
    const key = canvas.dataset.drawing!
    const strokes = strokesFor(key)
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    if (canvas.dataset.animate !== 'true' || replayed.has(key)) {
      paintStrokes(ctx, strokes, size)
      continue
    }
    replayed.add(key)
    const total = countPoints(strokes)
    const started = performance.now()
    const frame = (now: number) => {
      const shown = Math.ceil(Math.min(1, (now - started) / REPLAY_MS) * total)
      paintStrokes(ctx, strokes, size, shown)
      if (shown < total && canvas.isConnected) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }
}

// Runs every tick: the countdown text, and handing in whatever the player has when time runs
// out (the server waits a few seconds longer before filling in a blank).
function updateTimer(): void {
  const timer = document.querySelector<HTMLElement>('#timer')
  if (!room || room.phase !== 'playing' || room.deadline === null) return
  const left = room.deadline - (Date.now() + serverOffset)
  if (timer) timer.textContent = formatSeconds(left)
  if (left > 0 || autoSubmitted || !room.task) return
  autoSubmitted = true
  if (room.task.kind === 'draw') actions.submitDrawing()
  else actions.submitText(slots?.text.value ?? '')
}

setInterval(updateTimer, 250)
window.addEventListener('resize', () => room?.task?.kind === 'draw' && pad?.resize())

statusEl.textContent = ''
showHome()
