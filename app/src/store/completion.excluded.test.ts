import { describe, it, expect } from 'vitest'
import type { Doc, Section } from '../types'
import { sectionCompletion, overallCompletion } from './completion'

const sec: Section = { id: 's', title: 's', blocks: [
  { kind: 'kv', id: 'k1', fields: [{ id: 'a', label: 'A', type: 'text' }] },
  { kind: 'subhead', text: 'Sub', id: 's#0' },
  { kind: 'kv', id: 'k2', fields: [{ id: 'b', label: 'B', type: 'text' }] },
] }
const doc: Doc = { sections: [sec] }

describe('completion with exclusion', () => {
  it('counts all blocks when no exclusion passed', () => {
    expect(sectionCompletion(sec, {}).total).toBe(2)
  })
  it('drops blocks under an excluded subhead', () => {
    const ex = { sections: new Set<string>(), subsections: new Set(['s#0']) }
    expect(sectionCompletion(sec, {}, ex).total).toBe(1)
  })
  it('overall drops excluded sections', () => {
    const ex = { sections: new Set(['s']), subsections: new Set<string>() }
    expect(overallCompletion(doc, {}, ex).total).toBe(0)
  })
})
