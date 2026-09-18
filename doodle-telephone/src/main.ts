import '../../shared/src/page.css'
import '../../shared/src/rooms/rooms.css'
import './style.css'
import { h } from '../../shared/src/rooms/dom'
import { lobbyView } from '../../shared/src/rooms/lobby'
import { type RoomContext, startRoomPage } from '../../shared/src/rooms/page'
import { withSampleTimer } from '../../shared/src/rooms/preview'
import { sampleDraw, sampleGuess, sampleLobby, sampleReveal, sampleWaiting, sampleWrite } from './fixtures'
import { DrawingPad } from './pad'
import { BRUSH_SIZES, type ClientMessage, type Entry, MAX_PLAYERS, MIN_PLAYERS, PALETTE, type RoomView, type Stroke } from './protocol'
import { countPoints, paintStrokes } from './strokes'
import { type RoomActions, roomView, type TurnSlots } from './views'

const REPLAY_MS = 2500
const COLOR_NAMES = ['black', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown']
const LIMITS = { min: MIN_PLAYERS, max: MAX_PLAYERS }

let turnKey = ''
let slots: TurnSlots | null = null
let pad: DrawingPad | null = null
let autoSubmitted = false
const replayed = new Set<string>()

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

function actionsFor(room: RoomView, ctx: RoomContext<ClientMessage>): RoomActions {
  return {
    submitText: (text) => ctx.send({ type: 'submit', step: room.step, text }),
    submitDrawing: () => pad && ctx.send({ type: 'submit', step: room.step, strokes: pad.strokes }),
    revealNext: () => ctx.send({ type: 'revealNext' }),
    playAgain: () => ctx.send({ type: 'playAgain' }),
  }
}

// Keeps a half-finished drawing or guess across re-renders within one turn.
function slotsFor(room: RoomView): TurnSlots {
  const key = `${room.code}:${room.phase}:${room.step}:${room.task ? 'task' : 'wait'}`
  if (key !== turnKey || !slots) {
    turnKey = key
    slots = newSlots()
    autoSubmitted = false
  }
  return slots
}

function strokesFor(room: RoomView, key: string): Stroke[] {
  let entry: Entry | null | undefined
  if (key === 'task') {
    entry = room.task?.previous
  } else {
    const [chain, index] = key.split('-').map(Number)
    entry = room.reveal?.chains[chain]?.entries[index]
  }
  return entry?.kind === 'drawing' ? entry.strokes : []
}

// The newest drawing in the reveal replays stroke by stroke, once; everything else paints at once.
function paintDrawings(root: HTMLElement, room: RoomView, animate: boolean): void {
  for (const canvas of root.querySelectorAll<HTMLCanvasElement>('canvas[data-drawing]')) {
    const key = canvas.dataset.drawing!
    const strokes = strokesFor(room, key)
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    if (!animate || canvas.dataset.animate !== 'true' || replayed.has(key)) {
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

const noActions: RoomActions = { submitText: () => {}, submitDrawing: () => {}, revealNext: () => {}, playAgain: () => {} }

function previewScreen(room: RoomView): HTMLElement {
  turnKey = ''
  const screen = withSampleTimer(roomView(room, slotsFor(room), noActions))
  paintDrawings(screen, room, false)
  requestAnimationFrame(() => pad?.resize())
  return screen
}

startRoomPage<RoomView, ClientMessage>({
  game: 'doodle',
  playerRange: '2 to 12 players',
  limits: LIMITS,
  render(room, ctx) {
    // Chains are keyed by position, so a new round would otherwise skip its replays.
    if (room.phase !== 'reveal') replayed.clear()
    return roomView(room, slotsFor(room), actionsFor(room, ctx))
  },
  afterRender(room) {
    if (room.task?.kind === 'draw') pad?.resize()
    paintDrawings(document.querySelector<HTMLElement>('#app')!, room, true)
  },
  // Hands in whatever the player has when time runs out; the server waits a few seconds longer
  // before filling in a blank.
  tick(room, ctx) {
    if (room.phase !== 'playing' || room.deadline === null || !room.task || autoSubmitted) return
    if (room.deadline - ctx.serverNow() > 0) return
    autoSubmitted = true
    const actions = actionsFor(room, ctx)
    if (room.task.kind === 'draw') actions.submitDrawing()
    else actions.submitText(slots?.text.value ?? '')
  },
  preview: () => [
    { label: 'Lobby', render: () => lobbyView(sampleLobby, LIMITS, { start: () => {}, copyLink: () => {} }) },
    { label: 'Write', render: () => previewScreen(sampleWrite) },
    { label: 'Draw', render: () => previewScreen(sampleDraw) },
    { label: 'Waiting', render: () => previewScreen(sampleWaiting) },
    { label: 'Guess', render: () => previewScreen(sampleGuess) },
    { label: 'Reveal', render: () => previewScreen(sampleReveal) },
  ],
})

window.addEventListener('resize', () => pad?.resize())
