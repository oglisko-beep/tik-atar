import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type Dispatch, type ReactNode,
} from 'react'
import type { AppState, ImageItem, Row, SiteData } from '../types'
import { loadState, saveState, debounce, loadMode, saveMode, loadSharedCache, saveSharedCache } from './storage'
import { newSite, cloneSite } from './siteData'
import { isRemoteConfigured } from '../remote/config'

// When SharePoint is configured the app is a single shared system (no local mode).
const SHARED_ONLY = isRemoteConfigured()

export type Mode = 'local' | 'shared'
export type RemoteStatus =
  | 'off' | 'signedout' | 'loading' | 'synced' | 'saving' | 'readonly' | 'offline' | 'conflict'

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
  | { type: 'REPLACE_SITES'; sites: Record<string, SiteData>; activeSiteId: string | null }
  | { type: 'MERGE_SITE'; site: SiteData }

const now = () => new Date().toISOString()
const defaultUi = () => ({ theme: 'light' as const, showExamples: true })

function init(): AppState {
  if (SHARED_ONLY || loadMode() === 'shared') {
    const cache = loadSharedCache()
    return { sites: cache?.sites ?? {}, activeSiteId: cache?.activeSiteId ?? null, ui: loadState()?.ui ?? defaultUi() }
  }
  const loaded = loadState()
  if (loaded && Object.keys(loaded.sites).length) return loaded
  const s = newSite('אתר חדש')
  return { sites: { [s.id]: s }, activeSiteId: s.id, ui: defaultUi() }
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
      return touchActive(state, (site) => ({ ...site, values: { ...site.values, [action.blockId]: action.rows } }))
    case 'SET_CHECKLIST':
      return touchActive(state, (site) => {
        const cur = (site.values[action.blockId] as Record<string, Record<string, string>>) || {}
        const row = { ...(cur[action.rowId] || {}), [action.colId]: action.value }
        return { ...site, values: { ...site.values, [action.blockId]: { ...cur, [action.rowId]: row } } }
      })
    case 'SET_IMAGES':
      return touchActive(state, (site) => ({ ...site, values: { ...site.values, [action.blockId]: action.images } }))
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
      return { ...state, sites: { ...state.sites, [action.id]: { ...site, meta: { ...site.meta, name: action.name }, updatedAt: now() } } }
    }
    case 'SELECT_SITE':
      return state.sites[action.id] ? { ...state, activeSiteId: action.id } : state
    case 'SET_THEME':
      return { ...state, ui: { ...state.ui, theme: action.theme } }
    case 'TOGGLE_EXAMPLES':
      return { ...state, ui: { ...state.ui, showExamples: !state.ui.showExamples } }
    case 'IMPORT_STATE':
      return action.state
    case 'REPLACE_SITES':
      return { ...state, sites: action.sites, activeSiteId: action.activeSiteId }
    case 'MERGE_SITE':
      return { ...state, sites: { ...state.sites, [action.site.id]: action.site } }
    default:
      return state
  }
}

