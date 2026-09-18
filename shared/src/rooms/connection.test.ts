import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ConnectionEvents, createRoom, httpToWs, localTokenStore, RoomConnection, type TokenStore } from './connection'
import type { BaseRoomView } from './protocol'

class FakeSocket extends EventTarget {
  readyState = 0
  sent: string[] = []
  closedWith: number | null = null
  readonly url: string
  constructor(url: string) {
    super()
    this.url = url
  }
  send(data: string) {
    this.sent.push(data)
  }
  close(code: number) {
    this.closedWith = code
  }
  open() {
    this.readyState = WebSocket.OPEN
    this.dispatchEvent(new Event('open'))
  }
  receive(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) }))
  }
  drop(code = 1006, reason = '') {
    this.readyState = WebSocket.CLOSED
    this.dispatchEvent(Object.assign(new Event('close'), { code, reason }))
  }
}

function memoryTokens(initial: Record<string, string> = {}): TokenStore {
  const values = new Map(Object.entries(initial))
  return { get: (code) => values.get(code) ?? null, set: (code, token) => void values.set(code, token) }
}

function setup(tokens = memoryTokens()) {
  const sockets: FakeSocket[] = []
  const events = { onState: vi.fn(), onError: vi.fn(), onStatus: vi.fn() } satisfies ConnectionEvents<BaseRoomView>
  const connection = new RoomConnection<BaseRoomView, { type: string }>('https://rooms.example', 'doodle', 'ABCD', 'Ana Bo', tokens, events, (url) => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket as unknown as WebSocket
  })
  return { connection, sockets, events, tokens }
}

const room = { code: 'ABCD' } as BaseRoomView

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('httpToWs', () => {
  it('swaps the scheme', () => {
    expect(httpToWs('https://rooms.sbdevworks.com')).toBe('wss://rooms.sbdevworks.com')
    expect(httpToWs('http://localhost:8787')).toBe('ws://localhost:8787')
  })
})

describe('createRoom', () => {
  it('posts to the API and returns the code', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'WXYZ' }), { status: 201 }))
    await expect(createRoom('https://rooms.example', 'doodle', fetcher)).resolves.toBe('WXYZ')
    expect(fetcher).toHaveBeenCalledWith('https://rooms.example/doodle/rooms', { method: 'POST' })
  })

  it('throws a readable error when the server refuses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('nope', { status: 503 }))
    await expect(createRoom('https://rooms.example', 'doodle', fetcher)).rejects.toThrow('Could not create a room')
  })
})

describe('RoomConnection', () => {
  it('connects with the name, and the saved token when there is one', () => {
    const { connection, sockets, events } = setup(memoryTokens({ ABCD: 'tok' }))
    connection.connect()
    expect(sockets[0].url).toBe('wss://rooms.example/doodle/rooms/ABCD/ws?name=Ana+Bo&token=tok')
    expect(events.onStatus).toHaveBeenCalledWith('connecting')
    sockets[0].open()
    expect(events.onStatus).toHaveBeenLastCalledWith('connected')
  })

  it('stores the token and reports state with the server clock offset', () => {
    const { connection, sockets, events, tokens } = setup()
    vi.setSystemTime(10_000)
    connection.connect()
    sockets[0].receive({ type: 'state', room, token: 'new-token', now: 12_500 })
    expect(tokens.get('ABCD')).toBe('new-token')
    expect(events.onState).toHaveBeenCalledWith(room, 2500)
  })

  it('passes server errors on and ignores garbage', () => {
    const { connection, sockets, events } = setup()
    connection.connect()
    sockets[0].receive({ type: 'error', message: 'This room is full.' })
    sockets[0].receive('not json')
    expect(events.onError).toHaveBeenCalledExactlyOnceWith('This room is full.')
    expect(events.onState).not.toHaveBeenCalled()
  })

  it('sends only while open', () => {
    const { connection, sockets } = setup()
    connection.connect()
    connection.send({ type: 'start' })
    sockets[0].open()
    connection.send({ type: 'start' })
    expect(sockets[0].sent).toEqual(['{"type":"start"}'])
  })

  it('reconnects with backoff after a dropped connection, then gives up', () => {
    const { connection, sockets, events } = setup()
    connection.connect()
    sockets[0].drop()
    expect(events.onStatus).toHaveBeenLastCalledWith('reconnecting')
    vi.advanceTimersByTime(499)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(2)

    for (let i = 1; i <= 5; i++) {
      sockets[i].drop()
      vi.runOnlyPendingTimers()
    }
    expect(sockets).toHaveLength(6)
    expect(events.onStatus).toHaveBeenLastCalledWith('closed', 'Lost connection to the room.')
  })

  it('resets the backoff once a reconnect succeeds', () => {
    const { connection, sockets } = setup()
    connection.connect()
    sockets[0].drop()
    vi.runOnlyPendingTimers()
    sockets[1].open()
    sockets[1].drop()
    vi.advanceTimersByTime(500)
    expect(sockets).toHaveLength(3)
  })

  it('does not retry when the server refuses or replaces the connection', () => {
    const { connection, sockets, events } = setup()
    connection.connect()
    sockets[0].drop(4004, 'That room does not exist.')
    vi.runAllTimers()
    expect(sockets).toHaveLength(1)
    expect(events.onStatus).toHaveBeenLastCalledWith('closed', 'That room does not exist.')
  })

  it('stops for good when closed by the page, ignoring late events', () => {
    const { connection, sockets, events } = setup()
    connection.connect()
    sockets[0].drop()
    connection.close()
    vi.runAllTimers()
    expect(sockets).toHaveLength(1)
    sockets[0].drop()
    expect(events.onStatus).not.toHaveBeenCalledWith('closed', expect.anything())
    expect(sockets[0].closedWith).toBe(1000)
  })
})

describe('localTokenStore', () => {
  it('keeps one token per room code', () => {
    const values = new Map<string, string>()
    const store = localTokenStore('doodle-telephone', { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => void values.set(k, v) })
    store.set('ABCD', 't1')
    expect(store.get('ABCD')).toBe('t1')
    expect(store.get('WXYZ')).toBeNull()
    expect([...values.keys()]).toEqual(['doodle-telephone.token.ABCD'])
  })

  it('works without storage, and when storage throws', () => {
    const none = localTokenStore('doodle-telephone', null)
    none.set('ABCD', 't')
    expect(none.get('ABCD')).toBeNull()

    const broken = localTokenStore('doodle-telephone', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => broken.set('ABCD', 't')).not.toThrow()
    expect(broken.get('ABCD')).toBeNull()
  })

  it('defaults to the browser localStorage when there is one', () => {
    expect(localTokenStore('doodle-telephone').get('ABCD')).toBeNull()
  })
})
