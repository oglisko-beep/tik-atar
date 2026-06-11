import type { Block, Doc, Section, SiteData } from '../types'

export interface Excluded {
  sections: Set<string>
  subsections: Set<string>
}

export function excludedOf(site: SiteData | null | undefined): Excluded {
  return {
    sections: new Set(site?.excluded?.sections ?? []),
    subsections: new Set(site?.excluded?.subsections ?? []),
  }
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