interface StoreValue {
  state: AppState
  dispatch: Dispatch<Action>
  saving: boolean
  mode: Mode
  remoteStatus: RemoteStatus
  readOnly: boolean
  setMode: (m: Mode) => void
  signIn: () => void
  refreshNow: () => void
}
const StoreCtx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const [mode, setModeState] = useState<Mode>(() => (SHARED_ONLY ? 'shared' : loadMode()))
  const [saving, setSaving] = useState(false)
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>('off')
  const [readOnly, setReadOnly] = useState(false)

  const stateRef = useRef(state); stateRef.current = state
  const statusRef = useRef(remoteStatus); statusRef.current = remoteStatus
  const readOnlyRef = useRef(readOnly); readOnlyRef.current = readOnly
  const eTags = useRef<Record<string, string>>({})
  const editing = useRef(false)
  const justLoaded = useRef(false)

  const saveLocal = useRef(debounce((s: AppState) => { saveState(s); setSaving(false) }, 600)).current
  const saveCache = useRef(debounce((s: AppState) => saveSharedCache({ sites: s.sites, activeSiteId: s.activeSiteId }), 600)).current
  const remoteSave = useRef(debounce((s: SiteData) => { void doRemoteSave(s) }, 1500)).current

  // ---- remote operations (modules lazy-loaded so MSAL stays out of the main bundle) ----
  async function doRemoteSave(site: SiteData) {
    try {
      setRemoteStatus('saving')
      const sp = await import('../remote/sharepointStore')
      const { eTag } = await sp.saveRemoteSite(site, eTags.current[sp.fileNameFor(site)] || '')
      eTags.current[sp.fileNameFor(site)] = eTag
      setRemoteStatus('synced')
    } catch (e: any) {
      const m = String(e?.message)
      if (m === 'forbidden') { setReadOnly(true); setRemoteStatus('readonly'); void revertActiveFromServer() }
      else if (m === 'etag-conflict') { setRemoteStatus('conflict'); void reloadActive() }
      else if (m === 'redirecting' || m === 'no-account') setRemoteStatus('signedout')
      else setRemoteStatus('offline')
    } finally {
      editing.current = false
    }
  }

  async function loadAllRemote() {
    setRemoteStatus('loading')
    try {
      const auth = await import('../remote/auth')
      if (!(await auth.trySsoSilent())) { setRemoteStatus('signedout'); return }
      const sp = await import('../remote/sharepointStore')
      const files = await sp.listRemoteSites()
      const sites: Record<string, SiteData> = {}
      const tags: Record<string, string> = {}
      for (const fm of files) {
        const { site, eTag } = await sp.loadRemoteSite(fm.name)
        if (site) { sites[site.id] = site; tags[fm.name] = eTag }
      }
      eTags.current = tags
      justLoaded.current = true
      dispatch({ type: 'REPLACE_SITES', sites, activeSiteId: Object.keys(sites)[0] ?? null })
      setRemoteStatus(readOnlyRef.current ? 'readonly' : 'synced')
    } catch {
      setRemoteStatus('offline')
    }
  }

  async function reloadActive() {
    const st = stateRef.current
    const site = st.activeSiteId ? st.sites[st.activeSiteId] : null
    if (!site) return
    try {
      const sp = await import('../remote/sharepointStore')
      const file = sp.fileNameFor(site)
      const { site: fresh, eTag } = await sp.loadRemoteSite(file)
      if (fresh && eTag !== eTags.current[file]) {
        eTags.current[file] = eTag
        justLoaded.current = true
        dispatch({ type: 'MERGE_SITE', site: fresh })
      }
      setRemoteStatus(readOnlyRef.current ? 'readonly' : 'synced')
    } catch {
      setRemoteStatus('offline')
    }
  }

  // Forcefully replace the active site with the server copy, discarding a local
  // edit that was just rejected (read-only user). Ignores the eTag short-circuit.
  async function revertActiveFromServer() {
    const st = stateRef.current
    const site = st.activeSiteId ? st.sites[st.activeSiteId] : null
    if (!site) return
    try {
      const sp = await import('../remote/sharepointStore')
      const file = sp.fileNameFor(site)
      const { site: fresh, eTag } = await sp.loadRemoteSite(file)
      if (fresh) {
        eTags.current[file] = eTag
        justLoaded.current = true
        dispatch({ type: 'MERGE_SITE', site: fresh })
      }
    } catch { /* keep local copy if the reload fails */ }
  }

  // ---- persistence: local (v1) in local mode; cache (shared/v1) in shared mode ----
  const firstSave = useRef(true)
  useEffect(() => {
    saveMode(mode)
    if (firstSave.current) { firstSave.current = false; return }
    if (mode === 'local') { setSaving(true); saveLocal(state) }
    else saveCache(state)
  }, [state, mode, saveLocal, saveCache])

  // ---- remote autosave trigger (only on genuine edits in shared mode) ----
  const firstRemote = useRef(true)
  useEffect(() => {
    if (mode !== 'shared') return
    if (firstRemote.current) { firstRemote.current = false; return }
    if (justLoaded.current) { justLoaded.current = false; return }
    const site = state.activeSiteId ? state.sites[state.activeSiteId] : null
    if (site) { editing.current = true; remoteSave(site) }
  }, [state.sites, state.activeSiteId, mode, remoteSave])

  // ---- mode change: load the right source ----
  const firstMode = useRef(true)
  useEffect(() => {
    setReadOnly(false) // re-evaluate edit rights for the new source
    if (mode === 'shared') {
      void loadAllRemote()
    } else {
      setRemoteStatus('off')
      if (!firstMode.current) {
        const loaded = loadState()
        if (loaded && Object.keys(loaded.sites).length) {
          justLoaded.current = true
          dispatch({ type: 'REPLACE_SITES', sites: loaded.sites, activeSiteId: loaded.activeSiteId })
        }
      }
    }
    firstMode.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ---- poll (shared) ----
  useEffect(() => {
    if (mode !== 'shared') return
    const id = setInterval(() => {
      if (!editing.current && statusRef.current !== 'signedout') void reloadActive()
    }, 45000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => { document.documentElement.dataset.theme = state.ui.theme }, [state.ui.theme])

  const setMode = (m: Mode) => setModeState(m)
  const signIn = () => {
    void (async () => {
      try {
        setRemoteStatus('loading')
        const a = await import('../remote/auth')
        await a.login() // navigates away on success (redirect)
      } catch (e) {
        console.error('[shared] sign-in failed', e)
        setRemoteStatus('signedout')
      }
    })()
  }
  const refreshNow = () => { if (mode === 'shared') void reloadActive() }

  const value = useMemo(
    () => ({ state, dispatch, saving, mode, remoteStatus, readOnly, setMode, signIn, refreshNow }),
    [state, saving, mode, remoteStatus, readOnly],
  )
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
