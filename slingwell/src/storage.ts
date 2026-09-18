const BEST_KEY = 'slingwell.best'

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): ScoreStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Storage can be missing or throw (private windows, blocked site data); the best score is a
// nicety, so any failure just means starting from zero.
export function loadBest(storage: ScoreStorage | null = defaultStorage()): number {
  try {
    const value = Number(storage?.getItem(BEST_KEY))
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export function saveBest(score: number, storage: ScoreStorage | null = defaultStorage()): number {
  const best = Math.max(score, loadBest(storage))
  try {
    storage?.setItem(BEST_KEY, String(best))
  } catch {
    // Unwritable storage: keep the in-memory best for this session only.
  }
  return best
}
