import type { QuizPlayer, RoomView } from './protocol'

// Sample states for the preview mode. Plain data; nothing here is game logic.

const players: QuizPlayer[] = [
  { id: 'you', name: 'Sam', connected: true, isHost: true, score: 1450, answered: true },
  { id: 'ana', name: 'Ana', connected: true, isHost: false, score: 1820, answered: true },
  { id: 'ben', name: 'Ben', connected: true, isHost: false, score: 900, answered: false },
  { id: 'cy', name: 'Cy', connected: false, isHost: false, score: 300, answered: false },
]

const question = {
  number: 4,
  total: 10,
  category: 'Space',
  text: 'Which planet has the shortest day?',
  choices: ['Mercury', 'Jupiter', 'Earth', 'Neptune'],
}

const base: RoomView = { code: 'QUIZ', youId: 'you', phase: 'question', players, deadline: null, question, yourChoice: null, answer: null }
const answer = { correct: 1, picks: [1, 2, 0, 1], gains: { you: 820, ana: 910 } }

export const sampleLobby: RoomView = { ...base, phase: 'lobby', question: null }
export const sampleQuestion: RoomView = { ...base, players: players.map((p) => ({ ...p, answered: p.id === 'ana' })) }
export const sampleLocked: RoomView = { ...base, yourChoice: 1 }
export const sampleAnswer: RoomView = { ...base, phase: 'answer', yourChoice: 1, answer }
export const sampleScores: RoomView = { ...base, phase: 'scores', answer }
export const sampleFinal: RoomView = { ...base, phase: 'final', answer: null }
