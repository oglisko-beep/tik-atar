# Per-Site Column Inclusion (Tables & Checklists) — Design

**Date:** 2026-08-30
**Status:** Approved (design), pending implementation plan

## Goal

Let each site choose which **columns** of a table or checklist are included. A column that is not selected is **hidden everywhere** for that site — the editor view, Print/PDF, Word export, and the managers' dashboard — while the values already stored in that column are preserved and reappear if it is re-included.

This extends the existing chapter / sub-chapter inclusion ([2026-06-11](2026-06-11-chapter-inclusion-design.md)) one level deeper. Today a site can drop a whole sub-chapter but must accept every column of every table inside it, even where the column is meaningless for that site.

## Decisions (locked)

- **Scope:** per-site, stored inside `SiteData` — travels with the site through localStorage, SharePoint, and JSON import/export, exactly like the existing exclusions.
- **Granularity:** individual columns of `table` blocks **and** `checklist` blocks. Not kv fields, not checklist rows, not table rows.
- **Excluded behavior:** fully hidden (view + both exports + dashboard). Cell data kept.
- **Default:** everything included. Sites with no stored column exclusions behave exactly as today.
- **Two control surfaces:** a per-table popover in the section view, and a fourth level in the "תכולת התיק" modal. Both dispatch the same action.

## Data model

`types.ts` — extend the existing exclusion record with a third list. Storing *exclusions* (not inclusions) keeps the empty default meaning "everything included", so a column added to the schema later appears automatically in every existing site:

```ts
excluded?: { sections: string[]; subsections: string[]; columns: string[] }
```

`columns` is optional in practice (`columns?: string[]` on read) so stored sites written before this change load unchanged.

### Column IDs

Key format: `` `${blockId}#${colId}` `` — for example `s4-software#renew`, `s6-controls#owner`. Both `table` and `checklist` blocks already carry a required `id`, and every `Column` already carries a `colId`, so no schema churn is needed and no id-assignment pass is required (unlike sub-chapter ids, which had to be synthesized positionally). Ids are stable against reordering columns within a block, since they are name-based rather than positional.

The checklist **`rowHeader`** is not a `Column` and has no id. It is the row label, not data, and is never excludable.

## Shared helper — `store/inclusion.ts`

`Excluded` gains a third set; `excludedOf` fills it defensively:

```ts
export interface Excluded {
  sections: Set<string>
  subsections: Set<string>
  columns: Set<string>
}
```

One new function is the single source of truth for "which columns are visible", consumed by the view, both exporters, and the dashboard:

```ts
export function visibleColumns(
  block: Extract<Block, { kind: 'table' | 'checklist' }>,
  ex: Excluded,
): Column[]
```

It returns `block.columns` filtered by `!ex.columns.has(`${block.id}#${col.id}`)`. No consumer builds the key itself.

## Consumers

| File | Change |
|---|---|
| [`engine/TableBlock.tsx`](../../../app/src/engine/TableBlock.tsx) | `cols` comes from `visibleColumns`; the empty-state `colSpan` becomes `cols.length + 2`; example rows render the filtered set. |
| [`engine/ChecklistBlock.tsx`](../../../app/src/engine/ChecklistBlock.tsx) | Same substitution; `rowHeader` column is always rendered. |
| [`print/PrintView.tsx`](../../../app/src/print/PrintView.tsx) | Both the checklist branch and the table branch filter; the `pv-empty` `colSpan` follows the filtered count. |
| [`print/docxExport.ts`](../../../app/src/print/docxExport.ts) | Checklist headers become `[rowHeader, ...visible.map(c => c.label)]`; the table branch filters both its header row and its "row has content" test. |

Both exporters already receive the site, so they can derive `Excluded` the same way they do for sections today.

## Control surfaces

**In the table** — a «עמודות» button in the existing `table-foot` (next to «הוסף שורה»), opening a small popover listing every column with a checkbox. Reuses the `useClickOutside` hook already used by `Menu`. This is the surface for routine work: the effect on the table is visible immediately, one click away from the data.

