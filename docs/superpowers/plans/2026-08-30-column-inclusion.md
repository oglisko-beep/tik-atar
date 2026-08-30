# Per-Site Column Inclusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each site hide individual columns of any table or checklist, everywhere the portfolio is rendered — editor, Print/PDF, Word export, and the managers' dashboard — without deleting the data underneath.

**Architecture:** One new set on the existing per-site `excluded` record, keyed `blockId#colId`. A single helper, `visibleColumns(block, ex)`, is the only code that knows the key format; every renderer, exporter, and the dashboard call it instead of reading `block.columns`. Two UI surfaces (a popover on each table, a fourth level in the "תכולת התיק" modal) dispatch one reducer action.

**Tech Stack:** React 18 + TypeScript, Vite 6, Vitest 2 + Testing Library, no new dependencies.

**Spec:** [`docs/superpowers/specs/2026-08-30-column-inclusion-design.md`](../specs/2026-08-30-column-inclusion-design.md)

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `app/src/types.ts` | Type definitions | Add `columns` to `SiteData.excluded` |
| `app/src/store/inclusion.ts` | Single source of truth for visibility | Add `columns` to `Excluded`, add `visibleColumns` |
| `app/src/schema/index.ts` | Schema assembly + lookups | Add `columnsOf(blockId)` for the reducer guard |
| `app/src/store/StoreContext.tsx` | State + reducer | Add `TOGGLE_COLUMN`, extend `SET_INCLUSION` |
| `app/src/ui/ColumnPicker.tsx` | **New** — the «עמודות» popover | Create |
| `app/src/engine/TableBlock.tsx` | Table rendering | Take `cols` + `pickerSlot` props |
| `app/src/engine/ChecklistBlock.tsx` | Checklist rendering | Take `cols` prop |
| `app/src/engine/BlockRenderer.tsx` | Block dispatch | Thread `ex`, build `cols`, mount `ColumnPicker` |
| `app/src/engine/SectionView.tsx` | Section rendering | Pass `ex` down |
| `app/src/ui/ChapterManager.tsx` | Inclusion modal | Fourth level: blocks → columns |
| `app/src/print/PrintView.tsx` | Print/PDF | Filter columns |
| `app/src/print/docxExport.ts` | Word export | Filter columns |
| `app/src/store/completion.ts` | Completion math | Checklist rows count visible columns only |
| `app/src/store/dashboard.ts` | Managers' dashboard | Per-site expiry sources + name fallback |
| `app/src/styles/engine.css` | Styles | Popover styles |

**Working directory for all commands is `app/`.** Tests run with `npx vitest run <path>`.

---

## Task 1: Data model — `columns` in the exclusion record

**Files:**
- Modify: `app/src/types.ts`
- Modify: `app/src/store/inclusion.ts`
- Test: `app/src/store/inclusion.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these cases inside the existing `describe('inclusion', ...)` block in `app/src/store/inclusion.test.ts`:

```ts
  it('excludedOf(null) -> empty columns set', () => {
    expect(excludedOf(null).columns.size).toBe(0)
  })

  it('excludedOf tolerates a site saved before columns existed', () => {
    const ex = excludedOf({ excluded: { sections: [], subsections: [] } } as never)
    expect(ex.columns.size).toBe(0)
  })

  it('excludedOf reads the columns array into a set', () => {
    const ex = excludedOf({ excluded: { sections: [], subsections: [], columns: ['t#c1'] } } as never)
    expect(ex.columns.has('t#c1')).toBe(true)
  })

  it('visibleColumns returns every column when nothing is excluded', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
    expect(visibleColumns(tableBlock, ex).map((c) => c.id)).toEqual(['c0', 'c1'])
  })

  it('visibleColumns drops an excluded column', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(visibleColumns(tableBlock, ex).map((c) => c.id)).toEqual(['c0'])
  })

  it('column keys are namespaced per block — same colId in another block is unaffected', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(visibleColumns(checklistBlock, ex).map((c) => c.id)).toEqual(['c1', 'c2'])
  })
```

Add the two fixtures just below the existing `doc` constant, and extend the import:

```ts
import { excludedOf, visibleSections, visibleBlocks, subsectionsOf, visibleColumns } from './inclusion'

const tableBlock = {
  kind: 'table', id: 't',
  columns: [
    { id: 'c0', label: 'שם', type: 'text' },
    { id: 'c1', label: 'IP', type: 'ip' },
  ],
} as Extract<Block, { kind: 'table' }>

const checklistBlock = {
  kind: 'checklist', id: 'ck', rowHeader: 'בקרה',
  columns: [
    { id: 'c1', label: 'סטטוס', type: 'status' },
    { id: 'c2', label: 'אחראי', type: 'text' },
  ],
  rows: [{ id: 'r0', label: 'A' }],
} as Extract<Block, { kind: 'checklist' }>
```

The `Block` type must be added to the existing type import at the top of the file:

```ts
import type { Block, Doc, Section } from '../types'
```

Note the three existing `excludedOf` / set-literal call sites in this file now construct sets without `columns`; TypeScript will flag them in Step 2 and they are fixed in Step 3.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/inclusion.test.ts`
Expected: FAIL — `visibleColumns is not a function` (and TS errors about the missing `columns` property on the inline `Excluded` literals).

- [ ] **Step 3: Implement**

In `app/src/types.ts`, change the `excluded` line of `SiteData`:

```ts
  excluded?: { sections: string[]; subsections: string[]; columns?: string[] }
```

`columns` stays optional so sites already stored in SharePoint and localStorage load unchanged.

In `app/src/store/inclusion.ts`, extend the imports, the interface, and `excludedOf`, then add the new helper:

```ts
import type { Block, Column, Doc, Section, SiteData } from '../types'

export interface Excluded {
  sections: Set<string>
  subsections: Set<string>
  columns: Set<string>
}

export function excludedOf(site: SiteData | null | undefined): Excluded {
  return {
    sections: new Set(site?.excluded?.sections ?? []),
    subsections: new Set(site?.excluded?.subsections ?? []),
    columns: new Set(site?.excluded?.columns ?? []),
  }
}

/** Key for one column of one block. The only place this format is built. */
export const columnKey = (blockId: string, colId: string): string => `${blockId}#${colId}`

