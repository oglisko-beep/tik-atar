import { describe, it, expect } from 'vitest'
import { reducer, setEditorName } from './StoreContext'
import { newSite } from './siteData'
import { columnsOf } from '../schema'
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
  it('SET_INCLUSION replaces all three arrays', () => {
    const st = reducer(baseState(), { type: 'SET_INCLUSION', sections: ['s1'], subsections: ['s1#0'], columns: [] })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s1'], subsections: ['s1#0'], columns: [] })
  })
})

describe('TOGGLE_COLUMN', () => {
  it('adds a column key to the exclusion list', () => {
    const st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded?.columns).toEqual(['s7-suppliers#c5'])
  })

  it('removes a key that is already excluded', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    st = reducer(st, { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded?.columns).toEqual([])
  })

  it('refuses to exclude the last visible column of a block', () => {
    const all = columnsOf('s7-suppliers')
    let st = baseState()
    for (const c of all.slice(0, -1)) st = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${c.id}` })
    expect(st.sites.site1.excluded?.columns).toHaveLength(all.length - 1)
    const last = all[all.length - 1]
    st = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${last.id}` })
    expect(st.sites.site1.excluded?.columns).toHaveLength(all.length - 1)
  })

  it('leaves a site saved before columns existed intact', () => {
    const before = baseState()
    before.sites.site1.excluded = { sections: ['s6'], subsections: [] }
    const st = reducer(before, { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s6'], subsections: [], columns: ['s7-suppliers#c5'] })
  })

  it('SET_INCLUSION clears column exclusions', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    st = reducer(st, { type: 'SET_INCLUSION', sections: [], subsections: [], columns: [] })
    expect(st.sites.site1.excluded?.columns).toEqual([])
  })
})

describe('updatedBy stamping', () => {
  it('stamps meta.updatedBy from the current editor on edit', () => {
    setEditorName('דנה כהן')
    const st = reducer(baseState(), { type: 'SET_KV', blockId: 'site-details', fieldId: 'name', value: 'מטה' })
    expect(st.sites.site1.meta.updatedBy).toBe('דנה כהן')
    setEditorName('')
  })
  it('does not stamp when no editor is set', () => {
    setEditorName('')
    const st = reducer(baseState(), { type: 'SET_KV', blockId: 'site-details', fieldId: 'name', value: 'מטה' })
    expect(st.sites.site1.meta.updatedBy).toBeUndefined()
  })
})
