import type { QuizPlayer, RoomView } from './protocol'
import { pickQuestions } from './questions'

// Sample states for the preview mode. Plain data; nothing here is game logic.

const players: QuizPlayer[] = [
  { id: 'you', name: 'Sam', connected: true, isHost: true, score: 1450, answered: true },
  { id: 'ana', name: 'Ana', connected: true, isHost: false, score: 1820, answered: true },
  { id: 'ben', name: 'Ben', connected: true, isHost: false, score: 900, answered: false },
  { id: 'cy', name: 'Cy', connected: false, isHost: false, score: 300, answered: false },
]

// A fixed seed, so preview mode always shows the same round - a screenshot of it stays comparable.
const round = pickQuestions(10, seeded(20260921))
const asked = round[3]
const question = { number: 4, total: round.length, category: asked.category, text: asked.text, choices: asked.choices }

const base: RoomView = { code: 'QUIZ', youId: 'you', phase: 'question', players, deadline: null, question, yourChoice: null, answer: null }
// Two players got it right; the picks line up with the shuffled choices.
const wrong = (asked.correct + 1) % question.choices.length
const answer = {
  correct: asked.correct,
  picks: question.choices.map((_, i) => (i === asked.correct ? 2 : i === wrong ? 1 : 0)),
  gains: { you: 820, ana: 910 },
}

export const sampleLobby: RoomView = { ...base, phase: 'lobby', question: null }
export const sampleQuestion: RoomView = { ...base, players: players.map((p) => ({ ...p, answered: p.id === 'ana' })) }
export const sampleLocked: RoomView = { ...base, yourChoice: asked.correct }
export const sampleAnswer: RoomView = { ...base, phase: 'answer', yourChoice: asked.correct, answer }
export const sampleScores: RoomView = { ...base, phase: 'scores', answer }
export const sampleFinal: RoomView = { ...base, phase: 'final', answer: null }

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