/** Columns of a table/checklist block that this site has not excluded. */
export function visibleColumns(
  block: Extract<Block, { kind: 'table' | 'checklist' }>,
  ex: Excluded,
): Column[] {
  return block.columns.filter((c) => !ex.columns.has(columnKey(block.id, c.id)))
}
```

Then fix the three pre-existing set literals in `inclusion.test.ts` that no longer satisfy `Excluded` by adding `columns: new Set<string>()` to each:

```ts
    const ex = { sections: new Set(['sY']), subsections: new Set<string>(), columns: new Set<string>() }
```

```ts
    const ex = { sections: new Set<string>(), subsections: new Set(['sX#0']), columns: new Set<string>() }
```

(The third is inside `excludedOf reads arrays into sets`, which passes an object literal to `excludedOf` and needs no change.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/inclusion.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/store/inclusion.ts src/store/inclusion.test.ts
git commit -m "feat(inclusion): per-site column exclusion set + visibleColumns"
```

---

## Task 2: Schema lookup for the reducer guard

**Files:**
- Modify: `app/src/schema/index.ts`
- Test: `app/src/schema/schema.test.ts`

The reducer must refuse to hide a block's last visible column. To count them it needs the block's full column list from the schema.

- [ ] **Step 1: Write the failing test**

Append to `app/src/schema/schema.test.ts` (add `columnsOf` to the existing import from `./index`):

```ts
describe('columnsOf', () => {
  it('returns the columns of a table block', () => {
    expect(columnsOf('s4-software').map((c) => c.id).length).toBeGreaterThan(1)
  })
  it('returns the columns of a checklist block', () => {
    expect(columnsOf('s6-controls').map((c) => c.id)).toContain('status')
  })
  it('returns an empty array for an unknown or non-columnar block', () => {
    expect(columnsOf('does-not-exist')).toEqual([])
    expect(columnsOf('s6-soc')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/schema/schema.test.ts`
Expected: FAIL — `columnsOf is not a function`.

- [ ] **Step 3: Implement**

Append to `app/src/schema/index.ts` (and add `Column` to the type import on line 1):

```ts
/** Columns of a table/checklist block, by block id. Empty when the id is unknown
 *  or the block has no columns. Used by the reducer's last-column guard. */
export function columnsOf(blockId: string): Column[] {
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if ((block.kind === 'table' || block.kind === 'checklist') && block.id === blockId) return block.columns
    }
  }
  return []
}
```

Line 1 becomes:

```ts
import type { Column, Doc } from '../types'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/schema/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema/index.ts src/schema/schema.test.ts
git commit -m "feat(schema): columnsOf(blockId) lookup"
```

---

## Task 3: Reducer — `TOGGLE_COLUMN` and the last-column guard

**Files:**
- Modify: `app/src/store/StoreContext.tsx:23-40` (Action union), `:124-138` (inclusion cases)
- Test: `app/src/store/reducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `app/src/store/reducer.test.ts`. The file already has a `baseState()` helper whose single site is keyed `site1` — reuse it:

```ts
describe('TOGGLE_COLUMN', () => {
  it('adds a column key to the exclusion list', () => {
    const st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded?.columns).toEqual(['s7-suppliers#c5'])
  })

  it('removes a key that is already excluded', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    st = reducer(st, { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded?.columns).toEqual([])
  })

  it('refuses to exclude the last visible column of a block', () => {
    const all = columnsOf('s7-suppliers')
    let st = baseState()
    for (const c of all.slice(0, -1)) st = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${c.id}` })
    expect(st.sites.site1.excluded?.columns).toHaveLength(all.length - 1)
    const last = all[all.length - 1]
    st = reducer(st, { type: 'TOGGLE_COLUMN', key: `s7-suppliers#${last.id}` })
    expect(st.sites.site1.excluded?.columns).toHaveLength(all.length - 1)
  })

  it('leaves a site saved before columns existed intact', () => {
    const before = baseState()
    before.sites.site1.excluded = { sections: ['s6'], subsections: [] }
    const st = reducer(before, { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s6'], subsections: [], columns: ['s7-suppliers#c5'] })
  })

  it('SET_INCLUSION clears column exclusions', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_COLUMN', key: 's7-suppliers#c5' })
    st = reducer(st, { type: 'SET_INCLUSION', sections: [], subsections: [], columns: [] })
    expect(st.sites.site1.excluded?.columns).toEqual([])
  })
})
```

Add to the file's imports:

```ts
import { columnsOf } from '../schema'
```

The existing test `SET_INCLUSION replaces both arrays` asserts on the whole `excluded` object and will fail once the third array exists. Update its expectation in the same step:

```ts
  it('SET_INCLUSION replaces all three arrays', () => {
    const st = reducer(baseState(), { type: 'SET_INCLUSION', sections: ['s1'], subsections: ['s1#0'], columns: [] })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s1'], subsections: ['s1#0'], columns: [] })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: FAIL — the `TOGGLE_COLUMN` action type is not assignable / falls through to `default` and returns state unchanged.

- [ ] **Step 3: Implement**

In `app/src/store/StoreContext.tsx`, add the import:

```ts
import { columnsOf } from '../schema'
```

Extend the `Action` union — replace the two inclusion lines at the end of it with:

```ts
  | { type: 'TOGGLE_SECTION'; sectionId: string }
  | { type: 'TOGGLE_SUBSECTION'; subId: string }
  | { type: 'TOGGLE_COLUMN'; key: string }
  | { type: 'SET_INCLUSION'; sections: string[]; subsections: string[]; columns: string[] }
```

Add a default next to the existing `toggleId` helper, so the three inclusion cases stop repeating the literal:

```ts
const emptyExcluded = () => ({ sections: [] as string[], subsections: [] as string[], columns: [] as string[] })
```

Replace the three inclusion cases:

```ts
    case 'TOGGLE_SECTION':
      return touchActive(state, (site) => {
        const ex = { ...emptyExcluded(), ...site.excluded }
        return { ...site, excluded: { ...ex, sections: toggleId(ex.sections, action.sectionId) } }
      })
    case 'TOGGLE_SUBSECTION':
      return touchActive(state, (site) => {
        const ex = { ...emptyExcluded(), ...site.excluded }
        return { ...site, excluded: { ...ex, subsections: toggleId(ex.subsections, action.subId) } }
      })
    case 'TOGGLE_COLUMN':
      return touchActive(state, (site) => {
        const ex = { ...emptyExcluded(), ...site.excluded }
        const columns = ex.columns ?? []
        // Removing an exclusion is always allowed.
        if (columns.includes(action.key)) {
          return { ...site, excluded: { ...ex, columns: columns.filter((x) => x !== action.key) } }
        }
        // Adding one is refused when it would hide the block's last visible column.
        const blockId = action.key.slice(0, action.key.lastIndexOf('#'))
        const all = columnsOf(blockId)
        const hidden = all.filter((c) => columns.includes(`${blockId}#${c.id}`)).length
        if (all.length && hidden >= all.length - 1) return site
        return { ...site, excluded: { ...ex, columns: [...columns, action.key] } }
      })
    case 'SET_INCLUSION':
      return touchActive(state, (site) => ({
        ...site,
        excluded: { sections: action.sections, subsections: action.subsections, columns: action.columns },
      }))
