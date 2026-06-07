import type { Section } from '../types'

export const siteDetails: Section = {
  id: 'siteDetails',
  title: 'פרטי אתר כלליים',
  note: 'פרטי הזיהוי של האתר ואנשי הקשר המרכזיים.',
  blocks: [
    {
      kind: 'kv',
      id: 'site-details',
      fields: [
        { id: 'name', label: 'שם האתר', type: 'text' },
        { id: 'code', label: 'קוד אתר', type: 'text', placeholder: 'GY-TLV-01' },
        { id: 'address', label: 'כתובת מלאה', type: 'text' },
        { id: 'building', label: 'בניין / קומות', type: 'text' },
        { id: 'stations', label: 'מספר עמדות עבודה', type: 'text' },
        { id: 'users', label: 'מספר משתמשים', type: 'text' },
        { id: 'hours', label: 'שעות פעילות', type: 'text', placeholder: 'א׳–ה׳ 08:00–17:00' },
        { id: 'itOwner', label: 'אחראי IT באתר', type: 'text' },
        { id: 'phone', label: 'טלפון / נייד', type: 'text' },
        { id: 'email', label: 'דוא"ל', type: 'email' },
        { id: 'support', label: 'ספק תמיכה ראשי', type: 'text' },
        { id: 'since', label: 'תאריך איכלוס / הקמה', type: 'date' },
      ],
    },
  ],
}
