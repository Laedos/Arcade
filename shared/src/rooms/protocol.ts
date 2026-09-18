// What every online game's room has in common. Each game's own protocol.ts extends these.

export const MAX_NAME_LENGTH = 20
export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z]{4}$/

export interface PlayerView {
  id: string
  name: string
  connected: boolean
  isHost: boolean
}

export interface BaseRoomView {
  code: string
  youId: string
  phase: string
  players: PlayerView[]
}

// `now` is the server's clock, so clients can count down to deadlines without trusting their own.
export type ServerMessage<V extends BaseRoomView> = { type: 'state'; room: V; token: string; now: number } | { type: 'error'; message: string }
