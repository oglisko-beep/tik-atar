import { describe, it, expect } from 'vitest'
import type { Doc, Section } from '../types'
import { excludedOf, visibleSections, visibleBlocks, subsectionsOf } from './inclusion'

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
    const ex = { sections: new Set(['sY']), subsections: new Set<string>() }
    expect(visibleSections(doc, ex).map((s) => s.id)).toEqual(['sX'])
  })
  it('visibleBlocks drops an excluded subhead group, keeps the intro and other groups', () => {
    const ex = { sections: new Set<string>(), subsections: new Set(['sX#0']) }
    const ids = visibleBlocks(section, ex).map((b) => ('id' in b ? b.id : b.kind))
    expect(ids).toEqual(['intro', 'sX#1', 'b1'])
  })
  it('subsectionsOf returns subheads with ids and text', () => {
    expect(subsectionsOf(section)).toEqual([
      { id: 'sX#0', text: 'A' },
      { id: 'sX#1', text: 'B' },
    ])
  })
})
