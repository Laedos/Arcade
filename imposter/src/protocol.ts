// Wire format for Imposter. The room server doesn't exist yet; this is the contract its room
// will implement, and what the page already renders.
import type { BaseRoomView, PlayerView } from '../../shared/src/rooms/protocol'

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 10
export const MAX_CLUE_LENGTH = 24

export type Phase = 'lobby' | 'clues' | 'vote' | 'result'

export interface ImposterPlayer extends PlayerView {
  clue: string | null
  voted: boolean
}

// Only the imposter's own view has `imposter: true`, and it never carries the word.
export interface Role {
  imposter: boolean
  category: string
  word: string | null
}

export interface Result {
  imposterId: string
  word: string
  caught: boolean
  votesAgainst: Record<string, number>
}

export interface RoomView extends BaseRoomView {
  phase: Phase
  players: ImposterPlayer[]
  deadline: number | null
  role: Role | null
  // Whose turn it is to give a clue, in seat order.
  turnId: string | null
  yourVote: string | null
  result: Result | null
}

export type ClientMessage = { type: 'start' } | { type: 'clue'; text: string } | { type: 'vote'; targetId: string } | { type: 'playAgain' }
