import { button, type Child, h, isHost } from './dom'
import { type BaseRoomView, MAX_NAME_LENGTH, type PlayerView } from './protocol'

export interface HomeOptions {
  name: string
  code: string
  busy: boolean
  online: boolean
  playerRange: string
}

export interface HomeActions {
  create(name: string): void
  join(name: string, code: string): void
  preview(): void
}

// The first screen of every online game: pick a name, then create a room or join one by code.
// While the room server isn't live, it says so and offers the screen preview instead.
export function homeView(options: HomeOptions, actions: HomeActions): HTMLElement {
  if (!options.online) {
    return h(
      'section',
      { class: 'panel home' },
      h('p', { class: 'badge' }, 'Preview'),
      h('p', {}, `Online rooms aren't live yet. This game is for ${options.playerRange}; you can already click through every screen in the preview.`),
      button('Open the preview', actions.preview, 'primary'),
    )
  }

  const name = h('input', { id: 'name', name: 'name', maxlength: String(MAX_NAME_LENGTH), autocomplete: 'nickname', required: '' })
  name.value = options.name
  const code = h('input', { id: 'code', name: 'code', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'ABCD' })
  code.value = options.code

  const createButton = button('Create a room', () => actions.create(name.value.trim()), 'primary')
  const joinButton = button('Join', () => actions.join(name.value.trim(), code.value.trim().toUpperCase()))
  for (const b of [createButton, joinButton]) b.disabled = options.busy

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

export function playerList(room: BaseRoomView, extra: (player: PlayerView) => Child = () => null): HTMLElement {
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
        extra(p),
      ),
    ),
  )
}

export interface LobbyActions {
  start(): void
  copyLink(): void
}

export function lobbyView(room: BaseRoomView, limits: { min: number; max: number }, actions: LobbyActions): HTMLElement {
  const connected = room.players.filter((p) => p.connected).length
  const enough = connected >= limits.min
  let footer: Node
  if (!isHost(room)) {
    footer = h('p', { class: 'hint' }, 'Waiting for the host to start…')
  } else {
    const startButton = button('Start game', actions.start, 'primary')
    startButton.disabled = !enough
    footer = h('div', { class: 'stack' }, startButton, !enough && h('p', { class: 'hint' }, `Need at least ${limits.min} players.`))
  }
  return h(
    'section',
    { class: 'panel lobby' },
    h('p', { class: 'hint' }, 'Room code'),
    h('p', { class: 'room-code' }, room.code),
    button('Copy invite link', actions.copyLink),
    h('h2', {}, `Players (${room.players.length}/${limits.max})`),
    playerList(room),
    footer,
  )
}
