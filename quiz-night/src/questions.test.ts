import { describe, expect, it } from 'vitest'
import { CHOICES_PER_QUESTION } from './protocol'
import { QUESTION_BANK, pickQuestions, type BankQuestion } from './questions'

// A seeded generator, so a draw can be asserted exactly (mulberry32, same as Slingwell's world).
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

describe('the question bank', () => {
  it('gives every question the same number of choices, with a correct one among them', () => {
    for (const question of QUESTION_BANK) {
      expect(question.choices, question.text).toHaveLength(CHOICES_PER_QUESTION)
      expect(question.correct, question.text).toBeGreaterThanOrEqual(0)
      expect(question.correct, question.text).toBeLessThan(question.choices.length)
      expect(new Set(question.choices).size, question.text).toBe(question.choices.length)
      expect(question.category, question.text).not.toBe('')
    }
  })

  it('asks each question only once', () => {
    const texts = QUESTION_BANK.map((question) => question.text)

    expect(new Set(texts).size).toBe(texts.length)
  })

  it('holds enough questions for a full round', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(10)
  })
})

describe('pickQuestions', () => {
  it('draws the asked-for number of questions without repeating one', () => {
    const picked = pickQuestions(10, seeded(7))

    expect(picked).toHaveLength(10)
    expect(new Set(picked.map((question) => question.text)).size).toBe(10)
  })

  it('never returns more questions than the bank holds', () => {
    expect(pickQuestions(QUESTION_BANK.length + 5, seeded(1))).toHaveLength(QUESTION_BANK.length)
    expect(pickQuestions(0, seeded(1))).toHaveLength(0)
    expect(pickQuestions(-3, seeded(1))).toHaveLength(0)
  })

  it('keeps `correct` pointing at the right answer after shuffling the choices', () => {
    const answers = new Map(QUESTION_BANK.map((question) => [question.text, question.choices[question.correct]]))

    for (const question of pickQuestions(QUESTION_BANK.length, seeded(3))) {
      expect(question.choices[question.correct], question.text).toBe(answers.get(question.text))
      expect(new Set(question.choices).size, question.text).toBe(question.choices.length)
    }
  })

  it('moves the right answer around rather than leaving it in one place', () => {
    const bank: BankQuestion[] = Array.from({ length: 12 }, (_, i) => ({
      category: 'Test',
      text: `Q${i}`,
      choices: ['a', 'b', 'c', 'd'],
      correct: 0,
    }))

    const positions = new Set(pickQuestions(12, seeded(11), bank).map((question) => question.correct))

    expect(positions.size).toBeGreaterThan(1)
  })

  it('draws the same round twice from the same seed, and a different one from another', () => {
    const first = pickQuestions(5, seeded(42)).map((question) => question.text)

    expect(pickQuestions(5, seeded(42)).map((question) => question.text)).toEqual(first)
    expect(pickQuestions(5, seeded(43)).map((question) => question.text)).not.toEqual(first)
  })
})
