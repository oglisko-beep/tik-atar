import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { buildDocxDocument } from './docxExport'
import { newSite } from '../store/siteData'

describe('docxExport', () => {
  it('builds a valid, non-empty .docx for a populated site (exercises every block type)', async () => {
    const site = newSite('אתר בדיקה', () => 's1')
    site.values['site-details'] = { name: 'אתר בדיקה', code: 'GY-TLV-01', address: 'תל אביב' }
    site.values['s1-equipment'] = [
      { _id: '1', c0: 'תחנת עבודה', c1: 'Dell', c2: 'SN1', c3: 'דוד', c4: 'Win11', c5: '2024', c6: 'תקין' },
    ]
    site.values['s5-controls'] = { r0: { status: 'קיים', tool: 'Defender', owner: 'IT' } }
    site.values['dc-approvals'] = { r0: { name: 'י. ישראלי', sign: '', date: '01/06/2026' } }

    const buf = await Packer.toBuffer(buildDocxDocument(site, null))
    expect(buf.byteLength).toBeGreaterThan(2000)
  })

  it('builds even for a completely empty site', async () => {
    const site = newSite('ריק', () => 's2')
    const buf = await Packer.toBuffer(buildDocxDocument(site, null))
    expect(buf.byteLength).toBeGreaterThan(2000)
  })

  it('embeds an uploaded image (network diagram) into the .docx', async () => {
    const PNG_B64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const png = new Uint8Array(Buffer.from(PNG_B64, 'base64'))
    const site = newSite('עם תרשים', () => 's3')
    site.values['s3-diagram'] = [{ id: 'i1', name: 'network.png', dataUrl: 'data:image/png;base64,' + PNG_B64 }]
    const imageMap = { 's3-diagram': [{ data: png, type: 'png' as const, width: 200, height: 120 }] }
    const buf = await Packer.toBuffer(buildDocxDocument(site, null, imageMap))
    expect(buf.byteLength).toBeGreaterThan(2000)
  })
})
