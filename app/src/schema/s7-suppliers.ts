import type { Section } from '../types'
import { cols, exRow } from './helpers'

const sup = cols('ספק', 'תחום שירות', 'איש קשר', 'טלפון / דוא"ל', 'חוזה / SLA', 'תוקף')

export const s7: Section = {
  id: 's7',
  title: '7. ספקים וחוזי תמיכה',
  note: 'ספקי השירות, אנשי הקשר ותנאי ה-SLA.',
  blocks: [
    {
      kind: 'table',
      id: 's7-suppliers',
      columns: sup,
      minRows: 1,
      examples: [exRow(sup, 'חברת תקשורת Y', 'תשתיות רשת', 'דנה לוי', '03-1234567 / dana@y.co.il', '#SLA-204 · 4h', '12/2026')],
    },
  ],
}
