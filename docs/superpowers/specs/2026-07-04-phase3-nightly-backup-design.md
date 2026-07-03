# Phase 3 — Nightly Backup — Design

**Date:** 2026-07-04
**Status:** Approved (design), documenting

An independent nightly copy of all site data, so a lost/corrupted SharePoint library
isn't the single point of failure.

## Decisions

- **Host:** a Power Automate scheduled cloud flow (no code, no secret, no app registration, no admin consent). Runs on the creator's SharePoint connection.
- **Destination:** a `backups/` folder **inside the same `TikAtarData` library** (user's choice — simplest, no new infra). Accepted trade-off: same failure domain as the source; mitigated by SharePoint's own version history + ~93-day recycle bin.
- **Retention:** folder named by **day-of-month** (`01`–`31`). Always the last ~30 days; each folder is overwritten the following month. **No delete logic** — the fragile part of a GUI flow is avoided entirely. Growth is bounded to 31 folders.
- **Schedule:** daily 02:00, Israel Standard Time (Recurrence handles DST).

## What gets backed up

Every `{code}.json` at the **root** of `TikAtarData`. These files are self-contained: attachments (images / Visio / PDF) are embedded as base64 `dataUrl` **inside** the JSON (`ImageItem.dataUrl`), so there are no separate attachment files to copy.

## Flow structure

1. **Recurrence** — daily, 02:00, time zone (UTC+02:00) Jerusalem.
2. **Initialize variable** `dayFolder` (String) = `formatDateTime(convertFromUtc(utcNow(),'Israel Standard Time'),'dd')`.
3. **Create new folder** → `backups/@{dayFolder}` in `TikAtarData`. (First run also creates `backups`.) Downstream steps are configured to run even if this errors "already exists."
4. **Get files (properties only)** from `TikAtarData`.
5. **Filter array** — keep files (`{IsFolder}` = false) whose name ends `.json` and whose `{Path}` does **not** contain `/backups/` (excludes the backup subtree; robust to the exact root path).
6. **Apply to each** filtered file → **Copy file** into `TikAtarData/backups/@{dayFolder}`, conflict = **Replace**.

No retention/cleanup step — day-of-month rotation self-prunes.

## Deliverables

- This spec.
- `docs/BACKUP-SETUP.md` — step-by-step Hebrew build guide with exact action names, field values, and expressions.
- A "גיבוי" section added to `docs/INFRASTRUCTURE.md`.

## Verification

Cannot be automated from here (no Power Automate access). After the user builds the flow: run it once with **Test → Manually**, confirm `backups/<today's-dd>/` fills with one `.json` per site, then confirm the scheduled run the next morning. Failure notifications are emailed to the flow owner by Power Automate by default.

## Out of scope

- Off-SharePoint copy (Azure Blob) — rejected in favour of simplicity; revisit if true DR isolation is needed.
- Restore UI — restore is manual (download the JSON from `backups/<dd>/` and re-upload, or use the app's Import). 
- Zipping — Power Automate can't zip arbitrary files without a premium connector / Function.
- Notifications beyond Power Automate's built-in failure email (that's Phase 4).
