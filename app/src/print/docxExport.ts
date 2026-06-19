import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, ImageRun,
} from 'docx'
import type { Block, ChecklistValues, ImageItem, KvValues, Row, SiteData } from '../types'
import { doc as schema } from '../schema'
import { excludedOf, visibleSections, visibleBlocks } from '../store/inclusion'
import { isImageItem } from '../engine/imageUtils'

interface ProcessedImage { data: Uint8Array; type: 'png' | 'jpg'; width: number; height: number }
type ImageMap = Record<string, ProcessedImage[]>

function dataUrlToBytes(dataUrl: string): { data: Uint8Array; type: 'png' | 'jpg' } | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  try {
    const bin = atob(dataUrl.slice(comma + 1))
    const data = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
    return { data, type: dataUrl.slice(0, comma).includes('png') ? 'png' : 'jpg' }
  } catch {
    return null
  }
}
function imgDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res({ w: img.naturalWidth || 600, h: img.naturalHeight || 400 })
    img.onerror = () => res({ w: 600, h: 400 })
    img.src = dataUrl
  })
}
async function processImages(site: SiteData): Promise<ImageMap> {
  const map: ImageMap = {}
  const ids = schema.sections
    .flatMap((s) => s.blocks)
    .filter((b): b is Extract<Block, { kind: 'image' }> => b.kind === 'image')
    .map((b) => b.id)
  for (const id of ids) {
    const items = (site.values[id] as ImageItem[]) || []
    const out: ProcessedImage[] = []
    for (const it of items) {
      if (!isImageItem(it)) continue
      const bytes = dataUrlToBytes(it.dataUrl)
      if (!bytes) continue
      const { w, h } = await imgDims(it.dataUrl)
      const width = Math.min(600, w)
      const height = Math.max(1, Math.round(width * (h / w)))
      out.push({ data: bytes.data, type: bytes.type, width, height })
    }
    if (out.length) map[id] = out
  }
  return map
}

const FONT = 'Arial'
const TABLE_W = 9746
const C = {
  primary: '104E7D', primaryDark: '0B3A5E', accent: 'EEC21B',
  kvFill: 'EAF2FA', border: 'BFBFBF', note: '595959',
}
const B = { style: BorderStyle.SINGLE, size: 4, color: C.border }
const allB = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B }

