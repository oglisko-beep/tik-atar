import type { Section } from '../types'
import { cols, exRow } from './helpers'

const contacts = cols('שם', 'תפקיד', 'ארגון / מחלקה', 'טלפון', 'דוא"ל', 'הסלמה')

export const s8: Section = {
  id: 's8',
  title: '8. אנשי קשר ומדרג הסלמה',
  note: 'רמת הסלמה 1 = ראשונה לפנייה.',
  blocks: [
    {
      kind: 'table',
      id: 's8-contacts',
      columns: contacts,
      minRows: 1,
      examples: [exRow(contacts, 'ישראל ישראלי', 'מנהל מע׳ מידע', 'גב-ים — IT', '050-0000000', 'israel@gav-yam.co.il', '1')],
    },
  ],
}
