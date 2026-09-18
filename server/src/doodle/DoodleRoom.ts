import { DurableObject } from 'cloudflare:workers'
import type { ServerMessage } from '../../../doodle-telephone/src/protocol'
import { parseClientMessage } from '../http'
import { createRoom, disconnect, join, nextWakeAt, playAgain, type Result, revealNext, type Room, start, submit, tick, viewFor } from './room'

const ids = { newId: () => crypto.randomUUID(), newToken: () => crypto.randomUUID() }

// One Durable Object per room code. The room lives in memory: when the last player has gone and
// Cloudflare evicts the object, the room is gone too, which is fine for a party game.
export class DoodleRoom extends DurableObject {
  private room: Room | null = null
  private readonly sockets = new Map<WebSocket, string>()

  create(code: string): boolean {
    if (this.room) return false
    this.room = createRoom(code)
    return true
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    server.accept()

    const room = this.room
    if (!room) return this.refuse(client, server, 'That room does not exist. Check the code.')
    const joined = join(room, url.searchParams.get('name') ?? '', url.searchParams.get('token'), ids)
    if (!joined.ok) return this.refuse(client, server, joined.error)

    // The same player in a second tab takes over: the older connection is closed.
    for (const [socket, playerId] of this.sockets) {
      if (playerId === joined.value.id) {
        this.sockets.delete(socket)
        socket.close(4000, 'Opened somewhere else')
      }
    }
    this.sockets.set(server, joined.value.id)
    server.addEventListener('message', (event) => this.onMessage(server, event.data))
    server.addEventListener('close', () => this.onClose(server))
    server.addEventListener('error', () => this.onClose(server))

    this.broadcast()
    return new Response(null, { status: 101, webSocket: client })
  }

  override async alarm(): Promise<void> {
    if (this.room && tick(this.room, Date.now())) this.broadcast()
    await this.scheduleAlarm()
  }

  private refuse(client: WebSocket, server: WebSocket, message: string): Response {
    send(server, { type: 'error', message })
    server.close(4004, message.slice(0, 120))
    return new Response(null, { status: 101, webSocket: client })
  }

  private onMessage(socket: WebSocket, data: unknown): void {
    const room = this.room
    const playerId = this.sockets.get(socket)
    const message = parseClientMessage(data)
    if (!room || !playerId || !message) return

    const now = Date.now()
    let result: Result
    switch (message.type) {
      case 'start':
        result = start(room, playerId, now)
        break
      case 'submit':
        result = submit(room, playerId, message.step, 'text' in message ? { text: message.text } : { strokes: message.strokes }, now)
        break
      case 'revealNext':
        result = revealNext(room, playerId)
        break
      case 'playAgain':
        result = playAgain(room, playerId)
        break
    }
    if (!result.ok) {
      send(socket, { type: 'error', message: result.error })
      return
    }
    this.broadcast()
  }

  private onClose(socket: WebSocket): void {
    const playerId = this.sockets.get(socket)
    this.sockets.delete(socket)
    if (!this.room || !playerId) return
    disconnect(this.room, playerId, Date.now())
    this.broadcast()
  }

  private broadcast(): void {
    const room = this.room
    if (!room) return
    for (const [socket, playerId] of this.sockets) {
      const player = room.players.find((p) => p.id === playerId)
      if (player) send(socket, { type: 'state', room: viewFor(room, playerId), token: player.token, now: Date.now() })
    }
    void this.scheduleAlarm()
  }

  private async scheduleAlarm(): Promise<void> {
    const wakeAt = this.room ? nextWakeAt(this.room, Date.now()) : null
    if (wakeAt === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(wakeAt)
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  try {
    socket.send(JSON.stringify(message))
  } catch {
    // Already closing; its close handler cleans up.
  }
}
