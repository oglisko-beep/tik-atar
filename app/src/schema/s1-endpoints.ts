import type { Section } from '../types'
import { cols, exRow } from './helpers'

const equip = cols(
  'סוג ציוד',
  'יצרן / דגם',
  'מס׳ נכס / Serial',
  'משתמש / מיקום',
  'מערכת הפעלה',
  'רכש / אחריות',
  'סטטוס',
)

export const s1: Section = {
  id: 's1',
  title: '1. ציוד קצה',
  note: 'כלל ציוד הקצה באתר — תחנות, ניידים, מדפסות, ציוד היקפי וטלפוניה.',
  blocks: [
    {
      kind: 'bullets',
      title: 'מה לכלול:',
      items: [
        'תחנות עבודה נייחות',
        'מחשבים ניידים',
        'מסכים',
        'מדפסות / מסופונים / MFP',
        'סורקים',
        'טלפונים (IP / שלוחות)',
        'ציוד ועידה (מצלמות / רמקולים)',
        'טאבלטים ומכשירים ניידים',
        'UPS שולחני',
      ],
    },
    {
      kind: 'table',
      id: 's1-equipment',
      columns: equip,
      minRows: 1,
      examples: [
        exRow(equip, 'תחנת עבודה', 'Dell OptiPlex 7010', 'GY-PC-014 / SN8842', 'משה כהן / קומה 2', 'Windows 11 Pro', '03/2024 · 36 ח׳', 'תקין'),
      ],
    },
  ],
}
