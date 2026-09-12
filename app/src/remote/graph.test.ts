import { describe, it, expect, vi } from 'vitest'
import { resolveSiteId, resolveDriveId, listFiles, readFile, writeFile, deleteFile } from './graph'

const ok = (body: any, headers: Record<string, string> = {}) =>
  ({ ok: true, status: 200, json: async () => body, headers: { get: (k: string) => headers[k] ?? null } }) as any
const status = (s: number) => ({ ok: s < 400, status: s, json: async () => ({}), headers: { get: () => null } }) as any

describe('graph', () => {
  it('resolves site id', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 'SITE1' }))
    expect(await resolveSiteId('t', 'host:/sites/x', f)).toBe('SITE1')
    expect(f.mock.calls[0][0]).toContain('/sites/host:/sites/x')
  })
  it('resolves drive id by library name', async () => {
    const f = vi.fn().mockResolvedValue(ok({ value: [{ id: 'D1', name: 'Other' }, { id: 'D2', name: 'TikAtarData' }] }))
    expect(await resolveDriveId('t', 'SITE1', 'TikAtarData', f)).toBe('D2')
  })
  it('lists only .json files', async () => {
    const f = vi.fn().mockResolvedValue(ok({ value: [{ name: 'a.json', eTag: 'e1' }, { name: 'x.txt', eTag: 'e2' }] }))
    expect(await listFiles('t', 'S', 'D', f)).toEqual([{ name: 'a.json', eTag: 'e1' }])
  })
  it('reads file via metadata(eTag)+content, null on 404', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(ok({ id: 'IT1', eTag: 'E9' }))
      .mockResolvedValueOnce(ok({ meta: { name: 'הר' } }))
    const r = await readFile('t', 'S', 'D', 'a.json', f)
    expect(r.eTag).toBe('E9')
    expect(r.data.meta.name).toBe('הר')
    const f404 = vi.fn().mockResolvedValue(status(404))
    expect((await readFile('t', 'S', 'D', 'missing.json', f404)).data).toBeNull()
  })
  it('writes with If-Match, maps 412/403', async () => {
    const f = vi.fn().mockResolvedValue(ok({ eTag: 'E10' }))
    const r = await writeFile('t', 'S', 'D', 'a.json', { x: 1 }, 'E9', f)
    expect(r.eTag).toBe('E10')
    expect(f.mock.calls[0][1].headers['If-Match']).toBe('E9')
    await expect(writeFile('t', 'S', 'D', 'a.json', {}, 'E9', vi.fn().mockResolvedValue(status(412)))).rejects.toThrow('etag-conflict')
    await expect(writeFile('t', 'S', 'D', 'a.json', {}, '', vi.fn().mockResolvedValue(status(403)))).rejects.toThrow('forbidden')
  })

  it('deletes a file by path', async () => {
    const f = vi.fn().mockResolvedValue(status(204))
    await deleteFile('t', 'S', 'D', 'a.json', f)
    expect(f.mock.calls[0][0]).toContain('/root:/a.json')
    expect(f.mock.calls[0][1].method).toBe('DELETE')
  })

  it('treats a missing file as already deleted', async () => {
    const f = vi.fn().mockResolvedValue(status(404))
    await expect(deleteFile('t', 'S', 'D', 'gone.json', f)).resolves.toBeUndefined()
  })

  it('reports a forbidden delete so the app can lock to view-only', async () => {
    const f = vi.fn().mockResolvedValue(status(403))
    await expect(deleteFile('t', 'S', 'D', 'a.json', f)).rejects.toThrow('forbidden')
  })
})
