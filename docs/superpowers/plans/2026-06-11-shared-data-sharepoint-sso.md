# Shared Data via SharePoint + SSO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` checkboxes.
> **Git:** repo is active (user authorized commits). Each code task ends with a commit.

**Goal:** Add an optional "shared (SharePoint)" mode where a single editor's data is stored as JSON files in a SharePoint document library and all viewers read it live, authenticated via Entra SSO (MSAL + Microsoft Graph).

**Architecture:** The existing Azure-SWA SPA gains a `src/remote/` layer: MSAL for SSO, Graph helpers (CORS-friendly) to read/write JSON files in the `TikAtarData` library. A mode toggle in the store switches the source of truth between local (localStorage, unchanged) and shared (Graph). Access control = library permissions (403 → read-only). engine/schema/print/docx untouched.

**Tech Stack:** `@azure/msal-browser`, Microsoft Graph v1.0, Vite env vars, Vitest (mocked fetch).

---

## File Structure
```
app/
├─ .env.example                  # config template (committed)
├─ .env                          # real clientId/tenantId (gitignored)
├─ src/remote/
│  ├─ config.ts                  # env config + Graph constants
│  ├─ graph.ts                   # low-level Graph fetch (site/drive/list/read/write+eTag) — injectable fetch
│  ├─ sharepointStore.ts         # high-level: fileNameFor, list/load/save SiteData
│  ├─ auth.ts                    # MSAL: getMsal/ssoSilent/login/getToken
│  └─ graph.test.ts / sharepointStore.test.ts
├─ src/store/StoreContext.tsx     # + shared mode (load/save/poll/403/offline)
└─ src/ui/Header.tsx + ShareControls.tsx  # mode toggle + status banner
```

`.env` added to `app/.gitignore` (already ignores `*.local`; add `.env`).

---

## Task 1: Dependencies + config + env

**Files:** Modify `app/package.json`, `app/.gitignore`; Create `app/.env.example`, `app/src/remote/config.ts`.

- [ ] **Step 1: Install MSAL**
```powershell
npm install --prefix "C:\ITSiteProfolio\app" @azure/msal-browser@^3.0.0
```
- [ ] **Step 2: Ignore `.env`** — append to `app/.gitignore`: a line `.env`.
- [ ] **Step 3: `.env.example`**
```
VITE_AAD_CLIENT_ID=
VITE_AAD_TENANT_ID=
VITE_SP_SITE=gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT
VITE_SP_LIBRARY=TikAtarData
```
- [ ] **Step 4: `config.ts`**
```ts
export const remoteConfig = {
  clientId: (import.meta.env.VITE_AAD_CLIENT_ID as string) || '',
  tenantId: (import.meta.env.VITE_AAD_TENANT_ID as string) || '',
  siteUrl: (import.meta.env.VITE_SP_SITE as string) || 'gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT',
  library: (import.meta.env.VITE_SP_LIBRARY as string) || 'TikAtarData',
}
export const isRemoteConfigured = () => !!(remoteConfig.clientId && remoteConfig.tenantId)
export const GRAPH = 'https://graph.microsoft.com/v1.0'
export const GRAPH_SCOPES = ['Sites.ReadWrite.All', 'User.Read']
```
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(remote): add MSAL dep + remote config"`

---

## Task 2: Graph layer (TDD, injectable fetch)

**Files:** Create `app/src/remote/graph.ts`, `app/src/remote/graph.test.ts`.

