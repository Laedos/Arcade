// Wire format for Quiz Night. The room server doesn't exist yet; this is the contract its
// quiz room will implement, and what the page already renders.
import type { BaseRoomView, PlayerView } from '../../shared/src/rooms/protocol'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12
export const CHOICES_PER_QUESTION = 4

export type Phase = 'lobby' | 'question' | 'answer' | 'scores' | 'final'

export interface QuizPlayer extends PlayerView {
  score: number
  answered: boolean
}

export interface Question {
  number: number
  total: number
  category: string
  text: string
  choices: string[]
}

export interface AnswerReveal {
  correct: number
  // How many players picked each choice.
  picks: number[]
  // Points each player gained on this question (faster right answers earn more).
  gains: Record<string, number>
}

export interface RoomView extends BaseRoomView {
  phase: Phase
  players: QuizPlayer[]
  deadline: number | null
  question: Question | null
  yourChoice: number | null
  answer: AnswerReveal | null
}

export type ClientMessage =
  | { type: 'start' }
  | { type: 'answer'; question: number; choice: number }
  | { type: 'next' }
  | { type: 'playAgain' }
