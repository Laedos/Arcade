// Wire format for Rock Paper Scissors. The room server doesn't exist yet; this is the contract its
// room will implement, and what the page already renders.
import type { BaseRoomView, PlayerView } from '../../shared/src/rooms/protocol'

export const PLAYERS = 2
export const BEST_OF = 5

export type Move = 'rock' | 'paper' | 'scissors'
export type Phase = 'lobby' | 'choose' | 'reveal' | 'over'

export interface DuelPlayer extends PlayerView {
  wins: number
  // Has picked this round; the pick itself stays hidden until both have.
  locked: boolean
}

export interface RoundResult {
  moves: Record<string, Move>
  // null for a draw.
  winnerId: string | null
}

export interface RoomView extends BaseRoomView {
  phase: Phase
  players: DuelPlayer[]
  deadline: number | null
  round: number
  yourMove: Move | null
  lastRound: RoundResult | null
  matchWinnerId: string | null
}

export type ClientMessage = { type: 'start' } | { type: 'play'; move: Move } | { type: 'next' } | { type: 'rematch' }
