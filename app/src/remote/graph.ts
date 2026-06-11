import { GRAPH } from './config'

type F = typeof fetch
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/')

export async function resolveSiteId(token: string, sitePath: string, f: F = fetch): Promise<string> {
  const r = await f(`${GRAPH}/sites/${sitePath}`, { headers: auth(token) })
  if (!r.ok) throw new Error(`site ${r.status}`)
  return (await r.json()).id
}

export async function resolveDriveId(token: string, siteId: string, library: string, f: F = fetch): Promise<string> {
  const r = await f(`${GRAPH}/sites/${siteId}/drives`, { headers: auth(token) })
  if (!r.ok) throw new Error(`drives ${r.status}`)
  const d = (await r.json()).value.find((x: any) => x.name === library)
  if (!d) throw new Error('library-not-found')
  return d.id
}

export async function listFiles(token: string, siteId: string, driveId: string, f: F = fetch): Promise<{ name: string; eTag: string }[]> {
  const r = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root/children?$select=name,eTag`, { headers: auth(token) })
  if (!r.ok) throw new Error(`list ${r.status}`)
  return (await r.json()).value
    .filter((x: any) => x.name.endsWith('.json'))
    .map((x: any) => ({ name: x.name, eTag: x.eTag }))
}

export async function readFile(token: string, siteId: string, driveId: string, name: string, f: F = fetch): Promise<{ data: any; eTag: string }> {
  const meta = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root:/${enc(name)}`, { headers: auth(token) })
  if (meta.status === 404) return { data: null, eTag: '' }
  if (!meta.ok) throw new Error(`meta ${meta.status}`)
  const m = await meta.json()
  const content = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/items/${m.id}/content`, { headers: auth(token) })
  if (!content.ok) throw new Error(`content ${content.status}`)
  return { data: await content.json(), eTag: m.eTag || '' }
}

export async function writeFile(
  token: string,
  siteId: string,
  driveId: string,
  name: string,
  data: unknown,
  eTag: string,
  f: F = fetch,
): Promise<{ eTag: string }> {
  const headers: Record<string, string> = { ...auth(token), 'Content-Type': 'application/json' }
  if (eTag) headers['If-Match'] = eTag
  const r = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root:/${enc(name)}:/content`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  if (r.status === 412) throw new Error('etag-conflict')
  if (r.status === 403) throw new Error('forbidden')
  if (!r.ok) throw new Error(`write ${r.status}`)
  return { eTag: (await r.json()).eTag || '' }
}