- [ ] **Step 1: Failing tests** — `graph.test.ts`
```ts
import { describe, it, expect, vi } from 'vitest'
import { resolveSiteId, resolveDriveId, listFiles, readFile, writeFile } from './graph'

const ok = (body: any, headers: Record<string,string> = {}) =>
  ({ ok: true, status: 200, json: async () => body, headers: { get: (k: string) => headers[k] ?? null } }) as any
const status = (s: number) => ({ ok: s < 400, status: s, json: async () => ({}), headers: { get: () => null } }) as any

describe('graph', () => {
  it('resolves site id', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 'SITE1' }))
    expect(await resolveSiteId('t', 'host:/sites/x', f)).toBe('SITE1')
    expect(f.mock.calls[0][0]).toContain('/sites/host:/sites/x')
  })
  it('resolves drive id by library name', async () => {
    const f = vi.fn().mockResolvedValue(ok({ value: [{ id: 'D1', name: 'Other' }, { id: 'D2', name: 'TikAtarData' }] }))
    expect(await resolveDriveId('t', 'SITE1', 'TikAtarData', f)).toBe('D2')
  })
  it('lists only .json files', async () => {
    const f = vi.fn().mockResolvedValue(ok({ value: [{ name: 'a.json', eTag: 'e1' }, { name: 'x.txt', eTag: 'e2' }] }))
    const r = await listFiles('t', 'S', 'D', f)
    expect(r).toEqual([{ name: 'a.json', eTag: 'e1' }])
  })
  it('reads file via metadata(eTag)+content, returns null on 404', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(ok({ id: 'IT1', eTag: 'E9' }))     // metadata
      .mockResolvedValueOnce(ok({ meta: { name: 'הר' } }))       // content
    const r = await readFile('t', 'S', 'D', 'a.json', f)
    expect(r.eTag).toBe('E9')
    expect(r.data.meta.name).toBe('הר')
    const f404 = vi.fn().mockResolvedValue(status(404))
    expect((await readFile('t', 'S', 'D', 'missing.json', f404)).data).toBeNull()
  })
  it('writes with If-Match and maps 412/403', async () => {
    const f = vi.fn().mockResolvedValue(ok({ eTag: 'E10' }))
    const r = await writeFile('t', 'S', 'D', 'a.json', { x: 1 }, 'E9', f)
    expect(r.eTag).toBe('E10')
    expect(f.mock.calls[0][1].headers['If-Match']).toBe('E9')
    await expect(writeFile('t','S','D','a.json',{},'E9', vi.fn().mockResolvedValue(status(412)))).rejects.toThrow('etag-conflict')
    await expect(writeFile('t','S','D','a.json',{},'', vi.fn().mockResolvedValue(status(403)))).rejects.toThrow('forbidden')
  })
})
```
- [ ] **Step 2: Run → FAIL.** `npx vitest run src/remote/graph.test.ts`
- [ ] **Step 3: Implement `graph.ts`**
```ts
import { GRAPH } from './config'
type F = typeof fetch
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/')

export async function resolveSiteId(token: string, sitePath: string, f: F = fetch): Promise<string> {
  const r = await f(`${GRAPH}/sites/${sitePath}`, { headers: auth(token) })
  if (!r.ok) throw new Error(`site ${r.status}`)
  return (await r.json()).id
}
export async function resolveDriveId(token: string, siteId: string, library: string, f: F = fetch): Promise<string> {
  const r = await f(`${GRAPH}/sites/${siteId}/drives`, { headers: auth(token) })
  if (!r.ok) throw new Error(`drives ${r.status}`)
  const d = (await r.json()).value.find((x: any) => x.name === library)
  if (!d) throw new Error('library-not-found')
  return d.id
}
export async function listFiles(token: string, siteId: string, driveId: string, f: F = fetch): Promise<{ name: string; eTag: string }[]> {
  const r = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root/children?$select=name,eTag`, { headers: auth(token) })
  if (!r.ok) throw new Error(`list ${r.status}`)
  return (await r.json()).value.filter((x: any) => x.name.endsWith('.json')).map((x: any) => ({ name: x.name, eTag: x.eTag }))
}
export async function readFile(token: string, siteId: string, driveId: string, name: string, f: F = fetch): Promise<{ data: any; eTag: string }> {
  const meta = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root:/${enc(name)}`, { headers: auth(token) })
  if (meta.status === 404) return { data: null, eTag: '' }
  if (!meta.ok) throw new Error(`meta ${meta.status}`)
  const m = await meta.json()
  const content = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/items/${m.id}/content`, { headers: auth(token) })
  if (!content.ok) throw new Error(`content ${content.status}`)
  return { data: await content.json(), eTag: m.eTag || '' }
}
export async function writeFile(token: string, siteId: string, driveId: string, name: string, data: unknown, eTag: string, f: F = fetch): Promise<{ eTag: string }> {
  const headers: Record<string, string> = { ...auth(token), 'Content-Type': 'application/json' }
  if (eTag) headers['If-Match'] = eTag
  const r = await f(`${GRAPH}/sites/${siteId}/drives/${driveId}/root:/${enc(name)}:/content`, { method: 'PUT', headers, body: JSON.stringify(data) })
  if (r.status === 412) throw new Error('etag-conflict')
  if (r.status === 403) throw new Error('forbidden')
  if (!r.ok) throw new Error(`write ${r.status}`)
  return { eTag: (await r.json()).eTag || '' }
}
```
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(remote): graph read/write with eTag (tested)"`

