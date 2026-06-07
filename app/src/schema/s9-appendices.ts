import type { Section } from '../types'
import { cols, exRow } from './helpers'

const list = cols('שם הנספח', 'סוג', 'קישור / מיקום')

export const s9: Section = {
  id: 's9',
  title: '9. נספחים',
  note: 'צרפו את המסמכים הבאים כנספחים לתיק.',
  blocks: [
    {
      kind: 'bullets',
      items: [
        'נספח א׳ — תרשים רשת מפורט',
        'נספח ב׳ — תרשים מיקומי ציוד / קומות',
        'נספח ג׳ — צילומי חדר שרתים וארונות תקשורת',
        'נספח ד׳ — מסמכי ספקים וחוזים',
        'נספח ה׳ — נהלים רלוונטיים',
      ],
    },
    { kind: 'subhead', text: 'רשימת נספחים מצורפים' },
    { kind: 'note', text: 'רשמו את הנספחים שצורפו בפועל, עם קישור או מיקום הקובץ ברשת.' },
    {
      kind: 'table',
      id: 's9-list',
      columns: list,
      minRows: 1,
      examples: [exRow(list, 'נספח א׳ — תרשים רשת', 'PDF', '\\\\fileserver\\IT\\TLV\\network.pdf')],
    },
    { kind: 'subhead', text: 'תמונות וסריקות' },
    {
      kind: 'image',
      id: 's9-images',
      multi: true,
      hint: 'העלאת סריקות / צילומים של נספחים (חדר שרתים, ארונות תקשורת, מסמכים)',
    },
    {
      kind: 'callout',
      tone: 'warn',
      title: 'הערת אבטחה חשובה',
      items: [
        'אין לשמור סיסמאות, מפתחות הצפנה או קודי גישה במסמך זה.',
        'נהלו אותם בכספת סיסמאות / מאגר מאובטח נפרד עם בקרת גישה.',
      ],
    },
  ],
}
