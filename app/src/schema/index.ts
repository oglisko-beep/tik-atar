import type { Column, Doc } from '../types'
import { docControl } from './docControl'
import { siteDetails } from './siteDetails'
import { s1 } from './s1-endpoints'
import { s2 } from './s2-access'
import { s3 } from './s3-network'
import { s4 } from './s4-software'
import { s5 } from './s5-infosec'
import { s6 } from './s6-cyber'
import { sdr } from './sdr-dr'
import { s7 } from './s7-suppliers'
import { s8 } from './s8-contacts'
import { s9 } from './s9-appendices'

export const doc: Doc = {
  sections: [docControl, siteDetails, s1, s2, s3, s4, s5, s6, sdr, s7, s8, s9],
}

// Give every sub-heading a stable id (section id + its ordinal among subheads)
// so sub-chapters can be individually included/excluded per site.
for (const section of doc.sections) {
  let ordinal = 0
  for (const block of section.blocks) {
    if (block.kind === 'subhead') {
      if (!block.id) block.id = `${section.id}#${ordinal}`
      ordinal++
    }
  }
}

/** Convenience: map of every data-block id -> its block, for quick lookups. */
export function dataBlocks() {
  return doc.sections.flatMap((s) => s.blocks).filter((b): b is Extract<typeof b, { id: string }> => 'id' in b)
}

/** Columns of a table/checklist block, by block id. Empty when the id is unknown
 *  or the block has no columns. Used by the reducer's last-column guard. */
export function columnsOf(blockId: string): readonly Column[] {
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if ((block.kind === 'table' || block.kind === 'checklist') && block.id === blockId) return block.columns
    }
  }
  return []
}
