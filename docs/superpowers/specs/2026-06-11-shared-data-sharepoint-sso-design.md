# נתונים משותפים ב-SharePoint עם SSO — מסמך עיצוב (Spec)

> תאריך: 2026-06-11 · סטטוס: ממתין לאישור spec
> הרחבה לאפליקציית "תיק אתר אינטראקטיבי" — מ-localStorage לכל-משתמש אל **נתונים משותפים** ב-SharePoint.

## 1. רקע ומטרה
היום כל משתמש שומר בדפדפן שלו (localStorage) — אין שיתוף. המטרה: **עורך יחיד ממלא, צופים רבים רואים את אותם נתונים**, חי ומיידי, עם **SSO** (זהות הארגון, Entra ID) — בלי backend משלנו (SharePoint הוא ה-store).

## 2. דרישות (מהסיעור-מוחות)
- **דפוס:** עורך יחיד + צופים רבים → last-write-wins, ללא קונפליקטים מורכבים.
- **חיות:** מיידי — צופה רואה עדכונים ללא פעולת פרסום (טעינה + רענון תקופתי).
- **SSO:** מי שמחובר ל-M365 נכנס בשקט.
- **Admin זמין** ל-app registration + admin-consent.

## 3. ארכיטקטורה
```
משתמש (M365) → MSAL.js (SSO, Entra) → Access Token (Graph)
   → Microsoft Graph → ספריית מסמכים ב-SharePoint (קובץ JSON לכל אתר) → האפליקציה
```
- ללא שרת משלנו. SharePoint = מסד הנתונים. Entra = ההזדהות.
- **חובה Microsoft Graph** (לא SharePoint REST) — רק Graph תומך ב-CORS מדפדפן ממקור ה-SWA (`azurestaticapps.net`).
- האפליקציה ממשיכה להתארח על Azure SWA הקיים (גישה ישירה לכתובת; הטמעת SharePoint נדחתה בנפרד).

