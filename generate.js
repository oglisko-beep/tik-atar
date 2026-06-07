/* תיק אתר — מערכות מידע | תבנית-אב (RTL Hebrew) */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents, ImageRun,
} = require('docx');
const fs = require('fs');
const path = require('path');

let logoData = null;
try {
  const { Resvg } = require('@resvg/resvg-js');
  const svg = fs.readFileSync(path.join(__dirname, 'gav-yam.svg'));
  logoData = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng();
} catch (e) { console.log('logo skipped: ' + e.message); }

const FONT = 'Arial';
const TABLE_W = 9746; // A4 (11906) minus left+right margins (2*1080)

const C = {
  primary: '104E7D',
  primaryDark: '0B3A5E',
  accent: 'EEC21B',
  exFill: 'F2F2F2',
  exText: '808080',
  kvFill: 'EAF2FA',
  border: 'BFBFBF',
  note: '595959',
};

// ---------- helpers ----------
function widths(weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return TABLE_W - acc;
    const v = Math.round((TABLE_W * w) / sum);
    acc += v;
    return v;
  });
}
const B = { style: BorderStyle.SINGLE, size: 4, color: C.border };
const allB = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

function run(text, o = {}) {
  return new TextRun({
    text: String(text == null ? '' : text),
    rightToLeft: true, font: FONT,
    size: o.size, bold: o.bold, italics: o.italics, color: o.color,
  });
}
function para(text, o = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: o.align || AlignmentType.RIGHT,
    spacing: o.spacing || { after: 120 },
    children: o.children || [run(text, o)],
  });
}
function h1(text, o = {}) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, bidirectional: true, alignment: AlignmentType.RIGHT,
    pageBreakBefore: o.pageBreak !== false,
    spacing: { before: 120, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.primary, space: 4 } },
    children: [run(text)],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { before: 180, after: 80 }, children: [run(text)],
  });
}
function note(text) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 120 },
    children: [run(text, { size: 20, italics: true, color: C.note })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bul', level: 0 }, bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 40 }, children: [run(text, { size: 20 })],
  });
}
function spacer(h) {
  return new Paragraph({ spacing: { after: h || 120 }, children: [] });
}
function cell(text, o = {}) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      bidirectional: true, alignment: o.align || AlignmentType.RIGHT, spacing: { after: 0 },
      children: [run(text, {
        size: 18,
        bold: o.header ? true : o.bold,
        italics: o.italics,
        color: o.header ? 'FFFFFF' : o.color,
      })],
    })],
  });
}
function dataTable(headers, weights, opts = {}) {
  const w = widths(weights);
  const rows = [];
  rows.push(new TableRow({
    tableHeader: true,
    children: headers.map((t, i) => cell(t, { w: w[i], fill: C.primary, header: true })),
  }));
  (opts.plain || []).forEach((r) => rows.push(new TableRow({
    children: r.map((v, i) => cell(v, { w: w[i] })),
  })));
  (opts.examples || []).forEach((r) => rows.push(new TableRow({
    children: r.map((v, i) => cell(v, { w: w[i], fill: C.exFill, italics: true, color: C.exText })),
  })));
  for (let k = 0; k < (opts.empty || 0); k++) {
    rows.push(new TableRow({ children: w.map((x) => cell('', { w: x })) }));
  }
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: w,
    visuallyRightToLeft: true, borders: allB, rows,
  });
}
function kvTable(labels, examples = {}) {
  const keyW = Math.round(TABLE_W * 0.32);
  const valW = TABLE_W - keyW;
  const rows = labels.map((label) => new TableRow({
    children: [
      cell(label, { w: keyW, fill: C.kvFill, bold: true }),
      cell(examples[label] || '', { w: valW, italics: !!examples[label], color: examples[label] ? C.exText : undefined }),
    ],
  }));
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [keyW, valW],
    visuallyRightToLeft: true, borders: allB, rows,
  });
}
function box(lines, fill) {
  const db = { style: BorderStyle.DASHED, size: 6, color: '9DB2C6' };
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [TABLE_W], visuallyRightToLeft: true,
    borders: { top: db, bottom: db, left: db, right: db, insideHorizontal: db, insideVertical: db },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: TABLE_W, type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 140, right: 140 },
        shading: { fill: fill || 'F7F9FB', type: ShadingType.CLEAR },
        children: lines.map((t) => new Paragraph({
          bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 50 },
          children: [run(t, { size: 20, italics: true, color: '7F7F7F' })],
        })),
      })],
    })],
  });
}
function callout(title, items, fill) {
  const cb = { style: BorderStyle.SINGLE, size: 6, color: C.primary };
  const kids = [new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 80 },
    children: [run(title, { size: 22, bold: true, color: C.primaryDark })],
  })];
  items.forEach((t) => kids.push(new Paragraph({
    numbering: { reference: 'bul', level: 0 }, bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 40 }, children: [run(t, { size: 20 })],
  })));
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: [TABLE_W], visuallyRightToLeft: true,
    borders: { top: cb, bottom: cb, left: cb, right: cb, insideHorizontal: cb, insideVertical: cb },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: TABLE_W, type: WidthType.DXA },
        margins: { top: 140, bottom: 140, left: 160, right: 160 },
        shading: { fill: fill || 'EAF3FB', type: ShadingType.CLEAR },
        children: kids,
      })],
    })],
  });
}

