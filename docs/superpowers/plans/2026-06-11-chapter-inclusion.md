# Per-Site Chapter & Sub-Chapter Inclusion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each site choose which chapters and sub-chapters are included; unselected ones are hidden from navigation, the editor, completion %, and both exports, with data preserved.

**Architecture:** Store exclusions inside each `SiteData` (`excluded.sections` / `excluded.subsections`). Every sub-heading gets a stable id at schema-assembly time. One helper module (`store/inclusion.ts`) computes visibility and is consumed by completion, the section view, the sidebar, the search palette, and both exporters. A modal (`ChapterManager`) toggles inclusion via reducer actions.

**Tech Stack:** Vite + React 18 + TypeScript, Vitest (globals + jsdom), existing schema-driven engine.

**Working dir for all commands:** `C:\ITSiteProfolio\app`. Run tests with `npm run test`, type-check with `npx tsc --noEmit`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/types.ts` | add `id?` to subhead block; add `excluded?` to `SiteData` |
| `src/schema/index.ts` | assign stable subhead ids at assembly |
| `src/store/inclusion.ts` (new) | visibility helper (single source of truth) |
| `src/store/completion.ts` | optional `Excluded` arg; skip excluded sections/sub-chapters |
| `src/store/StoreContext.tsx` | export `reducer`; add 3 inclusion actions |
| `src/engine/SectionView.tsx` | render `visibleBlocks` |
| `src/ui/icons.tsx` | add `IconSliders` |
| `src/ui/ChapterManager.tsx` (new) | the selection modal |
| `src/ui/Sidebar.tsx` | filter sections; add manage button |
| `src/ui/AppShell.tsx` | modal state; active-section guard; all-hidden empty state |
| `src/ui/CommandPalette.tsx` | search only visible content |
| `src/print/PrintView.tsx` | filter sections + blocks |
| `src/print/docxExport.ts` | filter sections + blocks |
| `src/styles/engine.css` | styles for the modal + sidebar manage button |
| New tests: `src/store/inclusion.test.ts`, `src/store/completion.excluded.test.ts`, `src/store/reducer.test.ts`, `src/schema/subheadIds.test.ts` |

---

### Task 1: Data-model types

**Files:** Modify `src/types.ts`

- [ ] **Step 1: Add `id?` to the subhead block**

In `src/types.ts`, change the subhead member of the `Block` union from:
```ts
  | { kind: 'subhead'; text: string; optional?: boolean }
```
to:
```ts
  | { kind: 'subhead'; text: string; optional?: boolean; id?: string }