---

## Task 3: SharePoint store + filename mapping (TDD)

**Files:** Create `app/src/remote/sharepointStore.ts`, `app/src/remote/sharepointStore.test.ts`.

- [ ] **Step 1: Failing test** (pure mapping) — `sharepointStore.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { fileNameFor } from './sharepointStore'
import { newSite } from '../store/siteData'

describe('sharepointStore.fileNameFor', () => {
  it('uses sanitized site code', () => {
    const s = newSite('אתר', () => 'id1'); s.meta.code = 'GY-TLV-01'
    expect(fileNameFor(s)).toBe('GY-TLV-01.json')
  })
  it('falls back to id and sanitizes', () => {
    const s = newSite('אתר', () => 'id-9'); s.meta.code = ''
    expect(fileNameFor(s)).toBe('id-9.json')
  })
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `sharepointStore.ts`**
```ts
import type { SiteData } from '../types'
import { getToken } from './auth'
import { remoteConfig } from './config'
import { resolveSiteId, resolveDriveId, listFiles, readFile, writeFile } from './graph'

let ids: { siteId: string; driveId: string } | null = null
async function getIds(token: string) {
  if (!ids) {
    const siteId = await resolveSiteId(token, remoteConfig.siteUrl)
    const driveId = await resolveDriveId(token, siteId, remoteConfig.library)
    ids = { siteId, driveId }
  }
  return ids
}
export function fileNameFor(site: SiteData): string {
  const base = (site.meta.code || site.id || 'site').replace(/[^\w.\-]+/g, '_')
  return base + '.json'
}
export async function listRemoteSites(): Promise<{ name: string; eTag: string }[]> {
  const t = await getToken(); const { siteId, driveId } = await getIds(t)
  return listFiles(t, siteId, driveId)
}
export async function loadRemoteSite(name: string): Promise<{ site: SiteData | null; eTag: string }> {
  const t = await getToken(); const { siteId, driveId } = await getIds(t)
  const { data, eTag } = await readFile(t, siteId, driveId, name)
  return { site: data as SiteData | null, eTag }
}
export async function saveRemoteSite(site: SiteData, eTag: string): Promise<{ eTag: string }> {
  const t = await getToken(); const { siteId, driveId } = await getIds(t)
  return writeFile(t, siteId, driveId, fileNameFor(site), site, eTag)
}
```
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(remote): sharepointStore (list/load/save)"`

---

## Task 4: MSAL auth (SSO)

**Files:** Create `app/src/remote/auth.ts`. (Manual verification — browser-only.)

