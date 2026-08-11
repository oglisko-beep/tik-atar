import type { Section } from '../types'
import { cols, exRow } from './helpers'

const targetCols = cols('מערכת / שירות', 'RTO (יעד זמן שחזור)', 'RPO (יעד אובדן נתונים)', 'עדיפות שחזור')
const drillCols = cols('תאריך', 'סוג תרגיל', 'היקף', 'תוצאה / ממצאים', 'יעד לטיפול')
const contactCols = cols('תפקיד', 'שם', 'טלפון', 'ספק / חיצוני')

export const sdr: Section = {
  id: 'sdr',
  title: '7. התאוששות מאסון (DR)',
  note: 'תוכנית ההתאוששות, יעדי השירות, נהלי השחזור והתרגולים — היערכות להמשכיות עסקית באתר.',
  blocks: [
    { kind: 'subhead', text: '7.1 תוכנית התאוששות (DR Plan)' },
    {
      kind: 'kv',
      id: 'sdr-plan',
      fields: [
        { id: 'exists', label: 'תוכנית DR מתועדת (קיימת / היכן)', type: 'text' },
        { id: 'updated', label: 'תאריך עדכון אחרון', type: 'date' },
        { id: 'owner', label: 'אחראי DR (בעל התוכנית)', type: 'text' },
        { id: 'site', label: 'אתר חלופי (DR Site) — מיקום / ענן / אין', type: 'text' },
        { id: 'strategy', label: 'אסטרטגיה (Backup&Restore / Warm Standby / Active-Active)', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '7.2 יעדי שחזור למערכות קריטיות' },
    { kind: 'note', text: 'RTO — כמה זמן עד חזרה לפעילות. RPO — כמה נתונים מותר לאבד (חלון הגיבוי).' },
    {
      kind: 'table',
      id: 'sdr-targets',
      columns: targetCols,
      minRows: 1,
      examples: [exRow(targetCols, 'שרת קבצים', '4 שעות', '24 שעות', 'גבוהה')],
    },
    { kind: 'subhead', text: '7.3 נוהל שחזור (Recovery Runbook)' },
    {
      kind: 'kv',
      id: 'sdr-runbook',
      fields: [
        { id: 'order', label: 'סדר שחזור מערכות (עדיפויות)', type: 'text' },
        { id: 'backupLoc', label: 'מיקום הגיבויים לשחזור', type: 'text' },
        { id: 'failover', label: 'נוהל מעבר לאתר חלופי (Failover)', type: 'text' },
        { id: 'comms', label: 'נוהל תקשורת באירוע (מי מעדכן, ערוצים)', type: 'text' },
        { id: 'validation', label: 'אימות תקינות אחרי שחזור', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '7.4 תרגולים ובדיקות' },
    {
      kind: 'table',
      id: 'sdr-drills',
      columns: drillCols,
      minRows: 1,
      examples: [exRow(drillCols, '03/2026', 'Restore', 'שרת קבצים', 'הצליח — 3 שעות', '—')],
    },
    { kind: 'subhead', text: '7.5 אנשי קשר וספקים ל-DR' },
    {
      kind: 'table',
      id: 'sdr-contacts',
      columns: contactCols,
      minRows: 1,
      examples: [exRow(contactCols, 'מוביל DR', '—', '—', 'פנימי')],
    },
  ],
}
