import { describe, it, expect } from 'vitest'
import type { SiteData } from '../types'
import { buildDashboard, relativeUpdated } from './dashboard'

const DAY = 86400000
const NOW = Date.parse('2026-06-16T00:00:00Z')

function site(id: string, over: Partial<SiteData> = {}): SiteData {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: over.updatedAt ?? new Date(NOW - DAY).toISOString(),
    meta: { name: id, code: '', version: '1.0', classification: 'לשימוש פנימי', ...(over.meta || {}) },
    values: over.values ?? {},
  }
}

describe('relativeUpdated', () => {
  it('buckets time since update (Hebrew, with dual forms)', () => {
    expect(relativeUpdated(new Date(NOW).toISOString(), NOW)).toBe('היום')
    expect(relativeUpdated(new Date(NOW - 2 * DAY).toISOString(), NOW)).toBe('לפני יומיים')
    expect(relativeUpdated(new Date(NOW - 4 * DAY).toISOString(), NOW)).toBe('לפני 4 ימים')
    expect(relativeUpdated(new Date(NOW - 14 * DAY).toISOString(), NOW)).toBe('לפני שבועיים')
    expect(relativeUpdated(new Date(NOW - 150 * DAY).toISOString(), NOW)).toBe('לפני 5 חודשים')
  })
})

describe('buildDashboard', () => {
  it('reports site count and zero completion for empty sites', () => {
    const d = buildDashboard({ a: site('a'), b: site('b') }, NOW)
    expect(d.kpis.siteCount).toBe(2)
    expect(d.kpis.avgCompletion).toBe(0)
    expect(d.kpis.completed).toBe(0)
  })

  it('sums filled inventory rows across sites (ignores empty rows)', () => {
    const a = site('a', { values: { 's3-servers': [{ _id: '1', x: 'srv1' }, { _id: '2' }], 's1-equipment': [{ _id: '1', y: 'pc' }] } })
    const b = site('b', { values: { 's3-servers': [{ _id: '1', x: 'srv2' }], 's4-software': [{ _id: '1', z: 'M365' }] } })
    const d = buildDashboard({ a, b }, NOW)
    expect(d.inventory.servers).toBe(2)
    expect(d.inventory.endpoints).toBe(1)
    expect(d.inventory.software).toBe(1)
    expect(d.inventory.network).toBe(0)
  })

  it('builds a security row per control with per-site statuses and critical tagging', () => {
    const a = site('a', { values: { 's5-controls': { r3: { status: 'קיים' } } } })
    const d = buildDashboard({ a }, NOW)
    expect(d.security.rows.length).toBeGreaterThanOrEqual(14)
    const backup = d.security.rows.find((r) => r.label === 'גיבוי')
    expect(backup?.critical).toBe(true)
    expect(backup?.statuses['a']).toBe('קיים')
  })

  it('flags a site with a missing critical control as attention (severity bad)', () => {
    const a = site('a', { values: { 's5-controls': { r3: { status: 'חסר' } } } })
    const d = buildDashboard({ a }, NOW)
    const item = d.attention.find((x) => x.siteId === 'a')
    expect(item).toBeTruthy()
    expect(item?.severity).toBe('bad')
    expect(item?.reasons.some((r) => r.includes('גיבוי'))).toBe(true)
    expect(d.kpis.needAttention).toBe(1)
  })

  it('flags a stale site', () => {
    const a = site('a', { updatedAt: new Date(NOW - 150 * DAY).toISOString() })
    const d = buildDashboard({ a }, NOW)
    const item = d.attention.find((x) => x.siteId === 'a')
    expect(item?.reasons.some((r) => r.includes('לא עודכן'))).toBe(true)
  })

  it('collects contracts/licenses expiring within the window, sorted soonest-first', () => {
    // NOW = 2026-06-16. s7 "תוקף" = c5, name = c0; s4 "חידוש" = c5, name = c0
    const a = site('a', {
      values: {
        's7-suppliers': [{ _id: '1', c0: 'ספק קרוב', c5: '20/06/2026' }, { _id: '2', c0: 'ספק רחוק', c5: '12/2027' }],
        's4-software': [{ _id: '1', c0: 'M365', c5: '07/2026' }], // renews end of July → within 60d
      },
    })
    const d = buildDashboard({ a }, NOW)
    expect(d.expiries.length).toBe(2) // the 2027 contract is beyond the 60-day window
    expect(d.expiries.every((e) => e.daysLeft <= 60)).toBe(true)
    expect(d.expiries[0].daysLeft).toBeLessThanOrEqual(d.expiries[1].daysLeft) // sorted ascending
    expect(d.expiries[0].name).toBe('ספק קרוב') // 20/06 is soonest
    expect(d.expiries.map((e) => e.name)).toContain('M365')
  })

  it('marks an already-expired contract as attention severity bad', () => {
    const a = site('a', { values: { 's7-suppliers': [{ _id: '1', c0: 'ספק פג', c5: '01/2026' }] } })
    const d = buildDashboard({ a }, NOW)
    const exp = d.expiries.find((e) => e.name === 'ספק פג')
    expect(exp).toBeTruthy()
    expect(exp!.daysLeft).toBeLessThan(0)
    const item = d.attention.find((x) => x.siteId === 'a')
    expect(item?.severity).toBe('bad')
    expect(item?.reasons.some((r) => r.includes('פקיעה קרובה'))).toBe(true)
  })

  it('skips a site that excluded the expiry column, but not its siblings', () => {
    const soon = '01/07/2026' // ~15 days after NOW, inside the 60-day window
    const vals = { 's7-suppliers': [{ _id: 'r', c0: 'ספק', c5: soon }] }
    const a = site('a', { values: vals })
    const b = { ...site('b', { values: vals }), excluded: { sections: [], subsections: [], columns: ['s7-suppliers#c5'] } }
    const d = buildDashboard({ a, b }, NOW)
    expect(d.expiries.map((e) => e.siteId)).toEqual(['a'])
  })

  it('falls back to the first visible column for the expiry item name', () => {
    const s = {
      ...site('a', { values: { 's7-suppliers': [{ _id: 'r', c0: 'ספק', c1: 'תחום', c5: '01/07/2026' }] } }),
      excluded: { sections: [], subsections: [], columns: ['s7-suppliers#c0'] },
    }
    const d = buildDashboard({ a: s }, NOW)
    expect(d.expiries[0].name).toBe('תחום')
  })
})
