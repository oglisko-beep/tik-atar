# DR Chapter — Design

**Date:** 2026-07-04
**Status:** Approved (design), implementing

A dedicated **"התאוששות מאסון (DR)"** chapter in תיק אתר, consolidating the disaster-recovery / business-continuity content that today is scattered across §5 (backup, "שחזור ו-DR" control) and §6 ("DR Drill").

## Placement

New section `sdr`, titled **"7. התאוששות מאסון (DR)"**, inserted **after `s6` (cyber)** in `doc.sections`. Existing sections renumber by title only (ids are stable strings): `s7`→"8. ספקים…", `s8`→"9. אנשי קשר…", `s9`→"10. נספחים". None of s7/s8/s9 have internal numbered subheads, so only the title prefix changes.

## Content (`app/src/schema/sdr-dr.ts`)

| Sub | Block id | Kind | Fields / columns |
|-----|----------|------|------------------|
| 7.1 תוכנית התאוששות (DR Plan) | `sdr-plan` | kv | תוכנית DR מתועדת · תאריך עדכון (date) · אחראי DR · אתר חלופי (DR Site) · אסטרטגיה |
| 7.2 יעדי שחזור למערכות קריטיות | `sdr-targets` | table | מערכת · **RTO** · **RPO** · עדיפות שחזור |
| 7.3 נוהל שחזור (Recovery Runbook) | `sdr-runbook` | kv | סדר שחזור · מיקום הגיבויים · נוהל Failover · נוהל תקשורת · אימות אחרי שחזור |
| 7.4 תרגולים ובדיקות | `sdr-drills` | table | תאריך · סוג · היקף · תוצאה/ממצאים · יעד לטיפול |
| 7.5 אנשי קשר וספקים ל-DR | `sdr-contacts` | table | תפקיד · שם · טלפון · ספק/חיצוני |

Notes:
- **RTO/RPO** (7.2) were removed from §5.2 earlier as single fields; they return here per-system, in their natural DR home.
- **"מיקום הגיבויים"** (7.3) documents the nightly `backups/` folder (Phase 3).
- No `status` checklist → the schema `status`-column count stays 2 (no test change there).

## Engine impact

None — the schema engine is generic. The new chapter automatically participates in completion %, per-site chapter inclusion/exclusion, search, print, and docx export. Managers dashboard is unaffected (it reads specific block ids).

## Files

| File | Change |
|------|--------|
| `app/src/schema/sdr-dr.ts` | new section `sdr` (5 subsections) |
| `app/src/schema/index.ts` | import `sdr`, insert after `s6` |
| `app/src/schema/s7-suppliers.ts` / `s8-contacts.ts` / `s9-appendices.ts` | title prefix 7→8, 8→9, 9→10 |
| `app/src/schema/schema.test.ts` | sections-order list: insert `sdr`, "11"→"12" |

## Verification

Tests (`schema.test.ts` order + counts, full suite) + tsc. Preview: local-mode hack → open the new chapter, confirm all 5 subsections render, RTL correct, and s7/s8/s9 show 8/9/10. Revert hack, commit, deploy, marker-grep the live bundle.

## Out of scope

Removing the now-duplicated DR bits from §5/§6 (keep them — they serve different granularity); dashboard DR widgets; migrating existing per-site data (new chapter starts empty, included by default).
