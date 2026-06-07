import { describe, it, expect } from 'vitest'
import { exportSite, exportAll, parseImport } from './exportImport'
import { newSite } from './siteData'
import type { AppState } from '../types'

describe('exportImport', () => {
  it('round-trips a single site', () => {
    const s = newSite('אתר א', () => 's1')
    s.values['k'] = { a: '1' }
    const res = parseImport(exportSite(s))
    expect(res.kind).toBe('site')
    if (res.kind === 'site') expect(res.site).toEqual(s)
  })

  it('round-trips full app state', () => {
    const s = newSite('א', () => 's1')
    const state: AppState = { sites: { s1: s }, activeSiteId: 's1', ui: { theme: 'dark', showExamples: false } }
    const res = parseImport(exportAll(state))
    expect(res.kind).toBe('all')
    if (res.kind === 'all') expect(res.state).toEqual(state)
  })

  it('rejects junk and wrong shapes', () => {
    expect(parseImport('not json').kind).toBe('error')
    expect(parseImport('{"foo":1}').kind).toBe('error')
  })
})
