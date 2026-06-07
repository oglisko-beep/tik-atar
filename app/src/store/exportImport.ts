import type { AppState, SiteData } from '../types'

export const SCHEMA_VERSION = 1

export interface ExportEnvelope {
  app: 'tik-atar'
  schemaVersion: number
  exportedAt: string
  scope: 'site' | 'all'
  data: SiteData | AppState
}

export function exportSite(site: SiteData): string {
  const env: ExportEnvelope = {
    app: 'tik-atar',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scope: 'site',
    data: site,
  }
  return JSON.stringify(env, null, 2)
}

export function exportAll(state: AppState): string {
  const env: ExportEnvelope = {
    app: 'tik-atar',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scope: 'all',
    data: state,
  }
  return JSON.stringify(env, null, 2)
}

export type ImportResult =
  | { kind: 'site'; site: SiteData }
  | { kind: 'all'; state: AppState }
  | { kind: 'error'; message: string }

export function parseImport(text: string): ImportResult {
  let env: any
  try {
    env = JSON.parse(text)
  } catch {
    return { kind: 'error', message: 'קובץ JSON פגום' }
  }
  if (env && env.app === 'tik-atar' && env.data) {
    if (env.scope === 'all' && env.data.sites) return { kind: 'all', state: env.data as AppState }
    if (env.scope === 'site' && env.data.meta) return { kind: 'site', site: env.data as SiteData }
  }
  // Tolerate a bare SiteData object
  if (env && env.id && env.meta && env.values) return { kind: 'site', site: env as SiteData }
  return { kind: 'error', message: 'מבנה הקובץ אינו מתאים' }
}

export function download(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFileName(name: string): string {
  return (name || 'site').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'site'
}
