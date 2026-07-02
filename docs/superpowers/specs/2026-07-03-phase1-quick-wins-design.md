# Phase 1 — Quick Wins — Design

**Date:** 2026-07-03
**Status:** Approved (design), implementing

Three focused improvements. Format validation (IP/email/date) and base mobile responsiveness already exist, so scope is: **"updated by X"**, **required-field indicators**, and a **targeted mobile-polish pass**.

## A. "עודכן לאחרונה ע"י X" (last edited by)

**Data:** `SiteMeta` gains `updatedBy?: string`.

**Capture:** a module-level `editorName` in `store/StoreContext.tsx`, set via an exported `setEditorName(name)` (exported for testability). The provider calls it after a successful `trySsoSilent()` in `loadAllRemote`, from `auth.currentAccount()` (`account.name ?? account.username`). Local/unauthenticated mode leaves it `''` → nothing stamped.

**Stamp:** wherever `updatedAt` is bumped:
- `touchActive` (every edit): `meta: editorName ? { ...base.meta, updatedBy: editorName } : base.meta`.
- `RENAME_SITE`: same (stamps `updatedBy` alongside the new name).

**Display:**
- **Dashboard site cards** (`DashboardView`): the meta line becomes `עודכן {relativeUpdated} · ע"י {updatedBy}` (drop the "ע"י" part when absent). `SiteSummary` in `store/dashboard.ts` gains `updatedBy?: string` from `site.meta.updatedBy`.
- **Site switcher** (`SiteSwitcher`): each site row in the dropdown shows a small subline `ע"י {updatedBy}` when present.

## B. שדות חובה מסומנים (required-field indicators)

**Schema:** `Field` and `Column` gain `required?: boolean`. Mark a minimal key set in `schema/siteDetails.ts`: `name` (שם האתר) and `code` (קוד אתר).

**Behaviour — non-blocking, visual only** (never prevents save):
- New pure helper in `store/validation.ts`: `requiredEmpty(required: boolean | undefined, v: string): boolean` → `!!required && !v.trim()`.
- `Field` gains a `required?` prop. Precedence of the field's visual state: **format-invalid (red, existing)** > **required-empty (amber)** > normal. When required-empty (and format-valid), show an amber border and a `נדרש` hint (suppressed in `compact` cells, like the format warning).
- `KvBlock` passes `required={f.required}` to `Field`. (Table/checklist columns are out of scope for now — the marked fields are all KV.)

**CSS** (`styles/engine.css` + input styles): `.input.req-empty` / `.textarea.req-empty` amber border; `.field-req` amber hint text.

## C. ליטוש מובייל ממוקד (targeted mobile polish)

A responsive pass verified at ~375 px (preview `mobile` preset). Base drawer/hamburger/collapse already exist (`@media 900px`). Fix the remaining rough edges found during implementation, expected to include:
- **Header crowding** — under a narrow breakpoint (~560 px) tighten / reduce the row of icon buttons (dashboard, examples, theme, menu, share) so the header doesn't overflow.
- **Dashboard security matrix + wide tables** — confirm clean horizontal scroll (already `overflow-x:auto`), add momentum/edge affordance if needed.
- **KPI / cards / login card** — confirm they stack and fit.

Exact rules are finalized during implementation with mobile-width screenshots; no data or logic changes.

## Files

| File | Change |
|------|--------|
| `types.ts` | `SiteMeta.updatedBy?`; `Field.required?`, `Column.required?` |
| `store/StoreContext.tsx` | `editorName` module var + `setEditorName`; capture after `trySsoSilent`; stamp in `touchActive` + `RENAME_SITE` |
| `store/dashboard.ts` | `SiteSummary.updatedBy?` |
| `store/validation.ts` | `requiredEmpty()` helper |
| `engine/Field.tsx` | `required?` prop; amber required-empty state |
| `engine/KvBlock.tsx` | pass `required` |
| `ui/DashboardView.tsx` | show `ע"י {updatedBy}` in cards |
| `ui/SiteSwitcher.tsx` | show `ע"י {updatedBy}` in dropdown rows |
| `schema/siteDetails.ts` | mark `name`, `code` required |
| `styles/engine.css` / input styles | required-empty amber; mobile-polish `@media` rules |
| Tests | `validation` (requiredEmpty); `reducer`/store (updatedBy stamped after `setEditorName`) |

## Testing

- `requiredEmpty` — true only when required && blank.
- Reducer: after `setEditorName('דנה')`, a `SET_KV`/`SET_META` on the active site sets `meta.updatedBy = 'דנה'` and bumps `updatedAt`; with `editorName=''` it stamps nothing.
- Dashboard: `buildDashboard` surfaces `updatedBy` from meta.
- Mobile: visual verification at ~375 px.

## Out of scope

Blocking/enforced required fields; per-user edit history (only the latest editor); required on table/checklist columns; full mobile redesign.
