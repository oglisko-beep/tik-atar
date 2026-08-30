import type { Block, ColumnarBlock, Column, Doc, Section, SiteData } from '../types'

export interface Excluded {
  sections: Set<string>
  subsections: Set<string>
  columns: Set<string>
}

export function excludedOf(site: SiteData | null | undefined): Excluded {
  return {
    sections: new Set(site?.excluded?.sections ?? []),
    subsections: new Set(site?.excluded?.subsections ?? []),
    columns: new Set(site?.excluded?.columns ?? []),
  }
}

/** Key for one column of one block. The only place this format is built. */
export const columnKey = (blockId: string, colId: string): string => `${blockId}#${colId}`

/** Columns of a table/checklist block that this site has not excluded. */
export function visibleColumns(block: ColumnarBlock, ex: Excluded): Column[] {
  return block.columns.filter((c) => !ex.columns.has(columnKey(block.id, c.id)))
}

export function visibleSections(doc: Doc, ex: Excluded): Section[] {
  return doc.sections.filter((s) => !ex.sections.has(s.id))
}

/** A sub-chapter spans a subhead until the next subhead. Drops the subhead and
 *  its following blocks when that subhead id is excluded. Blocks before the
 *  first subhead belong to the section and are always kept. */
export function visibleBlocks(section: Section, ex: Excluded): Block[] {
  const out: Block[] = []
  let cut = false
  for (const b of section.blocks) {
    if (b.kind === 'subhead') {
      cut = !!b.id && ex.subsections.has(b.id)
      if (cut) continue
    }
    if (!cut) out.push(b)
  }
  return out
}

export function subsectionsOf(section: Section): { id: string; text: string }[] {
  const subs: { id: string; text: string }[] = []
  for (const b of section.blocks) if (b.kind === 'subhead' && b.id) subs.push({ id: b.id, text: b.text })
  return subs
}

export interface ColumnarBlockRef {
  /** Subhead this block sits under; '' for blocks before the first subhead. */
  subId: string
  blockId: string
  /** Display label — the block has no title of its own. */
  label: string
  columns: readonly Column[]
}

/** Tables and checklists of a section, tagged with the subhead they sit under.
 *  Repeated kinds under one subhead are numbered so they can be told apart. */
export function columnarBlocksOf(section: Section): ColumnarBlockRef[] {
  const out: ColumnarBlockRef[] = []
  let subId = ''
  for (const b of section.blocks) {
    if (b.kind === 'subhead') { subId = b.id ?? ''; continue }
    if (b.kind !== 'table' && b.kind !== 'checklist') continue
    out.push({ subId, blockId: b.id, label: b.kind === 'table' ? 'טבלה' : 'צ׳קליסט', columns: b.columns })
  }
  // Number only the kinds that repeat within the same subhead.
  const total = new Map<string, number>()
  for (const item of out) {
    const k = `${item.subId}|${item.label}`
    total.set(k, (total.get(k) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  for (const item of out) {
    const k = `${item.subId}|${item.label}`
    if ((total.get(k) ?? 0) < 2) continue
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    item.label = `${item.label} ${n}`
  }
  return out
}
