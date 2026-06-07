import type { Section } from '../types'
import { cols, exRow } from './helpers'

const access = cols(
  'מערכת / רכיב',
  'יצרן / דגם',
  'מיקום (דלת/שער)',
  'בקר / כתובת IP',
  'סוג הזדהות',
  'מורשים',
  'ספק / תחזוקה',
)
const cctv = cols('מצלמה / אזור', 'דגם', 'מיקום', 'רזולוציה', 'מקליט / NVR', 'שמירה (ימים)')

export const s2: Section = {
  id: 's2',
  title: '2. בקרות כניסה',
  note: 'מערכות בקרת הכניסה הפיזית לאתר.',
  blocks: [
    {
      kind: 'bullets',
      title: 'מה לכלול:',
      items: [
        'בקרי דלתות',
        'קוראי כרטיסים / תגיות קרבה',
        'קוראים ביומטריים',
        'מקלדות קוד',
        'אינטרקום',
        'שערים / מחסומים',
        'מנעולים חכמים',
      ],
    },
    {
      kind: 'table',
      id: 's2-access',
      columns: access,
      minRows: 1,
      examples: [
        exRow(access, 'בקר דלת ראשית', 'Suprema BioStation 2', 'כניסה ראשית · קומת קרקע', '192.168.1.40', 'כרטיס + טביעת אצבע', '25', 'חברת אבטחה X'),
      ],
    },
    { kind: 'subhead', text: 'מצלמות אבטחה (CCTV)', optional: true },
    {
      kind: 'table',
      id: 's2-cctv',
      optional: true,
      columns: cctv,
      minRows: 1,
      examples: [exRow(cctv, 'מצלמה 1 — חניון', 'Hikvision DS-2CD2046', 'חניון תת-קרקעי', '4MP', 'NVR-01', '30')],
    },
    { kind: 'subhead', text: 'מערכת אזעקה', optional: true },
    {
      kind: 'kv',
      id: 's2-alarm',
      optional: true,
      fields: [
        { id: 'panel', label: 'לוח בקרה (דגם)', type: 'text' },
        { id: 'sensors', label: 'גלאים (סוג / כמות)', type: 'text' },
        { id: 'zones', label: 'אזורים', type: 'text' },
        { id: 'monitor', label: 'חברת ניטור', type: 'text' },
        { id: 'phone', label: 'טלפון מוקד', type: 'text' },
        { id: 'arm', label: 'קוד דריכה — אחראי', type: 'text' },
      ],
    },
  ],
}
