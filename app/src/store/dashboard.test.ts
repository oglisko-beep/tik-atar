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
})
