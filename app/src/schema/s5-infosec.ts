import type { Section } from '../types'
import { cols, exRow } from './helpers'

const ctrlCols = (toolLabel: string) => [
  { id: 'status', label: 'סטטוס', type: 'status' as const },
  { id: 'tool', label: toolLabel, type: 'text' as const },
  { id: 'owner', label: 'אחראי', type: 'text' as const },
]

const s5Controls = [
  'אנטי-וירוס / EDR',
  'חומת אש (Firewall)',
  'עדכוני אבטחה (Patching)',
  'גיבוי',
  'שחזור ו-DR',
  'הצפנת תחנות (BitLocker)',
  'אימות דו-שלבי (MFA)',
  'מדיניות סיסמאות',
  'ניהול הרשאות (Least Privilege)',
  'סינון דוא"ל / אנטי-ספאם',
  'סינון גלישה',
  'אבטחה פיזית',
  'ניטור ולוגים',
  'מודעות והדרכת עובדים',
]

const perms = cols('קבוצה / תפקיד', 'הרשאות עיקריות', 'מערכת', 'אישור / אחראי')

export const s5: Section = {
  id: 's5',
  title: '5. אבטחת מידע',
  note: 'בקרות האבטחה, הגיבוי וההיערכות לאירוע באתר.',
  blocks: [
    { kind: 'subhead', text: '5.1 סקירת בקרות אבטחה' },
    { kind: 'note', text: 'סטטוס לכל בקרה: קיים / חלקי / חסר.' },
    {
      kind: 'checklist',
      id: 's5-controls',
      rowHeader: 'בקרה',
      columns: ctrlCols('כלי / פרטים'),
      rows: s5Controls.map((label, i) => ({ id: 'r' + i, label })),
    },
    { kind: 'subhead', text: '5.2 גיבוי ושחזור' },
    {
      kind: 'kv',
      id: 's5-backup',
      fields: [
        { id: 'tool', label: 'כלי גיבוי', type: 'text' },
        { id: 'what', label: 'מה מגובה', type: 'text' },
        { id: 'freq', label: 'תדירות', type: 'text' },
        { id: 'target', label: 'יעד גיבוי (מקומי/ענן/Offsite)', type: 'text' },
        { id: 'retention', label: 'שמירה (Retention)', type: 'text' },
        { id: 'lastTest', label: 'בדיקת שחזור אחרונה', type: 'text' },
        { id: 'rto', label: 'יעד RTO', type: 'text' },
        { id: 'rpo', label: 'יעד RPO', type: 'text' },
        { id: 'owner', label: 'אחראי', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '5.3 ניהול משתמשים והרשאות' },
    {
      kind: 'table',
      id: 's5-perms',
      columns: perms,
      minRows: 1,
      examples: [exRow(perms, 'IT-Admins', 'Domain Admin', 'Active Directory', 'מנהל מע׳ מידע')],
    },
    { kind: 'subhead', text: '5.4 תגובה לאירוע אבטחה' },
    {
      kind: 'kv',
      id: 's5-incident',
      fields: [
        { id: 'first', label: 'גורם מטפל ראשון', type: 'text' },
        { id: 'contact', label: 'איש קשר אבטחת מידע + טלפון', type: 'text' },
        { id: 'external', label: 'ספק חיצוני (SOC / IR)', type: 'text' },
        { id: 'procedure', label: 'נוהל דיווח', type: 'text' },
        { id: 'offline', label: 'זמינות גיבוי לא-מקוון', type: 'text' },
        { id: 'mgmt', label: 'איש קשר הנהלה', type: 'text' },
      ],
    },
  ],
}
