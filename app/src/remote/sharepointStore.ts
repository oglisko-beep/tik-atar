import type { SiteData } from '../types'
import { getToken } from './auth'
import { remoteConfig } from './config'
import { resolveSiteId, resolveDriveId, listFiles, readFile, writeFile } from './graph'

let ids: { siteId: string; driveId: string } | null = null

async function getIds(token: string) {
  if (!ids) {
    const siteId = await resolveSiteId(token, remoteConfig.siteUrl)
    const driveId = await resolveDriveId(token, siteId, remoteConfig.library)
    ids = { siteId, driveId }
  }
  return ids
}

export function fileNameFor(site: SiteData): string {
  const base = (site.meta.code || site.id || 'site').replace(/[^\w.\-]+/g, '_')
  return base + '.json'
}

export async function listRemoteSites(): Promise<{ name: string; eTag: string }[]> {
  const t = await getToken()
  const { siteId, driveId } = await getIds(t)
  return listFiles(t, siteId, driveId)
}

export async function loadRemoteSite(name: string): Promise<{ site: SiteData | null; eTag: string }> {
  const t = await getToken()
  const { siteId, driveId } = await getIds(t)
  const { data, eTag } = await readFile(t, siteId, driveId, name)
  return { site: data as SiteData | null, eTag }
}

export async function saveRemoteSite(site: SiteData, eTag: string): Promise<{ eTag: string }> {
  const t = await getToken()
  const { siteId, driveId } = await getIds(t)
  return writeFile(t, siteId, driveId, fileNameFor(site), site, eTag)
}
