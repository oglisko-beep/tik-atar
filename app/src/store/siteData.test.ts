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

  it('carries the portfolio scope over to the clone', () => {
    // Cloning is how a new building's portfolio is started from an existing one,
    // so the chapter/sub-chapter/column choices are exactly what should survive.
    const a = newSite('A', () => 'a')
    a.excluded = { sections: ['s6'], subsections: ['s3#1'], columns: ['s7-suppliers#c5'] }
    const b = cloneSite(a, 'B', () => 'b')
    expect(b.excluded).toEqual({ sections: ['s6'], subsections: ['s3#1'], columns: ['s7-suppliers#c5'] })
  })

  it('deep-copies the scope so the clone and the source diverge', () => {
    const a = newSite('A', () => 'a')
    a.excluded = { sections: [], subsections: [], columns: ['s7-suppliers#c5'] }
    const b = cloneSite(a, 'B', () => 'b')
    b.excluded!.columns!.push('s4-software#c5')
    expect(a.excluded!.columns).toEqual(['s7-suppliers#c5'])
  })

  it('leaves a site with no scope set without one', () => {
    const a = newSite('A', () => 'a')
    expect(cloneSite(a, 'B', () => 'b').excluded).toBeUndefined()
  })
})
