import { describe, it, expect } from 'vitest'
import { fileNameFor } from './sharepointStore'
import { newSite } from '../store/siteData'

describe('sharepointStore.fileNameFor', () => {
  it('uses the sanitized site code', () => {
    const s = newSite('אתר', () => 'id1')
    s.meta.code = 'GY-TLV-01'
    expect(fileNameFor(s)).toBe('GY-TLV-01.json')
  })
  it('falls back to id when no code, and sanitizes', () => {
    const s = newSite('אתר', () => 'id-9')
    s.meta.code = ''
    expect(fileNameFor(s)).toBe('id-9.json')
  })
})
