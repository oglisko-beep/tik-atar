import type { ChecklistValues, Row, SiteData } from '../types'
import { doc } from '../schema'
import { overallCompletion, pct } from './completion'
import { excludedOf, visibleColumns, type Excluded } from './inclusion'
import { parseDate } from './validation'

const COMPLETED_PCT = 90
const LOW_PCT = 60
const STALE_DAYS = 90
const EXPIRY_WINDOW_DAYS = 60
const DAY = 86400000

// Critical controls are matched by label substring against the 5.1 checklist,
// so reordering the schema rows can't silently break this.
const CRITICAL_LABELS = ['אנטי-וירוס', 'עדכוני אבטחה', 'גיבוי', 'שחזור ו-DR', 'אימות דו-שלבי']

export interface SiteSummary {
  id: string
  name: string
  classification: string
  completion: number
  updatedAt: string
  updatedBy?: string
  staleDays: number
  criticalGaps: string[]
}
export interface SecurityRow {
  rowId: string
  label: string
  critical: boolean
  statuses: Record<string, string>
}
export interface AttentionItem {
  siteId: string
  name: string
  severity: 'bad' | 'warn'
  reasons: string[]
}
export interface ExpiryItem {
  siteId: string
  siteName: string
  name: string
  typeLabel: string
  dateStr: string
  daysLeft: number
}
export interface DashboardData {
  kpis: { siteCount: number; avgCompletion: number; completed: number; needAttention: number }
  sites: SiteSummary[]
  security: { siteOrder: { id: string; name: string }[]; rows: SecurityRow[] }
  inventory: { servers: number; endpoints: number; network: number; software: number }
  attention: AttentionItem[]
  expiries: ExpiryItem[]
}

interface ExpirySource { tableId: string; dateColId: string; nameColId: string; typeLabel: string }

/** Discover expiry date columns from the schema (role: 'expiry'), skipping any the
 *  site has excluded. Item name = the table's first column that is still visible. */
function expirySourcesFor(ex: Excluded): ExpirySource[] {
  const out: ExpirySource[] = []
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (block.kind !== 'table') continue
      const cols = visibleColumns(block, ex)
      const nameCol = cols[0]
      if (!nameCol) continue
      for (const col of cols) {
        if (col.role === 'expiry') out.push({ tableId: block.id, dateColId: col.id, nameColId: nameCol.id, typeLabel: col.label })
      }
    }
  }
  return out
}

function securityControls(): { rowId: string; label: string; critical: boolean }[] {
  const block = doc.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'checklist' && b.id === 's5-controls')
  if (!block || block.kind !== 'checklist') return []
  return block.rows.map((r) => ({
    rowId: r.id,
    label: r.label,
    critical: CRITICAL_LABELS.some((c) => r.label.includes(c)),
  }))
}

function filledRows(v: unknown): number {
  const rows = (v as Row[]) || []
  return rows.filter((r) => Object.entries(r).some(([k, val]) => k !== '_id' && typeof val === 'string' && val.trim().length > 0)).length
}

/** Human-friendly "time since update" in Hebrew, with dual forms. */
export function relativeUpdated(updatedAt: string, now: number): string {
  const t = Date.parse(updatedAt)
  if (isNaN(t)) return '—'
  const days = Math.max(0, Math.floor((now - t) / DAY))
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days === 2) return 'לפני יומיים'
  if (days < 7) return `לפני ${days} ימים`
  if (days < 30) { const w = Math.floor(days / 7); return w === 1 ? 'לפני שבוע' : w === 2 ? 'לפני שבועיים' : `לפני ${w} שבועות` }
  if (days < 365) { const m = Math.floor(days / 30); return m === 1 ? 'לפני חודש' : m === 2 ? 'לפני חודשיים' : `לפני ${m} חודשים` }
  const y = Math.floor(days / 365); return y === 1 ? 'לפני שנה' : y === 2 ? 'לפני שנתיים' : `לפני ${y} שנים`
}

