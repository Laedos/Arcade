import { type Entry, MAX_NAME_LENGTH, MAX_TEXT_LENGTH, MIN_PLAYERS, type RoomView } from './protocol'

type Child = Node | string | null | false | undefined

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, string>> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) if (value !== undefined) el.setAttribute(key, value)
  for (const child of children) if (child) el.append(child)
  return el
}

function button(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const el = h('button', { type: 'button', class: className }, label)
  el.addEventListener('click', onClick)
  return el
}

export interface HomeActions {
  create(name: string): void
  join(name: string, code: string): void
}

export function homeView(defaults: { name: string; code: string }, busy: boolean, actions: HomeActions): HTMLElement {
  const name = h('input', { id: 'name', name: 'name', maxlength: String(MAX_NAME_LENGTH), autocomplete: 'nickname', required: '' })
  name.value = defaults.name
  const code = h('input', { id: 'code', name: 'code', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'ABCD' })
  code.value = defaults.code

  const createButton = button('Create a room', () => actions.create(name.value.trim()), 'primary')
  const joinButton = button('Join', () => actions.join(name.value.trim(), code.value.trim().toUpperCase()))
  for (const b of [createButton, joinButton]) b.disabled = busy

  return h(
    'section',
    { class: 'panel home' },
    h('label', { for: 'name' }, 'Your name'),
    name,
    createButton,
    h('p', { class: 'or' }, 'or join a friend'),
    h('div', { class: 'join-row' }, h('label', { for: 'code', class: 'sr-only' }, 'Room code'), code, joinButton),
  )
}

export interface RoomActions {
  start(): void
  copyLink(): void
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

export function roomView(room: RoomView, slots: TurnSlots, actions: RoomActions): HTMLElement {
  switch (room.phase) {
    case 'lobby':
      return lobbyView(room, actions)
    case 'playing':
      return playingView(room, slots, actions)
    case 'reveal':
      return revealView(room, actions)
  }
}

function nameOf(room: RoomView, id: string): string {
  return room.players.find((p) => p.id === id)?.name ?? 'Someone'
}

function isHost(room: RoomView): boolean {
  return room.players.some((p) => p.id === room.youId && p.isHost)
}

function playerList(room: RoomView, showSubmitted: boolean): HTMLElement {
  return h(
    'ul',
    { class: 'players' },
    ...room.players.map((p) =>
      h(
        'li',
        { class: p.connected ? '' : 'away' },
        p.name,
        p.id === room.youId && h('span', { class: 'tag' }, 'you'),
        p.isHost && h('span', { class: 'tag' }, 'host'),
        !p.connected && h('span', { class: 'tag' }, 'away'),
        showSubmitted && h('span', { class: 'tick', 'aria-label': p.submitted ? 'done' : 'still working' }, p.submitted ? '✓' : '…'),
      ),
    ),
  )
}

function lobbyView(room: RoomView, actions: RoomActions): HTMLElement {
  const connected = room.players.filter((p) => p.connected).length
  const enough = connected >= MIN_PLAYERS
  let footer: Node
  if (!isHost(room)) {
    footer = h('p', { class: 'hint' }, 'Waiting for the host to start…')
  } else {
    const startButton = button('Start game', actions.start, 'primary')
    startButton.disabled = !enough
    footer = h('div', {}, startButton, !enough && h('p', { class: 'hint' }, `Need at least ${MIN_PLAYERS} players.`))
  }
  return h(
    'section',
    { class: 'panel lobby' },
    h('p', { class: 'hint' }, 'Room code'),
    h('p', { class: 'room-code' }, room.code),
    button('Copy invite link', actions.copyLink),
    h('h2', {}, `Players (${room.players.length})`),
    playerList(room, false),
    footer,
  )
}

const TASK_TITLES = { write: 'Write something for someone to draw', draw: 'Draw this', guess: 'What is this drawing?' }

function playingView(room: RoomView, slots: TurnSlots, actions: RoomActions): HTMLElement {
  const header = h('div', { class: 'turn-bar' }, h('span', {}, `Turn ${room.step + 1} of ${room.totalSteps}`), h('span', { id: 'timer', class: 'timer', role: 'timer' }))
  const task = room.task
  if (!task) {
    return h('section', { class: 'panel' }, header, h('h2', {}, 'Waiting for everyone else…'), playerList(room, true))
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
  return h('li', { class: `entry ${entry.kind}` }, author, content)
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

export function formatSeconds(msLeft: number): string {
  const seconds = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
