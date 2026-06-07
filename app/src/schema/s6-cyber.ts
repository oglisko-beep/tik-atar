import type { Section } from '../types'

const s6Controls = [
  'הגנת קצה מתקדמת (EDR / XDR)',
  'חומת אש מתקדמת (NGFW) / IPS-IDS',
  'סגמנטציה של הרשת (VLAN / Microsegmentation)',
  'ניהול פגיעויות וסריקות',
  'הגנה מפני כופרה (Anti-Ransomware)',
  'גיבוי מנותק / בלתי-ניתן-לשינוי',
  'ניהול הרשאות-על (PAM)',
  'הגנת דוא"ל וזיהוי פישינג מתקדם',
  'סינון DNS / גלישה',
  'מודיעין איומים (Threat Intelligence)',
  'הקשחת מערכות (Hardening / CIS)',
  'גיבוי הגדרות ציוד תקשורת',
]

const resilienceTests = [
  'מבחן חדירה (Penetration Test)',
  'סקר סיכוני סייבר',
  'תרגיל פישינג',
  'בדיקת התאוששות (DR Drill)',
  'סקר ארכיטקטורת הגנה',
]

export const s6: Section = {
  id: 's6',
  title: '6. הגנת סייבר',
  note: 'היערכות הארגון להגנת סייבר אקטיבית — ניטור, תגובה לאירוע, חוסן ורגולציה (משלים את פרק אבטחת המידע).',
  blocks: [
    { kind: 'subhead', text: '6.1 בקרות הגנת סייבר מתקדמות' },
    { kind: 'note', text: 'סטטוס לכל בקרה: קיים / חלקי / חסר.' },
    {
      kind: 'checklist',
      id: 's6-controls',
      rowHeader: 'בקרה',
      columns: [
        { id: 'status', label: 'סטטוס', type: 'status' },
        { id: 'tool', label: 'כלי / ספק', type: 'text' },
        { id: 'owner', label: 'אחראי', type: 'text' },
      ],
      rows: s6Controls.map((label, i) => ({ id: 'r' + i, label })),
    },
    { kind: 'subhead', text: '6.2 ניטור ותגובה (SOC / SIEM)' },
    {
      kind: 'kv',
      id: 's6-soc',
      fields: [
        { id: 'soc', label: 'מוקד ניטור (SOC) — פנימי / ספק', type: 'text' },
        { id: 'siem', label: 'כלי SIEM / ניטור', type: 'text' },
        { id: 'hours', label: 'שעות פעילות (24/7?)', type: 'text' },
        { id: 'channel', label: 'ערוץ דיווח אירוע', type: 'text' },
        { id: 'sla', label: 'זמן תגובה (SLA)', type: 'text' },
        { id: 'logs', label: 'מקורות לוגים', type: 'text' },
        { id: 'retention', label: 'שמירת לוגים (תקופה)', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '6.3 תגובה לאירוע סייבר ודיווח רגולטורי' },
    {
      kind: 'kv',
      id: 's6-report',
      fields: [
        { id: 'procedure', label: 'נוהל תגובה לאירוע סייבר (קיים?)', type: 'text' },
        { id: 'csirt', label: 'צוות תגובה (CSIRT) ואנשי קשר', type: 'text' },
        { id: 'certil', label: 'דיווח למערך הסייבר הלאומי (CERT-IL · 119)', type: 'text' },
        { id: 'privacy', label: 'דיווח לרשות להגנת הפרטיות', type: 'text' },
        { id: 'offline', label: 'גיבוי לא-מקוון זמין לשחזור', type: 'text' },
        { id: 'insurance', label: 'ביטוח סייבר (חברה / פוליסה)', type: 'text' },
        { id: 'emergency', label: 'איש קשר חירום (ספק IR)', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '6.4 בדיקות חוסן וסקרי סיכונים' },
    {
      kind: 'checklist',
      id: 's6-resilience',
      rowHeader: 'סוג בדיקה',
      columns: [
        { id: 'by', label: 'מבצע / ספק', type: 'text' },
        { id: 'last', label: 'תאריך אחרון', type: 'text' },
        { id: 'open', label: 'ממצאים פתוחים', type: 'text' },
        { id: 'target', label: 'יעד לטיפול', type: 'text' },
      ],
      rows: resilienceTests.map((label, i) => ({ id: 'r' + i, label })),
    },
    { kind: 'subhead', text: '6.5 ממשל סייבר, מודעות ורגולציה' },
    {
      kind: 'kv',
      id: 's6-gov',
      fields: [
        { id: 'ciso', label: 'ממונה הגנת סייבר / אחראי', type: 'text' },
        { id: 'standard', label: 'מתודולוגיה / תקן (ISO 27001 / NIST / מתודולוגיית הגנת סייבר)', type: 'text' },
        { id: 'awareness', label: 'הדרכות מודעות סייבר (תדירות)', type: 'text' },
        { id: 'phishing', label: 'תרגילי פישינג (תדירות)', type: 'text' },
        { id: 'bia', label: 'נכסי מידע קריטיים (BIA)', type: 'text' },
        { id: 'privacy', label: 'עמידה בתקנות הגנת הפרטיות', type: 'text' },
        { id: 'policies', label: 'מדיניות ונהלי סייבר מאושרים', type: 'text' },
      ],
    },
  ],
}
