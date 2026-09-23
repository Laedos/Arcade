import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../shared/src/rng'
import { CHOICES_PER_QUESTION } from './protocol'
import { QUESTION_BANK, pickQuestions, type BankQuestion } from './questions'

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
    const picked = pickQuestions(10, mulberry32(7))

    expect(picked).toHaveLength(10)
    expect(new Set(picked.map((question) => question.text)).size).toBe(10)
  })

  it('never returns more questions than the bank holds', () => {
    expect(pickQuestions(QUESTION_BANK.length + 5, mulberry32(1))).toHaveLength(QUESTION_BANK.length)
    expect(pickQuestions(0, mulberry32(1))).toHaveLength(0)
    expect(pickQuestions(-3, mulberry32(1))).toHaveLength(0)
  })

  it('keeps `correct` pointing at the right answer after shuffling the choices', () => {
    const answers = new Map(QUESTION_BANK.map((question) => [question.text, question.choices[question.correct]]))

    for (const question of pickQuestions(QUESTION_BANK.length, mulberry32(3))) {
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

    const positions = new Set(pickQuestions(12, mulberry32(11), bank).map((question) => question.correct))

    expect(positions.size).toBeGreaterThan(1)
  })

  it('draws the same round twice from the same seed, and a different one from another', () => {
    const first = pickQuestions(5, mulberry32(42)).map((question) => question.text)

    expect(pickQuestions(5, mulberry32(42)).map((question) => question.text)).toEqual(first)
    expect(pickQuestions(5, mulberry32(43)).map((question) => question.text)).not.toEqual(first)
  })
})
