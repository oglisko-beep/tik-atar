import type { Block, BlockValue, ChecklistValues, Doc, KvValues, Row, Section } from '../types'

export interface Completion {
  total: number
  filled: number
}

function nonEmpty(v?: string): boolean {
  return !!v && v.trim().length > 0
}

function unit(b: Block, v: BlockValue | undefined): Completion {
  if ('optional' in b && b.optional) return { total: 0, filled: 0 }
  if (b.kind === 'kv') {
    const kv = (v as KvValues) || {}
    return { total: b.fields.length, filled: b.fields.filter((f) => nonEmpty(kv[f.id])).length }
  }
  if (b.kind === 'checklist') {
    const cv = (v as ChecklistValues) || {}
    return {
      total: b.rows.length,
      filled: b.rows.filter((r) => {
        const rv = cv[r.id]
        return rv && Object.values(rv).some((x) => nonEmpty(x))
      }).length,
    }
  }
  if (b.kind === 'table') {
    const rows = (v as Row[]) || []
    const has = rows.some((r) => Object.entries(r).some(([k, val]) => k !== '_id' && nonEmpty(val)))
    return { total: 1, filled: has ? 1 : 0 }
  }
  return { total: 0, filled: 0 }
}

export function sectionCompletion(sec: Section, values: Record<string, BlockValue>): Completion {
  return sec.blocks.reduce<Completion>(
    (acc, b) => {
      const id = 'id' in b ? b.id : undefined
      const u = unit(b, id ? values[id] : undefined)
      return { total: acc.total + u.total, filled: acc.filled + u.filled }
    },
    { total: 0, filled: 0 },
  )
}

export function overallCompletion(doc: Doc, values: Record<string, BlockValue>): Completion {
  return doc.sections.reduce<Completion>(
    (acc, sec) => {
      const c = sectionCompletion(sec, values)
      return { total: acc.total + c.total, filled: acc.filled + c.filled }
    },
    { total: 0, filled: 0 },
  )
}

export const pct = (c: Completion): number => (c.total ? Math.round((c.filled / c.total) * 100) : 0)
