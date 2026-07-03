# Phase 2 — Expiry Flags — Design

**Date:** 2026-07-03
**Status:** Approved (design), implementing

Surface **expiring contracts and licenses** on the managers dashboard. Frontend only — no backend/notifications yet (that's Phase 4).

**Decisions:** threshold = **60 days**; sources = contracts (`s7-suppliers` "תוקף") + licenses (`s4-software` "חידוש"). Warranty (s1) excluded — its column mixes purchase date + months.

## A. Structure the date columns

- `Column` gains `role?: 'expiry'`. `helpers.cols()` already spreads a per-column options object; extend its `ColSpec` options to allow `role`.
- Mark the two expiry columns as `type: 'date'` + `role: 'expiry'`:
  - `schema/s7-suppliers.ts`: `'תוקף'` → `['תוקף', { type: 'date', role: 'expiry' }]` (stays column `c5`).
  - `schema/s4-software.ts`: `'חידוש'` → `['חידוש', { type: 'date', role: 'expiry' }]` (stays column `c5`).
- Column ids are unchanged (positional `c5`), so existing data is preserved.

## B. Date parsing — accept month precision

Existing values are `mm/yyyy` (e.g. `12/2026`). Add a shared parser and make `date` validation accept `mm/yyyy` so those stay valid and users can enter either a full date or a month.

`store/validation.ts`:
```ts
/** Parse dd/mm/yyyy | yyyy-mm-dd | mm/yyyy -> timestamp (mm/yyyy = last day of month). null if unparseable. */
export function parseDate(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const my = s.match(/^(\d{1,2})\/(\d{4})$/)              // mm/yyyy
  if (my) { const m = +my[1]; return m >= 1 && m <= 12 ? new Date(+my[2], m, 0).getTime() : null }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)  // dd/mm/yyyy
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)        // yyyy-mm-dd
  let d = 0, m = 0, y = 0
  if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3] }
  else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3] }
  else return null
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? new Date(y, m - 1, d).getTime() : null
}
```
Refactor `validate`'s `date` branch to use it: `parseDate(v.trim()) !== null ? valid : { valid:false, message:'תאריך לא תקין (dd/mm/yyyy או mm/yyyy)' }`. Existing date tests still pass; add an `mm/yyyy`-valid test.

## C. Dashboard — "פקיעות קרובות"

`store/dashboard.ts`:
- Constant `EXPIRY_WINDOW_DAYS = 60`.
- Derive expiry sources from the schema (robust to column reordering): for every `table` block, find columns with `role === 'expiry'`; the item name = the table's **first** column. → `{ tableId, dateColId, nameColId, typeLabel }` where `typeLabel` is the date column's label ("תוקף"/"חידוש").
- New type:
  ```ts
  export interface ExpiryItem {
    siteId: string; siteName: string; name: string; typeLabel: string; dateStr: string; daysLeft: number
  }
  ```
- In `buildDashboard(sites, now)`: for each site, each source, each **filled** row of `site.values[tableId]`, `parseDate(row[dateColId])`; if parsed and `daysLeft = floor((ts-now)/DAY) <= EXPIRY_WINDOW_DAYS`, push an `ExpiryItem` (`name = row[nameColId] || '—'`). Sort by `daysLeft` ascending (expired/soonest first).
- `DashboardData` gains `expiries: ExpiryItem[]`.
- **Attention:** for each site with ≥1 expiry, add a reason `פקיעה קרובה (${soonest.typeLabel})`; severity `bad` if any is expired (`daysLeft < 0`), else `warn`. (Deduped with the existing per-site attention entry — merge reasons into the same `AttentionItem`.)

`ui/DashboardView.tsx`: a new section **"פקיעות קרובות"** after the security matrix — a list of rows: `{name} · {typeLabel} · {dateStr}` and a status chip `פג לפני X ימים` (red) / `בעוד X ימים` (amber, ≤14 red). Empty state: "אין פקיעות קרובות." Clicking a row opens that site.

## Files

| File | Change |
|------|--------|
| `types.ts` | `Column.role?: 'expiry'` |
| `schema/helpers.ts` | `cols` ColSpec options allow `role` |
| `schema/s7-suppliers.ts` / `s4-software.ts` | mark expiry column `type:'date'` + `role:'expiry'` |
| `store/validation.ts` | `parseDate`; `date` validation via `parseDate` (accepts mm/yyyy) |
| `store/validation.test.ts` | parseDate + mm/yyyy cases |
| `store/dashboard.ts` | `ExpiryItem`, `expiries`, attention merge |
| `store/dashboard.test.ts` | expiry detection (soon / expired / beyond-window / mm-yyyy) |
| `ui/DashboardView.tsx` | "פקיעות קרובות" section |
| `styles/engine.css` | expiry list styles |

## Testing

- `parseDate`: dd/mm/yyyy, yyyy-mm-dd, mm/yyyy (→ end of month), invalid → null; `validate('date','12/2026')` valid.
- `buildDashboard` (fixed `now`): a contract 30 days out appears; one 200 days out does not; an expired one has `daysLeft < 0` and makes the site's attention severity `bad`.

## Out of scope

Email/Teams notifications (Phase 4); warranty parsing (s1); editable per-site thresholds; a date-picker widget (fields stay text with validation).
