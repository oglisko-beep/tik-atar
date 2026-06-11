import type { AppState, SiteData } from '../types'

export const KEY = 'tik-atar/v1'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || typeof s !== 'object' || !('sites' in s) || !('ui' in s)) return null
    return s as AppState
  } catch {
    return null
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full / unavailable — ignore */
  }
}

export function debounce<T extends (...a: any[]) => void>(fn: T, ms = 500) {
  let t: ReturnType<typeof setTimeout>
  return (...a: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
}

// ---- shared-mode persistence (separate keys so local data is never overwritten) ----
const MODE_KEY = 'tik-atar/mode'
const SHARED_KEY = 'tik-atar/shared/v1'

export function loadMode(): 'local' | 'shared' {
  try {
    return localStorage.getItem(MODE_KEY) === 'shared' ? 'shared' : 'local'
  } catch {
    return 'local'
  }
}
export function saveMode(m: 'local' | 'shared'): void {
  try {
    localStorage.setItem(MODE_KEY, m)
  } catch {
    /* ignore */
  }
}

export interface SharedCache {
  sites: Record<string, SiteData>
  activeSiteId: string | null
}
export function loadSharedCache(): SharedCache | null {
  try {
    const raw = localStorage.getItem(SHARED_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || typeof s !== 'object' || !('sites' in s)) return null
    return s as SharedCache
  } catch {
    return null
  }
}
export function saveSharedCache(c: SharedCache): void {
  try {
    localStorage.setItem(SHARED_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}
