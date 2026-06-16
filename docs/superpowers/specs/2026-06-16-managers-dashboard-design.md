# Managers Dashboard — Design

**Date:** 2026-06-16
**Status:** Approved (design), pending implementation plan

## Goal

A read-only, cross-site **executive overview** ("דשבורד מנהלים"). Instead of drilling into one site's form, a manager sees the whole portfolio at a glance: completion KPIs, per-site cards, a security-controls matrix, aggregate inventory, and an attention list. Styled in the Gav-Yam brand (existing design tokens, `CompletionRing`, RTL, Heebo). Computed live from existing data; printable for a management PDF.

## Entry & placement

- A **"דשבורד"** toggle button in the header (next to the existing controls).
- When on, the main content area renders `<DashboardView>` instead of the per-site `<SectionView>`. The header, sidebar, and site switcher stay.
- Clicking a **site card** → selects that site and exits dashboard mode (jumps to its form).
- Clicking a **sidebar chapter** also exits dashboard mode (shows that chapter).
- State: `dashboardMode` boolean, local to `AppShell` (not persisted). AppShell sets `document.documentElement.dataset.view = 'dashboard' | 'site'` so print CSS can target it.

## Data model & aggregation — `store/dashboard.ts` (new, pure, tested)

One entry point aggregates all sites; `now` is injected for testability.

```ts
export interface SiteSummary {
  id: string
  name: string
  classification: string
  completion: number          // 0-100, respects per-site inclusion (excludedOf)
  updatedAt: string
  staleDays: number           // floor((now - updatedAt)/day)
  criticalGaps: string[]      // labels of critical controls whose status is 'חסר'
}

export interface SecurityRow {
  rowId: string
  label: string
  critical: boolean
  statuses: Record<string, string>  // siteId -> '' | קיים | חלקי | חסר | לא רלוונטי
}

export interface AttentionItem {
  siteId: string
  name: string
  severity: 'bad' | 'warn'
  reasons: string[]
}

export interface DashboardData {
  kpis: { siteCount: number; avgCompletion: number; completed: number; needAttention: number }
  sites: SiteSummary[]                                  // sorted by completion desc
  security: { siteOrder: { id: string; name: string }[]; rows: SecurityRow[] }
  inventory: { servers: number; endpoints: number; network: number; software: number }
  attention: AttentionItem[]                            // sorted: bad first, then lowest completion
}

export function buildDashboard(sites: Record<string, SiteData>, now: number): DashboardData
```

**Thresholds (constants at top of the module):**
- `COMPLETED_PCT = 90` — a site counts as "הושלם".
- `LOW_PCT = 60` — below this is an attention reason.
- `STALE_DAYS = 90` — ~3 months without update is an attention reason.
- **Critical controls** are resolved from the schema by label substring (robust to row-order changes), not hardcoded ids: `אנטי-וירוס`, `עדכוני אבטחה`, `גיבוי`, `שחזור ו-DR`, `אימות דו-שלבי`. Read the `s5-controls` checklist block once from `doc` to get all rows (id+label) and tag the critical ones.

**Computation details:**
- `completion` = `pct(overallCompletion(doc, site.values, excludedOf(site)))` — reuses existing helpers and respects per-site chapter inclusion.
- Security status per (site, control) = `(site.values['s5-controls'] as ChecklistValues)?.[rowId]?.status ?? ''`.
- Inventory = count of filled rows (a row with any non-`_id` non-empty cell — same predicate the print view uses) summed across all sites, per table id:
  - servers → `s3-servers`, endpoints → `s1-equipment`, network → `s3-netgear`, software → `s4-software`.
- `criticalGaps` = critical controls whose status === `חסר`.
- `attention`: a site is listed if `completion < LOW_PCT` OR `staleDays > STALE_DAYS` OR `criticalGaps.length > 0`. `severity = 'bad'` when there are critical gaps or `completion < 30`, else `'warn'`. `reasons` are human strings, e.g. `השלמה 32%`, `לא עודכן 5 חודשים`, `גיבוי חסר`.

## Components

- **`ui/DashboardView.tsx`** (new) — reads `state.sites` via `useStore`, calls `buildDashboard(state.sites, Date.now())`, renders five sections in brand style:
  1. **KPI strip** — four cards (אתרים · השלמה ממוצעת · הושלמו · דורשים טיפול).
  2. **Site cards** — grid; each uses `<CompletionRing value size={46} showText />`, name, classification badge, "עודכן לפני …", and any critical-gap chips. `onClick` → `onOpenSite(id)`.
  3. **Security matrix** — table: rows = controls, columns = sites; each cell colored by status using existing status colors (`--ok/--warn/--bad/--na`) with an icon (`IconCheck` for קיים, dash for חלקי, `IconX` for חסר, empty for blank). Horizontally scrollable for many sites. Critical rows marked.
  4. **Inventory** — four tiles (שרתים · תחנות קצה · ציוד תקשורת · רישומי תוכנה).
  5. **Attention list** — rows with a severity dot, site name, and reasons.
- **`ui/Header.tsx`** — add a "דשבורד" button (props `dashboardActive`, `onToggleDashboard`); highlight when active.
- **`ui/AppShell.tsx`** — `dashboardMode` state; pass toggle to Header; render `<DashboardView onOpenSite={(id)=>{ dispatch SELECT_SITE; setDashboardMode(false) }} />` in `app-main` when on; set `documentElement.dataset.view`. Sidebar `onSelect` also clears dashboard mode.

The "relative time" helper (e.g. "לפני 5 חודשים") is a small pure function in `dashboard.ts` (`relativeUpdated(updatedAt, now)`), reused by cards and attention reasons, and unit-tested.

## Styling — `styles/engine.css`

New `.dash*` classes using existing tokens: `--surface`, `--surface-2`, `--border`, `--c-primary` (#104E7D), `--c-accent` (#EEC21B), `--muted`, `--text`, `--radius`, status colors. KPI cards and tiles on `--surface-2`; site cards on `--surface` with `--shadow-sm`; matrix cells use the status color tints. Matches the existing card/section aesthetic.

## Print — `styles/print.css`

When `documentElement[data-view="dashboard"]`, `@media print` shows the dashboard and suppresses the site `PrintView` + app chrome: hide `.app-header`, `.app-sidebar`, `.print-view`; show `.app-main .dashboard` flowing full width; the security matrix prints with visible borders. No second render — the on-screen `DashboardView` is what prints.

## Testing — `store/dashboard.test.ts` (new)

- KPIs: avg completion, completed count (≥90), needAttention count, on a fixture of 3 sites.
- A site below `LOW_PCT`, a stale site (via injected `now`), and a site with a critical control = `חסר` each appear in `attention` with the right severity/reasons.
- Inventory sums filled rows across sites for each table id (ignores empty rows).
- Security rows include all `s5-controls` controls with per-site statuses; criticals tagged.
- `relativeUpdated` returns expected buckets (days/weeks/months) for fixed `now`.

## Out of scope (v1)

Editing from the dashboard (read-only by design); support-contract expiry flags (free-text dates — fragile, future); per-user dashboard customization; charts/trends over time.