- [ ] **Step 1: Implement `auth.ts`**
```ts
import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser'
import { remoteConfig, GRAPH_SCOPES } from './config'

let msal: PublicClientApplication | null = null
export async function getMsal(): Promise<PublicClientApplication> {
  if (!msal) {
    msal = new PublicClientApplication({
      auth: {
        clientId: remoteConfig.clientId,
        authority: `https://login.microsoftonline.com/${remoteConfig.tenantId}`,
        redirectUri: window.location.origin + '/',
      },
      cache: { cacheLocation: 'localStorage' },
    })
    await msal.initialize()
    await msal.handleRedirectPromise()
  }
  return msal
}
export async function currentAccount(): Promise<AccountInfo | null> {
  const m = await getMsal()
  return m.getAllAccounts()[0] ?? null
}
/** Try silent SSO. Returns true if signed in, false if interaction needed. */
export async function trySsoSilent(): Promise<boolean> {
  const m = await getMsal()
  if (m.getAllAccounts().length) return true
  try { const r = await m.ssoSilent({ scopes: GRAPH_SCOPES }); m.setActiveAccount(r.account); return true }
  catch { return false }
}
export async function login(): Promise<void> {
  const m = await getMsal()
  await m.loginRedirect({ scopes: GRAPH_SCOPES })
}
export async function logout(): Promise<void> {
  const m = await getMsal()
  await m.logoutRedirect()
}
export async function getToken(): Promise<string> {
  const m = await getMsal()
  const account = m.getActiveAccount() ?? m.getAllAccounts()[0]
  if (!account) throw new Error('no-account')
  try { return (await m.acquireTokenSilent({ scopes: GRAPH_SCOPES, account })).accessToken }
  catch (e) {
    if (e instanceof InteractionRequiredAuthError) { await m.acquireTokenRedirect({ scopes: GRAPH_SCOPES, account }); throw new Error('redirecting') }
    throw e
  }
}
```
- [ ] **Step 2: Build check** `npm run build --prefix app` → succeeds.
- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(remote): MSAL SSO auth"`

---

## Task 5: Store shared-mode integration

**Files:** Modify `app/src/store/StoreContext.tsx`.

Add to `AppState.ui`: `mode: 'local' | 'shared'` and transient (non-persisted) sync state held in the provider: `{ remoteStatus: 'off'|'signedout'|'loading'|'synced'|'saving'|'readonly'|'offline'|'conflict', eTags: Record<fileName,string> }`.

- [ ] **Step 1: Reducer** — add `SET_MODE` action; default `mode:'local'`. Persist `mode` in localStorage state (so it sticks). Local mode = today's behavior unchanged.
- [ ] **Step 2: Shared lifecycle** (in `StoreProvider`, only when `mode==='shared'`):
  - On switch to shared: `trySsoSilent()`; if false → status `signedout` (UI shows "התחבר"). If true → `loading`: `listRemoteSites()`; for each load `loadRemoteSite(name)` into `state.sites`, recording `eTags[fileName]`. status `synced`.
  - **Autosave (editor):** when active site changes in shared mode, debounce (1.5s) `saveRemoteSite(site, eTags[file])` → on success update eTag + status `synced`; on `forbidden` → status `readonly`; on `etag-conflict` → reload that site + status `conflict` (banner); on network error → status `offline` (keep localStorage cache).
  - **Poll:** every 45s in shared mode, if not mid-edit, reload the active site; if its eTag changed, update state.
- [ ] **Step 3:** Expose via context: `mode`, `remoteStatus`, `signIn()` (calls `login()`), `setMode()`, `refreshNow()`.
- [ ] **Step 4: Build check** + manual smoke (local mode still works).
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(store): shared SharePoint mode (load/save/poll/etag/403/offline)"`

> Full code for this task is written during execution against the live `StoreContext.tsx`; it reuses `touchActive`, the debounce util, and the `useEffect` autosave already present. Keep local-mode path byte-for-byte unchanged.

---

## Task 6: UI — mode toggle + status banner

**Files:** Create `app/src/ui/ShareControls.tsx`; Modify `app/src/ui/Header.tsx`, `app/src/styles/engine.css`.

- [ ] **Step 1: `ShareControls`** — a header control: a segmented toggle **מקומי / משותף**; when shared: show status chip (`synced`→"מסונכרן", `saving`→"שומר…", `readonly`→"צפייה בלבד", `offline`→"לא מחובר", `signedout`→ button "התחבר", `conflict`→"עודכן במקום אחר · רענן") + a refresh icon button (`refreshNow`).
- [ ] **Step 2:** Mount `<ShareControls/>` in `Header` (next to SaveIndicator). Hide entirely if `!isRemoteConfigured()` (so before setup the app is exactly as today).
- [ ] **Step 3:** CSS for the segmented toggle + status chip colors (reuse `--ok/--warn/--bad`).
- [ ] **Step 4: Build check.**
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(ui): shared-mode toggle + sync status"`

