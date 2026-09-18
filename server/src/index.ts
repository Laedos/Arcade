import { isAllowedOrigin, newRoomCode, normalizeRoomCode } from './http'
import type { DoodleRoom } from './doodle/DoodleRoom'

export { DoodleRoom } from './doodle/DoodleRoom'

interface Env {
  DOODLE_ROOMS: DurableObjectNamespace<DoodleRoom>
  ALLOWED_ORIGINS: string
}

const CREATE_ATTEMPTS = 8

// POST /doodle/rooms              -> { code }       create a room
// GET  /doodle/rooms/:code/ws     -> WebSocket     join it (?name=...&token=...)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) return new Response('Forbidden', { status: 403 })
    const cors = { 'Access-Control-Allow-Origin': origin!, 'Access-Control-Allow-Methods': 'POST', Vary: 'Origin' }

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    if (request.method === 'POST' && url.pathname === '/doodle/rooms') {
      for (let i = 0; i < CREATE_ATTEMPTS; i++) {
        const code = newRoomCode(Math.random)
        if (await env.DOODLE_ROOMS.get(env.DOODLE_ROOMS.idFromName(code)).create(code)) {
          return Response.json({ code }, { status: 201, headers: cors })
        }
      }
      return new Response('Could not find a free room code, try again.', { status: 503, headers: cors })
    }

    const match = /^\/doodle\/rooms\/([^/]+)\/ws$/.exec(url.pathname)
    if (match && request.headers.get('Upgrade') === 'websocket') {
      const code = normalizeRoomCode(match[1])
      if (!code) return new Response('Bad room code', { status: 400 })
      return env.DOODLE_ROOMS.get(env.DOODLE_ROOMS.idFromName(code)).fetch(request)
    }

    return new Response('Not found', { status: 404, headers: cors })
  },
} satisfies ExportedHandler<Env>
