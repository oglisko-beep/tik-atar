import { describe, it, expect } from 'vitest'
import { doc } from './index'

describe('subhead ids', () => {
  it('every subhead has an id', () => {
    for (const s of doc.sections)
      for (const b of s.blocks)
        if (b.kind === 'subhead') expect(b.id, `${s.id}: ${b.text}`).toBeTruthy()
  })
  it('subhead ids are unique within a section', () => {
    for (const s of doc.sections) {
      const ids = s.blocks.flatMap((b) => (b.kind === 'subhead' && b.id ? [b.id] : []))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
