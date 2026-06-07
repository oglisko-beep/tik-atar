import type { AppState } from '../types'

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
