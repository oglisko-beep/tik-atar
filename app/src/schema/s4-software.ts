import type { Section } from '../types'
import { cols, exRow } from './helpers'

const sw = cols('תוכנה / שירות', 'יצרן', 'גרסה', 'סוג רישיון', 'כמות / מושבים', 'חידוש', 'ספק')

export const s4: Section = {
  id: 's4',
  title: '4. תוכנות ורישוי',
  note: 'מצאי התוכנה, הרישיונות ומנויי הענן באתר.',
  blocks: [
    {
      kind: 'bullets',
      title: 'מה לכלול:',
      items: [
        'מערכות הפעלה (שרתים ותחנות)',
        'תוכנות תשתית (AD, DNS, DHCP, Hypervisor)',
        'אפליקציות עסקיות',
        'אנטי-וירוס / EDR',
        'מנויי ענן / SaaS',
        'רישיונות גישה (CAL)',
        'כלי גיבוי וניטור',
      ],
    },
    {
      kind: 'table',
      id: 's4-software',
      columns: sw,
      minRows: 1,
      examples: [
        exRow(sw, 'Microsoft 365 E3', 'Microsoft', '—', 'מנוי שנתי', '50', '01/2026', 'ספק X'),
        exRow(sw, 'Windows Server', 'Microsoft', '2022', 'Volume + CAL', '5 + 50 CAL', '—', '—'),
      ],
    },
  ],
}
