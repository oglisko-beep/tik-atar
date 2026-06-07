import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, KEY } from './storage'
import type { AppState } from '../types'

beforeEach(() => localStorage.clear())

const sample: AppState = { sites: {}, activeSiteId: null, ui: { theme: 'light', showExamples: true } }

describe('storage', () => {
  it('round-trips state', () => {
    saveState(sample)
    expect(loadState()).toEqual(sample)
  })
  it('returns null when empty', () => {
    expect(loadState()).toBeNull()
  })
  it('returns null on corrupt json', () => {
    localStorage.setItem(KEY, '{bad')
    expect(loadState()).toBeNull()
  })
  it('returns null on wrong shape', () => {
    localStorage.setItem(KEY, JSON.stringify({ foo: 1 }))
    expect(loadState()).toBeNull()
  })
})