## 4. הזדהות (SSO)
- **App Registration** ב-Entra, סוג **SPA (Single-page application)**.
  - Redirect URI = `https://icy-ground-0f57e4e03.7.azurestaticapps.net/` (וגם `http://localhost:5173/` לפיתוח).
  - הרשאות Graph **מואצלות (delegated):** `Sites.ReadWrite.All` + `User.Read`.
  - **admin-consent** חד-פעמי (אתה/ה-admin).
  - *(אופציה מצמצמת יותר: `Sites.Selected` + מתן גישה לאתר הספציפי בלבד — least privilege; נבחר ב-`Sites.ReadWrite.All` לפשטות, וההרשאות בפועל נשלטות ע"י הרשאות הספרייה.)*
- **MSAL Browser (`@azure/msal-browser`):** `ssoSilent` → אם יש session פעיל, אין מסך התחברות; נפילה ל-`loginRedirect`.
- `Client ID` ו-`Tenant ID` נשמרים כקונפיג סביבה (`.env` / config), לא בקוד-קשיח.

## 5. מודל הנתונים — ספריית מסמכים
- אתר: `https://gavyamcoil1.sharepoint.com/sites/GavYamPortal/IT/`
- ספרייה ייעודית: **`TikAtarData`** (תיווצר באתר).
- **קובץ JSON לכל אתר-תיק** (`<קוד-אתר>.json`, למשל `GY-TLV-01.json`), בפורמט **זהה לייצוא/ייבוא הקיים** (`SiteData`). תומך בתמונות (base64) — אין מגבלת גודל עמודה.
- קובץ אינדקס קל (אופציונלי) או פשוט `children` של הספרייה = רשימת האתרים.

## 6. גישת Graph (endpoints)
- זיהוי אתר: `GET /v1.0/sites/gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT`
- זיהוי הספרייה (drive): `GET /v1.0/sites/{siteId}/drives` → ה-drive בשם `TikAtarData`.
- רשימת אתרים: `GET /sites/{siteId}/drives/{driveId}/root/children`
- קריאה: `GET /sites/{siteId}/drives/{driveId}/root:/{name}.json:/content`
- כתיבה: `PUT /sites/{siteId}/drives/{driveId}/root:/{name}.json:/content` (יוצר/מעדכן), עם **`If-Match: <eTag>`** למניעת דריסה.

## 7. סנכרון ו"חיות"
- **בעלייה:** טען רשימת קבצים → טען את האתר הפעיל.
- **רענון תקופתי:** poll כל ~45 שניות (+ כפתור "רענן ידני") → צופה פתוח מתעדכן. (Webhook/SignalR — YAGNI כרגע.)
- **כתיבת עורך:** debounced (~1.5 שניות) → `PUT` עם eTag. אם eTag לא תואם (השתנה בינתיים) → טען מחדש והודע ("הנתונים עודכנו במקום אחר").

## 8. תפקידים (עורך / צופה)
**בקרת הגישה = הרשאות הספרייה** (נקי ומאובטח, ללא לוגיקת תפקידים בקוד):
- עורך = הרשאת **Contribute/Edit** על הספרייה.
- צופים = **Read**.
- בכתיבה, אם Graph מחזיר **403** → האפליקציה עוברת ל**מצב צפייה-בלבד** (שדות נעולים, באנר "צפייה בלבד").

## 9. שינויים באפליקציה
- **`src/remote/` חדש:** `auth.ts` (MSAL/SSO), `graph.ts` (קריאה/כתיבה Graph), `sharepointStore.ts` (load/save/list מול הספרייה), `config.ts` (clientId/tenantId/siteUrl/library).
- **`StoreContext`:** מקור-אמת ניתן-להחלפה — **"מקומי" (localStorage, כמו היום) ↔ "משותף (SharePoint)"**. מתג ב-Header. במצב משותף: load מ-Graph, autosave → Graph, localStorage = cache/אופליין.
- שכבת ה-engine/schema/print/docx — **ללא שינוי** (הם עובדים על אותו `SiteData`).
- env: `.env` עם `VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`, `VITE_SP_SITE`, `VITE_SP_LIBRARY` (מוזרק ב-build; לא סודי — SPA public client).

## 10. טיפול בשגיאות / קצה
| מצב | התנהגות |
|------|---------|
| לא מחובר | `ssoSilent` → אם נכשל, `loginRedirect` |
| אין הרשאת כתיבה (403) | מצב צפייה-בלבד + באנר |
| אופליין / Graph לא זמין | נפילה ל-cache מקומי (localStorage) + באנר "לא מחובר" |
| קונפליקט eTag | טען מחדש + הודעה |
| הספרייה/אתר לא נמצאו | הודעת שגיאה ברורה עם הנחיית הקמה |

## 11. הקמה חד-פעמית (admin)
1. צור ספרייה `TikAtarData` באתר `.../sites/GavYamPortal/IT/`.
2. App Registration (SPA) + Redirect URIs + הרשאות `Sites.ReadWrite.All`,`User.Read` + **admin-consent**.
3. הרשאות ספרייה: עורך=Contribute, צופים=Read.
4. הזן `clientId`/`tenantId` ל-`.env` → build → deploy.
*(אדריך צעד-צעד או נריץ דרך `az` / Graph CLI.)*

## 12. בדיקות
- יחידה: `sharepointStore` (build/parse של נתיבי Graph, מיפוי SiteData↔קובץ, לוגיקת eTag) עם Graph ממוקא (mock fetch).
- ידני: SSO שקט · קריאה/כתיבה · רענון רואה עדכון של עורך אחר · 403 → צפייה-בלבד · אופליין → cache.

## 13. הגדרת "סיום" (Acceptance)
- מי שמחובר ל-M365 נכנס ב-SSO ללא מסך התחברות.
- העורך שומר → תוך ≤דקה צופה (אחר, פתוח) רואה את העדכון.
- צופה ללא הרשאת כתיבה → צפייה-בלבד.
- אופליין → האפליקציה עדיין נטענת מ-cache.
- תמונות נשמרות ומשותפות.
- מצב "מקומי" הישן עדיין עובד (לא נשבר).

## 14. סיכונים / החלטות פתוחות
- **"IT" — subsite או תיקייה?** ניפתר בזמן מימוש (ננסה נתיב subsite, נפילה לאתר-האב).
- **גודל קובץ עם תמונות רבות** — ספרייה ללא מגבלת עמודה, אך קבצים גדולים מאטים load; נשקול הפרדת תמונות בעתיד אם צריך.
- **Sites.ReadWrite.All רחב** — חלופה מצמצמת `Sites.Selected` אם ה-admin יעדיף.
- **הטמעת iframe ב-SharePoint + SSO** — נדחתה; גישה ישירה לכתובת ה-SWA עובדת חלק.