type RunOpts = { size?: number; bold?: boolean; italics?: boolean; color?: string }
function run(text: unknown, o: RunOpts = {}) {
  return new TextRun({ text: String(text ?? ''), rightToLeft: true, font: FONT, ...o })
}
function para(text: string, o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; size?: number; bold?: boolean; italics?: boolean; color?: string } = {}) {
  return new Paragraph({
    bidirectional: true, alignment: o.align || AlignmentType.RIGHT, spacing: { after: o.after ?? 120 },
    children: [run(text, { size: o.size, bold: o.bold, italics: o.italics, color: o.color })],
  })
}
function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, bidirectional: true, alignment: AlignmentType.RIGHT, pageBreakBefore: true,
    spacing: { before: 120, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.primary, space: 4 } },
    children: [run(text)],
  })
}
function h2(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { before: 180, after: 80 }, children: [run(text)] })
}
function note(text: string) {
  return new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 120 }, children: [run(text, { size: 20, italics: true, color: C.note })] })
}
function bullet(text: string) {
  return new Paragraph({ numbering: { reference: 'bul', level: 0 }, bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 40 }, children: [run(text, { size: 20 })] })
}
function spacer(h = 120) {
  return new Paragraph({ spacing: { after: h }, children: [] })
}
function eqWidths(n: number): number[] {
  const w = Math.floor(TABLE_W / n)
  const out = Array(n).fill(w)
  out[n - 1] = TABLE_W - w * (n - 1)
  return out
}
type CellOpts = { w: number; fill?: string; header?: boolean; bold?: boolean; italics?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }
function cell(text: string, o: CellOpts) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      bidirectional: true, alignment: o.align || AlignmentType.RIGHT, spacing: { after: 0 },
      children: [run(text, { size: 18, bold: o.header ? true : o.bold, italics: o.italics, color: o.header ? 'FFFFFF' : o.color })],
    })],
  })
}
function dataTable(headers: string[], rows: string[][]) {
  const w = eqWidths(headers.length)
  const trs: TableRow[] = []
  trs.push(new TableRow({ tableHeader: true, children: headers.map((t, i) => cell(t, { w: w[i], fill: C.primary, header: true })) }))
  if (!rows.length) rows = [headers.map((_, i) => (i === 0 ? '— לא הוזן —' : ''))]
  rows.forEach((r) => trs.push(new TableRow({ children: headers.map((_, i) => cell(r[i] ?? '', { w: w[i] })) })))
  return new Table({ width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: w, visuallyRightToLeft: true, borders: allB, rows: trs })
}
function kvTable(pairs: [string, string][]) {
  const keyW = Math.round(TABLE_W * 0.32)
  const valW = TABLE_W - keyW
  const rows = pairs.map(([k, v]) => new TableRow({
    children: [cell(k, { w: keyW, fill: C.kvFill, bold: true }), cell(v, { w: valW })],
  }))
  return new Table({ width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [keyW, valW], visuallyRightToLeft: true, borders: allB, rows })
}
function calloutBox(title: string, items: string[]) {
  const cb = { style: BorderStyle.SINGLE, size: 6, color: 'C0392B' }
  const kids = [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 80 }, children: [run(title, { size: 22, bold: true, color: 'C0392B' })] })]
  items.forEach((t) => kids.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 40 }, children: [run(t, { size: 20 })] })))
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [TABLE_W], visuallyRightToLeft: true,
    borders: { top: cb, bottom: cb, left: cb, right: cb, insideHorizontal: cb, insideVertical: cb },
    rows: [new TableRow({ children: [new TableCell({ width: { size: TABLE_W, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 160, right: 160 }, shading: { fill: 'FCE9E9', type: ShadingType.CLEAR, color: 'auto' }, children: kids })] })],
  })
}
function placeholderBox(lines: string[]) {
  const db = { style: BorderStyle.DASHED, size: 6, color: '9DB2C6' }
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [TABLE_W], visuallyRightToLeft: true,
    borders: { top: db, bottom: db, left: db, right: db, insideHorizontal: db, insideVertical: db },
    rows: [new TableRow({ children: [new TableCell({ width: { size: TABLE_W, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 140, right: 140 }, shading: { fill: 'F7F9FB', type: ShadingType.CLEAR, color: 'auto' }, children: lines.map((t) => new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [run(t, { size: 20, italics: true, color: '7F7F7F' })] })) })] })],
  })
}

function blockToDocx(block: Block, values: Record<string, unknown>, imageMap: ImageMap): (Paragraph | Table)[] {
  switch (block.kind) {
    case 'image': {
      const out: (Paragraph | Table)[] = []
      for (const im of imageMap[block.id] || []) {
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 },
          children: [new ImageRun({ type: im.type, data: im.data, transformation: { width: im.width, height: im.height } })],
        }))
      }
      const items = (values[block.id] as ImageItem[]) || []
      for (const it of items) if (!isImageItem(it)) out.push(note(`תרשים מצורף (Visio): ${it.name}`))
      return out
    }
    case 'subhead':
      return [h2(block.text)]
    case 'note':
      return [note(block.text)]
    case 'bullets': {
      const out: (Paragraph | Table)[] = []
      if (block.title) out.push(para(block.title, { after: 40 }))
      block.items.forEach((t) => out.push(bullet(t)))
      out.push(spacer(80))
      return out
    }
    case 'box':
      return [placeholderBox(block.lines), spacer(80)]
    case 'callout':
      return [calloutBox(block.title, block.items), spacer(80)]
    case 'kv': {
      const v = (values[block.id] as KvValues) || {}
      return [kvTable(block.fields.map((f) => [f.label, v[f.id] || ''])), spacer(80)]
    }
    case 'checklist': {
      const v = (values[block.id] as ChecklistValues) || {}
      const headers = [block.rowHeader, ...block.columns.map((c) => c.label)]
      const rows = block.rows.map((r) => [r.label, ...block.columns.map((c) => v[r.id]?.[c.id] || '')])
      return [dataTable(headers, rows), spacer(80)]
    }
    case 'table': {
      const all = (values[block.id] as Row[]) || []
      const rows = all.filter((r) => block.columns.some((c) => r[c.id]?.trim())).map((r) => block.columns.map((c) => r[c.id] || ''))
      return [dataTable(block.columns.map((c) => c.label), rows), spacer(80)]
    }
    default:
      return []
  }
}

