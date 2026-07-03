# גיבוי לילי — מדריך הקמה (Power Automate)

מדריך שלב-אחר-שלב להקמת ה-flow שמגבה כל לילה את נתוני "תיק אתר".

**מה זה עושה:** כל לילה ב-02:00 מעתיק את כל קובצי `‎*.json` משורש ספריית `TikAtarData` לתוך `backups/<יום-בחודש>/` באותה ספרייה. שם התיקייה הוא היום-בחודש (`01`–`31`), כך שתמיד יש את ~30 הימים האחרונים והתיקיות נדרסות אוטומטית בחודש הבא — בלי צורך במחיקה.

**למה מספיק להעתיק רק את ה-JSON:** כל הקבצים המצורפים (תמונות / Visio / PDF) מאוחסנים base64 בתוך קובץ ה-JSON של האתר. אין קבצים נפרדים לגבות.

---

## דרישות מקדימות

- חשבון עם הרשאת **כתיבה** לספריית `TikAtarData` (עדיף חשבון שירות ייעודי — אם החשבון שמקים את ה-flow יושבת, ה-flow ייעצר).
- רישיון Power Automate (כלול ברוב חבילות Microsoft 365). כל הפעולות כאן הן **סטנדרטיות** (Standard) — אין צורך במחבר Premium.
- פרטי היעד (כבר מוגדרים במערכת):
  - **Site Address:** `https://gavyamcoil1.sharepoint.com/sites/GavYamPortal/IT`
  - **Library:** `TikAtarData`

---

## שלב 0 — יצירת ה-flow

1. היכנס ל-<https://make.powerautomate.com> עם חשבון היעד.
2. בתפריט השמאלי: **Create** → **Scheduled cloud flow**.
3. **Flow name:** `תיק אתר — גיבוי לילי`
4. **Starting:** התאריך של היום, שעה `02:00 AM`.
5. **Repeat every:** `1` / `Day`.
6. לחץ **Create**. זה יוצר את טריגר ה-**Recurrence**.

## שלב 1 — כוונון הטריגר (Recurrence)

1. לחץ על שלב ה-**Recurrence** לפתיחה.
2. **Show advanced options** → **Time zone:** `(UTC+02:00) Jerusalem`.
3. ודא: **At these hours** = `2`, **At these minutes** = `0`.

> אזור הזמן מטפל אוטומטית בשעון קיץ/חורף.

## שלב 2 — משתנה עם היום-בחודש

1. **+ New step** → חפש `Initialize variable`.
2. **Name:** `dayFolder`
3. **Type:** `String`
4. **Value:** לחץ בשדה → לשונית **Expression** → הדבק:
   ```
   formatDateTime(convertFromUtc(utcNow(),'Israel Standard Time'),'dd')
   ```
   לחץ **OK**. (התוצאה היא היום-בחודש בשתי ספרות, למשל `04`.)

## שלב 3 — יצירת תיקיית היעד

1. **+ New step** → חפש `Create new folder` (מחבר **SharePoint**).
2. **Site Address:** בחר מהרשימה את `.../sites/GavYamPortal/IT`.
3. **List or Library:** `TikAtarData`.
4. **Folder Path:** הקלד `backups/` ואז מהתוכן הדינמי הוסף את `dayFolder`. התוצאה:
   ```
   backups/@{variables('dayFolder')}
   ```
   > בהרצה הראשונה זה יוצר גם את `backups` וגם את תיקיית היום.

## שלב 4 — שליפת כל הקבצים בספרייה

1. **+ New step** → חפש `Get files (properties only)` (SharePoint).
2. **Site Address:** אותו site.
3. **Library Name:** `TikAtarData`.
   > אל תגדיר "Limit Entries to Folder" — אנחנו רוצים את השורש.

## שלב 5 — סינון לקובצי ה-JSON בשורש בלבד

1. **+ New step** → חפש `Filter array`.
2. **From:** מהתוכן הדינמי בחר **value** של השלב `Get files (properties only)`.
3. לחץ **Edit in advanced mode** והדבק בדיוק:
   ```
   @and(equals(item()?['{IsFolder}'], false), endsWith(item()?['{Name}'], '.json'), not(contains(item()?['{Path}'], '/backups/')))
   ```
   > זה משאיר רק קבצים (לא תיקיות) שמסתיימים ב-`.json` ושאינם בתוך `backups/` — כך לא מגבים את הגיבויים.

## שלב 6 — העתקת כל קובץ לתיקיית הגיבוי

1. **+ New step** → חפש `Apply to each`.
2. **Select an output:** מהתוכן הדינמי בחר **Body** של השלב `Filter array`.
3. בתוך הלולאה: **Add an action** → `Copy file` (SharePoint).
   - **Current Site Address:** אותו site.
   - **File to Copy:** מהתוכן הדינמי בחר **Identifier** (של הפריט הנוכחי בלולאה).
   - **Destination Site Address:** אותו site.
   - **Destination Folder:** הקלד את הנתיב:
     ```
     /TikAtarData/backups/@{variables('dayFolder')}
     ```
   - **If another file is already there:** `Replace`.

## שלב 7 — טיפול בתיקייה שכבר קיימת (חד-פעמי)

מכיוון שאותה תיקיית-יום חוזרת בחודש הבא, `Create new folder` עלול להחזיר שגיאה "already exists" ולעצור את ה-flow. כדי שימשיך בכל מקרה:

1. לחץ על שלב `Get files (properties only)` → תפריט `⋯` → **Configure run after**.
2. סמן גם **is successful** וגם **has failed** עבור `Create new folder`. **Done**.

> כך גם אם יצירת התיקייה "נכשלת" כי היא כבר קיימת — ההעתקה ממשיכה כרגיל.

## שלב 8 — שמירה ובדיקה

1. **Save**.
2. **Test** → **Manually** → **Test** → **Run flow**.
3. עבור לספרייה ב-SharePoint → `backups/<היום-בחודש>/` וּודא שיש שם קובץ `.json` אחד לכל אתר.
4. למחרת בבוקר ודא שהריצה המתוזמנת רצה (בהיסטוריית ה-flow: **28-day run history**).

---

## שחזור מגיבוי

1. פתח את `TikAtarData/backups/<יום>/` והורד את קובץ ה-`{code}.json` הרצוי.
2. **אפשרות א' (החלפה ישירה):** העלה אותו חזרה לשורש `TikAtarData` (מחליף את הקובץ הפגום).
3. **אפשרות ב' (דרך האפליקציה):** במערכת → **ייבוא** של קובץ ה-JSON.

## פתרון תקלות

- **`Copy file` נכשל על "File to Copy":** אם `Identifier` לא עובד, נסה במקומו את התוכן הדינמי **Full Path** (`{FullPath}`) של הפריט.
- **הרשאות (403):** ודא שהחשבון שמריץ את ה-flow הוא חבר בקבוצה המורשית לעריכה של הספרייה.
- **התראות כשל:** Power Automate שולח מייל לבעל ה-flow כשריצה נכשלת. אפשר גם: **Settings** של ה-flow → כיבוי/כיוונון.
- **החלפת החשבון המריץ:** אם צריך להעביר בעלות, השתמש ב-**Share** / **Run-only users**, או בנה מחדש עם חשבון השירות.

---

*עודכן: שלב 3 במפת השיפורים. ראה [`docs/superpowers/specs/2026-07-04-phase3-nightly-backup-design.md`](superpowers/specs/2026-07-04-phase3-nightly-backup-design.md).*
