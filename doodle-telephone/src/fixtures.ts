import type { PlayerView, RoomView, Stroke } from './protocol'

// Sample states for the preview mode: what each screen looks like mid-game, before the room
// server exists. Plain data; nothing here is game logic.

const players: PlayerView[] = [
  { id: 'you', name: 'Sam', connected: true, isHost: true, submitted: false },
  { id: 'ana', name: 'Ana', connected: true, isHost: false, submitted: true },
  { id: 'ben', name: 'Ben', connected: true, isHost: false, submitted: false },
  { id: 'cy', name: 'Cy', connected: false, isHost: false, submitted: false },
]

// A rough cat: head, ears, eyes, whiskers.
export const SAMPLE_DRAWING: Stroke[] = [
  { color: '#1b1b1f', size: 10, points: [300, 520, 330, 400, 420, 330, 500, 320, 580, 330, 670, 400, 700, 520, 660, 640, 500, 690, 340, 640, 300, 520] },
  { color: '#1b1b1f', size: 10, points: [360, 380, 380, 230, 450, 330] },
  { color: '#1b1b1f', size: 10, points: [550, 330, 620, 230, 640, 380] },
  { color: '#3e9ef7', size: 24, points: [420, 480] },
  { color: '#3e9ef7', size: 24, points: [580, 480] },
  { color: '#e5484d', size: 10, points: [480, 560, 500, 580, 520, 560] },
  { color: '#8d6e63', size: 4, points: [440, 580, 300, 560] },
  { color: '#8d6e63', size: 4, points: [560, 580, 700, 560] },
]

const base: RoomView = {
  code: 'CATS',
  youId: 'you',
  phase: 'playing',
  players,
  step: 0,
  totalSteps: 4,
  deadline: null,
  task: null,
  reveal: null,
}

export const sampleLobby: RoomView = { ...base, phase: 'lobby' }
export const sampleWrite: RoomView = { ...base, task: { kind: 'write', step: 0, previous: null } }
export const sampleDraw: RoomView = { ...base, step: 1, task: { kind: 'draw', step: 1, previous: { kind: 'prompt', authorId: 'ana', text: 'A cat running a marathon' } } }
export const sampleWaiting: RoomView = { ...base, step: 1 }
export const sampleGuess: RoomView = { ...base, step: 2, task: { kind: 'guess', step: 2, previous: { kind: 'drawing', authorId: 'ben', strokes: SAMPLE_DRAWING } } }
export const sampleReveal: RoomView = {
  ...base,
  phase: 'reveal',
  reveal: {
    chain: 0,
    entry: 3,
    finished: false,
    chains: [
      {
        ownerId: 'ana',
        entries: [
          { kind: 'prompt', authorId: 'ana', text: 'A cat running a marathon' },
          { kind: 'drawing', authorId: 'ben', strokes: SAMPLE_DRAWING },
          { kind: 'guess', authorId: 'cy', text: 'Angry owl' },
          { kind: 'drawing', authorId: 'you', strokes: SAMPLE_DRAWING.slice(0, 3) },
        ],
      },
    ],
  },
}
