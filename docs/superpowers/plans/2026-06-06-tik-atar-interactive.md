# תיק אתר אינטראקטיבי — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` checkboxes.
> **Workspace policy:** git commits are **deferred** (not a git repo; user hasn't asked to commit). Each task ends with a **Checkpoint** (build/test green) instead of a commit. Git can be initialized at the end on request.

**Goal:** Build a modern, RTL, brand-accurate React web app that replaces the static Word "תיק אתר — מערכות מידע" with an interactive, schema-driven, multi-site form portfolio (fill, autosave, search, completion, print/PDF, JSON + docx export).

**Architecture:** Schema-driven. One `Doc` schema (ported 1:1 from `generate.js`) describes every section/block/field. A generic engine renders forms from schema + values. A React-context store holds per-site values, autosaves to localStorage, and supports multi-site + import/export.

**Tech Stack:** Vite + React + TypeScript · vanilla CSS (CSS variables for light/dark + RTL + print) · Vitest + @testing-library/react + jsdom · `docx` (lazy, last task).

---

## File Structure

```
app/
├─ index.html                 # <html dir="rtl" lang="he">
├─ package.json               # separate from repo root
├─ tsconfig.json · tsconfig.node.json · vite.config.ts
├─ src/
│  ├─ main.tsx · App.tsx
│  ├─ types.ts                # Doc/Section/Block/Field/Column/Row + state types
│  ├─ schema/
│  │  ├─ index.ts             # assembles Doc from section modules
│  │  ├─ docControl.ts · siteDetails.ts
│  │  ├─ s1-endpoints.ts … s9-appendices.ts
│  ├─ store/
│  │  ├─ storage.ts           # versioned localStorage load/save
│  │  ├─ siteData.ts          # new/clone/blank site
│  │  ├─ completion.ts        # completion math
│  │  ├─ validation.ts        # ip/email/date
│  │  ├─ exportImport.ts      # JSON in/out
│  │  └─ StoreContext.tsx     # context + reducer + hooks + autosave
│  ├─ engine/
│  │  ├─ SectionView.tsx · BlockRenderer.tsx
│  │  ├─ Field.tsx · StatusSelect.tsx
│  │  ├─ KvBlock.tsx · TableBlock.tsx · ChecklistBlock.tsx
│  │  ├─ BulletsBlock.tsx · BoxBlock.tsx · CalloutBlock.tsx
│  ├─ ui/
│  │  ├─ AppShell.tsx · Sidebar.tsx · Header.tsx
│  │  ├─ SiteSwitcher.tsx · ThemeToggle.tsx · SaveIndicator.tsx
│  │  ├─ CommandPalette.tsx · CompletionRing.tsx · Menu.tsx · icons.tsx
│  ├─ print/ PrintView.tsx · docxExport.ts
│  └─ styles/ global.css · theme.css · print.css
```

**Value model** (stored under `site.values[blockId]`):
- `kv` block → `{ [fieldId]: string }`
- `table` block → `Row[]` (each `Row` = `{ _id: string, [colId]: string }`)
- `checklist` block → `{ [rowId]: { [colId]: string } }`
- `bullets`/`box`/`callout` → no value

---

## Task 0: Scaffold + theme tokens + RTL

**Files:** Create `app/package.json`, `app/index.html`, `app/vite.config.ts`, `app/tsconfig*.json`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/styles/{global,theme,print}.css`.

- [ ] **Step 1: Init Vite app** in `app/` (React+TS template) and add deps.

```bash
cd app && npm create vite@latest . -- --template react-ts   # if interactive, scaffold files manually instead
npm i
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm i docx
```
(If `npm create` is interactive in this shell, create the files by hand per below.)

- [ ] **Step 2: `index.html`** sets RTL + Heebo font.

```html
<!doctype html>
<html lang="he" dir="rtl" data-theme="light">
  <head>
    <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet">
    <title>תיק אתר — מערכות מידע</title>
  </head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 3: `styles/theme.css`** brand tokens + light/dark.

```css
:root{
  --c-primary:#104E7D; --c-primary-dark:#0B3A5E; --c-accent:#EEC21B;
  --bg:#F4F7FB; --surface:#FFFFFF; --surface-2:#EAF2FA; --text:#1B2733; --muted:#5b6b7a;
  --border:#D5DEE8; --header:#FFFFFF; --shadow:0 1px 3px rgba(16,78,125,.08),0 8px 24px rgba(16,78,125,.06);
  --ok:#1E8E5A; --warn:#C9851A; --bad:#C0392B; --na:#7a8794; --radius:14px;
}
[data-theme="dark"]{
  --bg:#0C1620; --surface:#13212E; --surface-2:#1B2C3B; --text:#E7EEF5; --muted:#9fb0bf;
  --border:#23384A; --header:#0F1C28; --shadow:0 1px 3px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35);
}
*{box-sizing:border-box} html,body,#root{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:Heebo,"Segoe UI",system-ui,sans-serif}
```

- [ ] **Step 4: `vite.config.ts`** with vitest jsdom config.

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins:[react()],
  test:{ environment:'jsdom', globals:true, setupFiles:'./src/test-setup.ts' }
} as any)
```
Create `src/test-setup.ts`: `import '@testing-library/jest-dom'`.

- [ ] **Step 5: Minimal `App.tsx`/`main.tsx`** rendering `תיק אתר — מערכות מידע` heading.

- [ ] **Checkpoint:** `npm run dev` boots; page shows the RTL heading in brand blue. `npm run build` succeeds.

---

## Task 1: Types + schema (port all content from `generate.js`)

**Files:** Create `app/src/types.ts`, `app/src/schema/*.ts`, `app/src/schema/index.ts`, test `app/src/schema/schema.test.ts`.

- [ ] **Step 1: `types.ts`** — exact shape the engine consumes.

```ts
export type FieldType='text'|'textarea'|'date'|'select'|'ip'|'email'|'status';
export interface Field{ id:string; label:string; type:FieldType; placeholder?:string; options?:string[]; optional?:boolean }
export interface Column{ id:string; label:string; type:FieldType; weight?:number; placeholder?:string; options?:string[] }
export type Row=Record<string,string>;            // includes _id
export type Block =
 | { kind:'bullets'; title?:string; items:string[] }
 | { kind:'kv'; id:string; fields:Field[] }
 | { kind:'table'; id:string; columns:Column[]; examples?:Row[]; seedRows?:Row[]; minRows?:number; optional?:boolean }
 | { kind:'checklist'; id:string; columns:Column[]; rows:{id:string;label:string}[] }
 | { kind:'box'; lines:string[] }
 | { kind:'callout'; tone:'info'|'warn'; title:string; items:string[] };
export interface Section{ id:string; title:string; note?:string; blocks:Block[] }
export interface Doc{ sections:Section[] }

export interface SiteMeta{ name:string; code:string; version:string; classification:string }
export type BlockValue = Record<string,string> | Row[] | Record<string,Record<string,string>>;
export interface SiteData{ id:string; createdAt:string; updatedAt:string; meta:SiteMeta; values:Record<string,BlockValue> }
export interface AppState{ sites:Record<string,SiteData>; activeSiteId:string|null; ui:{ theme:'light'|'dark'; showExamples:boolean } }
```

- [ ] **Step 2: Write failing schema-integrity test** `schema/schema.test.ts`.

```ts
import { describe,it,expect } from 'vitest';
import { doc } from './index';
const blocks = doc.sections.flatMap(s=>s.blocks);
describe('schema',()=>{
  it('has the 11 top-level sections in order',()=>{
    expect(doc.sections.map(s=>s.id)).toEqual(
      ['docControl','siteDetails','s1','s2','s3','s4','s5','s6','s7','s8','s9']);
  });
  it('every data block id is unique',()=>{
    const ids=blocks.filter(b=>'id' in b).map((b:any)=>b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('s5 control checklist has 14 rows, s6 has 12',()=>{
    const cl=blocks.filter((b:any)=>b.kind==='checklist');
    expect(cl.find((b:any)=>b.id==='s5-controls')!.rows.length).toBe(14);
    expect(cl.find((b:any)=>b.id==='s6-controls')!.rows.length).toBe(12);
  });
});
```

- [ ] **Step 3: Run test → FAIL** (`./index` not found). `npx vitest run src/schema`.

- [ ] **Step 4: Port content.** Each `schema/sN-*.ts` exports a `Section`. Port **1:1 from `generate.js`** (it is the source of truth, in repo root). Mapping (generate.js → schema):

  - `docControl.ts` (`generate.js` ~L245-258): title `בקרת מסמך`, note, table `dc-versions` cols [גרסה,תאריך,עורך,תיאור השינוי,אישר] + example row, table `dc-approvals` cols [תפקיד,שם מלא,חתימה,תאריך] seedRows [מנהל מערכות מידע / אחראי אבטחת מידע / מנהל האתר].
  - `siteDetails.ts` (~L261-268): kv `site-details`, 12 fields (שם האתר, קוד אתר, כתובת מלאה, בניין / קומות, מספר עמדות עבודה, מספר משתמשים, שעות פעילות, אחראי IT באתר, טלפון / נייד, דוא"ל, ספק תמיכה ראשי, תאריך איכלוס / הקמה); placeholders: קוד אתר=`GY-TLV-01`, שעות=`א׳–ה׳ 08:00–17:00`.
  - `s1-endpoints.ts` (~L271-283): bullets(9) + table `s1-equipment` cols [סוג ציוד,יצרן / דגם,מס׳ נכס / Serial,משתמש / מיקום,מערכת הפעלה,רכש / אחריות,סטטוס] (example: תחנת עבודה / Dell OptiPlex 7010 / …).
  - `s2-access.ts` (~L286-304): bullets(7) + table `s2-access` [מערכת / רכיב,יצרן / דגם,מיקום (דלת/שער),בקר / כתובת IP,סוג הזדהות,מורשים,ספק / תחזוקה]; sub `מצלמות אבטחה (CCTV)` table `s2-cctv` optional; `מערכת אזעקה` kv `s2-alarm` optional (6 fields).
  - `s3-network.ts` (~L307-353): 3.1 table `s3-wan`; 3.2 bullets(5)+table `s3-netgear` (2 examples: Firewall/FortiGate, Core Switch/Catalyst); 3.3 table `s3-servers`; 3.4 table `s3-virt` (2 examples); 3.5 table `s3-vlan` (2 examples); 3.6 kv `s3-room` (8 fields); 3.7 box (תרשים רשת lines).
  - `s4-software.ts` (~L356-370): bullets(7) + table `s4-software` [תוכנה / שירות,יצרן,גרסה,סוג רישיון,כמות / מושבים,חידוש,ספק] (2 examples).
  - `s5-infosec.ts` (~L373-400): checklist `s5-controls` cols [בקרה,סטטוס,כלי / פרטים,אחראי] with the **14** controls (אנטי-וירוס / EDR … מודעות והדרכת עובדים); kv `s5-backup` (9 fields); table `s5-perms` (example IT-Admins); kv `s5-incident` (6 fields).
  - `s6-cyber.ts` (~L403-436): checklist `s6-controls` **12** controls; kv `s6-soc` (7); kv `s6-report` (7); table `s6-resilience` (example pentest + plain rows סקר/פישינג/DR/ארכיטקטורה); kv `s6-gov` (7).
  - `s7-suppliers.ts` (~L439-445): table `s7-suppliers` [ספק,תחום שירות,איש קשר,טלפון / דוא"ל,חוזה / SLA,תוקף].
  - `s8-contacts.ts` (~L448-454): note (`רמת הסלמה 1 = ראשונה`), table `s8-contacts` [שם,תפקיד,ארגון / מחלקה,טלפון,דוא"ל,הסלמה].
  - `s9-appendices.ts` (~L457-470): bullets(5 נספחים) + callout tone `warn` title `הערת אבטחה חשובה` items (אין לשמור סיסמאות…).

  `schema/index.ts`:
```ts
import { docControl } from './docControl'; /* …imports… */
import type { Doc } from '../types';
export const doc:Doc = { sections:[ docControl, siteDetails, s1,s2,s3,s4,s5,s6,s7,s8,s9 ] };
```
  Helper for tables (keep DRY):
```ts
export const ex = (cols:string[], vals:string[]):Row => Object.fromEntries(vals.map((v,i)=>[cols[i],v])).withId?.(); // see note
```
  (Simpler: define `examples` inline as `{colId:value}`. Column ids are slugs: `c0,c1,…` or semantic — use `c0..cn` to stay terse; labels carry the Hebrew.)

- [ ] **Step 5: Run test → PASS.** `npx vitest run src/schema`. Fix counts/ids until green.

- [ ] **Checkpoint:** schema test green; `doc` imports cleanly.

---

## Task 2: Store — persistence, sites, reducer, autosave

**Files:** Create `store/storage.ts`, `store/siteData.ts`, `store/StoreContext.tsx`; tests `store/storage.test.ts`, `store/siteData.test.ts`.

- [ ] **Step 1: Failing tests** for storage + siteData.

```ts
// storage.test.ts
import { describe,it,expect,beforeEach } from 'vitest';
import { loadState, saveState, KEY } from './storage';
beforeEach(()=>localStorage.clear());
it('round-trips state',()=>{ const s:any={sites:{},activeSiteId:null,ui:{theme:'light',showExamples:true}};
  saveState(s); expect(loadState()).toEqual(s); });