```

- [ ] **Step 2: Add `excluded?` to `SiteData`**

In `src/types.ts`, change `SiteData` to add the field after `values`:
```ts
export interface SiteData {
  id: string
  createdAt: string
  updatedAt: string
  meta: SiteMeta
  values: Record<string, BlockValue>
  excluded?: { sections: string[]; subsections: string[] }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add app/src/types.ts
git commit -m "feat(inclusion): add subhead id + SiteData.excluded to types"
```

---

### Task 2: Stable subhead ids (TDD)

**Files:** Modify `src/schema/index.ts`; Create `src/schema/subheadIds.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/schema/subheadIds.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { doc } from './index'

describe('subhead ids', () => {
  it('every subhead has an id', () => {
    for (const s of doc.sections)
      for (const b of s.blocks)
        if (b.kind === 'subhead') expect(b.id, `${s.id}: ${b.text}`).toBeTruthy()
  })
  it('subhead ids are unique within a section', () => {
    for (const s of doc.sections) {
      const ids = s.blocks.flatMap((b) => (b.kind === 'subhead' && b.id ? [b.id] : []))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test -- subheadIds`
Expected: FAIL ("every subhead has an id" — ids are undefined).

- [ ] **Step 3: Assign ids at assembly**

In `src/schema/index.ts`, after the `export const doc` block and before `dataBlocks`, insert:
```ts
// Give every sub-heading a stable id (section id + its ordinal among subheads)
// so sub-chapters can be individually included/excluded per site.
for (const section of doc.sections) {
  let ordinal = 0
  for (const block of section.blocks) {
    if (block.kind === 'subhead') {
      if (!block.id) block.id = `${section.id}#${ordinal}`
      ordinal++
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test -- subheadIds`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/schema/index.ts app/src/schema/subheadIds.test.ts
git commit -m "feat(inclusion): assign stable ids to sub-headings"
```

---

### Task 3: Inclusion helper (TDD)

**Files:** Create `src/store/inclusion.ts`; Create `src/store/inclusion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/inclusion.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { Doc, Section } from '../types'
import { excludedOf, visibleSections, visibleBlocks, subsectionsOf } from './inclusion'

const section: Section = {
  id: 'sX', title: 'X', blocks: [
    { kind: 'kv', id: 'intro', fields: [] },
    { kind: 'subhead', text: 'A', id: 'sX#0' },
    { kind: 'kv', id: 'a1', fields: [] },
    { kind: 'subhead', text: 'B', id: 'sX#1' },
    { kind: 'kv', id: 'b1', fields: [] },
  ],
}
const doc: Doc = { sections: [section, { id: 'sY', title: 'Y', blocks: [] }] }

describe('inclusion', () => {
  it('excludedOf(null) -> empty sets', () => {
    const ex = excludedOf(null)
    expect(ex.sections.size).toBe(0)
    expect(ex.subsections.size).toBe(0)
  })
  it('excludedOf reads arrays into sets', () => {
    const ex = excludedOf({ excluded: { sections: ['s1'], subsections: ['s1#0'] } } as never)
    expect(ex.sections.has('s1')).toBe(true)
    expect(ex.subsections.has('s1#0')).toBe(true)
  })
  it('visibleSections drops excluded sections', () => {
    const ex = { sections: new Set(['sY']), subsections: new Set<string>() }
    expect(visibleSections(doc, ex).map((s) => s.id)).toEqual(['sX'])
  })
  it('visibleBlocks drops an excluded subhead group, keeps the intro and other groups', () => {
    const ex = { sections: new Set<string>(), subsections: new Set(['sX#0']) }
    const ids = visibleBlocks(section, ex).map((b) => ('id' in b ? b.id : b.kind))
    expect(ids).toEqual(['intro', 'sX#1', 'b1'])
  })
  it('subsectionsOf returns subheads with ids and text', () => {
    expect(subsectionsOf(section)).toEqual([
      { id: 'sX#0', text: 'A' },
      { id: 'sX#1', text: 'B' },
    ])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test -- inclusion`
Expected: FAIL ("Cannot find module './inclusion'").

- [ ] **Step 3: Implement the helper**

Create `src/store/inclusion.ts`:
```ts
import type { Block, Doc, Section, SiteData } from '../types'

export interface Excluded {
  sections: Set<string>
  subsections: Set<string>
}

export function excludedOf(site: SiteData | null | undefined): Excluded {
  return {
    sections: new Set(site?.excluded?.sections ?? []),
    subsections: new Set(site?.excluded?.subsections ?? []),
  }
}

export function visibleSections(doc: Doc, ex: Excluded): Section[] {
  return doc.sections.filter((s) => !ex.sections.has(s.id))
}

/** A sub-chapter spans a subhead until the next subhead. Drops the subhead and
 *  its following blocks when that subhead id is excluded. Blocks before the
 *  first subhead belong to the section and are always kept. */
export function visibleBlocks(section: Section, ex: Excluded): Block[] {
  const out: Block[] = []
  let cut = false
  for (const b of section.blocks) {
    if (b.kind === 'subhead') {
      cut = !!b.id && ex.subsections.has(b.id)
      if (cut) continue
    }
    if (!cut) out.push(b)
  }
  return out
}

export function subsectionsOf(section: Section): { id: string; text: string }[] {
  const subs: { id: string; text: string }[] = []
  for (const b of section.blocks) if (b.kind === 'subhead' && b.id) subs.push({ id: b.id, text: b.text })
  return subs
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test -- inclusion`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/store/inclusion.ts app/src/store/inclusion.test.ts
git commit -m "feat(inclusion): visibility helper (sections, blocks, subsections)"
```

---

### Task 4: Completion respects exclusion (TDD)

**Files:** Modify `src/store/completion.ts`; Create `src/store/completion.excluded.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/completion.excluded.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { Doc, Section } from '../types'
import { sectionCompletion, overallCompletion } from './completion'

const sec: Section = { id: 's', title: 's', blocks: [
  { kind: 'kv', id: 'k1', fields: [{ id: 'a', label: 'A', type: 'text' }] },
  { kind: 'subhead', text: 'Sub', id: 's#0' },
  { kind: 'kv', id: 'k2', fields: [{ id: 'b', label: 'B', type: 'text' }] },
] }
const doc: Doc = { sections: [sec] }

describe('completion with exclusion', () => {
  it('counts all blocks when no exclusion passed', () => {
    expect(sectionCompletion(sec, {}).total).toBe(2)
  })
  it('drops blocks under an excluded subhead', () => {
    const ex = { sections: new Set<string>(), subsections: new Set(['s#0']) }
    expect(sectionCompletion(sec, {}, ex).total).toBe(1)
  })
  it('overall drops excluded sections', () => {
    const ex = { sections: new Set(['s']), subsections: new Set<string>() }
    expect(overallCompletion(doc, {}, ex).total).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test -- completion.excluded`
Expected: FAIL (`sectionCompletion` takes 2 args / drops nothing).

- [ ] **Step 3: Thread `Excluded` through completion**

In `src/store/completion.ts`, add the import at the top:
```ts
import type { Excluded } from './inclusion'
import { visibleBlocks, visibleSections } from './inclusion'
```

Replace `sectionCompletion` and `overallCompletion` with:
```ts
export function sectionCompletion(sec: Section, values: Record<string, BlockValue>, ex?: Excluded): Completion {
  const blocks = ex ? visibleBlocks(sec, ex) : sec.blocks
  return blocks.reduce<Completion>(
    (acc, b) => {
      const id = 'id' in b ? b.id : undefined
      const u = unit(b, id ? values[id] : undefined)
      return { total: acc.total + u.total, filled: acc.filled + u.filled }
    },
    { total: 0, filled: 0 },
  )
}

export function overallCompletion(doc: Doc, values: Record<string, BlockValue>, ex?: Excluded): Completion {
  const sections = ex ? visibleSections(doc, ex) : doc.sections
  return sections.reduce<Completion>(
    (acc, sec) => {
      const c = sectionCompletion(sec, values, ex)
      return { total: acc.total + c.total, filled: acc.filled + c.filled }
    },
    { total: 0, filled: 0 },
  )
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm run test -- completion`
Expected: PASS (existing `completion.test.ts` AND the new `completion.excluded.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add app/src/store/completion.ts app/src/store/completion.excluded.test.ts
git commit -m "feat(inclusion): completion skips excluded sections and sub-chapters"
```

---

### Task 5: Reducer actions (TDD)

**Files:** Modify `src/store/StoreContext.tsx`; Create `src/store/reducer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/reducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reducer } from './StoreContext'
import { newSite } from './siteData'
import type { AppState } from '../types'

function baseState(): AppState {
  const s = newSite('T', () => 'site1')
  return { sites: { site1: s }, activeSiteId: 'site1', ui: { theme: 'light', showExamples: true } }
}

describe('inclusion reducer actions', () => {
  it('TOGGLE_SECTION adds then removes a section id', () => {
    let st = reducer(baseState(), { type: 'TOGGLE_SECTION', sectionId: 's6' })
    expect(st.sites.site1.excluded?.sections).toEqual(['s6'])
    st = reducer(st, { type: 'TOGGLE_SECTION', sectionId: 's6' })
    expect(st.sites.site1.excluded?.sections).toEqual([])
  })
  it('TOGGLE_SUBSECTION toggles a sub id', () => {
    const st = reducer(baseState(), { type: 'TOGGLE_SUBSECTION', subId: 's3#7' })
    expect(st.sites.site1.excluded?.subsections).toEqual(['s3#7'])
  })
  it('SET_INCLUSION replaces both arrays', () => {
    const st = reducer(baseState(), { type: 'SET_INCLUSION', sections: ['s1'], subsections: ['s1#0'] })
    expect(st.sites.site1.excluded).toEqual({ sections: ['s1'], subsections: ['s1#0'] })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test -- reducer`
Expected: FAIL (`reducer` is not exported / actions unknown).

- [ ] **Step 3: Add action types**

In `src/store/StoreContext.tsx`, add to the `Action` union (after the `MERGE_SITE` line):
```ts
  | { type: 'TOGGLE_SECTION'; sectionId: string }
  | { type: 'TOGGLE_SUBSECTION'; subId: string }
  | { type: 'SET_INCLUSION'; sections: string[]; subsections: string[] }
```

- [ ] **Step 4: Export the reducer and add cases**

In `src/store/StoreContext.tsx`, change `function reducer(` to `export function reducer(`. Add this helper just above the `reducer` function:
```ts
const toggleId = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
```
Add these cases inside the reducer `switch`, just before `default:`:
```ts
    case 'TOGGLE_SECTION':
      return touchActive(state, (site) => {
        const ex = site.excluded ?? { sections: [], subsections: [] }
        return { ...site, excluded: { ...ex, sections: toggleId(ex.sections, action.sectionId) } }
      })
    case 'TOGGLE_SUBSECTION':
      return touchActive(state, (site) => {
        const ex = site.excluded ?? { sections: [], subsections: [] }
        return { ...site, excluded: { ...ex, subsections: toggleId(ex.subsections, action.subId) } }
      })
    case 'SET_INCLUSION':
      return touchActive(state, (site) => ({ ...site, excluded: { sections: action.sections, subsections: action.subsections } }))
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm run test -- reducer`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add app/src/store/StoreContext.tsx app/src/store/reducer.test.ts
git commit -m "feat(inclusion): reducer actions TOGGLE_SECTION/TOGGLE_SUBSECTION/SET_INCLUSION"
```

---

### Task 6: Section view hides excluded sub-chapters

**Files:** Modify `src/engine/SectionView.tsx`

- [ ] **Step 1: Render visible blocks and exclusion-aware completion**

In `src/engine/SectionView.tsx`, add the import:
```ts
import { excludedOf, visibleBlocks } from '../store/inclusion'
```
Replace the completion line:
```ts
  const completion = pct(sectionCompletion(section, values))
```
with:
```ts
  const ex = excludedOf(site)
  const completion = pct(sectionCompletion(section, values, ex))
```
Replace the blocks map:
```ts
      {section.blocks.map((block, i) => (
```
with:
```ts
      {visibleBlocks(section, ex).map((block, i) => (
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/engine/SectionView.tsx
git commit -m "feat(inclusion): section view renders only included sub-chapters"
```

---

### Task 7: Sliders icon

**Files:** Modify `src/ui/icons.tsx`

- [ ] **Step 1: Add the icon**

Append to `src/ui/icons.tsx` (before the final newline):
```ts
export const IconSliders = (p: P) => (<svg {...base(p)}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>)
```

- [ ] **Step 2: Commit**

```bash
git add app/src/ui/icons.tsx
git commit -m "feat(inclusion): add sliders icon"
```

---

### Task 8: ChapterManager modal + styles

**Files:** Create `src/ui/ChapterManager.tsx`; Modify `src/styles/engine.css`

- [ ] **Step 1: Create the component**

Create `src/ui/ChapterManager.tsx`:
```tsx
import { useState } from 'react'
import { doc } from '../schema'
import { useStore, useActiveSite } from '../store/StoreContext'
import { excludedOf, subsectionsOf } from '../store/inclusion'
import { IconX, IconChevronDown, IconCheck } from './icons'

export function ChapterManager({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  const site = useActiveSite()
  const ex = excludedOf(site)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const allSecIds = doc.sections.map((s) => s.id)
  const allSubIds = doc.sections.flatMap((s) => subsectionsOf(s).map((x) => x.id))

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm" role="dialog" aria-label="תכולת התיק">
        <div className="cm-head">
          <div>
            <div className="cm-title">תכולת התיק — פרקים</div>
            <div className="cm-sub">בחר אילו פרקים ותתי-פרקים ייכללו באתר «{site?.meta.name || '—'}»</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="סגור"><IconX /></button>
        </div>
        <div className="cm-tools">
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: [], subsections: [] })}>בחר הכול</button>
          <button className="cm-link" onClick={() => dispatch({ type: 'SET_INCLUSION', sections: allSecIds, subsections: allSubIds })}>נקה הכול</button>
        </div>
        <div className="cm-list">
          {doc.sections.map((s) => {
            const secOn = !ex.sections.has(s.id)
            const subs = subsectionsOf(s)
            const num = s.title.match(/^(\d+)\./)?.[1]
            const label = s.title.replace(/^\d+\.\s*/, '')
            return (
              <div key={s.id}>
                <div className="cm-row">
                  <button className={'cm-check' + (secOn ? ' on' : '')} aria-pressed={secOn} aria-label={label} onClick={() => dispatch({ type: 'TOGGLE_SECTION', sectionId: s.id })}>
                    {secOn && <IconCheck width={14} height={14} />}
                  </button>
                  <span className="cm-num">{num ?? '•'}</span>
                  <span className="cm-nm">{label}</span>
                  {subs.length > 0 && (
                    <button className={'cm-exp' + (open[s.id] ? ' open' : '')} aria-label="הצג תתי-פרקים" onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}>
                      <IconChevronDown width={16} height={16} />
                    </button>
                  )}
                </div>
                {open[s.id] && subs.map((sub) => {
                  const subOn = !ex.subsections.has(sub.id)
                  return (
                    <div className="cm-row cm-sub" key={sub.id}>
                      <button className={'cm-check' + (subOn ? ' on' : '')} aria-pressed={subOn} aria-label={sub.text} onClick={() => dispatch({ type: 'TOGGLE_SUBSECTION', subId: sub.id })}>
                        {subOn && <IconCheck width={13} height={13} />}
                      </button>
                      <span className="cm-nm">{sub.text}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="cm-foot">פרקים שלא סומנו יוסתרו מהאתר ומהיצוא — הנתונים יישמרו.</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add styles**

Append to `src/styles/engine.css`:
```css
/* Chapter inclusion manager */
.cm { width: min(560px, 92vw); max-height: 80vh; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
.cm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.cm-title { font-weight: 800; color: var(--c-primary); font-size: 16px; }
.cm-sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
.cm-tools { display: flex; gap: 16px; padding: 8px 18px; border-bottom: 1px solid var(--border); }
.cm-link { background: none; border: none; color: var(--c-primary); font: 600 13px Heebo, sans-serif; cursor: pointer; padding: 0; }
.cm-list { overflow-y: auto; padding: 8px; }
.cm-row { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: var(--radius-sm); }
.cm-row:hover { background: var(--surface-2); }
.cm-sub { padding-inline-start: 34px; }
.cm-num { font-size: 12px; color: var(--muted); min-width: 14px; text-align: center; }
.cm-nm { flex: 1; font-size: 14px; color: var(--text); }
.cm-sub .cm-nm { font-size: 13px; color: var(--text-2); }
.cm-check { width: 20px; height: 20px; flex: none; border: 1.5px solid var(--border-strong); border-radius: 5px; background: var(--surface); display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; padding: 0; }
.cm-check.on { background: var(--c-primary); border-color: var(--c-primary); }
.cm-exp { background: none; border: none; color: var(--muted); cursor: pointer; padding: 2px; display: flex; transition: transform .15s; }
.cm-exp.open { transform: rotate(180deg); }
.cm-foot { padding: 11px 18px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); }
.nav-group-head { display: flex; align-items: center; justify-content: space-between; padding-inline-end: 8px; }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/ChapterManager.tsx app/src/styles/engine.css
git commit -m "feat(inclusion): ChapterManager modal + styles"
```

---

### Task 9: Sidebar filters sections + manage button

**Files:** Modify `src/ui/Sidebar.tsx`

- [ ] **Step 1: Wire visibility and the manage button**

In `src/ui/Sidebar.tsx`, add imports:
```ts
import { excludedOf, visibleSections } from '../store/inclusion'
import { IconSliders } from './icons'
```
Change the signature to accept an optional `onManage` (optional so this task compiles before Task 10 wires it):
```ts
export function Sidebar({ active, onSelect, onManage }: { active: string; onSelect: (id: string) => void; onManage?: () => void }) {
```
After `const values = site?.values || {}` add:
```ts
  const ex = excludedOf(site)
```
Change the overall line:
```ts
  const overall = pct(overallCompletion(doc, values))
```
to:
```ts
  const overall = pct(overallCompletion(doc, values, ex))
```
Replace the group label:
```ts
      <div className="nav-group-label">פרקים</div>
```
with:
```ts
      <div className="nav-group-head">
        <span className="nav-group-label">פרקים</span>
        <button className="icon-btn nav-manage" title="תכולת התיק — בחר פרקים" aria-label="תכולת התיק" onClick={() => onManage?.()}>
          <IconSliders width={17} height={17} />
        </button>
      </div>
```
Replace `{doc.sections.map((s) => {` with `{visibleSections(doc, ex).map((s) => {`, and inside it change:
```ts
        const c = pct(sectionCompletion(s, values))
```
to:
```ts
        const c = pct(sectionCompletion(s, values, ex))
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (`onManage` is optional).

- [ ] **Step 3: Commit**

```bash
git add app/src/ui/Sidebar.tsx
git commit -m "feat(inclusion): sidebar lists only included chapters + manage button"
```

---

### Task 10: AppShell wires the modal, guards active section, empty state

**Files:** Modify `src/ui/AppShell.tsx`

- [ ] **Step 1: Wire it all**

In `src/ui/AppShell.tsx`, update imports:
```ts
import { useStore, useActiveSite } from '../store/StoreContext'
import { excludedOf, visibleSections } from '../store/inclusion'
import { ChapterManager } from './ChapterManager'
```
After `const { readOnly, remoteStatus, signIn } = useStore()` add:
```ts
  const site = useActiveSite()
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const ex = excludedOf(site)
  const visible = visibleSections(doc, ex)
```
Replace the section lookup:
```ts
  const section = doc.sections.find((s) => s.id === active) ?? doc.sections[0]
```
with:
```ts
  const section = visible.find((s) => s.id === active) ?? visible[0]
```
Add this effect right after the existing `useEffect(() => { mainRef.current?.scrollTo({ top: 0 }) }, [active])`:
```ts
  // If the active section gets hidden, move to the first visible one.
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === active)) setActive(visible[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, visible.map((s) => s.id).join(',')])
```
Pass `onManage` to the sidebar — change the `<Sidebar .../>` usage to add the prop:
```tsx
      <Sidebar
        active={active}
        onSelect={(id) => {
          setActive(id)
          setSidebarOpen(false)
        }}
        onManage={() => setChaptersOpen(true)}
      />
```
Replace the main content block (the `needsSignIn ? (...) : (...)` ternary's editor branch) so all-hidden shows an empty state. Replace:
```tsx
        ) : (
          <div className="main-pad" ref={padRef}>
            <SectionView section={section} />
          </div>
        )}
```
with:
```tsx
        ) : visible.length === 0 ? (
          <div className="signin-gate">
            <IconEye width={44} height={44} />
            <h2>כל הפרקים הוסתרו</h2>
            <p>פתח את "תכולת התיק" כדי לכלול פרקים באתר זה.</p>
            <button className="btn btn-primary" onClick={() => setChaptersOpen(true)}>תכולת התיק</button>
          </div>
        ) : (
          <div className="main-pad" ref={padRef}>
            <SectionView section={section!} />
          </div>
        )}
```
Add the modal render just before the closing of the palette conditional (next to `{paletteOpen && ...}`):
```tsx
      {chaptersOpen && <ChapterManager onClose={() => setChaptersOpen(false)} />}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/ui/AppShell.tsx
git commit -m "feat(inclusion): AppShell modal wiring, active-section guard, all-hidden state"
```

---

### Task 11: Search palette skips hidden content

**Files:** Modify `src/ui/CommandPalette.tsx`

- [ ] **Step 1: Filter the index by visibility**

In `src/ui/CommandPalette.tsx`, update imports:
```ts
import { useActiveSite } from '../store/StoreContext'
import { excludedOf, visibleSections } from '../store/inclusion'
import type { SiteData } from '../types'
```
Replace `function buildIndex(): Entry[] {` with `function buildIndex(site: SiteData | null): Entry[] {` and rewrite its body:
```ts
function buildIndex(site: SiteData | null): Entry[] {
  const ex = excludedOf(site)
  const visible = new Set(visibleSections(doc, ex).map((s) => s.id))
  const out: Entry[] = []
  for (const s of doc.sections) {
    if (!visible.has(s.id)) continue
    out.push({ label: s.title, sectionId: s.id, sectionTitle: s.title, kind: 'פרק' })
    let cut = false
    for (const b of s.blocks) {
      if (b.kind === 'subhead') { cut = !!b.id && ex.subsections.has(b.id); if (cut) continue }
      if (cut) continue
      if (b.kind === 'subhead') out.push({ label: b.text, sectionId: s.id, sectionTitle: s.title, kind: 'תת-פרק' })
      if (b.kind === 'kv') b.fields.forEach((f) => out.push({ label: f.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'שדה' }))
      if (b.kind === 'table') b.columns.forEach((c) => out.push({ label: c.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'טור' }))
      if (b.kind === 'checklist') {
        b.rows.forEach((r) => out.push({ label: r.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'בקרה' }))
        b.columns.forEach((c) => out.push({ label: c.label, sectionId: s.id, sectionTitle: s.title, blockId: b.id, kind: 'טור' }))
      }
    }
  }
  return out
}
```
Replace `const index = useMemo(buildIndex, [])` with:
```ts
  const site = useActiveSite()
  const index = useMemo(() => buildIndex(site), [site])
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/ui/CommandPalette.tsx
git commit -m "feat(inclusion): search palette skips hidden chapters/sub-chapters"
```

---

### Task 12: Print view filters

**Files:** Modify `src/print/PrintView.tsx`

- [ ] **Step 1: Filter sections and blocks**

In `src/print/PrintView.tsx`, add the import:
```ts
import { excludedOf, visibleSections, visibleBlocks } from '../store/inclusion'
```
After `const v = site.values` add:
```ts
  const ex = excludedOf(site)
```
Replace the sections map:
```tsx
      {doc.sections.map((s) => (
        <section className="pv-section" key={s.id}>
          <h2>{s.title}</h2>
          {s.note && <p className="pv-note">{s.note}</p>}
          {s.blocks.map((b, i) => (
            <PrintBlock key={i} block={b} values={v} />
          ))}
        </section>
      ))}
```
with:
```tsx
      {visibleSections(doc, ex).map((s) => (
        <section className="pv-section" key={s.id}>
          <h2>{s.title}</h2>
          {s.note && <p className="pv-note">{s.note}</p>}
          {visibleBlocks(s, ex).map((b, i) => (
            <PrintBlock key={i} block={b} values={v} />
          ))}
        </section>
      ))}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/print/PrintView.tsx
git commit -m "feat(inclusion): print/PDF excludes hidden chapters/sub-chapters"
```

---

### Task 13: Word export filters

**Files:** Modify `src/print/docxExport.ts`

- [ ] **Step 1: Filter sections and blocks in the builder**

In `src/print/docxExport.ts`, add the import after the existing `import { doc as schema } from '../schema'`:
```ts
import { excludedOf, visibleSections, visibleBlocks } from '../store/inclusion'
```
In `buildDocxDocument`, replace the body-building loop:
```ts
  const body: (Paragraph | Table)[] = []
  for (const section of schema.sections) {
    body.push(h1(section.title))
    if (section.note) body.push(note(section.note))
    for (const block of section.blocks) body.push(...blockToDocx(block, site.values, imageMap))
  }
```
with:
```ts
  const ex = excludedOf(site)
  const body: (Paragraph | Table)[] = []
  for (const section of visibleSections(schema, ex)) {
    body.push(h1(section.title))
    if (section.note) body.push(note(section.note))
    for (const block of visibleBlocks(section, ex)) body.push(...blockToDocx(block, site.values, imageMap))
  }
```

- [ ] **Step 2: Run the docx tests**

Run: `npm run test -- docxExport`
Expected: PASS (existing test uses a site with no `excluded`, so output is unchanged).

- [ ] **Step 3: Commit**

```bash
git add app/src/print/docxExport.ts
git commit -m "feat(inclusion): Word export excludes hidden chapters/sub-chapters"
```

---

### Task 14: Full verification + live preview

**Files:** none (verification only)

- [ ] **Step 1: Type-check, tests, build**

Run: `npx tsc --noEmit` → Expected: PASS
Run: `npm run test` → Expected: all suites PASS (including the 4 new files)
Run: `npm run build` → Expected: built, no errors

- [ ] **Step 2: Verify in the preview**

Start the dev server (preview_start, config `tik-atar`). Then:
1. Open the chapter manager from the sidebar sliders button → the modal lists all chapters.
2. Uncheck a chapter (e.g. "הגנת סייבר") → it disappears from the sidebar; overall % updates.
3. Expand a chapter with sub-chapters (e.g. "מערך הרשת"), uncheck "3.8 רשת אלחוטית" → its subhead + blocks vanish from the section view; section % updates.
4. Re-check both → they return with data intact (type a value, exclude, re-include, confirm value persists).
5. Exclude the active chapter → main view switches to the first visible chapter.
6. Search (Ctrl+K) → excluded chapter/sub-chapter no longer appears.
7. Confirm no console errors.

- [ ] **Step 3: Verify exclusion round-trips through import/export**

In the preview console, confirm `excluded` is part of the serialized site (it is part of `SiteData`, which `exportImport.ts` serializes wholesale). If `exportImport.ts` whitelists fields, add `excluded` to the serialized shape; otherwise no change needed.

- [ ] **Step 4: Commit any verification fixes, then deploy**

```bash
git add -A
git commit -m "test(inclusion): verification fixes"
git push
```
Watch the Azure deploy to success and confirm the live bundle contains the feature (grep deployed main bundle for `cm-row` or the manager).

---

## Notes

- Backward compatible: sites without `excluded` behave exactly as before (every helper treats missing exclusion as "all included").
- Persistence is automatic: `excluded` lives in `SiteData`, so localStorage, the SharePoint JSON, and JSON import/export all carry it.
- Sub-chapter ids are positional within a section; reordering subheads in the schema would remap a stored exclusion (acceptable — the schema is stable).
