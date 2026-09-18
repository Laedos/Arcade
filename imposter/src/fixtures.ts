import type { ImposterPlayer, RoomView } from './protocol'

// Sample states for the preview mode. Plain data; nothing here is game logic.

const players: ImposterPlayer[] = [
  { id: 'you', name: 'Sam', connected: true, isHost: true, clue: null, voted: false },
  { id: 'ana', name: 'Ana', connected: true, isHost: false, clue: 'Sand', voted: true },
  { id: 'ben', name: 'Ben', connected: true, isHost: false, clue: 'Towel', voted: false },
  { id: 'cy', name: 'Cy', connected: true, isHost: false, clue: null, voted: true },
]

const base: RoomView = {
  code: 'SPYY',
  youId: 'you',
  phase: 'clues',
  players,
  deadline: null,
  role: { imposter: false, category: 'Places', word: 'Beach' },
  turnId: 'cy',
  yourVote: null,
  result: null,
}

const withClues = players.map((p) => ({ ...p, clue: p.clue ?? (p.id === 'you' ? 'Waves' : 'Holiday') }))

export const sampleLobby: RoomView = { ...base, phase: 'lobby', role: null, turnId: null }
export const sampleClues: RoomView = base
export const sampleYourTurn: RoomView = { ...base, turnId: 'you', players: players.map((p) => (p.id === 'cy' ? { ...p, clue: 'Holiday' } : p)) }
export const sampleImposter: RoomView = { ...base, role: { imposter: true, category: 'Places', word: null } }
export const sampleVote: RoomView = { ...base, phase: 'vote', turnId: null, players: withClues }
export const sampleVoted: RoomView = { ...sampleVote, yourVote: 'cy', players: withClues.map((p) => (p.id === 'you' ? { ...p, voted: true } : p)) }
export const sampleResult: RoomView = {
  ...sampleVote,
  phase: 'result',
  result: { imposterId: 'cy', word: 'Beach', caught: true, votesAgainst: { cy: 3, ben: 1 } },
}