```

`{ ...emptyExcluded(), ...site.excluded }` is what makes a site stored before this change (no `columns` key) safe to spread.

Returning `site` unchanged from the guard still runs through `touchActive`, which bumps `updatedAt`. That is harmless — the test above asserts the exclusion list, not the timestamp.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Fix the two existing `SET_INCLUSION` call sites**

`SET_INCLUSION` now requires `columns`. In `app/src/ui/ChapterManager.tsx`, both buttons:

```tsx
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: [], subsections: [], columns: [] })}>בחר הכול</button>
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: allSecIds, subsections: allSubIds, columns: [] })}>נקה הכול</button>
```

Per the spec, «נקה הכול» leaves columns untouched (passes `[]`) because every block is hidden by that action anyway, and excluding all columns would collide with the guard.

- [ ] **Step 6: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/store/StoreContext.tsx src/store/reducer.test.ts src/ui/ChapterManager.tsx
git commit -m "feat(store): TOGGLE_COLUMN action with last-column guard"
```

---

## Task 4: Render only the visible columns

**Files:**
- Modify: `app/src/engine/TableBlock.tsx`, `app/src/engine/ChecklistBlock.tsx`, `app/src/engine/BlockRenderer.tsx`, `app/src/engine/SectionView.tsx`
- Test: `app/src/engine/TableBlock.test.tsx`

The two leaf components become presentational: they render exactly the columns they are handed. `BlockRenderer` does the filtering.

- [ ] **Step 1: Write the failing test**

Append to `app/src/engine/TableBlock.test.tsx`:

```tsx
  it('renders only the columns it is given', () => {
    render(<TableBlock block={block} cols={[block.columns[0]]} value={[]} onChange={vi.fn()} showExamples={false} />)
    expect(screen.getByText('שם')).toBeInTheDocument()
    expect(screen.queryByText('IP')).toBeNull()
  })

  it('spans the empty-state cell across the visible columns only', () => {
    render(<TableBlock block={block} cols={[block.columns[0]]} value={[]} onChange={vi.fn()} showExamples={false} />)
    expect(screen.getByText(/אין שורות/).getAttribute('colspan')).toBe('3')
  })
```

