import { describe, expect, it } from 'vitest'
import { CODE_LENGTH, isAllowedOrigin, newRoomCode, normalizeRoomCode, parseClientMessage } from './http'

describe('room codes', () => {
  it('makes codes of the right length from unambiguous letters', () => {
    expect(newRoomCode(() => 0)).toBe('AAAA')
    expect(newRoomCode(() => 0.9999)).toBe('ZZZZ')
    expect(newRoomCode(Math.random)).toMatch(/^[A-HJ-NP-Z]{4}$/)
  })

  it('accepts a typed code in any case and rejects anything else', () => {
    expect(normalizeRoomCode(' abcd ')).toBe('ABCD')
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('ABIO')).toBeNull()
    expect(normalizeRoomCode('AB1D')).toBeNull()
    expect(CODE_LENGTH).toBe(4)
  })
})

describe('isAllowedOrigin', () => {
  const allowed = 'https://play.sbdevworks.com, http://localhost:5173'

  it('allows listed origins only', () => {
    expect(isAllowedOrigin('https://play.sbdevworks.com', allowed)).toBe(true)
    expect(isAllowedOrigin('http://localhost:5173', allowed)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', allowed)).toBe(false)
    expect(isAllowedOrigin(null, allowed)).toBe(false)
  })
})

describe('parseClientMessage', () => {
  it('parses the simple commands', () => {
    expect(parseClientMessage('{"type":"start"}')).toEqual({ type: 'start' })
    expect(parseClientMessage('{"type":"revealNext","extra":1}')).toEqual({ type: 'revealNext' })
    expect(parseClientMessage('{"type":"playAgain"}')).toEqual({ type: 'playAgain' })
  })

  it('parses text and drawing submissions', () => {
    expect(parseClientMessage('{"type":"submit","step":0,"text":"cat"}')).toEqual({ type: 'submit', step: 0, text: 'cat' })
    expect(parseClientMessage('{"type":"submit","step":1,"strokes":[]}')).toEqual({ type: 'submit', step: 1, strokes: [] })
  })

  it('rejects malformed input', () => {
    expect(parseClientMessage('{"type":"submit","step":"1","text":"x"}')).toBeNull()
    expect(parseClientMessage('{"type":"submit","step":1}')).toBeNull()
    expect(parseClientMessage('{"type":"hack"}')).toBeNull()
    expect(parseClientMessage('null')).toBeNull()
    expect(parseClientMessage('not json')).toBeNull()
    expect(parseClientMessage(new ArrayBuffer(2))).toBeNull()
  })
})
