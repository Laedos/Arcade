import type { ClientMessage } from '../../doodle-telephone/src/protocol'

// No I or O, so a code read aloud or off a screen can't be mistaken for 1 or 0.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const CODE_LENGTH = 4

export function newRoomCode(random: () => number): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return code
}

export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase()
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null
}

export function isAllowedOrigin(origin: string | null, allowed: string): boolean {
  if (!origin) return false
  return allowed
    .split(',')
    .map((o) => o.trim())
    .includes(origin)
}

// Anything from the network is untrusted: only shapes the room understands get through, and the
// room itself still validates the content (see room.ts's cleanText/cleanStrokes).
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string') return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const message = data as Record<string, unknown>
  switch (message.type) {
    case 'start':
    case 'revealNext':
    case 'playAgain':
      return { type: message.type }
    case 'submit':
      if (typeof message.step !== 'number') return null
      if (typeof message.text === 'string') return { type: 'submit', step: message.step, text: message.text }
      if (Array.isArray(message.strokes)) return { type: 'submit', step: message.step, strokes: message.strokes }
      return null
    default:
      return null
  }
}