`colspan` is `cols.length + 2` — one index column plus one actions column.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/TableBlock.test.tsx`
Expected: FAIL — TS error, `cols` is not a prop of `TableBlock`.

- [ ] **Step 3: Implement `TableBlock`**

In `app/src/engine/TableBlock.tsx`, extend the props and delete the internal `cols` derivation:

```tsx
import type { ReactNode } from 'react'
import type { Block, Column, Row } from '../types'
```

```tsx
export function TableBlock({
  block,
  cols,
  value,
  onChange,
  showExamples,
  pickerSlot,
}: {
  block: TableBlockT
  cols: Column[]
  value: Row[] | undefined
  onChange: (rows: Row[]) => void
  showExamples: boolean
  pickerSlot?: ReactNode
}) {
```

Delete this line from the body (it is now a prop):

```tsx
  const cols = block.columns
```

Change the empty-state `colSpan` — it already reads `cols.length + 2`, so it follows automatically. Confirm the line reads:

```tsx
                <td colSpan={cols.length + 2} className="muted" style={{ textAlign: 'center', padding: 18 }}>
```

Add the picker slot to the footer, before the row count:

```tsx
      <div className="table-foot">
        <button className="btn btn-sm add-row-btn" onClick={addRow}>
          <IconPlus /> הוסף שורה
        </button>
        {pickerSlot}
        <span className="muted" style={{ fontSize: 12 }}>
          {filledCount} שורות מלאות
        </span>
      </div>
```

- [ ] **Step 4: Implement `ChecklistBlock`**

In `app/src/engine/ChecklistBlock.tsx`, take `cols` and use it in both `.map` calls:

```tsx
import type { Block, ChecklistValues, Column } from '../types'
```

```tsx
export function ChecklistBlock({
  block,
  cols,
  value,
  onChange,
}: {
  block: ChecklistBlockT
  cols: Column[]
  value: ChecklistValues | undefined
  onChange: (rowId: string, colId: string, value: string) => void
}) {
```

Replace both occurrences of `block.columns.map(` with `cols.map(`. The `rowHeader` cell is untouched — it is the row label, never excludable.

- [ ] **Step 5: Thread `ex` through `BlockRenderer`**

In `app/src/engine/BlockRenderer.tsx`, add the prop and the import:

```tsx
import { visibleColumns, type Excluded } from '../store/inclusion'
```

```tsx
export function BlockRenderer({
  block,
  values,
  dispatch,
  showExamples,
  ex,
}: {
  block: Block
  values: Record<string, BlockValue>
  dispatch: Dispatch<Action>
  showExamples: boolean
  ex: Excluded
}) {
```

Pass the filtered columns in the two cases:

```tsx
    case 'checklist':
      return (
        <div className="block" id={`block-${block.id}`}>
          <ChecklistBlock
            block={block}
            cols={visibleColumns(block, ex)}
            value={values[block.id] as ChecklistValues | undefined}
            onChange={(rowId, colId, value) =>
              dispatch({ type: 'SET_CHECKLIST', blockId: block.id, rowId, colId, value })
            }
          />
        </div>
      )
    case 'table':
      return (
        <div className="block" id={`block-${block.id}`}>
          <TableBlock
            block={block}
            cols={visibleColumns(block, ex)}
            value={values[block.id] as Row[] | undefined}
            showExamples={showExamples}
            onChange={(rows) => dispatch({ type: 'SET_TABLE', blockId: block.id, rows })}
          />
        </div>
      )
```

- [ ] **Step 6: Pass `ex` from `SectionView`**

In `app/src/engine/SectionView.tsx`, `ex` is already computed on line 15. Add it to the render call:

```tsx
      {visibleBlocks(section, ex).map((block, i) => (
        <BlockRenderer key={i} block={block} values={values} dispatch={dispatch} showExamples={showExamples} ex={ex} />
      ))}
```

- [ ] **Step 7: Update the three existing `TableBlock` tests**

Each existing `render(<TableBlock ... />)` in `app/src/engine/TableBlock.test.tsx` needs the new required prop. Add `cols={block.columns}` to the first two, and to the third (which uses `exBlock`) add `cols={exBlock.columns}` in both the `render` and the `rerender` call.

- [ ] **Step 8: Run tests and types**

Run: `npx vitest run src/engine/ && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/engine/
git commit -m "feat(engine): render only the site's visible columns"
```

---

## Task 5: The «עמודות» popover

**Files:**
- Create: `app/src/ui/ColumnPicker.tsx`
- Create: `app/src/ui/ColumnPicker.test.tsx`
- Modify: `app/src/engine/BlockRenderer.tsx`
- Modify: `app/src/styles/engine.css`

- [ ] **Step 1: Write the failing test**

Create `app/src/ui/ColumnPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnPicker } from './ColumnPicker'
import type { Column } from '../types'

const cols: Column[] = [
  { id: 'c0', label: 'שם', type: 'text' },
  { id: 'c1', label: 'תוקף', type: 'date' },
]
const noneExcluded = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }

describe('ColumnPicker', () => {
  it('opens the popover and lists every column', () => {
    render(<ColumnPicker blockId="t" columns={cols} ex={noneExcluded} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    expect(screen.getByLabelText('שם')).toBeInTheDocument()
    expect(screen.getByLabelText('תוקף')).toBeInTheDocument()
  })

  it('dispatches TOGGLE_COLUMN with the namespaced key', () => {
    const dispatch = vi.fn()
    render(<ColumnPicker blockId="t" columns={cols} ex={noneExcluded} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    fireEvent.click(screen.getByLabelText('תוקף'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_COLUMN', key: 't#c1' })
  })

  it('disables the last visible column so it cannot be hidden', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    render(<ColumnPicker blockId="t" columns={cols} ex={ex} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /עמודות/ }))
    expect(screen.getByLabelText('שם')).toBeDisabled()
    expect(screen.getByLabelText('תוקף')).not.toBeDisabled()
  })

  it('shows how many columns are hidden', () => {
    const ex = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    render(<ColumnPicker blockId="t" columns={cols} ex={ex} dispatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /עמודות/ }).textContent).toContain('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/ColumnPicker.test.tsx`
Expected: FAIL — cannot resolve `./ColumnPicker`.

- [ ] **Step 3: Implement**

Create `app/src/ui/ColumnPicker.tsx`:

```tsx
import { useState, type Dispatch } from 'react'
import type { Column } from '../types'
import type { Action } from '../store/StoreContext'
import { columnKey, type Excluded } from '../store/inclusion'
import { useClickOutside } from './useClickOutside'
import { IconColumns } from './icons'

/** Per-block column visibility popover. Presentational: it is handed the block's
 *  columns and the site's exclusions, and emits TOGGLE_COLUMN. */
export function ColumnPicker({
  blockId,
  columns,
  ex,
  dispatch,
}: {
  blockId: string
  columns: Column[]
  ex: Excluded
  dispatch: Dispatch<Action>
}) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  const isHidden = (c: Column) => ex.columns.has(columnKey(blockId, c.id))
  const hiddenCount = columns.filter(isHidden).length
  const visibleCount = columns.length - hiddenCount

  return (
    <div className="colpick" ref={ref}>
      <button
        className="btn btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconColumns /> עמודות{hiddenCount ? ` (${hiddenCount} מוסתרות)` : ''}
      </button>
      {open && (
        <div className="colpick-pop" role="group" aria-label="בחירת עמודות">
          {columns.map((c) => {
            const hidden = isHidden(c)
            // The last visible column may not be hidden — the reducer refuses it too.
            const locked = !hidden && visibleCount <= 1
            return (
              <label className="colpick-row" key={c.id}>
                <input
                  type="checkbox"
                  checked={!hidden}
                  disabled={locked}
                  aria-label={c.label}
                  onChange={() => dispatch({ type: 'TOGGLE_COLUMN', key: columnKey(blockId, c.id) })}
                />
                <span>{c.label}</span>
              </label>
            )
          })}
          <div className="colpick-foot">עמודות שהוסתרו — הנתונים בהן יישמרו.</div>
        </div>
      )}
    </div>
  )
}
```

Add the icon to `app/src/ui/icons.tsx`, matching the one-line style of every other icon in that file (they share the local `base(p)` prop helper):

```tsx
export const IconColumns = (p: P) => (<svg {...base(p)}><rect x="3" y="4" width="6" height="16" rx="1" /><rect x="15" y="4" width="6" height="16" rx="1" /></svg>)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/ColumnPicker.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Mount it in `BlockRenderer`**

In `app/src/engine/BlockRenderer.tsx`, import it and pass it as the slot in the `table` case:

```tsx
import { ColumnPicker } from '../ui/ColumnPicker'
```

```tsx
            pickerSlot={<ColumnPicker blockId={block.id} columns={block.columns} ex={ex} dispatch={dispatch} />}
```

Checklists have no footer to host the button, so their columns are managed from the modal only (Task 6). This is deliberate: adding a footer to `ChecklistBlock` for one control is not worth the layout churn.

- [ ] **Step 6: Style the popover**

Append to `app/src/styles/engine.css`:

These use the project's real tokens from `app/src/styles/theme.css` (`--surface`, `--surface-3`, `--border`, `--muted`, `--radius-sm`, `--shadow-lg`), so they follow dark mode automatically:

```css
.colpick { position: relative; display: inline-flex; }
.colpick-pop {
  position: absolute; bottom: calc(100% + 6px); inset-inline-start: 0; z-index: 30;
  min-width: 210px; padding: 8px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-lg);
}
.colpick-row { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: var(--radius-xs); cursor: pointer; }
.colpick-row:hover { background: var(--surface-3); }
.colpick-row input:disabled { cursor: not-allowed; }
.colpick-row input:disabled + span { opacity: 0.55; }
.colpick-foot { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); }
```

- [ ] **Step 7: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/ui/ColumnPicker.tsx src/ui/ColumnPicker.test.tsx src/ui/icons.tsx src/engine/BlockRenderer.tsx src/styles/engine.css
git commit -m "feat(ui): per-table column picker popover"
```

---

## Task 6: Fourth level in the "תכולת התיק" modal

**Files:**
- Modify: `app/src/store/inclusion.ts` (add `columnarBlocksOf`)
- Modify: `app/src/ui/ChapterManager.tsx`
- Test: `app/src/store/inclusion.test.ts`

The modal lists chapters → sub-chapters. Columns live under the *blocks* of a sub-chapter, and blocks have no titles, so each is labelled by its kind plus its position within the sub-chapter.

- [ ] **Step 1: Write the failing test**

Append to `app/src/store/inclusion.test.ts` (extend the import with `columnarBlocksOf`):

```ts
  it('columnarBlocksOf groups tables and checklists under their subhead', () => {
    const sec: Section = {
      id: 'sZ', title: 'Z', blocks: [
        { kind: 'subhead', text: 'ראשון', id: 'sZ#0' },
        { kind: 'table', id: 'tA', columns: [{ id: 'c0', label: 'A', type: 'text' }] },
        { kind: 'note', text: 'ignored' },
        { kind: 'subhead', text: 'שני', id: 'sZ#1' },
        { kind: 'checklist', id: 'ckB', rowHeader: 'ב', columns: [{ id: 'c1', label: 'B', type: 'text' }], rows: [] },
      ],
    }
    expect(columnarBlocksOf(sec)).toEqual([
      { subId: 'sZ#0', blockId: 'tA', label: 'טבלה', columns: [{ id: 'c0', label: 'A', type: 'text' }] },
      { subId: 'sZ#1', blockId: 'ckB', label: 'צ׳קליסט', columns: [{ id: 'c1', label: 'B', type: 'text' }] },
    ])
  })

  it('columnarBlocksOf numbers repeated kinds within one subhead', () => {
    const sec: Section = {
      id: 'sW', title: 'W', blocks: [
        { kind: 'subhead', text: 'א', id: 'sW#0' },
        { kind: 'table', id: 't1', columns: [{ id: 'c', label: 'C', type: 'text' }] },
        { kind: 'table', id: 't2', columns: [{ id: 'c', label: 'C', type: 'text' }] },
      ],
    }
    expect(columnarBlocksOf(sec).map((b) => b.label)).toEqual(['טבלה 1', 'טבלה 2'])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/inclusion.test.ts`
Expected: FAIL — `columnarBlocksOf is not a function`.

- [ ] **Step 3: Implement the helper**

Append to `app/src/store/inclusion.ts`:

```ts
export interface ColumnarBlock {
  /** Subhead this block sits under; '' for blocks before the first subhead. */
  subId: string
  blockId: string
  /** Display label — the block has no title of its own. */
  label: string
  columns: Column[]
}

/** Tables and checklists of a section, tagged with the subhead they sit under.
 *  Repeated kinds under one subhead are numbered so they can be told apart. */
export function columnarBlocksOf(section: Section): ColumnarBlock[] {
  const out: ColumnarBlock[] = []
  let subId = ''
  for (const b of section.blocks) {
    if (b.kind === 'subhead') { subId = b.id ?? ''; continue }
    if (b.kind !== 'table' && b.kind !== 'checklist') continue
    out.push({ subId, blockId: b.id, label: b.kind === 'table' ? 'טבלה' : 'צ׳קליסט', columns: b.columns })
  }
  // Number only the kinds that repeat within the same subhead.
  for (const item of out) {
    const siblings = out.filter((x) => x.subId === item.subId && x.label === item.label)
    if (siblings.length > 1) siblings.forEach((s, i) => { s.label = `${s.label} ${i + 1}` })
  }
  return out
}
```

The numbering loop mutates `label` in place; because `siblings` holds references into `out`, the renaming applies once per group and the guard `siblings.length > 1` re-reads the already-renamed labels harmlessly (a renamed label no longer matches the original, so each group is processed exactly once).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/inclusion.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the fourth level**

In `app/src/ui/ChapterManager.tsx`, extend the imports:

```tsx
import { excludedOf, subsectionsOf, columnarBlocksOf, columnKey } from '../store/inclusion'
```

Inside the sub-chapter `map`, after the existing `cm-row cm-sub` div, add the block/column rows for that sub-chapter. Replace the whole sub-chapter block with:

```tsx
                {open[s.id] && subs.map((sub) => {
                  const subOn = !ex.subsections.has(sub.id)
                  const blocks = columnarBlocksOf(s).filter((b) => b.subId === sub.id)
                  return (
                    <div key={sub.id}>
                      <div className="cm-row cm-sub">
                        <button className={'cm-check' + (subOn ? ' on' : '')} aria-pressed={subOn} aria-label={sub.text} onClick={() => dispatch({ type: 'TOGGLE_SUBSECTION', subId: sub.id })}>
                          {subOn && <IconCheck width={13} height={13} />}
                        </button>
                        <span className="cm-nm">{sub.text}</span>
                        {blocks.length > 0 && subOn && (
                          <button className={'cm-exp' + (open[sub.id] ? ' open' : '')} aria-label="הצג עמודות" onClick={() => setOpen((o) => ({ ...o, [sub.id]: !o[sub.id] }))}>
                            <IconChevronDown width={15} height={15} />
                          </button>
                        )}
                      </div>
                      {open[sub.id] && subOn && blocks.map((b) => {
                        const visible = b.columns.filter((c) => !ex.columns.has(columnKey(b.blockId, c.id)))
                        return (
                          <div key={b.blockId}>
                            <div className="cm-row cm-blk"><span className="cm-nm">{b.label}</span></div>
                            {b.columns.map((c) => {
                              const key = columnKey(b.blockId, c.id)
                              const on = !ex.columns.has(key)
                              const locked = on && visible.length <= 1
                              return (
                                <div className="cm-row cm-col" key={c.id}>
                                  <button
                                    className={'cm-check' + (on ? ' on' : '') + (locked ? ' locked' : '')}
                                    aria-pressed={on}
                                    aria-label={c.label}
                                    disabled={locked}
                                    onClick={() => dispatch({ type: 'TOGGLE_COLUMN', key })}
                                  >
                                    {on && <IconCheck width={12} height={12} />}
                                  </button>
                                  <span className="cm-nm">{c.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
```

Note the sub-chapter row is now wrapped in its own `<div key={sub.id}>` so the column rows nest under it, and the chevron/columns only appear when the sub-chapter itself is included — there is nothing to configure inside an excluded sub-chapter.

- [ ] **Step 6: Style the two new depths**

Append to `app/src/styles/engine.css` — check the existing `.cm-sub` rule first and mirror its indentation approach (the file uses logical properties for RTL):

```css
.cm-blk { padding-inline-start: 52px; font-size: 12px; color: var(--muted); }
.cm-col { padding-inline-start: 68px; }
.cm-check.locked { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 7: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/store/inclusion.ts src/store/inclusion.test.ts src/ui/ChapterManager.tsx src/styles/engine.css
git commit -m "feat(ui): column level in the portfolio contents modal"
```

---

## Task 7: Exports — Print/PDF and Word

**Files:**
- Modify: `app/src/print/PrintView.tsx`, `app/src/print/docxExport.ts`
- Test: `app/src/print/docxExport.test.ts`

A `.docx` is a zip, and the existing tests in `docxExport.test.ts` only assert `byteLength` — there is no way to grep the output for a missing column without adding an unzip dependency. So the Word path gets a build-smoke test, and the *visible* assertion is made against the print renderer, which is plain React.

`PrintBlock` in `PrintView.tsx` is currently module-private and pure (it takes `block` and `values`, no store). Export it so it can be rendered directly.

Create `app/src/print/PrintView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrintBlock } from './PrintView'
import type { Block } from '../types'

const table = {
  kind: 'table', id: 's7-suppliers',
  columns: [
    { id: 'c0', label: 'ספק', type: 'text' },
    { id: 'c5', label: 'תוקף', type: 'date' },
  ],
} as Extract<Block, { kind: 'table' }>

const values = { 's7-suppliers': [{ _id: 'r', c0: 'ספק א', c5: '12/2026' }] }
const none = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
const hideValidity = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['s7-suppliers#c5']) }

describe('PrintBlock', () => {
  it('prints every column when the site excludes nothing', () => {
    render(<PrintBlock block={table} values={values} ex={none} />)
    expect(screen.getByText('תוקף')).toBeInTheDocument()
    expect(screen.getByText('12/2026')).toBeInTheDocument()
  })

  it('omits an excluded column from the header and the body', () => {
    render(<PrintBlock block={table} values={values} ex={hideValidity} />)
    expect(screen.getByText('ספק א')).toBeInTheDocument()
    expect(screen.queryByText('תוקף')).toBeNull()
    expect(screen.queryByText('12/2026')).toBeNull()
  })
})
```

`PrintBlock` returns a bare `<table>`, so it renders standalone without a wrapper.

The column ids `c0` and `c5` are the real ones: `app/src/schema/helpers.ts` auto-numbers columns `c0..cn`, and `תוקף` is the sixth column of `s7-suppliers`.

Also append a smoke case to `app/src/print/docxExport.test.ts`, matching that file's existing style:

```ts
  it('builds a valid .docx for a site with column exclusions', async () => {
    const site = newSite('עם עמודות מוסתרות', () => 's4')
    site.values['s7-suppliers'] = [{ _id: 'r', c0: 'ספק א', c5: '12/2026' }]
    site.excluded = { sections: [], subsections: [], columns: ['s7-suppliers#c5'] }
    const buf = await Packer.toBuffer(buildDocxDocument(site, null))
    expect(buf.byteLength).toBeGreaterThan(2000)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/print/`
Expected: FAIL — `PrintBlock` is not exported, and it does not accept an `ex` prop.

- [ ] **Step 3: Implement `docxExport`**

`buildDocxDocument` already computes `const ex = excludedOf(site)` at line 251 and calls `blockToDocx(block, site.values, imageMap)` at line 256. Add `ex` as a fourth parameter and pass the existing value — no recomputation:

```ts
function blockToDocx(block: Block, values: Record<string, unknown>, imageMap: ImageMap, ex: Excluded): (Paragraph | Table)[] {
```

```ts
    for (const block of visibleBlocks(section, ex)) body.push(...blockToDocx(block, site.values, imageMap, ex))
```

Then the two branches at lines 184–193 filter:

```ts
    case 'checklist': {
      const v = (values[block.id] as ChecklistValues) || {}
      const cols = visibleColumns(block, ex)
      const headers = [block.rowHeader, ...cols.map((c) => c.label)]
      const rows = block.rows.map((r) => [r.label, ...cols.map((c) => v[r.id]?.[c.id] || '')])
      return [dataTable(headers, rows), spacer(80)]
    }
    case 'table': {
      const all = (values[block.id] as Row[]) || []
      const cols = visibleColumns(block, ex)
      const rows = all.filter((r) => cols.some((c) => r[c.id]?.trim())).map((r) => cols.map((c) => r[c.id] || ''))
      return [dataTable(cols.map((c) => c.label), rows), spacer(80)]
    }
```

Extend the existing import on line 8:

```ts
import { excludedOf, visibleSections, visibleBlocks, visibleColumns, type Excluded } from '../store/inclusion'
```

Note the table branch's "row has content" filter now tests visible columns only — a row whose only value sits in a hidden column is correctly treated as empty for export.

- [ ] **Step 4: Implement `PrintView`**

In `app/src/print/PrintView.tsx`, export `PrintBlock` and give it the `ex` prop:

```tsx
export function PrintBlock({ block, values, ex }: { block: Block; values: Record<string, BlockValue>; ex: Excluded }) {
```

In the `checklist` case, derive the columns and use them in both maps:

```tsx
    case 'checklist': {
      const v = (values[block.id] as ChecklistValues) || {}
      const cols = visibleColumns(block, ex)
```

In the `table` case, derive them and use them in the row filter, the header map, the body map, and the empty-state span:

```tsx
    case 'table': {
      const all = (values[block.id] as Row[]) || []
      const cols = visibleColumns(block, ex)
      const rows = all.filter((r) => cols.some((c) => r[c.id]?.trim()))
```

```tsx
                <td className="pv-empty" colSpan={cols.length}>
```

Replace every remaining `block.columns.map(` inside those two cases with `cols.map(` — five call sites in total across the two branches.

The component that renders `PrintBlock` already computes `ex` for `visibleBlocks`; pass that same value down as the new prop.

Extend the import on line 3:

```tsx
import { excludedOf, visibleSections, visibleBlocks, visibleColumns, type Excluded } from '../store/inclusion'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/print/ && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/print/
git commit -m "feat(print): honour column exclusions in PDF and Word export"
```

---

## Task 8: Completion — checklist rows count visible columns only

**Files:**
- Modify: `app/src/store/completion.ts:20-30`
- Test: `app/src/store/completion.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `app/src/store/completion.test.ts`, in the file's existing style:

```ts
  it('a checklist row whose only value is in a hidden column counts as unfilled', () => {
    const sec: Section = {
      id: 'sC', title: 'C', blocks: [
        { kind: 'checklist', id: 'ck', rowHeader: 'בקרה', rows: [{ id: 'r0', label: 'A' }], columns: [
          { id: 'status', label: 'סטטוס', type: 'status' },
          { id: 'owner', label: 'אחראי', type: 'text' },
        ] },
      ],
    }
    const values = { ck: { r0: { owner: 'דני' } } }
    const all = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set<string>() }
    const hidden = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['ck#owner']) }
    expect(sectionCompletion(sec, values, all)).toEqual({ total: 1, filled: 1 })
    expect(sectionCompletion(sec, values, hidden)).toEqual({ total: 1, filled: 0 })
  })

  it('table completion is unaffected by column exclusion', () => {
    const sec: Section = {
      id: 'sT', title: 'T', blocks: [
        { kind: 'table', id: 't', columns: [
          { id: 'c0', label: 'A', type: 'text' },
          { id: 'c1', label: 'B', type: 'text' },
        ] },
      ],
    }
    const values = { t: [{ _id: 'r', c0: 'x' }] }
    const hidden = { sections: new Set<string>(), subsections: new Set<string>(), columns: new Set(['t#c1']) }
    expect(sectionCompletion(sec, values, hidden)).toEqual({ total: 1, filled: 1 })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/completion.test.ts`
Expected: FAIL — the hidden case returns `filled: 1`.

- [ ] **Step 3: Implement**

In `app/src/store/completion.ts`, give `unit` the exclusions and use them in the checklist branch:

```ts
import { visibleBlocks, visibleColumns, visibleSections } from './inclusion'
```

```ts
function unit(b: Block, v: BlockValue | undefined, ex?: Excluded): Completion {
  if ('optional' in b && b.optional) return { total: 0, filled: 0 }
  if (b.kind === 'kv') {
    const kv = (v as KvValues) || {}
    return { total: b.fields.length, filled: b.fields.filter((f) => nonEmpty(kv[f.id])).length }
  }
  if (b.kind === 'checklist') {
    const cv = (v as ChecklistValues) || {}
    // A row counts as filled only when a column the site can actually see has a value.
    const cols = ex ? visibleColumns(b, ex) : b.columns
    return {
      total: b.rows.length,
      filled: b.rows.filter((r) => {
        const rv = cv[r.id]
        return !!rv && cols.some((c) => nonEmpty(rv[c.id]))
      }).length,
    }
  }
  if (b.kind === 'table') {
    const rows = (v as Row[]) || []
    const has = rows.some((r) => Object.entries(r).some(([k, val]) => k !== '_id' && nonEmpty(val)))
    return { total: 1, filled: has ? 1 : 0 }
  }
  return { total: 0, filled: 0 }
}
```

And pass it through in `sectionCompletion`:

```ts
      const u = unit(b, id ? values[id] : undefined, ex)
```

Tables keep counting as one unit regardless of columns — that is why the second test asserts no change.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/completion.test.ts src/store/completion.excluded.test.ts`
Expected: PASS, including the pre-existing exclusion tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/completion.ts src/store/completion.test.ts
git commit -m "feat(completion): checklist rows count visible columns only"
```

---

## Task 9: Dashboard — per-site expiry sources and name fallback

**Files:**
- Modify: `app/src/store/dashboard.ts:69-83` (`expirySources`), `:196-215` (expiry loop)
- Test: `app/src/store/dashboard.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `app/src/store/dashboard.test.ts`, inside the existing `describe('buildDashboard', ...)`. The file's helper is `site(id, over)` and it does **not** copy `excluded`, so the exclusion is attached afterwards by spreading:

```ts
  it('skips a site that excluded the expiry column, but not its siblings', () => {
    const soon = '01/07/2026' // ~15 days after NOW, inside the 60-day window
    const vals = { 's7-suppliers': [{ _id: 'r', c0: 'ספק', c5: soon }] }
    const a = site('a', { values: vals })
    const b = { ...site('b', { values: vals }), excluded: { sections: [], subsections: [], columns: ['s7-suppliers#c5'] } }
    const d = buildDashboard({ a, b }, NOW)
    expect(d.expiries.map((e) => e.siteId)).toEqual(['a'])
  })

  it('falls back to the first visible column for the expiry item name', () => {
    const s = {
      ...site('a', { values: { 's7-suppliers': [{ _id: 'r', c0: 'ספק', c1: 'תחום', c5: '01/07/2026' }] } }),
      excluded: { sections: [], subsections: [], columns: ['s7-suppliers#c0'] },
    }
    const d = buildDashboard({ a: s }, NOW)
    expect(d.expiries[0].name).toBe('תחום')
  })
```

The column ids are the real ones: `helpers.ts` auto-numbers `s7-suppliers` columns `c0..c5`, where `c0` is «ספק» and `c5` is the `role: 'expiry'` column «תוקף». `NOW` is `2026-06-16`, already defined at the top of the file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/dashboard.test.ts`
Expected: FAIL — site B still produces an expiry, and the name is `''` rather than the fallback.

- [ ] **Step 3: Implement**

In `app/src/store/dashboard.ts`, make the source discovery exclusion-aware:

```ts
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
```

Iterating `cols` rather than `block.columns` is what drops an excluded expiry column; taking `cols[0]` is the name fallback.

Then move the call inside the per-site loop:

```ts
  const expiries: ExpiryItem[] = []
  for (const site of list) {
    const sources = expirySourcesFor(excludedOf(site))
    for (const src of sources) {
```

Delete the now-unused `const sources = expirySources()` line above the loop and the old `expirySources` function. Extend the import:

```ts
import { excludedOf, visibleColumns, type Excluded } from './inclusion'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/dashboard.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/dashboard.ts src/store/dashboard.test.ts
git commit -m "fix(dashboard): per-site expiry sources + visible-column name fallback"
```

---

## Task 10: Full verification

**Files:** none modified unless a check fails.

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: every test passes. Compare the count against `app/README.md`, which advertises the suite size — update that number in the README if it is now stale, and commit that edit with the final commit below.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, `app/dist` written.

- [ ] **Step 4: Manual smoke test in the browser**

Run: `npm run dev`, open `http://localhost:5173`, then:
1. Open chapter 7 (ספקים), click «עמודות» under the table, uncheck «תוקף» → the column disappears immediately.
2. Type a value in another column, reload the page → the exclusion and the data both survive.
3. Open the ⋯ menu → «תכולת התיק» → expand chapter 7 → its sub-chapter → confirm «תוקף» shows unchecked there too.
4. Uncheck every column but one → the last checkbox is disabled in both surfaces.
5. Re-check «תוקף» → any value previously typed into it reappears.
6. Menu → הדפסה — the hidden column is absent from the print view.
7. Menu → ייצוא Word — open the .docx and confirm the column is absent.
8. Open the dashboard — a site with «תוקף» hidden raises no expiry row.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: verify column inclusion end to end"
```

---

## Notes for the implementer

- **Two test files reference `Excluded` object literals.** Any new literal needs all three sets (`sections`, `subsections`, `columns`) or TypeScript rejects it. Prefer `excludedOf({...} as never)` where a site-shaped fixture is more readable.
- **`SiteData.excluded.columns` is optional on read, required on write.** The reducer always writes all three arrays via `emptyExcluded()`; readers use `?? []`. Do not make it required in `types.ts` — that would break every site already stored in SharePoint.
- **Do not touch `generate.js`.** The Word master template at the repo root is a separate artifact with no notion of per-site inclusion; it is explicitly out of scope in the spec.
- **The `#` separator.** Column keys are split with `lastIndexOf('#')` in the reducer because block ids never contain `#` but the format must stay unambiguous if that ever changes.
- **Never hand out a live schema array.** `doc` is built once at module load and shared by every site for the app's lifetime, so any function returning a block's `columns` (or `rows`, or `fields`) must type it `readonly` — otherwise a caller's `.sort()` / `.push()` / `.splice()` silently corrupts the schema for the whole session. This bit us twice during implementation: once in `columnsOf` (Task 2, fixed in `19f6a03`) and again in `ColumnarBlockRef.columns` (Task 6, fixed in `5f752eb`). Filtered results such as `visibleColumns` are safe because `.filter()` allocates a fresh array.
- **Hidden-column data is preserved but treated as absent.** A value stored in an excluded column stays in `site.values` and reappears if the column is re-included, but it does not count anywhere the user can see: not for a table's "N שורות מלאות" footer, not for checklist completion, not for export row-emptiness, and not for dashboard expiry. Tasks 4, 7, 8 and 9 each implement one half of that rule — keep them consistent.
