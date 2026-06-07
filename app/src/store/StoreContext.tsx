import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type Dispatch, type ReactNode,
} from 'react'
import type { AppState, ImageItem, Row, SiteData } from '../types'
import { loadState, saveState, debounce } from './storage'
import { newSite, cloneSite } from './siteData'

export type Action =
  | { type: 'SET_KV'; blockId: string; fieldId: string; value: string }
  | { type: 'SET_TABLE'; blockId: string; rows: Row[] }
  | { type: 'SET_CHECKLIST'; blockId: string; rowId: string; colId: string; value: string }
  | { type: 'SET_IMAGES'; blockId: string; images: ImageItem[] }
  | { type: 'SET_META'; patch: Partial<SiteData['meta']> }
  | { type: 'NEW_SITE'; name: string }
  | { type: 'CLONE_SITE'; name?: string }
  | { type: 'DELETE_SITE'; id: string }
  | { type: 'RENAME_SITE'; id: string; name: string }
  | { type: 'SELECT_SITE'; id: string }
  | { type: 'SET_THEME'; theme: 'light' | 'dark' }
  | { type: 'TOGGLE_EXAMPLES' }
  | { type: 'IMPORT_STATE'; state: AppState }

const now = () => new Date().toISOString()

function init(): AppState {
  const loaded = loadState()
  if (loaded && Object.keys(loaded.sites).length) return loaded
  const s = newSite('אתר חדש')
  return { sites: { [s.id]: s }, activeSiteId: s.id, ui: { theme: 'light', showExamples: true } }
}

/** Apply a mutation to the active site and bump its updatedAt. */
function touchActive(state: AppState, mutate: (site: SiteData) => SiteData): AppState {
  const id = state.activeSiteId
  if (!id || !state.sites[id]) return state
  const updated = { ...mutate(state.sites[id]), updatedAt: now() }
  return { ...state, sites: { ...state.sites, [id]: updated } }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_KV':
      return touchActive(state, (site) => {
        const cur = (site.values[action.blockId] as Record<string, string>) || {}
        return { ...site, values: { ...site.values, [action.blockId]: { ...cur, [action.fieldId]: action.value } } }
      })
    case 'SET_TABLE':
      return touchActive(state, (site) => ({
        ...site,
        values: { ...site.values, [action.blockId]: action.rows },
      }))
    case 'SET_CHECKLIST':
      return touchActive(state, (site) => {
        const cur = (site.values[action.blockId] as Record<string, Record<string, string>>) || {}
        const row = { ...(cur[action.rowId] || {}), [action.colId]: action.value }
        return { ...site, values: { ...site.values, [action.blockId]: { ...cur, [action.rowId]: row } } }
      })
    case 'SET_IMAGES':
      return touchActive(state, (site) => ({
        ...site,
        values: { ...site.values, [action.blockId]: action.images },
      }))
    case 'SET_META':
      return touchActive(state, (site) => ({ ...site, meta: { ...site.meta, ...action.patch } }))
    case 'NEW_SITE': {
      const s = newSite(action.name || 'אתר חדש')
      return { ...state, sites: { ...state.sites, [s.id]: s }, activeSiteId: s.id }
    }
    case 'CLONE_SITE': {
      const src = state.activeSiteId ? state.sites[state.activeSiteId] : null
      if (!src) return state
      const s = cloneSite(src, action.name || `${src.meta.name} (עותק)`)
      return { ...state, sites: { ...state.sites, [s.id]: s }, activeSiteId: s.id }
    }
    case 'DELETE_SITE': {
      const sites = { ...state.sites }
      delete sites[action.id]
      const ids = Object.keys(sites)
      if (!ids.length) {
        const s = newSite('אתר חדש')
        return { sites: { [s.id]: s }, activeSiteId: s.id, ui: state.ui }
      }
      const activeSiteId = action.id === state.activeSiteId ? ids[0] : state.activeSiteId
      return { ...state, sites, activeSiteId }
    }
    case 'RENAME_SITE': {
      const site = state.sites[action.id]
      if (!site) return state
      return {
        ...state,
        sites: { ...state.sites, [action.id]: { ...site, meta: { ...site.meta, name: action.name }, updatedAt: now() } },
      }
    }
    case 'SELECT_SITE':
      return state.sites[action.id] ? { ...state, activeSiteId: action.id } : state
    case 'SET_THEME':
      return { ...state, ui: { ...state.ui, theme: action.theme } }
    case 'TOGGLE_EXAMPLES':
      return { ...state, ui: { ...state.ui, showExamples: !state.ui.showExamples } }
    case 'IMPORT_STATE':
      return action.state
    default:
      return state
  }
}

interface StoreValue {
  state: AppState
  dispatch: Dispatch<Action>
  saving: boolean
}
const StoreCtx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const [saving, setSaving] = useState(false)
  const first = useRef(true)
  const save = useRef(debounce((s: AppState) => { saveState(s); setSaving(false) }, 600)).current

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaving(true)
    save(state)
  }, [state, save])

  useEffect(() => {
    document.documentElement.dataset.theme = state.ui.theme
  }, [state.ui.theme])

  const value = useMemo(() => ({ state, dispatch, saving }), [state, saving])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useActiveSite(): SiteData | null {
  const { state } = useStore()
  return state.activeSiteId ? state.sites[state.activeSiteId] ?? null : null
}

export function useBlockValue(blockId: string) {
  const site = useActiveSite()
  return site?.values[blockId]
}
