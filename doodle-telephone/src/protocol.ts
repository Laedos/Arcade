// Wire format between the Doodle Telephone page and its room server (server/). Both sides
// import this file, so a change here is a change to both.
import type { BaseRoomView, PlayerView as BasePlayerView, ServerMessage as BaseServerMessage } from '../../shared/src/rooms/protocol'

export { MAX_NAME_LENGTH } from '../../shared/src/rooms/protocol'

export const CANVAS_SIZE = 1000
export const PALETTE = ['#1b1b1f', '#ffffff', '#e5484d', '#f76b15', '#ffc53d', '#46a758', '#3e9ef7', '#8e4ec6', '#d6409f', '#8d6e63'] as const
export const BRUSH_SIZES = [4, 10, 24, 48] as const
export const MAX_TEXT_LENGTH = 80
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

// One pen-down to pen-up line. `points` is flat [x0, y0, x1, y1, ...] in 0..CANVAS_SIZE, so a
// drawing looks the same on every screen size.
export interface Stroke {
  color: string
  size: number
  points: number[]
}

export type Entry =
  | { kind: 'prompt' | 'guess'; authorId: string; text: string }
  | { kind: 'drawing'; authorId: string; strokes: Stroke[] }

export type TaskKind = 'write' | 'draw' | 'guess'

export type Phase = 'lobby' | 'playing' | 'reveal'

export interface PlayerView extends BasePlayerView {
  submitted: boolean
}

export interface Task {
  kind: TaskKind
  step: number
  // What the player is responding to: nothing when writing the first prompt, text to draw,
  // or a drawing to guess.
  previous: Entry | null
}

export interface RevealChain {
  ownerId: string
  entries: Entry[]
}

export interface RoomView extends BaseRoomView {
  phase: Phase
  players: PlayerView[]
  step: number
  totalSteps: number
  deadline: number | null
  task: Task | null
  // Revealed so far: every chain before `chain` in full, and `chain` up to `entry`.
  reveal: { chains: RevealChain[]; chain: number; entry: number; finished: boolean } | null
}

export type ClientMessage =
  | { type: 'start' }
  | { type: 'submit'; step: number; text: string }
  | { type: 'submit'; step: number; strokes: Stroke[] }
  | { type: 'revealNext' }
  | { type: 'playAgain' }

export type ServerMessage = BaseServerMessage<RoomView>
