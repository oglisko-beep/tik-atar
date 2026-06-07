import { describe, it, expect } from 'vitest'
import { doc } from './index'
import type { Block } from '../types'

const blocks: Block[] = doc.sections.flatMap((s) => s.blocks)
const withId = blocks.filter((b): b is Extract<Block, { id: string }> => 'id' in b)

describe('schema', () => {
  it('has the 11 top-level sections in order', () => {
    expect(doc.sections.map((s) => s.id)).toEqual([
      'docControl', 'siteDetails', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9',
    ])
  })

  it('every data block id is unique', () => {
    const ids = withId.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('control checklists have the right number of rows', () => {
    const cl = blocks.filter((b): b is Extract<Block, { kind: 'checklist' }> => b.kind === 'checklist')
    expect(cl.find((b) => b.id === 's5-controls')!.rows.length).toBe(14)
    expect(cl.find((b) => b.id === 's6-controls')!.rows.length).toBe(12)
  })

  it('every kv field and table/checklist column has a non-empty label', () => {
    for (const b of blocks) {
      if (b.kind === 'kv') b.fields.forEach((f) => expect(f.label.length).toBeGreaterThan(0))
      if (b.kind === 'table' || b.kind === 'checklist') b.columns.forEach((c) => expect(c.label.length).toBeGreaterThan(0))
    }
  })

  it('status columns use the status field type', () => {
    const cl = blocks.filter((b): b is Extract<Block, { kind: 'checklist' }> => b.kind === 'checklist')
    const statusCols = cl.flatMap((b) => b.columns).filter((c) => c.id === 'status')
    expect(statusCols.length).toBe(2) // s5-controls + s6-controls
    statusCols.forEach((c) => expect(c.type).toBe('status'))
  })
})
