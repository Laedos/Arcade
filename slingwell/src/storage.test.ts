import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBest, saveBest } from './storage'

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
    expect(loadBest(memoryStorage())).toBe(0)
  })

  it('keeps the higher of the new and stored score', () => {
    const storage = memoryStorage()
    expect(saveBest(12, storage)).toBe(12)
    expect(saveBest(5, storage)).toBe(12)
    expect(loadBest(storage)).toBe(12)
  })

  it('ignores garbage in storage', () => {
    const storage = memoryStorage()
    storage.setItem('slingwell.best', 'not a number')
    expect(loadBest(storage)).toBe(0)
  })

  it('degrades to zero and the in-memory score when storage throws', () => {
    expect(loadBest(brokenStorage)).toBe(0)
    expect(saveBest(7, brokenStorage)).toBe(7)
  })

  it('uses the browser localStorage by default', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    saveBest(9)
    expect(loadBest()).toBe(9)
  })

  it('falls back to no storage when even reaching localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    expect(loadBest()).toBe(0)
  })

  it('treats missing storage as empty', () => {
    expect(loadBest(null)).toBe(0)
    expect(saveBest(3, null)).toBe(3)
  })
})
