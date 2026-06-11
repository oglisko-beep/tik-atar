# Per-Site Chapter & Sub-Chapter Inclusion — Design

**Date:** 2026-06-11
**Status:** Approved (design), pending implementation plan

## Goal

Let each site (תיק אתר) choose which **chapters (פרקים)** and **sub-chapters (תתי-פרקים)** are included. Anything not selected is **hidden everywhere** for that site — sidebar navigation, the editor view, exports (Print/PDF and Word), and the completion percentage — while its data is preserved and reappears if re-included.

## Decisions (locked)

- **Scope:** per-site. The selection lives inside each `SiteData`, so it travels with the site (localStorage + SharePoint + JSON import/export) and differs per site automatically.
- **Excluded behavior:** fully hidden (nav + view + export + completion). Data kept.
- **Granularity:** chapters (`Section`) and sub-chapters (`subhead` block + the blocks beneath it until the next subhead).
- **Default:** everything included. Existing sites (no selection stored) behave exactly as today.

## Data model

`types.ts`:
- Extend the subhead block with a stable id: `{ kind: 'subhead'; text: string; optional?: boolean; id?: string }`.
- Extend `SiteData` with an **excluded** record (store exclusions, not inclusions, so the default empty state = everything included → backward compatible):
  ```ts
  excluded?: { sections: string[]; subsections: string[] }
  ```

### Sub-chapter IDs

Subheads currently have no id. Assign one **once at schema assembly** in `schema/index.ts` (zero per-file churn): for each section, walk its blocks and give every `subhead` without an id the value `` `${section.id}#${ordinal}` `` where `ordinal` is its 0-based position among that section's subheads. Explicit ids (if ever added to a schema file) win. Caveat: ids are positional, so reordering subheads within a section would remap a stored exclusion — acceptable given the schema is stable; document it.

## Shared inclusion helper (new) — `store/inclusion.ts`

Single source of truth for "what is visible", consumed by the view, sidebar, completion, and both exporters (DRY):

```ts
export interface Excluded { sections: Set<string>; subsections: Set<string> }

export function excludedOf(site: SiteData | null): Excluded
// -> sets built from site.excluded (empty when undefined)

export function visibleSections(doc: Doc, ex: Excluded): Section[]
// doc.sections.filter(s => !ex.sections.has(s.id))

export function visibleBlocks(section: Section, ex: Excluded): Block[]
// walk blocks; when a subhead's id is in ex.subsections, drop that subhead and
// every following block until the next subhead; otherwise keep.

export function subsectionsOf(section: Section): { id: string; text: string }[]
// the section's subheads (which now all have ids) — used by the manager panel.
```

## Touch points

| File | Change |
|------|--------|
| `types.ts` | add `id?` to subhead block; add `excluded?` to `SiteData`; add reducer action types |
| `schema/index.ts` | auto-assign subhead ids at assembly |
| `store/inclusion.ts` | **new** helper (above) |
| `store/completion.ts` | `sectionCompletion`/`overallCompletion` take an optional `Excluded`; skip excluded sections and excluded sub-chapter blocks |
| `engine/SectionView.tsx` | render `visibleBlocks(section, ex)` instead of `section.blocks` |
| `ui/Sidebar.tsx` | list `visibleSections`; overall % uses `Excluded`; add the "manage" button next to the "פרקים" label |
| `ui/AppShell.tsx` | hold `chaptersOpen` state; render `<ChapterManager>`; guard `active` — if the active section becomes hidden, fall back to the first visible section; empty-state if all hidden |
| `ui/ChapterManager.tsx` | **new** modal: chapter tree with checkboxes, expandable sub-chapters, "בחר/נקה הכול" |
| `ui/icons.tsx` | add an "adjustments/sliders" icon for the entry button |
| `ui/CommandPalette.tsx` | search only within `visibleSections` |
| `print/PrintView.tsx` | iterate `visibleSections` + `visibleBlocks` |
| `print/docxExport.ts` | same filtering before building the document |
| `store/StoreContext.tsx` | reducer cases `TOGGLE_SECTION`, `TOGGLE_SUBSECTION`, `SET_INCLUSION`; all via `touchActive` so they bump `updatedAt` and trigger autosave/remote-save |

`store/exportImport.ts` needs no change — it serializes the whole `SiteData`, so `excluded` rides along; the plan verifies it does not strip unknown fields.

## Reducer actions

- `TOGGLE_SECTION { sectionId }` — add/remove from `excluded.sections`.
- `TOGGLE_SUBSECTION { subId }` — add/remove from `excluded.subsections`.
- `SET_INCLUSION { sections, subsections }` — set both excluded arrays directly (used by "בחר הכול" → empty, "נקה הכול" → all ids).

All mutate the active site through the existing `touchActive`, so completion, persistence, and remote save react automatically.

## UI — ChapterManager panel

- Modal overlay (same pattern as `CommandPalette`), RTL.
- Title "תכולת התיק", subtitle naming the active site.
- "בחר הכול" / "נקה הכול" links.
- One row per chapter: checkbox (checked = included) + number/label; chapters with sub-chapters expand to show indented sub-chapter rows with their own checkboxes.
- Unchecking a chapter hides it and (visually) its sub-chapters.
- Footer note: unselected chapters are hidden from the site and export; data is kept.
- Closes on overlay click / Esc / close button.

## Edge cases

- **Active section hidden:** AppShell switches `active` to the first visible section.
- **All sections excluded:** main area shows an empty state pointing to "תכולת התיק"; the manager stays reachable from the sidebar header.
- **Sub-chapter excluded but its chapter included:** chapter shows, that sub-chapter's subhead + blocks are dropped.
- **Backward compatibility:** sites without `excluded` → everything included.

## Testing

- `store/inclusion.test.ts` (new): `visibleBlocks` drops an excluded subhead group and keeps others; `visibleSections` filters; `subsectionsOf` returns ids+text.
- `store/completion.test.ts`: excluding a section/sub-chapter lowers `total`; including all == current behavior.
- `schema/schema.test.ts`: every subhead has an id after assembly; ids are unique within a section.
- Reducer: `TOGGLE_SECTION`/`TOGGLE_SUBSECTION` add/remove ids and bump `updatedAt`.

## Out of scope

Reordering or renaming chapters, adding custom chapters, per-user (vs per-site) selection.
