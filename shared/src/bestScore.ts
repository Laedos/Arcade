type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): ScoreStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Storage can be missing or throw (private windows, blocked site data); a best score is a
// nicety, so any failure just means starting from zero.
export function loadBest(key: string, storage: ScoreStorage | null = defaultStorage()): number {
  try {
    const value = Number(storage?.getItem(key))
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export function saveBest(key: string, score: number, storage: ScoreStorage | null = defaultStorage()): number {
  const best = Math.max(score, loadBest(key, storage))
  try {
    storage?.setItem(key, String(best))
  } catch {
    // Unwritable storage: keep the in-memory best for this session only.
  }
  return best
}
