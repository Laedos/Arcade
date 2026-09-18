import type { DuelPlayer, RoomView } from './protocol'

// Sample states for the preview mode. Plain data; nothing here is game logic.

const players: DuelPlayer[] = [
  { id: 'you', name: 'Sam', connected: true, isHost: true, wins: 2, locked: false },
  { id: 'ana', name: 'Ana', connected: true, isHost: false, wins: 1, locked: true },
]

const base: RoomView = { code: 'RPSX', youId: 'you', phase: 'choose', players, deadline: null, round: 4, yourMove: null, lastRound: null, matchWinnerId: null }

export const sampleLobby: RoomView = { ...base, phase: 'lobby', players: players.slice(0, 1), round: 0 }
export const sampleChoose: RoomView = base
export const sampleLocked: RoomView = { ...base, yourMove: 'paper', players: players.map((p) => ({ ...p, locked: p.id === 'you' })) }
export const sampleReveal: RoomView = {
  ...base,
  phase: 'reveal',
  players: players.map((p) => ({ ...p, wins: p.id === 'you' ? 3 : 1 })),
  lastRound: { moves: { you: 'paper', ana: 'rock' }, winnerId: 'you' },
}
export const sampleOver: RoomView = { ...sampleReveal, phase: 'over', matchWinnerId: 'you' }
