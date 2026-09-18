import type { BaseRoomView, ServerMessage } from './protocol'

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000]
// Close codes the room server uses when it refuses or replaces a connection. Retrying those
// would just be refused again.
const FINAL_CLOSE_CODES = new Set([4000, 4004])

export interface ConnectionEvents<V extends BaseRoomView> {
  onState(room: V, serverOffsetMs: number): void
  onError(message: string): void
  onStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'closed', reason?: string): void
}

export interface TokenStore {
  get(code: string): string | null
  set(code: string, token: string): void
}

type SocketFactory = (url: string) => WebSocket

export function httpToWs(base: string): string {
  return base.replace(/^http/, 'ws')
}

export async function createRoom(apiBase: string, game: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(`${apiBase}/${game}/rooms`, { method: 'POST' })
  if (!response.ok) throw new Error('Could not create a room. Try again in a moment.')
  const body = (await response.json()) as { code: string }
  return body.code
}

// Keeps one live connection to a game's room, reconnecting with the player's token (so they get their
// seat back) until the server says no or the page gives up.
export class RoomConnection<V extends BaseRoomView, C = unknown> {
  private socket: WebSocket | null = null
  private attempt = 0
  private stopped = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  private readonly apiBase: string
  private readonly game: string
  private readonly code: string
  private readonly name: string
  private readonly tokens: TokenStore
  private readonly events: ConnectionEvents<V>
  private readonly openSocket: SocketFactory

  constructor(
    apiBase: string,
    game: string,
    code: string,
    name: string,
    tokens: TokenStore,
    events: ConnectionEvents<V>,
    openSocket: SocketFactory = (url) => new WebSocket(url),
  ) {
    this.apiBase = apiBase
    this.game = game
    this.code = code
    this.name = name
    this.tokens = tokens
    this.events = events
    this.openSocket = openSocket
  }

  connect(): void {
    this.stopped = false
    this.events.onStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    const params = new URLSearchParams({ name: this.name })
    const token = this.tokens.get(this.code)
    if (token) params.set('token', token)
    const socket = this.openSocket(`${httpToWs(this.apiBase)}/${this.game}/rooms/${this.code}/ws?${params}`)
    this.socket = socket

    socket.addEventListener('open', () => {
      this.attempt = 0
      this.events.onStatus('connected')
    })
    socket.addEventListener('message', (event) => this.receive(event.data))
    socket.addEventListener('close', (event) => this.closed(socket, event.code, event.reason))
  }

  // False when there's no open connection right now (e.g. mid-reconnect), so callers that must get
  // a message through can try again.
  send(message: C): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false
    this.socket.send(JSON.stringify(message))
    return true
  }

  close(): void {
    this.stopped = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.socket?.close(1000)
  }

  private receive(data: unknown): void {
    let message: ServerMessage<V>
    try {
      message = JSON.parse(String(data)) as ServerMessage<V>
    } catch {
      return
    }
    if (message.type === 'state') {
      this.tokens.set(this.code, message.token)
      this.events.onState(message.room, message.now - Date.now())
    } else if (message.type === 'error') {
      this.events.onError(message.message)
    }
  }

  private closed(socket: WebSocket, code: number, reason: string): void {
    if (socket !== this.socket || this.stopped) return
    if (FINAL_CLOSE_CODES.has(code) || this.attempt >= RETRY_DELAYS_MS.length) {
      this.events.onStatus('closed', reason || 'Lost connection to the room.')
      return
    }
    const delay = RETRY_DELAYS_MS[this.attempt]
    this.attempt += 1
    this.events.onStatus('reconnecting')
    this.retryTimer = setTimeout(() => this.connect(), delay)
  }
}

export function localTokenStore(game: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()): TokenStore {
  const key = (code: string) => `${game}.token.${code}`
  return {
    get: (code) => {
      try {
        return storage?.getItem(key(code)) ?? null
      } catch {
        return null
      }
    },
    set: (code, token) => {
      try {
        storage?.setItem(key(code), token)
      } catch {
        // No storage: a refresh just joins as a new player.
      }
    },
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