it('returns null on corrupt json',()=>{ localStorage.setItem(KEY,'{bad'); expect(loadState()).toBeNull(); });
```
```ts
// siteData.test.ts
import { describe,it,expect } from 'vitest';
import { newSite, cloneSite } from './siteData';
it('creates a blank site with defaults',()=>{ const s=newSite('אתר תל אביב',()=>'id1');
  expect(s.id).toBe('id1'); expect(s.meta.version).toBe('1.0');
  expect(s.meta.classification).toBe('לשימוש פנימי'); expect(s.values).toEqual({}); });
it('clones values but new id/name',()=>{ const a=newSite('A',()=>'a'); a.values['x']={f:'v'};
  const b=cloneSite(a,'B',()=>'b'); expect(b.id).toBe('b'); expect(b.meta.name).toBe('B');
  expect(b.values).toEqual({x:{f:'v'}}); b.values['x'] as any; a.values['x'] && expect(b.values).not.toBe(a.values); });
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/store`.

- [ ] **Step 3: Implement.**
```ts
// storage.ts
import type { AppState } from '../types';
export const KEY='tik-atar/v1';
export function loadState():AppState|null{
  try{ const raw=localStorage.getItem(KEY); if(!raw) return null;
    const s=JSON.parse(raw); if(!s||typeof s!=='object'||!('sites'in s)) return null; return s as AppState;
  }catch{ return null; } }