// ---------- cover ----------
const coverKey = 2500, coverVal = 4700, coverW = coverKey + coverVal;
function coverRow(label, val) {
  return new TableRow({
    children: [
      cell(label, { w: coverKey, fill: C.kvFill, bold: true }),
      cell(val || '', { w: coverVal, italics: !!val, color: val ? C.exText : undefined }),
    ],
  });
}
const coverTable = new Table({
  width: { size: coverW, type: WidthType.DXA }, columnWidths: [coverKey, coverVal],
  alignment: AlignmentType.CENTER, visuallyRightToLeft: true, borders: allB,
  rows: [
    coverRow('שם האתר', ''),
    coverRow('קוד אתר', ''),
    coverRow('כתובת', ''),
    coverRow('אחראי IT', ''),
    coverRow('תאריך עריכה', ''),
    coverRow('גרסה', '1.0'),
    coverRow('סיווג', 'לשימוש פנימי'),
  ],
});

const logoEl = logoData
  ? new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 220 },
      children: [new ImageRun({ type: 'png', data: logoData, transformation: { width: 360, height: 107 }, altText: { title: 'גב-ים', description: 'לוגו גב-ים', name: 'gav-yam-logo' } })],
    })
  : new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, bidirectional: true, children: [run('[ לוגו גב-ים ]', { size: 26, color: 'A0A0A0' })] });

