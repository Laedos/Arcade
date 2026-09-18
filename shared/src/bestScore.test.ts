import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBest, saveBest } from './bestScore'

const KEY = 'test.best'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const brokenStorage = {
  getItem: (): string | null => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('best score storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('starts at zero when nothing is stored', () => {
    expect(loadBest(KEY, memoryStorage())).toBe(0)
  })

  it('keeps the higher of the new and stored score', () => {
    const storage = memoryStorage()
    expect(saveBest(KEY, 12, storage)).toBe(12)
    expect(saveBest(KEY, 5, storage)).toBe(12)
    expect(loadBest(KEY, storage)).toBe(12)
  })

  it('ignores garbage in storage', () => {
    const storage = memoryStorage()
    storage.setItem(KEY, 'not a number')
    expect(loadBest(KEY, storage)).toBe(0)
  })

  it('degrades to zero and the in-memory score when storage throws', () => {
    expect(loadBest(KEY, brokenStorage)).toBe(0)
    expect(saveBest(KEY, 7, brokenStorage)).toBe(7)
  })

  it('uses the browser localStorage by default', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    saveBest(KEY, 9)
    expect(loadBest(KEY)).toBe(9)
  })

  it('falls back to no storage when even reaching localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    expect(loadBest(KEY)).toBe(0)
  })

  it('treats missing storage as empty', () => {
    expect(loadBest(KEY, null)).toBe(0)
    expect(saveBest(KEY, 3, null)).toBe(3)
  })
})