async function loadLogoPng(): Promise<Uint8Array | null> {
  try {
    const res = await fetch('./gav-yam.svg')
    const svgText = await res.text()
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('logo load failed'))
      img.src = url
    })
    const W = 360, H = 107, scale = 3
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, W, H)
    URL.revokeObjectURL(url)
    const pngBlob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/png'))
    return new Uint8Array(await pngBlob.arrayBuffer())
  } catch {
    return null
  }
}

export function buildDocxDocument(site: SiteData, logo: Uint8Array | null, imageMap: ImageMap = {}): Document {
  const details = (site.values['site-details'] as KvValues) || {}
  const today = new Date().toLocaleDateString('he-IL')

  const logoEl = logo
    ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 300, height: 89 } })] })
    : new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, bidirectional: true, children: [run('גב-ים', { size: 40, bold: true, color: C.primaryDark })] })

  const coverMeta: [string, string][] = [
    ['שם האתר', details.name || site.meta.name],
    ['קוד אתר', details.code || site.meta.code],
    ['כתובת', details.address || ''],
    ['אחראי IT', details.itOwner || ''],
    ['תאריך הפקה', today],
    ['גרסה', site.meta.version],
    ['סיווג', site.meta.classification],
  ]

  const cover = [
    spacer(400), logoEl, spacer(400),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 80 }, children: [run('תיק אתר — מערכות מידע', { size: 52, bold: true, color: C.primaryDark })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 500 }, children: [run(details.name || site.meta.name, { size: 30, color: C.primary })] }),
    kvTable(coverMeta),
  ]

  const ex = excludedOf(site)
  const body: (Paragraph | Table)[] = []
  for (const section of visibleSections(schema, ex)) {
    body.push(h1(section.title))
    if (section.note) body.push(note(section.note))
    for (const block of visibleBlocks(section, ex)) body.push(...blockToDocx(block, site.values, imageMap))
  }

  const docxDoc = new Document({
    creator: 'גב-ים — מערכות מידע',
    title: 'תיק אתר — מערכות מידע',
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: FONT, color: C.primaryDark }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: FONT, color: C.primary }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { right: 480, hanging: 260 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
      headers: { default: new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.primary, space: 3 } }, children: [run('תיק אתר — מערכות מידע', { size: 16, bold: true, color: C.primaryDark })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [run('עמוד ', { size: 16, color: C.note }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.note }), run(' מתוך ', { size: 16, color: C.note }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: C.note }), run('   ·   סיווג: ' + site.meta.classification, { size: 16, color: C.note })] })] }) },
      children: [...cover, ...body],
    }],
  })

  return docxDoc
}

export async function exportDocx(site: SiteData | null): Promise<void> {
  if (!site) return
  const details = (site.values['site-details'] as KvValues) || {}
  const logo = await loadLogoPng()
  const imageMap = await processImages(site)
  const docxDoc = buildDocxDocument(site, logo, imageMap)
  const blob = await Packer.toBlob(docxDoc)
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = (details.name || site.meta.name || 'site').replace(/[\\/:*?"<>|]+/g, '_') + '.docx'
  window.document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
