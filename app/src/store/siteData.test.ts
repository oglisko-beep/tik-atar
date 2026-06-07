import { describe, it, expect } from 'vitest'
import { newSite, cloneSite } from './siteData'

describe('siteData', () => {
  it('creates a blank site with defaults', () => {
    const s = newSite('אתר תל אביב', () => 'id1')
    expect(s.id).toBe('id1')
    expect(s.meta.name).toBe('אתר תל אביב')
    expect(s.meta.version).toBe('1.0')
    expect(s.meta.classification).toBe('לשימוש פנימי')
    expect(s.values).toEqual({})
  })

  it('clones values deeply with a new id and name', () => {
    const a = newSite('A', () => 'a')
    a.values['x'] = { f: 'v' }
    const b = cloneSite(a, 'B', () => 'b')
    expect(b.id).toBe('b')
    expect(b.meta.name).toBe('B')
    expect(b.values).toEqual({ x: { f: 'v' } })
    ;(b.values['x'] as Record<string, string>).f = 'changed'
    expect((a.values['x'] as Record<string, string>).f).toBe('v')
  })
})
