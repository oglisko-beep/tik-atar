import type { Section } from '../types'
import { cols, exRow } from './helpers'

const versions = cols('גרסה', ['תאריך', { type: 'date' }], 'עורך', 'תיאור השינוי', 'אישר')

export const docControl: Section = {
  id: 'docControl',
  title: 'בקרת מסמך',
  note: 'עדכנו את טבלת הגרסאות בכל שינוי, ואת טבלת האישורים עם הפקת התיק.',
  blocks: [
    { kind: 'subhead', text: 'היסטוריית גרסאות' },
    {
      kind: 'table',
      id: 'dc-versions',
      columns: versions,
      minRows: 1,
      examples: [exRow(versions, '1.0', '29/05/2026', 'י. ישראלי', 'גרסה ראשונית של תיק האתר', '—')],
    },
    { kind: 'subhead', text: 'אישורים' },
    {
      kind: 'checklist',
      id: 'dc-approvals',
      rowHeader: 'תפקיד',
      columns: [
        { id: 'name', label: 'שם מלא', type: 'text' },
        { id: 'sign', label: 'חתימה', type: 'text' },
        { id: 'date', label: 'תאריך', type: 'date' },
      ],
      rows: [
        { id: 'r0', label: 'מנהל מערכות מידע' },
        { id: 'r1', label: 'אחראי אבטחת מידע' },
        { id: 'r2', label: 'מנהל האתר' },
      ],
    },
  ],
}
