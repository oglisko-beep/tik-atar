import { describe, it, expect } from 'vitest'
import { sectionCompletion, overallCompletion, pct } from './completion'
import { doc } from '../schema'
import type { Section } from '../types'

const sec: Section = {
  id: 'x',
  title: 'x',
  blocks: [
    { kind: 'kv', id: 'k', fields: [{ id: 'a', label: 'A', type: 'text' }, { id: 'b', label: 'B', type: 'text' }] },
    { kind: 'checklist', id: 'c', rowHeader: 'בקרה', columns: [{ id: 'status', label: 'סטטוס', type: 'status' }], rows: [{ id: 'r1', label: '1' }, { id: 'r2', label: '2' }] },
    { kind: 'table', id: 't', columns: [{ id: 'c0', label: 'X', type: 'text' }], optional: true },
  ],
}

describe('completion', () => {
  it('counts kv fields + checklist rows and ignores optional blocks', () => {
    expect(sectionCompletion(sec, {}).total).toBe(4)
  })
  it('counts filled kv fields and checklist rows', () => {
    const c = sectionCompletion(sec, { k: { a: 'x' }, c: { r1: { status: 'קיים' } } })
    expect(c.filled).toBe(2)
  })
  it('treats a table as one filled unit when any cell has content', () => {
    const s2: Section = { id: 'y', title: 'y', blocks: [{ kind: 'table', id: 't2', columns: [{ id: 'c0', label: 'X', type: 'text' }] }] }
    expect(sectionCompletion(s2, {}).filled).toBe(0)
    expect(sectionCompletion(s2, { t2: [{ _id: '1', c0: 'hi' }] }).filled).toBe(1)
  })
  it('pct rounds and guards divide-by-zero', () => {
    expect(pct({ filled: 1, total: 3 })).toBe(33)
    expect(pct({ filled: 0, total: 0 })).toBe(0)
    expect(pct({ filled: 4, total: 4 })).toBe(100)
  })
  it('overall completion over the real doc starts at 0 and has a positive total', () => {
    const c = overallCompletion(doc, {})
    expect(c.filled).toBe(0)
    expect(c.total).toBeGreaterThan(50)
  })
})
