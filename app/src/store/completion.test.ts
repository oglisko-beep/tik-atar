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

  it('a checklist row whose only value is in a hidden column counts as unfilled', () => {
    const sec: Section = {
      id: 'sC', title: 'C', blocks: [
        { kind: 'checklist', id: 'ck', rowHeader: 'בקרה', rows: [{ id: 'r0', label: 'A' }], columns: [
          { id: 'status', label: 'סטטוס', type: 'status' },
          { id: 'owner', label: 'אחראי', type: 'text' },
        ] },
      ],
    }
    const values = { ck: { r0: { owner: 'דני' } } }
    const all = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
    const hidden = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['ck#owner']) }
    expect(sectionCompletion(sec, values, all)).toEqual({ total: 1, filled: 1 })
    expect(sectionCompletion(sec, values, hidden)).toEqual({ total: 1, filled: 0 })
  })

  it('table completion is unaffected by column exclusion', () => {
    const sec: Section = {
      id: 'sT', title: 'T', blocks: [
        { kind: 'table', id: 't', columns: [
          { id: 'c0', label: 'A', type: 'text' },
          { id: 'c1', label: 'B', type: 'text' },
        ] },
      ],
    }
    const values = { t: [{ _id: 'r', c0: 'x' }] }
    const hidden = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(sectionCompletion(sec, values, hidden)).toEqual({ total: 1, filled: 1 })
  })

  it('counts no checklist row as filled when every column is excluded', () => {
    // Unreachable through the UI — the reducer refuses to hide a block's last visible
    // column — but `unit` accepts any Excluded, so pin the degenerate case.
    const sec: Section = {
      id: 'sE', title: 'E', blocks: [
        { kind: 'checklist', id: 'ck', rowHeader: 'בקרה', rows: [{ id: 'r0', label: 'A' }], columns: [
          { id: 'status', label: 'סטטוס', type: 'status' },
        ] },
      ],
    }
    const values = { ck: { r0: { status: 'קיים' } } }
    const none = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['ck#status']) }
    expect(sectionCompletion(sec, values, none)).toEqual({ total: 1, filled: 0 })
  })
})
