import { describe, it, expect } from 'vitest'
import { buildIndex } from './CommandPalette'
import { newSite } from '../store/siteData'

/** Search is a way into the portfolio, so it must honour the same exclusions as
 *  the editor — otherwise a hidden column is still findable via Ctrl+K. */
describe('buildIndex column exclusion', () => {
  it('indexes a column while it is visible', () => {
    const site = newSite('T', () => 'site1')
    const hit = buildIndex(site).find((e) => e.blockId === 's7-suppliers' && e.label === 'תוקף')
    expect(hit).toBeTruthy()
  })

  it('drops a column the site has excluded', () => {
    const site = newSite('T', () => 'site1')
    site.excluded = { sections: [], subsections: [], columns: ['s7-suppliers#c5'] }
    const hit = buildIndex(site).find((e) => e.blockId === 's7-suppliers' && e.label === 'תוקף')
    expect(hit).toBeUndefined()
  })

  it('drops an excluded checklist column too', () => {
    const site = newSite('T', () => 'site1')
    site.excluded = { sections: [], subsections: [], columns: ['s6-controls#owner'] }
    const labels = buildIndex(site)
      .filter((e) => e.blockId === 's6-controls' && e.kind === 'טור')
      .map((e) => e.label)
    expect(labels).not.toContain('אחראי')
    expect(labels).toContain('סטטוס')
  })
})
