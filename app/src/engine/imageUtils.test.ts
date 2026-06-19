import { describe, it, expect } from 'vitest'
import { isImageItem } from './imageUtils'

describe('isImageItem', () => {
  it('uses MIME type when present', () => {
    expect(isImageItem({ id: '1', name: 'x.png', dataUrl: '', type: 'image/png' })).toBe(true)
    expect(isImageItem({ id: '1', name: 'x.vsdx', dataUrl: '', type: 'application/vnd.visio' })).toBe(false)
  })
  it('infers image from filename when no type', () => {
    expect(isImageItem({ id: '1', name: 'diagram.png', dataUrl: '' })).toBe(true)
    expect(isImageItem({ id: '1', name: 'photo.JPG', dataUrl: '' })).toBe(true)
  })
  it('infers Visio from filename when no type', () => {
    expect(isImageItem({ id: '1', name: 'net.vsdx', dataUrl: '' })).toBe(false)
    expect(isImageItem({ id: '1', name: 'net.vsd', dataUrl: '' })).toBe(false)
    expect(isImageItem({ id: '1', name: 'net.vsdm', dataUrl: '' })).toBe(false)
  })
})
