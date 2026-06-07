import type { Doc } from '../types'
import { docControl } from './docControl'
import { siteDetails } from './siteDetails'
import { s1 } from './s1-endpoints'
import { s2 } from './s2-access'
import { s3 } from './s3-network'
import { s4 } from './s4-software'
import { s5 } from './s5-infosec'
import { s6 } from './s6-cyber'
import { s7 } from './s7-suppliers'
import { s8 } from './s8-contacts'
import { s9 } from './s9-appendices'

export const doc: Doc = {
  sections: [docControl, siteDetails, s1, s2, s3, s4, s5, s6, s7, s8, s9],
}

/** Convenience: map of every data-block id -> its block, for quick lookups. */
export function dataBlocks() {
  return doc.sections.flatMap((s) => s.blocks).filter((b): b is Extract<typeof b, { id: string }> => 'id' in b)
}