const cover = [
  spacer(400),
  logoEl,
  spacer(500),
  new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 80 }, children: [run('תיק אתר — מערכות מידע', { size: 56, bold: true, color: C.primaryDark })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 120 }, children: [run('תבנית-אב', { size: 30, color: C.primary })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 }, children: [run('ציוד קצה · בקרות כניסה · רשת ושרתים · תוכנות · אבטחת מידע', { size: 20, color: C.note })] }),
  coverTable,
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------- TOC ----------
const toc = [
  new Paragraph({ alignment: AlignmentType.RIGHT, bidirectional: true, spacing: { after: 120 }, children: [run('תוכן עניינים', { size: 34, bold: true, color: C.primaryDark })] }),
  new TableOfContents('תוכן עניינים', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
  callout('כיצד למלא את התיק', [
    'מלאו כל שדה רלוונטי; אם פרט אינו קיים באתר, סמנו "לא רלוונטי".',
    'השורות האפורות בנטוי הן דוגמאות — מחקו אותן לאחר המילוי.',
    'ניתן להוסיף שורות לטבלה (Tab בסוף השורה האחרונה מוסיף שורה חדשה).',
    'אין לשמור סיסמאות / קודים במסמך — ראו ההערה בנספחים.',
    'עדכנו את טבלת הגרסאות בכל שינוי מהותי בתיק.',
    'לרענון תוכן העניינים: לחצו עליו → "עדכן שדה".',
  ]),
];

// ---------- body ----------
const body = [];
function S(arr) { arr.forEach((x) => body.push(x)); }

// בקרת מסמך
S([
  h1('בקרת מסמך'),
  note('עדכנו את טבלת הגרסאות בכל שינוי, ואת טבלת האישורים עם הפקת התיק.'),
  h2('היסטוריית גרסאות'),
  dataTable(['גרסה', 'תאריך', 'עורך', 'תיאור השינוי', 'אישר'],
    [1, 1.4, 1.6, 3, 1.5],
    { examples: [['1.0', '29/05/2026', 'י. ישראלי', 'גרסה ראשונית של תיק האתר', '—']], empty: 4 }),
  spacer(),
  h2('אישורים'),
  dataTable(['תפקיד', 'שם מלא', 'חתימה', 'תאריך'],
    [2.2, 2.2, 1.6, 1.6],
    { plain: [['מנהל מערכות מידע', '', '', ''], ['אחראי אבטחת מידע', '', '', ''], ['מנהל האתר', '', '', '']] }),
]);

// פרטי אתר כלליים
S([
  h1('פרטי אתר כלליים'),
  note('פרטי הזיהוי של האתר ואנשי הקשר המרכזיים.'),
  kvTable(
    ['שם האתר', 'קוד אתר', 'כתובת מלאה', 'בניין / קומות', 'מספר עמדות עבודה', 'מספר משתמשים', 'שעות פעילות', 'אחראי IT באתר', 'טלפון / נייד', 'דוא"ל', 'ספק תמיכה ראשי', 'תאריך איכלוס / הקמה'],
    { 'קוד אתר': 'GY-TLV-01', 'שעות פעילות': 'א׳–ה׳ 08:00–17:00' }
  ),
]);

// 1. ציוד קצה
S([
  h1('1. ציוד קצה'),
  note('כלל ציוד הקצה באתר — תחנות, ניידים, מדפסות, ציוד היקפי וטלפוניה.'),
  para('מה לכלול:', { spacing: { after: 40 } }),
  bullet('תחנות עבודה נייחות'), bullet('מחשבים ניידים'), bullet('מסכים'),
  bullet('מדפסות / מסופונים / MFP'), bullet('סורקים'),
  bullet('טלפונים (IP / שלוחות)'), bullet('ציוד ועידה (מצלמות / רמקולים)'),
  bullet('טאבלטים ומכשירים ניידים'), bullet('UPS שולחני'),
  spacer(80),
  dataTable(['סוג ציוד', 'יצרן / דגם', 'מס׳ נכס / Serial', 'משתמש / מיקום', 'מערכת הפעלה', 'רכש / אחריות', 'סטטוס'],
    [1.5, 1.7, 1.6, 1.6, 1.3, 1.3, 0.9],
    { examples: [['תחנת עבודה', 'Dell OptiPlex 7010', 'GY-PC-014 / SN8842', 'משה כהן / קומה 2', 'Windows 11 Pro', '03/2024 · 36 ח׳', 'תקין']], empty: 6 }),
]);

// 2. בקרות כניסה
S([
  h1('2. בקרות כניסה'),
  note('מערכות בקרת הכניסה הפיזית לאתר.'),
  para('מה לכלול:', { spacing: { after: 40 } }),
  bullet('בקרי דלתות'), bullet('קוראי כרטיסים / תגיות קרבה'), bullet('קוראים ביומטריים'),
  bullet('מקלדות קוד'), bullet('אינטרקום'), bullet('שערים / מחסומים'), bullet('מנעולים חכמים'),
  spacer(80),
  dataTable(['מערכת / רכיב', 'יצרן / דגם', 'מיקום (דלת/שער)', 'בקר / כתובת IP', 'סוג הזדהות', 'מורשים', 'ספק / תחזוקה'],
    [1.6, 1.5, 1.6, 1.4, 1.3, 0.8, 1.6],
    { examples: [['בקר דלת ראשית', 'Suprema BioStation 2', 'כניסה ראשית · קומת קרקע', '192.168.1.40', 'כרטיס + טביעת אצבע', '25', 'חברת אבטחה X']], empty: 5 }),
  spacer(),
  h2('מצלמות אבטחה (CCTV) — אופציונלי'),
  dataTable(['מצלמה / אזור', 'דגם', 'מיקום', 'רזולוציה', 'מקליט / NVR', 'שמירה (ימים)'],
    [1.8, 1.4, 1.8, 1.1, 1.6, 1],
    { examples: [['מצלמה 1 — חניון', 'Hikvision DS-2CD2046', 'חניון תת-קרקעי', '4MP', 'NVR-01', '30']], empty: 4 }),
  spacer(),
  h2('מערכת אזעקה — אופציונלי'),
  kvTable(['לוח בקרה (דגם)', 'גלאים (סוג / כמות)', 'אזורים', 'חברת ניטור', 'טלפון מוקד', 'קוד דריכה — אחראי']),
]);

// 3. מערך הרשת והשרתים
S([
  h1('3. מערך הרשת והשרתים'),
  note('תשתית התקשורת, השרתים והאחסון של האתר.'),
  h2('3.1 קישוריות אינטרנט / WAN'),
  dataTable(['ספק (ISP)', 'סוג קו', 'מהירות (הורדה/העלאה)', 'IP ציבורי', 'נתב / CPE', 'חוזה / תמיכה'],
    [1.6, 1.3, 1.7, 1.5, 1.3, 1.6],
    { examples: [['בזק בינלאומי', 'סיב אופטי', '200/200 Mbps', '85.64.x.x', 'Fortinet 60F', '#IL-44213']], empty: 3 }),
  spacer(),
  h2('3.2 ציוד תקשורת'),
  para('מה לכלול:', { spacing: { after: 40 } }),
  bullet('חומות אש (Firewall)'), bullet('נתבים (Routers)'), bullet('מתגים (Switches)'),
  bullet('נקודות גישה אלחוטיות (AP) ובקר'), bullet('ארונות תקשורת ופאנלים'),
  spacer(80),
  dataTable(['רכיב', 'יצרן / דגם', 'תפקיד', 'כתובת ניהול (IP)', 'מיקום (ארון)', 'פירמוור'],
    [1.4, 1.6, 1.5, 1.5, 1.4, 1.2],
    { examples: [
      ['Firewall', 'Fortinet FortiGate 60F', 'חומת אש / שער', '192.168.1.1', 'ארון תקשורת ראשי', 'v7.2.5'],
      ['Core Switch', 'Cisco Catalyst 9200', 'ליבת רשת', '192.168.1.2', 'ארון תקשורת ראשי', '17.6'],
    ], empty: 5 }),
  spacer(),
  h2('3.3 שרתים'),
  dataTable(['שם שרת (Hostname)', 'תפקיד', 'פיזי / וירטואלי', 'מערכת הפעלה', 'מעבד / זיכרון / אחסון', 'כתובת IP', 'מארח / מיקום'],
    [1.5, 1.5, 1.2, 1.4, 1.8, 1.3, 1.3],
    { examples: [['GY-DC01', 'Domain Controller', 'וירטואלי (VMware)', 'Windows Server 2022', '4 vCPU / 16GB / 200GB', '192.168.1.10', 'ESXi-Host01']], empty: 5 }),
  spacer(),
  h2('3.4 וירטואליזציה ואחסון'),
  dataTable(['רכיב', 'יצרן / דגם', 'תפקיד', 'קיבולת / משאבים', 'כתובת ניהול', 'הערות'],
    [1.5, 1.6, 1.4, 1.7, 1.4, 1.6],
    { examples: [
      ['Host וירטואליזציה', 'Dell PowerEdge R650', 'מארח מכונות וירטואליות', '2×Xeon / 256GB / 4TB', '192.168.1.5', 'VMware ESXi'],
      ['אחסון רשת (NAS)', 'Synology RS1221+', 'גיבוי ושיתוף קבצים', '8×8TB (RAID6)', '192.168.1.6', '—'],
    ], empty: 3 }),
  spacer(),
  h2('3.5 כתובות IP ו-VLAN'),
  dataTable(['רשת / VLAN', 'טווח (Subnet)', 'Gateway', 'ייעוד', 'הקצאה'],
    [1.7, 2, 1.6, 2, 1.3],
    { examples: [
      ['VLAN 10 — משתמשים', '192.168.10.0/24', '192.168.10.1', 'תחנות עבודה', 'DHCP'],
      ['VLAN 20 — שרתים', '192.168.20.0/24', '192.168.20.1', 'שרתים', 'Static'],
    ], empty: 4 }),
  spacer(),
  h2('3.6 חדר תקשורת / שרתים'),
  kvTable(['מיקום החדר', 'מיזוג אוויר (סוג / גיבוי)', 'UPS (דגם / זמן גיבוי)', 'בקרת גישה לחדר', 'חיישני טמפרטורה / מים', 'כיבוי אש', 'מספר ארונות (וגובה U)', 'הארקה']),
  spacer(),
  h2('3.7 תרשים רשת'),
  box(['כאן יש לשבץ תרשים רשת עדכני של האתר', '(אינטרנט ← חומת אש ← מתגים ← שרתים / VLANs)']),
]);

// 4. תוכנות ורישוי
S([
  h1('4. תוכנות ורישוי'),
  note('מצאי התוכנה, הרישיונות ומנויי הענן באתר.'),
  para('מה לכלול:', { spacing: { after: 40 } }),
  bullet('מערכות הפעלה (שרתים ותחנות)'), bullet('תוכנות תשתית (AD, DNS, DHCP, Hypervisor)'),
  bullet('אפליקציות עסקיות'), bullet('אנטי-וירוס / EDR'),
  bullet('מנויי ענן / SaaS'), bullet('רישיונות גישה (CAL)'), bullet('כלי גיבוי וניטור'),
  spacer(80),
  dataTable(['תוכנה / שירות', 'יצרן', 'גרסה', 'סוג רישיון', 'כמות / מושבים', 'חידוש', 'ספק'],
    [1.7, 1.3, 1, 1.4, 1.4, 1.2, 1.2],
    { examples: [
      ['Microsoft 365 E3', 'Microsoft', '—', 'מנוי שנתי', '50', '01/2026', 'ספק X'],
      ['Windows Server', 'Microsoft', '2022', 'Volume + CAL', '5 + 50 CAL', '—', '—'],
    ], empty: 6 }),
]);

// 5. אבטחת מידע
S([
  h1('5. אבטחת מידע'),
  note('בקרות האבטחה, הגיבוי וההיערכות לאירוע באתר.'),
  h2('5.1 סקירת בקרות אבטחה'),
  note('סטטוס לכל בקרה: קיים / חלקי / חסר.'),
  dataTable(['בקרה', 'סטטוס', 'כלי / פרטים', 'אחראי'],
    [2.4, 1.4, 2.8, 1.7],
    { plain: [
      ['אנטי-וירוס / EDR', '', '', ''], ['חומת אש (Firewall)', '', '', ''],
      ['עדכוני אבטחה (Patching)', '', '', ''], ['גיבוי', '', '', ''],
      ['שחזור ו-DR', '', '', ''], ['הצפנת תחנות (BitLocker)', '', '', ''],
      ['אימות דו-שלבי (MFA)', '', '', ''], ['מדיניות סיסמאות', '', '', ''],
      ['ניהול הרשאות (Least Privilege)', '', '', ''], ['סינון דוא"ל / אנטי-ספאם', '', '', ''],
      ['סינון גלישה', '', '', ''], ['אבטחה פיזית', '', '', ''],
      ['ניטור ולוגים', '', '', ''], ['מודעות והדרכת עובדים', '', '', ''],
    ] }),
  spacer(),
  h2('5.2 גיבוי ושחזור'),
  kvTable(['כלי גיבוי', 'מה מגובה', 'תדירות', 'יעד גיבוי (מקומי/ענן/Offsite)', 'שמירה (Retention)', 'בדיקת שחזור אחרונה', 'יעד RTO', 'יעד RPO', 'אחראי']),
  spacer(),
  h2('5.3 ניהול משתמשים והרשאות'),
  dataTable(['קבוצה / תפקיד', 'הרשאות עיקריות', 'מערכת', 'אישור / אחראי'],
    [1.8, 2.6, 1.7, 1.7],
    { examples: [['IT-Admins', 'Domain Admin', 'Active Directory', 'מנהל מע׳ מידע']], empty: 4 }),
  spacer(),
  h2('5.4 תגובה לאירוע אבטחה'),
  kvTable(['גורם מטפל ראשון', 'איש קשר אבטחת מידע + טלפון', 'ספק חיצוני (SOC / IR)', 'נוהל דיווח', 'זמינות גיבוי לא-מקוון', 'איש קשר הנהלה']),
]);

// 6. הגנת סייבר
S([
  h1('6. הגנת סייבר'),
  note('היערכות הארגון להגנת סייבר אקטיבית — ניטור, תגובה לאירוע, חוסן ורגולציה (משלים את פרק אבטחת המידע).'),
  h2('6.1 בקרות הגנת סייבר מתקדמות'),
  note('סטטוס לכל בקרה: קיים / חלקי / חסר.'),
  dataTable(['בקרה', 'סטטוס', 'כלי / ספק', 'אחראי'],
    [2.4, 1.4, 2.8, 1.7],
    { plain: [
      ['הגנת קצה מתקדמת (EDR / XDR)', '', '', ''], ['חומת אש מתקדמת (NGFW) / IPS-IDS', '', '', ''],
      ['סגמנטציה של הרשת (VLAN / Microsegmentation)', '', '', ''], ['ניהול פגיעויות וסריקות', '', '', ''],
      ['הגנה מפני כופרה (Anti-Ransomware)', '', '', ''], ['גיבוי מנותק / בלתי-ניתן-לשינוי', '', '', ''],
      ['ניהול הרשאות-על (PAM)', '', '', ''], ['הגנת דוא"ל וזיהוי פישינג מתקדם', '', '', ''],
      ['סינון DNS / גלישה', '', '', ''], ['מודיעין איומים (Threat Intelligence)', '', '', ''],
      ['הקשחת מערכות (Hardening / CIS)', '', '', ''], ['גיבוי הגדרות ציוד תקשורת', '', '', ''],
    ] }),
  spacer(),
  h2('6.2 ניטור ותגובה (SOC / SIEM)'),
  kvTable(['מוקד ניטור (SOC) — פנימי / ספק', 'כלי SIEM / ניטור', 'שעות פעילות (24/7?)', 'ערוץ דיווח אירוע', 'זמן תגובה (SLA)', 'מקורות לוגים', 'שמירת לוגים (תקופה)']),
  spacer(),
  h2('6.3 תגובה לאירוע סייבר ודיווח רגולטורי'),
  kvTable(['נוהל תגובה לאירוע סייבר (קיים?)', 'צוות תגובה (CSIRT) ואנשי קשר', 'דיווח למערך הסייבר הלאומי (CERT-IL · 119)', 'דיווח לרשות להגנת הפרטיות', 'גיבוי לא-מקוון זמין לשחזור', 'ביטוח סייבר (חברה / פוליסה)', 'איש קשר חירום (ספק IR)']),
  spacer(),
  h2('6.4 בדיקות חוסן וסקרי סיכונים'),
  dataTable(['סוג בדיקה', 'מבצע / ספק', 'תאריך אחרון', 'ממצאים פתוחים', 'יעד לטיפול'],
    [2.2, 1.8, 1.4, 1.5, 1.3],
    { examples: [['מבחן חדירה (Penetration Test)', 'ספק חיצוני', '03/2026', '2 (בינוני)', '06/2026']],
      plain: [
        ['סקר סיכוני סייבר', '', '', '', ''], ['תרגיל פישינג', '', '', '', ''],
        ['בדיקת התאוששות (DR Drill)', '', '', '', ''], ['סקר ארכיטקטורת הגנה', '', '', '', ''],
      ] }),
  spacer(),
  h2('6.5 ממשל סייבר, מודעות ורגולציה'),
  kvTable(['ממונה הגנת סייבר / אחראי', 'מתודולוגיה / תקן (ISO 27001 / NIST / מתודולוגיית הגנת סייבר)', 'הדרכות מודעות סייבר (תדירות)', 'תרגילי פישינג (תדירות)', 'נכסי מידע קריטיים (BIA)', 'עמידה בתקנות הגנת הפרטיות', 'מדיניות ונהלי סייבר מאושרים']),
]);

// 7. ספקים וחוזי תמיכה
S([
  h1('7. ספקים וחוזי תמיכה'),
  note('ספקי השירות, אנשי הקשר ותנאי ה-SLA.'),
  dataTable(['ספק', 'תחום שירות', 'איש קשר', 'טלפון / דוא"ל', 'חוזה / SLA', 'תוקף'],
    [1.5, 1.5, 1.5, 1.9, 1.3, 1.1],
    { examples: [['חברת תקשורת Y', 'תשתיות רשת', 'דנה לוי', '03-1234567 / dana@y.co.il', '#SLA-204 · 4h', '12/2026']], empty: 5 }),
]);

// 8. אנשי קשר ומדרג הסלמה
S([
  h1('8. אנשי קשר ומדרג הסלמה'),
  note('רמת הסלמה 1 = ראשונה לפנייה.'),
  dataTable(['שם', 'תפקיד', 'ארגון / מחלקה', 'טלפון', 'דוא"ל', 'הסלמה'],
    [1.7, 1.6, 1.6, 1.3, 2, 0.9],
    { examples: [['ישראל ישראלי', 'מנהל מע׳ מידע', 'גב-ים — IT', '050-0000000', 'israel@gav-yam.co.il', '1']], empty: 5 }),
]);

// 9. נספחים
S([
  h1('9. נספחים'),
  note('צרפו את המסמכים הבאים כנספחים לתיק.'),
  bullet('נספח א׳ — תרשים רשת מפורט'),
  bullet('נספח ב׳ — תרשים מיקומי ציוד / קומות'),
  bullet('נספח ג׳ — צילומי חדר שרתים וארונות תקשורת'),
  bullet('נספח ד׳ — מסמכי ספקים וחוזים'),
  bullet('נספח ה׳ — נהלים רלוונטיים'),
  spacer(120),
  callout('הערת אבטחה חשובה', [
    'אין לשמור סיסמאות, מפתחות הצפנה או קודי גישה במסמך זה.',
    'נהלו אותם בכספת סיסמאות / מאגר מאובטח נפרד עם בקרת גישה.',
  ], 'FCE9E9'),
]);

// ---------- document ----------
const doc = new Document({
  creator: 'גב-ים — מערכות מידע',
  title: 'תיק אתר — מערכות מידע',
  description: 'תבנית-אב לתיק אתר מערכות מידע',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: C.primaryDark },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: FONT, color: C.primary },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{
      reference: 'bul',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT,
        style: { paragraph: { indent: { right: 480, hanging: 260 } } } }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          bidirectional: true, alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.primary, space: 3 } },
          children: [run('תיק אתר — מערכות מידע', { size: 16, bold: true, color: C.primaryDark })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          bidirectional: true, alignment: AlignmentType.CENTER,
          children: [
            run('עמוד ', { size: 16, color: C.note }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.note }),
            run(' מתוך ', { size: 16, color: C.note }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: C.note }),
            run('   ·   סיווג: לשימוש פנימי', { size: 16, color: C.note }),
          ],
        })],
      }),
    },
    children: [...cover, ...toc, ...body],
  }],
});

const OUT = path.join(__dirname, 'תיק אתר - מערכות מידע (תבנית-אב).docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('OK wrote ' + OUT + ' (' + buf.length + ' bytes)');
});