export function buildDashboard(sites: Record<string, SiteData>, now: number): DashboardData {
  const controls = securityControls()
  const list = Object.values(sites)

  const summaries: SiteSummary[] = list.map((site) => {
    const completion = pct(overallCompletion(doc, site.values, excludedOf(site)))
    const t = Date.parse(site.updatedAt)
    const staleDays = isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / DAY))
    const cv = (site.values['s5-controls'] as ChecklistValues) || {}
    const criticalGaps = controls.filter((c) => c.critical && cv[c.rowId]?.status === 'חסר').map((c) => c.label)
    return {
      id: site.id,
      name: site.meta.name || '—',
      classification: site.meta.classification || '',
      completion,
      updatedAt: site.updatedAt,
      updatedBy: site.meta.updatedBy,
      staleDays,
      criticalGaps,
    }
  })
  summaries.sort((a, b) => b.completion - a.completion)

  const siteOrder = summaries.map((s) => ({ id: s.id, name: s.name }))
  const rows: SecurityRow[] = controls.map((c) => {
    const statuses: Record<string, string> = {}
    for (const site of list) {
      const cv = (site.values['s5-controls'] as ChecklistValues) || {}
      statuses[site.id] = cv[c.rowId]?.status ?? ''
    }
    return { rowId: c.rowId, label: c.label, critical: c.critical, statuses }
  })

  const inventory = {
    servers: list.reduce((n, s) => n + filledRows(s.values['s3-servers']), 0),
    endpoints: list.reduce((n, s) => n + filledRows(s.values['s1-equipment']), 0),
    network: list.reduce((n, s) => n + filledRows(s.values['s3-netgear']), 0),
    software: list.reduce((n, s) => n + filledRows(s.values['s4-software']), 0),
  }

  // Expiring contracts/licenses across sites (expired or within the window).
  const expiries: ExpiryItem[] = []
  for (const site of list) {
    const sources = expirySourcesFor(excludedOf(site))
    for (const src of sources) {
      const rows = (site.values[src.tableId] as Row[]) || []
      for (const row of rows) {
        const raw = (row[src.dateColId] || '').trim()
        if (!raw) continue
        const ts = parseDate(raw)
        if (ts === null) continue
        const daysLeft = Math.floor((ts - now) / DAY)
        if (daysLeft > EXPIRY_WINDOW_DAYS) continue
        expiries.push({
          siteId: site.id,
          siteName: site.meta.name || '—',
          name: (row[src.nameColId] || '').trim() || '—',
          typeLabel: src.typeLabel,
          dateStr: raw,
          daysLeft,
        })
      }
    }
  }
  expiries.sort((a, b) => a.daysLeft - b.daysLeft)
  const expBySite: Record<string, ExpiryItem[]> = {}
  for (const e of expiries) (expBySite[e.siteId] ||= []).push(e)

  const attention: AttentionItem[] = []
  for (const s of summaries) {
    const reasons: string[] = []
    if (s.completion < LOW_PCT) reasons.push(`השלמה ${s.completion}%`)
    if (s.staleDays > STALE_DAYS) reasons.push(`לא עודכן ${relativeUpdated(s.updatedAt, now).replace('לפני ', '')}`)
    for (const g of s.criticalGaps) reasons.push(`${g} — חסר`)
    const exp = expBySite[s.id]
    if (exp?.length) reasons.push(exp.length === 1 ? `פקיעה קרובה: ${exp[0].name}` : `${exp.length} פקיעות קרובות`)
    if (reasons.length) {
      const bad = s.criticalGaps.length > 0 || s.completion < 30 || !!exp?.some((e) => e.daysLeft < 0)
      attention.push({ siteId: s.id, name: s.name, severity: bad ? 'bad' : 'warn', reasons })
    }
  }
  attention.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'bad' ? -1 : 1))

  const completed = summaries.filter((s) => s.completion >= COMPLETED_PCT).length
  const avgCompletion = summaries.length ? Math.round(summaries.reduce((a, s) => a + s.completion, 0) / summaries.length) : 0

  return {
    kpis: { siteCount: summaries.length, avgCompletion, completed, needAttention: attention.length },
    sites: summaries,
    security: { siteOrder, rows },
    inventory,
    attention,
    expiries,
  }
}