export function saveState(s:AppState){ try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch{} }
export function debounce<T extends(...a:any[])=>void>(fn:T,ms=500){ let t:any;
  return (...a:Parameters<T>)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
```
```ts
// siteData.ts
import type { SiteData } from '../types';
const uuid=()=> (globalThis.crypto?.randomUUID?.() ?? 'id-'+performance.now());
export function newSite(name:string, id:()=>string=uuid):SiteData{
  const now=new Date().toISOString();
  return { id:id(), createdAt:now, updatedAt:now,
    meta:{ name, code:'', version:'1.0', classification:'לשימוש פנימי' }, values:{} }; }
export function cloneSite(src:SiteData,name:string,id:()=>string=uuid):SiteData{
  const now=new Date().toISOString();
  return { ...structuredClone(src), id:id(), createdAt:now, updatedAt:now,
    meta:{ ...src.meta, name } }; }
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: `StoreContext.tsx`** — reducer + hooks + autosave. Actions:
`SET_KV{blockId,fieldId,value}` · `SET_TABLE{blockId,rows}` · `ADD_ROW{blockId,row}` · `REMOVE_ROW{blockId,rowId}` · `SET_CHECKLIST{blockId,rowId,colId,value}` · `SET_META{patch}` · `NEW_SITE{name}` · `CLONE_SITE{name}` · `DELETE_SITE{id}` · `RENAME_SITE{id,name}` · `SELECT_SITE{id}` · `SET_THEME{theme}` · `TOGGLE_EXAMPLES` · `IMPORT_STATE{state}`.
Init: `loadState() ?? { sites:{[s.id]:s}, activeSiteId:s.id, ui:{theme:'light',showExamples:true} }` with `s=newSite('אתר חדש')`. On every dispatch, bump active site `updatedAt`. `useEffect(()=>debouncedSave(state),[state])`. Apply `data-theme` to `document.documentElement` from `ui.theme`. Export hooks `useStore()`, `useDispatch()`, `useActiveSite()`, `useBlockValue(blockId)`.

- [ ] **Checkpoint:** store tests green; build passes.

---

## Task 3: Validation + completion (pure, fully TDD)

**Files:** Create `store/validation.ts`, `store/completion.ts`; tests `store/validation.test.ts`, `store/completion.test.ts`.

- [ ] **Step 1: Failing tests.**
```ts
// validation.test.ts
import { validate } from './validation';
it('ip',()=>{ expect(validate('ip','192.168.1.1').valid).toBe(true);
  expect(validate('ip','10.0.0.0/24').valid).toBe(true);
  expect(validate('ip','999.1.1.1').valid).toBe(false);
  expect(validate('ip','').valid).toBe(true); });          // empty = no warning
it('email',()=>{ expect(validate('email','a@b.co').valid).toBe(true);
  expect(validate('email','nope').valid).toBe(false); });
it('date',()=>{ expect(validate('date','29/05/2026').valid).toBe(true);
  expect(validate('date','2026-05-29').valid).toBe(true);
  expect(validate('date','31/31/2026').valid).toBe(false); });
```
```ts
// completion.test.ts
import { sectionCompletion } from './completion';
import type { Section } from '../types';
const sec:Section={ id:'x',title:'x',blocks:[
  {kind:'kv',id:'k',fields:[{id:'a',label:'',type:'text'},{id:'b',label:'',type:'text'}]},
  {kind:'checklist',id:'c',columns:[{id:'status',label:'',type:'status'}],rows:[{id:'r1',label:''},{id:'r2',label:''}]},
]};
it('counts kv + checklist units',()=>{
  expect(sectionCompletion(sec,{}).total).toBe(4);            // 2 kv + 2 checklist
  expect(sectionCompletion(sec,{k:{a:'x'},c:{r1:{status:'קיים'}}}).filled).toBe(2);
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement.**
```ts
// validation.ts
import type { FieldType } from '../types';
const IP=/^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(\/\d{1,2})?$/;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE=/^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
export function validate(type:FieldType,v:string):{valid:boolean;message?:string}{
  if(!v) return {valid:true};
  if(type==='ip') return IP.test(v)?{valid:true}:{valid:false,message:'כתובת IP לא תקינה'};
  if(type==='email') return EMAIL.test(v)?{valid:true}:{valid:false,message:'דוא״ל לא תקין'};
  if(type==='date'){ if(!DATE.test(v)) return {valid:false,message:'תאריך לא תקין (dd/mm/yyyy)'};
    const [d,m]= v.includes('/')? v.split('/').map(Number) : [Number(v.slice(8,10)),Number(v.slice(5,7))];
    return (d>=1&&d<=31&&m>=1&&m<=12)?{valid:true}:{valid:false,message:'תאריך לא תקין'}; }
  return {valid:true};
}
```
```ts
// completion.ts
import type { Section, Block, BlockValue, Row } from '../types';
const nonEmptyRow=(r:Row)=>Object.entries(r).some(([k,v])=>k!=='_id'&&v?.trim());
function unit(b:Block,v:BlockValue|undefined){
  if(b.kind==='kv') return { total:b.fields.length,
     filled:b.fields.filter(f=>(v as any)?.[f.id]?.trim()).length };
  if(b.kind==='checklist') return { total:b.rows.length,
     filled:b.rows.filter(r=>(v as any)?.[r.id]?.status?.trim()).length };
  if(b.kind==='table'){ const rows=(v as Row[])||[]; return { total:1, filled: rows.some(nonEmptyRow)?1:0 }; }
  return { total:0, filled:0 };
}
export function sectionCompletion(sec:Section, values:Record<string,BlockValue>){
  return sec.blocks.reduce((acc,b)=>{ const u=unit(b,(b as any).id?values[(b as any).id]:undefined);
    return { total:acc.total+u.total, filled:acc.filled+u.filled }; },{total:0,filled:0});
}
export const pct=(c:{total:number;filled:number})=> c.total? Math.round(c.filled/c.total*100):0;
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Checkpoint:** validation+completion green.

---

## Task 4: Engine — field + block renderers

**Files:** Create `engine/Field.tsx`, `engine/StatusSelect.tsx`, `engine/{Kv,Table,Checklist,Bullets,Box,Callout}Block.tsx`, `engine/BlockRenderer.tsx`, `engine/SectionView.tsx`; test `engine/TableBlock.test.tsx`.

- [ ] **Step 1: Failing component test.**
```tsx
// TableBlock.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TableBlock } from './TableBlock';
const col=[{id:'c0',label:'שם',type:'text' as const}];
it('adds a row on click',()=>{
  const onChange=vi.fn();
  render(<TableBlock block={{kind:'table',id:'t',columns:col}} value={[]} onChange={onChange} showExamples={false}/>);
  fireEvent.click(screen.getByRole('button',{name:/הוסף שורה/}));
  expect(onChange).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement engine.** Key contracts:
  - `Field({type,value,onChange,placeholder,options})`: renders `<input>`/`<textarea>`/`<select>`; for `status` renders `StatusSelect`; runs `validate(type,value)` and shows a subtle warning under the field when invalid.
  - `StatusSelect`: options `['קיים','חלקי','חסר','לא רלוונטי']` rendered as colored pills (`--ok/--warn/--bad/--na`).
  - `TableBlock({block,value,onChange,showExamples})`: header from `columns`; data rows from `value:Row[]`; each cell a `Field`; per-row buttons שכפל/מחק; footer button **"הוסף שורה"** (`+`); when `showExamples` and `block.examples`, render gray-italic read-only example rows above data.
  - `ChecklistBlock`: fixed left column = control label (read-only), other columns editable `Field`s (status/text); value shape `{[rowId]:{[colId]:value}}`.
  - `KvBlock`: two-column rows label / `Field`.
  - `BulletsBlock` (• list), `BoxBlock` (dashed placeholder card), `CalloutBlock` (info/warn card).
  - `BlockRenderer` switches on `block.kind`, pulls value via `useBlockValue`, dispatches proper action.
  - `SectionView({section})`: heading + note + maps blocks through `BlockRenderer`.

- [ ] **Step 4: Run → PASS.**
- [ ] **Checkpoint:** engine test green; a temporary mount of `SectionView` for `siteDetails` renders inputs.

---

## Task 5: UI shell (sidebar, header, sites, theme, save)

**Files:** Create `ui/AppShell.tsx`, `ui/Sidebar.tsx`, `ui/Header.tsx`, `ui/SiteSwitcher.tsx`, `ui/ThemeToggle.tsx`, `ui/SaveIndicator.tsx`, `ui/CompletionRing.tsx`, `ui/icons.tsx`; rewrite `App.tsx`.

- [ ] **Step 1:** `AppShell` = CSS grid `[sidebar | main]` (RTL: sidebar on right), `Header` spanning top. `App.tsx` wraps everything in `StoreProvider` + renders `AppShell` with active `SectionView`.
- [ ] **Step 2:** `Sidebar` lists `doc.sections`; each item shows title + `CompletionRing` (from `sectionCompletion`+`pct`); active highlighted; clicking sets active section (local UI state in App or context).
- [ ] **Step 3:** `Header` = logo (inline `gav-yam.svg` copied to `app/public/`), `SiteSwitcher`, site name (editable), version, classification badge, search button (opens palette), `ThemeToggle`, `SaveIndicator`, `Menu`.
- [ ] **Step 4:** `SiteSwitcher` dropdown: list sites, **אתר חדש / שכפל / שנה שם / מחק** (dispatch actions). `ThemeToggle` flips `ui.theme`. `SaveIndicator` shows "נשמר" after debounce / "שומר…" while pending.
- [ ] **Checkpoint:** full app navigable; switching sections works; create/switch sites works; theme toggles; refresh restores data.

---

## Task 6: Search palette · examples toggle · validation surfacing

**Files:** Create `ui/CommandPalette.tsx`; wire `Menu`/`Header` toggles.

- [ ] **Step 1:** Build a search index from `doc`: for each field/column/section → `{sectionId, label, blockId}`. `CommandPalette` (open via Cmd/Ctrl+K and a header button) filters by substring, lists results, Enter/click → set active section + scroll element into view + focus.
- [ ] **Step 2:** Wire **"הצג דוגמאות"** toggle (`ui.showExamples`) into `Header`/`Menu`; passed to `TableBlock`.
- [ ] **Step 3:** Confirm `Field` shows validation warnings (ip/email/date) live.
- [ ] **Checkpoint:** Cmd/Ctrl+K finds "VLAN", jumps to §3; examples toggle hides/shows gray rows.

---

## Task 7: Export/Import JSON · Print/PDF

**Files:** Create `store/exportImport.ts`, `print/PrintView.tsx`, `styles/print.css`; wire into `Menu`.

- [ ] **Step 1: Test** `exportImport.test.ts`: `serialize(state)` → JSON string; `deserialize(str)` validates and returns `AppState|null` (null on bad/old version). Run → FAIL → implement → PASS.
- [ ] **Step 2:** `Menu` actions: **ייצוא JSON** (download `<siteName>.json` via Blob+anchor), **ייבוא JSON** (file input → `deserialize` → `IMPORT_STATE`).
- [ ] **Step 3:** `PrintView` renders active site read-only in A4 document layout (cover w/ logo + meta, then every section/block as static text/tables). `print.css` `@media print`: hide `.app-shell`, show `.print-view`, page margins, header/footer with classification + page numbers.
- [ ] **Step 4:** **הדפסה / PDF** menu action → `window.print()`.
- [ ] **Checkpoint:** export downloads JSON; importing it on a fresh load restores; `Ctrl+P` preview shows clean branded A4.

---

## Task 8: Polish + build

- [ ] Responsive: sidebar collapses under ~900px (hamburger). Animations: section fade, ring transitions. Accessibility: labels/`aria`, focus rings, keyboard nav, color-contrast check on both themes. Empty/first-run state. Favicon. README for `app/` (run/build).
- [ ] **Checkpoint:** `npm run build` clean; open `app/dist/index.html` (or `npm run preview`); manual pass of Acceptance (spec §14). Capture a screenshot.

---

## Task 9 (last, optional): docx export

**Files:** Create `print/docxExport.ts`; wire **ייצוא Word** in `Menu` (lazy `import()`).

- [ ] Build the same branded document from the active site using `docx` (mirror `generate.js`: cover+logo, headings, kv/data tables from values). Lazy-load to keep main bundle small. Trigger downloads `<siteName>.docx`.
- [ ] **Checkpoint:** exported .docx opens in Word, RTL + brand intact, values populated.

---

## Self-Review

- **Spec coverage:** §6 content → Task 1; persistence/multi-site/JSON → Tasks 2,7; completion/validation → Task 3; engine blocks → Task 4; shell/search/examples → Tasks 5,6; print → Task 7; theme/RTL/responsive/a11y → Tasks 0,5,8; docx → Task 9. ✔ all covered.
- **Placeholders:** none ("port from generate.js" references concrete, in-repo source with line ranges + explicit column/field lists).
- **Type consistency:** `Block`/`Row`/`BlockValue`/`SiteData`/`AppState` defined once in Task 1; actions in Task 2 match; `sectionCompletion`/`validate`/`newSite`/`cloneSite`/`loadState`/`saveState` signatures consistent across tasks. ✔
```
