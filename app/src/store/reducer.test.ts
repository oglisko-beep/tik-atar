import { describe, it, expect } from 'vitest'
import { reducer } from './StoreContext'
import { newSite } from './siteData'
import type { AppState } from '../types'

function baseState(): AppState {
  const s = newSite('T', () => 'site1')
  return { sites: { site1: s }, activeSiteId: 'site1', ui: { theme: 'light', showExamples: true } }
}

describe('inclusion reducer actions', () => {
  it('TOGGLE_SECTION adds then removes a section id', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_SECTION', sectionId: 's6' })
    expect(st.sites.site1.excluded?.sections).toEqual(['s6'])
    st = reducer(st, { type: 'TOGGLE_SECTION', sectionId: 's6' })
    expect(st.sites.site1.excluded?.sections).toEqual([])
  })
  it('TOGGLE_SUBSECTION toggles a sub id', () => {
    const st = reducer(baseState(), { type: 'TOGGLE_SUBSECTION', subId: 's3#7' })
    expect(st.sites.site1.excluded?.subsections).toEqual(['s3#7'])
  })
  it('SET_INCLUSION replaces both arrays', () => {
    const st = reducer(baseState(), { type: 'SET_INCLUSION', sections: ['s1'], subsections: ['s1#0'] })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s1'], subsections: ['s1#0'] })
  })
})
