import { ONLINE, ROOMS_API } from './config'
import { createRoom, localTokenStore, RoomConnection } from './connection'
import { button, formatSeconds, h, replaceKeepingFocus } from './dom'
import { homeView, lobbyView } from './lobby'
import { type PreviewStep, previewBar } from './preview'
import { type BaseRoomView, ROOM_CODE_PATTERN } from './protocol'

export interface RoomContext<C> {
  send(message: C): boolean
  // The server's clock, for counting down to deadlines.
  serverNow(): number
}

export interface RoomPageOptions<V extends BaseRoomView & { deadline?: number | null }, C> {
  // The path segment the room server uses for this game, e.g. 'quiz' for /quiz/rooms.
  game: string
  playerRange: string
  limits: { min: number; max: number }
  preview: () => PreviewStep[]
  // Every phase except the lobby, which this page draws itself.
  render(room: V, ctx: RoomContext<C>): HTMLElement
  afterRender?(room: V, ctx: RoomContext<C>): void
  tick?(room: V, ctx: RoomContext<C>): void
}

const NAME_KEY = 'arcade.name'

function stored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Only a convenience for next time.
  }
}

// Wires an online game page: the home screen, the room connection, the lobby, errors, the
// countdown in any `#timer`, and preview mode. The page needs #app, #status and #error.
export function startRoomPage<V extends BaseRoomView & { deadline?: number | null }, C extends { type: string }>(options: RoomPageOptions<V, C>): void {
  const app = document.querySelector<HTMLElement>('#app')!
  const statusEl = document.querySelector<HTMLElement>('#status')!
  const errorEl = document.querySelector<HTMLElement>('#error')!

  let connection: RoomConnection<V, C | { type: 'start' }> | null = null
  let room: V | null = null
  let serverOffset = 0
  const ctx: RoomContext<C> = { send: (message) => connection?.send(message) ?? false, serverNow: () => Date.now() + serverOffset }

  const showError = (message: string) => {
    errorEl.textContent = message
    errorEl.hidden = message === ''
  }

  const showHome = (busy = false) => {
    const code = new URLSearchParams(location.search).get('room') ?? ''
    app.replaceChildren(homeView({ name: stored(NAME_KEY), code, busy, online: ONLINE, playerRange: options.playerRange }, { create, join, preview: () => preview() }))
  }

  async function create(name: string): Promise<void> {
    if (!name) return showError('Pick a name first.')
    showError('')
    showHome(true)
    try {
      join(name, await createRoom(ROOMS_API, options.game))
    } catch (error) {
      showHome()
      showError(error instanceof Error ? error.message : 'Could not create a room.')
    }
  }

  function join(name: string, code: string): void {
    if (!name) return showError('Pick a name first.')
    if (!ROOM_CODE_PATTERN.test(code)) return showError('Room codes are 4 letters.')
    showError('')
    store(NAME_KEY, name)
    history.replaceState(null, '', `?room=${code}`)
    connection?.close()
    connection = new RoomConnection(ROOMS_API, options.game, code, name, localTokenStore(options.game), {
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
    history.replaceState(null, '', location.pathname)
    showHome()
    if (reason) showError(reason)
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(location.href)
      statusEl.textContent = 'Invite link copied.'
    } catch {
      statusEl.textContent = `Share this link: ${location.href}`
    }
  }

  function render(): void {
    if (!room) return
    const screen =
      room.phase === 'lobby' ? lobbyView(room, options.limits, { start: () => connection?.send({ type: 'start' }), copyLink }) : options.render(room, ctx)
    replaceKeepingFocus(app, screen, button('Leave room', () => leave(), 'leave'))
    options.afterRender?.(room, ctx)
    tick()
  }

  function tick(): void {
    if (!room) return
    const timer = document.querySelector<HTMLElement>('#timer')
    if (timer && room.deadline) timer.textContent = formatSeconds(room.deadline - ctx.serverNow())
    options.tick?.(room, ctx)
  }

  function preview(start = 0): void {
    const screen = h('div', { class: 'preview-screen' })
    const exit = () => {
      document.querySelector('.preview-bar')?.remove()
      showHome()
    }
    document.body.append(previewBar(options.preview(), (el) => screen.replaceChildren(el), exit, start))
    app.replaceChildren(screen)
  }

  setInterval(tick, 250)
  // ?preview or ?preview=N opens the preview straight away, at screen N; handy for sharing one.
  const previewParam = new URLSearchParams(location.search).get('preview')
  if (previewParam === null) showHome()
  else preview(Number(previewParam) || 0)
}
