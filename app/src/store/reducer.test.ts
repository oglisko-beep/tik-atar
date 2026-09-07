import { describe, it, expect } from 'vitest'
import { reducer, setEditorName } from './StoreContext'
import { newSite } from './siteData'
import { columnsOf, rowsOf } from '../schema'
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
  it('SET_INCLUSION replaces all four arrays', () => {
    const st = reducer(baseState(), { type: 'SET_INCLUSION', sections: ['s1'], subsections: ['s1#0'], columns: [], rows: [] })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s1'], subsections: ['s1#0'], columns: [], rows: [] })
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
    expect(st.sites.site1.excluded).toEqual({ sections: ['s6'], subsections: [], columns: ['s7-suppliers#c5'], rows: [] })
  })

  it('a refused toggle does not mark the site as edited', () => {
    const all = columnsOf('s7-suppliers')
    let st = baseState()
    for (const c of all.slice(0, -1)) st = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${c.id}` })
    const before = st.sites.site1.updatedAt
    const after = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${all[all.length - 1].id}` })
    expect(after.sites.site1.updatedAt).toBe(before)
  })

  it('SET_INCLUSION clears column exclusions', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    st = reducer(st, { type: 'SET_INCLUSION', sections: [], subsections: [], columns: [], rows: [] })
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

describe('TOGGLE_ROW', () => {
  it('filters a checklist row out and back in', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_ROW', key: 's6-resilience#r4' })
    expect(st.sites.site1.excluded?.rows).toEqual(['s6-resilience#r4'])
    st = reducer(st, { type: 'TOGGLE_ROW', key: 's6-resilience#r4' })
    expect(st.sites.site1.excluded?.rows).toEqual([])
  })

  it('refuses to hide the last visible row of a checklist', () => {
    const all = rowsOf('s6-resilience')
    let st = baseState()
    for (const r of all.slice(0, -1)) st = reducer(st, { type: 'TOGGLE_ROW', key: `s6-resilience#${r.id}` })
    expect(st.sites.site1.excluded?.rows).toHaveLength(all.length - 1)
    st = reducer(st, { type: 'TOGGLE_ROW', key: `s6-resilience#${all[all.length - 1].id}` })
    expect(st.sites.site1.excluded?.rows).toHaveLength(all.length - 1)
  })

  it('a refused toggle does not mark the site as edited', () => {
    const all = rowsOf('s6-resilience')
    let st = baseState()
    for (const r of all.slice(0, -1)) st = reducer(st, { type: 'TOGGLE_ROW', key: `s6-resilience#${r.id}` })
    const before = st.sites.site1.updatedAt
    const after = reducer(st, { type: 'TOGGLE_ROW', key: `s6-resilience#${all[all.length - 1].id}` })
    expect(after.sites.site1.updatedAt).toBe(before)
  })

  it('rows and columns are independent namespaces', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_ROW', key: 's6-controls#r0' })
    st = reducer(st, { type: 'TOGGLE_COLUMN', key: 's6-controls#owner' })
    expect(st.sites.site1.excluded?.rows).toEqual(['s6-controls#r0'])
    expect(st.sites.site1.excluded?.columns).toEqual(['s6-controls#owner'])
  })
})
