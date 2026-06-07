import type { SiteData } from '../types'

function uuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function newSite(name: string, id: () => string = uuid): SiteData {
  const ts = new Date().toISOString()
  return {
    id: id(),
    createdAt: ts,
    updatedAt: ts,
    meta: { name, code: '', version: '1.0', classification: 'לשימוש פנימי' },
    values: {},
  }
}

export function cloneSite(src: SiteData, name: string, id: () => string = uuid): SiteData {
  const ts = new Date().toISOString()
  return {
    id: id(),
    createdAt: ts,
    updatedAt: ts,
    meta: { ...src.meta, name },
    values: structuredClone(src.values),
  }
}