---

## Task 7: One-time infrastructure (Entra app reg + consent + library)

**Driven via `az` (logged in) + Graph; needs the admin-backed account. Not code — produces clientId/tenantId.**

- [ ] **Step 1: Create Entra SPA app registration**
```powershell
$az = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
& $az ad app create --display-name "Tik Atar Portal" `
  --sign-in-audience AzureADMyOrg `
  --web-redirect-uris "https://icy-ground-0f57e4e03.7.azurestaticapps.net/" "http://localhost:5173/"
```
Then set the app as SPA platform (redirect under `spa`, not `web`) via `az rest PATCH /applications/{id}` setting `spa.redirectUris` (SPA requires PKCE). Capture **appId (clientId)** and **tenantId** (`az account show --query tenantId`).
- [ ] **Step 2: Add Graph delegated permissions** (`Sites.ReadWrite.All`, `User.Read`) via `az ad app permission add`, then **admin-consent**:
```powershell
& $az ad app permission admin-consent --id <appId>
```
- [ ] **Step 3: Create the document library** `TikAtarData` in the site via Graph:
```powershell
$site = & $az rest --method GET --url "https://graph.microsoft.com/v1.0/sites/gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT" --query id -o tsv
& $az rest --method POST --url "https://graph.microsoft.com/v1.0/sites/$site/lists" --headers "Content-Type=application/json" --body '{ "displayName": "TikAtarData", "list": { "template": "documentLibrary" } }'
```
- [ ] **Step 4: Library permissions** — set Edit for the editor, Read for viewers (SharePoint UI or Graph). Document the chosen editor account.
- [ ] **Step 5:** Record `clientId`, `tenantId`, confirmed `siteUrl`, `library` for Task 8. (No commit — secrets/ids go to `.env`, gitignored.)

---

## Task 8: Wire config, deploy, live verify

- [ ] **Step 1:** Create `app/.env` with the real `VITE_AAD_CLIENT_ID` + `VITE_AAD_TENANT_ID` (gitignored). For the Azure SWA build, add the same as **build env vars** in the Azure workflow (or SWA configuration → Environment variables) so the deployed build is configured.
- [ ] **Step 2:** `npm run build --prefix app` → succeeds with config baked in.
- [ ] **Step 3:** Commit non-secret changes (workflow env wiring) + push → Azure auto-deploys.
- [ ] **Step 4: Live verify (manual):**
  - Open the SWA URL → SSO silent sign-in (no prompt) as editor → switch to **שיתוף** → create/fill a site → confirm a JSON file appears in `TikAtarData`.
  - Open as a viewer (Read-only account / incognito) → switch to שיתוף → sees the editor's data → editing blocked (read-only).
  - Editor changes a value → within ~45s the viewer's open page refreshes it.
  - Disconnect network → app still loads from cache.
- [ ] **Step 5:** Final full `npm run test --prefix app` (all green) + commit any fixes.

---

## Self-Review

- **Spec coverage:** §3 arch → Tasks 2–5; §4 SSO → Task 4; §5 store(library) → Tasks 3,7; §6 Graph endpoints → Task 2; §7 liveness/eTag → Tasks 2,5; §8 roles/403 → Tasks 2,5,6; §9 app changes → Tasks 1,5,6; §10 errors → Tasks 2,5; §11 setup → Task 7; §12 tests → Tasks 2,3; §13 acceptance → Task 8. ✔
- **Placeholders:** Task 5 notes "full code written during execution" against the live file — its behavior, actions, and integration points are fully specified (SET_MODE, debounced saveRemoteSite, poll 45s, 403→readonly, etag-conflict→reload, offline→cache). Task 7 has exact CLI; library-permissions step is inherently a console action (documented).
- **Type consistency:** `resolveSiteId/resolveDriveId/listFiles/readFile/writeFile` signatures identical across graph.ts + tests + sharepointStore.ts; `fileNameFor`, `loadRemoteSite`, `saveRemoteSite`, `getToken` consistent; `SiteData` reused unchanged. ✔
```
