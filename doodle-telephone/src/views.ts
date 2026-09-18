import { button, h, isHost, nameOf } from '../../shared/src/rooms/dom'
import { playerList } from '../../shared/src/rooms/lobby'
import { type Entry, MAX_TEXT_LENGTH, type PlayerView, type RoomView } from './protocol'

export interface RoomActions {
  submitText(text: string): void
  submitDrawing(): void
  revealNext(): void
  playAgain(): void
}

// Elements that must survive re-renders within one turn (a half-finished drawing, a half-typed
// guess), owned by the caller and slotted in here.
export interface TurnSlots {
  pad: HTMLElement
  text: HTMLInputElement
}

// Every phase after the lobby (the shared room page draws that).
export function roomView(room: RoomView, slots: TurnSlots, actions: RoomActions): HTMLElement {
  return room.phase === 'reveal' ? revealView(room, actions) : playingView(room, slots, actions)
}

function submittedTick(player: PlayerView): HTMLElement {
  return h('span', { class: 'tick', 'aria-label': player.submitted ? 'done' : 'still working' }, player.submitted ? '✓' : '…')
}

const TASK_TITLES = { write: 'Write something for someone to draw', draw: 'Draw this', guess: 'What is this drawing?' }

function playingView(room: RoomView, slots: TurnSlots, actions: RoomActions): HTMLElement {
  const header = h('div', { class: 'turn-bar' }, h('span', {}, `Turn ${room.step + 1} of ${room.totalSteps}`), h('span', { id: 'timer', class: 'timer', role: 'timer' }))
  const task = room.task
  if (!task) {
    return h('section', { class: 'panel' }, header, h('h2', {}, 'Waiting for everyone else…'), playerList(room, (p) => submittedTick(p as PlayerView)))
  }

  let body: Node[]
  if (task.kind === 'draw') {
    const prompt = task.previous && 'text' in task.previous ? task.previous.text : ''
    body = [h('p', { class: 'prompt' }, prompt), slots.pad, button('Done', actions.submitDrawing, 'primary')]
  } else {
    slots.text.setAttribute('maxlength', String(MAX_TEXT_LENGTH))
    slots.text.setAttribute('aria-label', task.kind === 'write' ? 'Your prompt' : 'Your guess')
    slots.text.setAttribute('placeholder', task.kind === 'write' ? 'A cat running a marathon' : 'I think it is…')
    const form = h('form', { class: 'answer' }, slots.text, h('button', { type: 'submit', class: 'primary' }, 'Done'))
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      actions.submitText(slots.text.value)
    })
    body = task.kind === 'guess' ? [drawingSlot('task'), form] : [form]
  }
  return h('section', { class: 'panel' }, header, h('h2', {}, TASK_TITLES[task.kind]), ...body)
}

// A placeholder the caller paints a drawing into (canvas painting needs a real browser).
export function drawingSlot(key: string, animate = false): HTMLCanvasElement {
  return h('canvas', { class: 'drawing', 'data-drawing': key, 'data-animate': animate ? 'true' : undefined, width: '600', height: '600', role: 'img', 'aria-label': 'A drawing' })
}

const VERBS: Record<Entry['kind'], string> = { prompt: 'wrote', drawing: 'drew', guess: 'guessed' }

function entryView(room: RoomView, entry: Entry, key: string, newest: boolean): HTMLElement {
  const author = h('p', { class: 'author' }, `${nameOf(room, entry.authorId)} ${VERBS[entry.kind]}`)
  const content = entry.kind === 'drawing' ? drawingSlot(key, newest) : h('p', { class: 'said' }, entry.text)
  return h('li', { class: `entry entry-${entry.kind}` }, author, content)
}

function revealView(room: RoomView, actions: RoomActions): HTMLElement {
  const reveal = room.reveal!
  const current = reveal.chains[reveal.chain]
  const entries = current.entries.map((entry, i) => entryView(room, entry, `${reveal.chain}-${i}`, i === reveal.entry && !reveal.finished))

  let controls: Node
  if (!isHost(room)) {
    controls = h('p', { class: 'hint' }, reveal.finished ? 'That’s all of them! Waiting for the host…' : 'The host is revealing…')
  } else if (reveal.finished) {
    controls = button('Play again', actions.playAgain, 'primary')
  } else {
    controls = button('Next', actions.revealNext, 'primary')
  }

  return h(
    'section',
    { class: 'panel reveal' },
    h('p', { class: 'hint' }, `Chain ${reveal.chain + 1} of ${room.totalSteps}`),
    h('h2', {}, `${nameOf(room, current.ownerId)}’s chain`),
    h('ol', { class: 'chain' }, ...entries),
    controls,
  )
}

