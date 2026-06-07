import '@testing-library/jest-dom'

// Node 25 ships an experimental global `localStorage` (web storage) that shadows
// jsdom's and lacks a usable `.clear()`. Replace it with a clean in-memory store
// so storage tests are deterministic. (The real browser localStorage is used at runtime.)
function makeStorage(): Storage {
  let m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear() {
      m = new Map()
    },
    getItem(k: string) {
      return m.has(k) ? m.get(k)! : null
    },
    setItem(k: string, v: string) {
      m.set(k, String(v))
    },
    removeItem(k: string) {
      m.delete(k)
    },
    key(i: number) {
      return Array.from(m.keys())[i] ?? null
    },
  } as Storage
}

try {
  Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), configurable: true, writable: true })
} catch {
  globalThis.localStorage = makeStorage()
}