**In the "תכולת התיק" modal** — a fourth level under each sub-chapter, listing that sub-chapter's table and checklist blocks and their columns, expanded with the same `open[]` pattern already in [`ChapterManager.tsx`](../../../app/src/ui/ChapterManager.tsx). This is the surface for reviewing the whole portfolio's scope in one place. Blocks are labelled by their preceding subhead plus a block-kind hint, since blocks have no titles of their own.

Both dispatch `{ type: 'TOGGLE_COLUMN', key: string }` — the reducer holds the only mutation logic, so the two surfaces cannot drift.

**Bulk actions.** The modal's existing «בחר הכול» / «נקה הכול» buttons dispatch `SET_INCLUSION`, whose payload gains `columns: string[]`. «בחר הכול» passes `columns: []`, restoring every column along with every chapter. «נקה הכול» passes `columns: []` as well and clears only chapters and sub-chapters: every block is hidden by that action anyway, and excluding all columns would collide with the last-column guard for no visible benefit. Re-including a chapter afterwards therefore returns it with its full column set.

## Dashboard

`buildDashboard` currently discovers expiry columns from the schema **globally**, via `expirySources()`. Two changes:

1. **Per-site sources.** It becomes `expirySourcesFor(ex: Excluded)`, called once per site inside the site loop. A source whose date column is excluded for that site is skipped, so the site raises no expiry alerts from a column it declared irrelevant. This matches the established behavior that an excluded chapter drops out of the completion percentage.

2. **Name column fallback.** `nameCol = block.columns[0]` yields a blank item name if the first column is hidden. It becomes the first *visible* column, falling back to `'—'` when a table somehow has none. This is a latent correctness fix that this feature would otherwise expose.

## Completion

Tables are unaffected by construction: `unit()` in [`completion.ts`](../../../app/src/store/completion.ts) scores a table as a single unit (`total: 1`) regardless of its columns.

Checklists **are** affected and must change. A checklist row currently counts as filled when *any* stored column has a value; if that value sits in a hidden column, the row would count as filled while appearing blank on screen. The rule becomes: a row is filled when any **visible** column has a value. `unit()` therefore needs the `Excluded` it is already given via `sectionCompletion`.

## Guards

- **Last column.** The final remaining visible column of a block cannot be excluded. Enforced in the reducer (the single mutation point); both surfaces additionally render that last checkbox disabled, so the rule is visible rather than mysterious.
- **Unknown keys.** Stored keys that no longer match any schema column (a column renamed or removed in a future schema) are ignored by `visibleColumns` — nothing matches them, so they have no effect — and are carried through subsequent writes untouched. There is no migration or cleanup pass: a harmless stale key costs nothing, and dropping keys silently would destroy a selection if a schema id were ever restored.

## Edge cases

- **Column hidden in a block whose sub-chapter is excluded:** no interaction — the whole block is already dropped upstream by `visibleBlocks`.
- **A site's data contains values only in hidden columns:** values persist untouched; the table renders as empty; re-including the column restores the display.
- **JSON import from a site with column exclusions into an app build with a changed schema:** unknown keys ignored per above.
- **Backward compatibility:** sites without `excluded.columns` → all columns included.

## Testing

- `store/inclusion.test.ts`: `visibleColumns` filters by key and returns all columns for an empty set; keys are namespaced per block (the same `colId` in two blocks is independent).
- `store/completion.test.ts`: a checklist row whose only value sits in an excluded column counts as unfilled; tables are unchanged by column exclusion.
- `store/dashboard.test.ts`: a site excluding an expiry column raises no expiry item while a sibling site still does; the item name falls back to the first visible column.
- `engine/TableBlock.test.tsx`: excluded column is absent from header and body; `colSpan` matches the visible count.
- Reducer: `TOGGLE_COLUMN` adds and removes a key, bumps `updatedAt`, and refuses to remove the last visible column.

## Out of scope

Excluding kv fields, checklist rows, or table rows. Reordering or renaming columns. Adding custom columns. Per-user (rather than per-site) column selection. Applying the selection to the Word master template generated by `generate.js`, which is a separate artifact.
