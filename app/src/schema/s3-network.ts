import type { Section } from '../types'
import { cols, exRow } from './helpers'

const wan = cols('ספק (ISP)', 'סוג קו', 'מהירות (הורדה/העלאה)', 'IP ציבורי', 'נתב / CPE', 'חוזה / תמיכה')
const gear = cols('רכיב', 'יצרן / דגם', 'תפקיד', 'כתובת ניהול (IP)', 'מיקום (ארון)', 'פירמוור')
const servers = cols('שם שרת (Hostname)', 'תפקיד', 'פיזי / וירטואלי', 'מערכת הפעלה', 'מעבד / זיכרון / אחסון', 'כתובת IP', 'מארח / מיקום')
const virt = cols('רכיב', 'יצרן / דגם', 'תפקיד', 'קיבולת / משאבים', 'כתובת ניהול', 'הערות')
const vlan = cols('רשת / VLAN', 'טווח (Subnet)', 'Gateway', 'ייעוד', 'הקצאה')
const ssid = cols('SSID', 'ייעוד', 'אבטחה / אימות', 'תדר (Band)', 'VLAN', 'מוסתר?')

export const s3: Section = {
  id: 's3',
  title: '3. מערך הרשת והשרתים',
  note: 'תשתית התקשורת, השרתים והאחסון של האתר.',
  blocks: [
    { kind: 'subhead', text: '3.1 קישוריות אינטרנט / WAN' },
    {
      kind: 'table',
      id: 's3-wan',
      columns: wan,
      minRows: 1,
      examples: [exRow(wan, 'בזק בינלאומי', 'סיב אופטי', '200/200 Mbps', '85.64.x.x', 'Fortinet 60F', '#IL-44213')],
    },
    { kind: 'subhead', text: '3.2 ציוד תקשורת' },
    {
      kind: 'bullets',
      title: 'מה לכלול:',
      items: [
        'חומות אש (Firewall)',
        'נתבים (Routers)',
        'מתגים (Switches)',
        'נקודות גישה אלחוטיות (AP) ובקר',
        'ארונות תקשורת ופאנלים',
      ],
    },
    {
      kind: 'table',
      id: 's3-netgear',
      columns: gear,
      minRows: 1,
      examples: [
        exRow(gear, 'Firewall', 'Fortinet FortiGate 60F', 'חומת אש / שער', '192.168.1.1', 'ארון תקשורת ראשי', 'v7.2.5'),
        exRow(gear, 'Core Switch', 'Cisco Catalyst 9200', 'ליבת רשת', '192.168.1.2', 'ארון תקשורת ראשי', '17.6'),
      ],
    },
    { kind: 'subhead', text: '3.3 שרתים' },
    {
      kind: 'table',
      id: 's3-servers',
      columns: servers,
      minRows: 1,
      examples: [
        exRow(servers, 'GY-DC01', 'Domain Controller', 'וירטואלי (VMware)', 'Windows Server 2022', '4 vCPU / 16GB / 200GB', '192.168.1.10', 'ESXi-Host01'),
      ],
    },
    { kind: 'subhead', text: '3.4 וירטואליזציה ואחסון' },
    {
      kind: 'table',
      id: 's3-virt',
      columns: virt,
      minRows: 1,
      examples: [
        exRow(virt, 'Host וירטואליזציה', 'Dell PowerEdge R650', 'מארח מכונות וירטואליות', '2×Xeon / 256GB / 4TB', '192.168.1.5', 'VMware ESXi'),
        exRow(virt, 'אחסון רשת (NAS)', 'Synology RS1221+', 'גיבוי ושיתוף קבצים', '8×8TB (RAID6)', '192.168.1.6', '—'),
      ],
    },
    { kind: 'subhead', text: '3.5 כתובות IP ו-VLAN' },
    {
      kind: 'table',
      id: 's3-vlan',
      columns: vlan,
      minRows: 1,
      examples: [
        exRow(vlan, 'VLAN 10 — משתמשים', '192.168.10.0/24', '192.168.10.1', 'תחנות עבודה', 'DHCP'),
        exRow(vlan, 'VLAN 20 — שרתים', '192.168.20.0/24', '192.168.20.1', 'שרתים', 'Static'),
      ],
    },
    { kind: 'subhead', text: '3.6 חדר תקשורת / שרתים' },
    {
      kind: 'kv',
      id: 's3-room',
      fields: [
        { id: 'loc', label: 'מיקום החדר', type: 'text' },
        { id: 'hvac', label: 'מיזוג אוויר (סוג / גיבוי)', type: 'text' },
        { id: 'ups', label: 'UPS (דגם / זמן גיבוי)', type: 'text' },
        { id: 'access', label: 'בקרת גישה לחדר', type: 'text' },
        { id: 'sensors', label: 'חיישני טמפרטורה / מים', type: 'text' },
        { id: 'fire', label: 'כיבוי אש', type: 'text' },
        { id: 'racks', label: 'מספר ארונות (וגובה U)', type: 'text' },
        { id: 'ground', label: 'הארקה', type: 'text' },
      ],
    },
    { kind: 'subhead', text: '3.7 תרשים רשת' },
    { kind: 'image', id: 's3-diagram', hint: 'העלאת תרשים רשת עדכני (אינטרנט ← חומת אש ← מתגים ← שרתים / VLANs)' },
    { kind: 'subhead', text: '3.8 רשת אלחוטית (Wi-Fi)' },
    {
      kind: 'bullets',
      title: 'מה לכלול:',
      items: [
        'בקר אלחוטי (WLC) / ניהול ענן',
        'נקודות גישה (Access Points)',
        'רשתות (SSID) — עובדים / אורחים / IoT',
        'אבטחה ואימות (WPA2/WPA3 · 802.1X · Portal)',
        'הפרדת רשת אורחים (VLAN)',
        'כיסוי וביצועים (Band steering / Roaming)',
      ],
    },
    {
      kind: 'kv',
      id: 's3-wifi',
      fields: [
        { id: 'controller', label: 'בקר אלחוטי (WLC) / ניהול', type: 'text' },
        { id: 'apCount', label: 'מספר נקודות גישה (AP)', type: 'text' },
        { id: 'apModel', label: 'דגם נקודות גישה', type: 'text' },
        { id: 'mgmt', label: 'ניהול (ענן / מקומי)', type: 'text' },
        { id: 'coverage', label: 'כיסוי (קומות / אזורים)', type: 'text' },
        { id: 'guest', label: 'רשת אורחים (הפרדה / VLAN)', type: 'text' },
      ],
    },
    {
      kind: 'table',
      id: 's3-wifi-ssid',
      columns: ssid,
      minRows: 1,
      examples: [
        exRow(ssid, 'GavYam-Corp', 'עובדים', 'WPA2-Enterprise (802.1X)', '5GHz', 'VLAN 10', 'לא'),
        exRow(ssid, 'GavYam-Guest', 'אורחים', 'WPA2-PSK + Portal', '2.4 + 5GHz', 'VLAN 90', 'לא'),
      ],
    },
    { kind: 'image', id: 's3-wifi-map', hint: 'מפת כיסוי Wi-Fi / Heatmap (אופציונלי)' },
  ],
}
