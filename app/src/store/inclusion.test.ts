import { describe, it, expect } from 'vitest'
import type { Block, Doc, Section } from '../types'
import { excludedOf, visibleSections, visibleBlocks, subsectionsOf, visibleColumns, columnarBlocksOf } from './inclusion'

const section: Section = {
  id: 'sX', title: 'X', blocks: [
    { kind: 'kv', id: 'intro', fields: [] },
    { kind: 'subhead', text: 'A', id: 'sX#0' },
    { kind: 'kv', id: 'a1', fields: [] },
    { kind: 'subhead', text: 'B', id: 'sX#1' },
    { kind: 'kv', id: 'b1', fields: [] },
  ],
}
const doc: Doc = { sections: [section, { id: 'sY', title: 'Y', blocks: [] }] }

const tableBlock = {
  kind: 'table', id: 't',
  columns: [
    { id: 'c0', label: 'שם', type: 'text' },
    { id: 'c1', label: 'IP', type: 'ip' },
  ],
} as Extract<Block, { kind: 'table' }>

const checklistBlock = {
  kind: 'checklist', id: 'ck', rowHeader: 'בקרה',
  columns: [
    { id: 'c1', label: 'סטטוס', type: 'status' },
    { id: 'c2', label: 'אחראי', type: 'text' },
  ],
  rows: [{ id: 'r0', label: 'A' }],
} as Extract<Block, { kind: 'checklist' }>

describe('inclusion', () => {
  it('excludedOf(null) -> empty sets', () => {
    const ex = excludedOf(null)
    expect(ex.sections.size).toBe(0)
    expect(ex.subsections.size).toBe(0)
  })
  it('excludedOf reads arrays into sets', () => {
    const ex = excludedOf({ excluded: { sections: ['s1'], subsections: ['s1#0'] } } as never)
    expect(ex.sections.has('s1')).toBe(true)
    expect(ex.subsections.has('s1#0')).toBe(true)
  })
  it('visibleSections drops excluded sections', () => {
    const ex = { sections: new Set(['sY']), subsections: new Set<string>(), columns: new Set<string>() }
    expect(visibleSections(doc, ex).map((s) => s.id)).toEqual(['sX'])
  })
  it('visibleBlocks drops an excluded subhead group, keeps the intro and other groups', () => {
    const ex = { sections: new Set<string>(), subsections: new Set(['sX#0']), columns: new Set<string>() }
    const ids = visibleBlocks(section, ex).map((b) => ('id' in b ? b.id : b.kind))
    expect(ids).toEqual(['intro', 'sX#1', 'b1'])
  })
  it('subsectionsOf returns subheads with ids and text', () => {
    expect(subsectionsOf(section)).toEqual([
      { id: 'sX#0', text: 'A' },
      { id: 'sX#1', text: 'B' },
    ])
  })

  it('excludedOf(null) -> empty columns set', () => {
    expect(excludedOf(null).columns.size).toBe(0)
  })

  it('excludedOf tolerates a site saved before columns existed', () => {
    const ex = excludedOf({ excluded: { sections: [], subsections: [] } } as never)
    expect(ex.columns.size).toBe(0)
  })

  it('excludedOf reads the columns array into a set', () => {
    const ex = excludedOf({ excluded: { sections: [], subsections: [], columns: ['t#c1'] } } as never)
    expect(ex.columns.has('t#c1')).toBe(true)
  })

  it('visibleColumns returns every column when nothing is excluded', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
    expect(visibleColumns(tableBlock, ex).map((c) => c.id)).toEqual(['c0', 'c1'])
  })

  it('visibleColumns drops an excluded column', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(visibleColumns(tableBlock, ex).map((c) => c.id)).toEqual(['c0'])
  })

  it('column keys are namespaced per block — same colId in another block is unaffected', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(visibleColumns(checklistBlock, ex).map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('columnarBlocksOf groups tables and checklists under their subhead', () => {
    const sec: Section = {
      id: 'sZ', title: 'Z', blocks: [
        { kind: 'subhead', text: 'ראשון', id: 'sZ#0' },
        { kind: 'table', id: 'tA', columns: [{ id: 'c0', label: 'A', type: 'text' }] },
        { kind: 'note', text: 'ignored' },
        { kind: 'subhead', text: 'שני', id: 'sZ#1' },
        { kind: 'checklist', id: 'ckB', rowHeader: 'ב', columns: [{ id: 'c1', label: 'B', type: 'text' }], rows: [] },
      ],
    }
    expect(columnarBlocksOf(sec)).toEqual([
      { subId: 'sZ#0', blockId: 'tA', label: 'טבלה', columns: [{ id: 'c0', label: 'A', type: 'text' }] },
      { subId: 'sZ#1', blockId: 'ckB', label: 'צ׳קליסט', columns: [{ id: 'c1', label: 'B', type: 'text' }] },
    ])
  })

  it('columnarBlocksOf numbers repeated kinds within one subhead', () => {
    const sec: Section = {
      id: 'sW', title: 'W', blocks: [
        { kind: 'subhead', text: 'א', id: 'sW#0' },
        { kind: 'table', id: 't1', columns: [{ id: 'c', label: 'C', type: 'text' }] },
        { kind: 'table', id: 't2', columns: [{ id: 'c', label: 'C', type: 'text' }] },
      ],
    }
    expect(columnarBlocksOf(sec).map((b) => b.label)).toEqual(['טבלה 1', 'טבלה 2'])
  })

  it('columnarBlocksOf tags blocks before the first subhead with subId ""', () => {
    const sec: Section = {
      id: 'sV', title: 'V', blocks: [
        { kind: 'table', id: 'tPre', columns: [{ id: 'c0', label: 'A', type: 'text' }] },
        { kind: 'subhead', text: 'ראשון', id: 'sV#0' },
        { kind: 'table', id: 'tPost', columns: [{ id: 'c1', label: 'B', type: 'text' }] },
      ],
    }
    expect(columnarBlocksOf(sec).map((b) => ({ subId: b.subId, blockId: b.blockId }))).toEqual([
      { subId: '', blockId: 'tPre' },
      { subId: 'sV#0', blockId: 'tPost' },
    ])
  })
})
