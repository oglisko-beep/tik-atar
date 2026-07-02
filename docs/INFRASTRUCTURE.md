# תיק אתר — מסמך תשתית (Infrastructure)

מסמך תפעולי ל‑IT: היכן המערכת רצה, ממה היא מורכבת, ואיך לתחזק/לשחזר.

> **מזהים רגישים** (clientId, tenantId, מזהה מנוי, טוקן פריסה) **אינם במסמך זה** — הריפו ציבורי. הם נמצאים ב‑`app/.env` (מקומי, gitignored), ב‑GitHub repo secrets, ובפורטלים של Azure/Entra. ריכוז שלהם נמצא בפתק הפרטי `INFRA-SECRETS.local.md` (לא נשמר ב‑git) — שמרו אותו בכספת/מאגר פנימי.

---

## 1. סקירה

אפליקציית **React 18 + Vite + TypeScript** — SPA סטטית שרצה **בדפדפן** של המשתמש. אין שרת אפליקציה ואין בסיס נתונים לתחזק ("serverless"): הפרונטאנד מתארח ב‑Azure, ההתחברות דרך Microsoft Entra ID, והנתונים נשמרים ישירות ב‑SharePoint דרך Microsoft Graph.

| רכיב | היכן |
|------|------|
| כתובת ראשית | **https://tikatar.gav-yam.co.il** |
| כתובת Azure (ברירת מחדל) | https://icy-ground-0f57e4e03.7.azurestaticapps.net |
| קוד מקור | https://github.com/oglisko-beep/tik-atar |
| אירוח | Azure Static Web Apps |
| התחברות | Microsoft Entra ID (SSO) |
| נתונים | SharePoint — ספריית `TikAtarData` |
| CI/CD | GitHub Actions (פריסה אוטומטית) |

---

## 2. אירוח — Azure Static Web Apps

| פרט | ערך |
|------|------|
| שם המשאב (SWA) | `tik-atar` |
| קבוצת משאבים | `rg-tik-atar` |
| אזור | West Europe (Amsterdam) |
| Hostname ברירת מחדל | `icy-ground-0f57e4e03.7.azurestaticapps.net` |
| מזהה מנוי / Resource ID | ראו פתק פרטי |

הבנייה מתבצעת ב‑GitHub Actions (Oryx כבוי — מעלים `app/dist` מוכן). קובצי תצורה: `app/public/staticwebapp.config.json` (CSP `frame-ancestors` ל‑SharePoint, ניתוב SPA fallback).

---

## 3. התחברות — Microsoft Entra ID

- רישום אפליקציה מסוג **SPA (Authorization Code + PKCE)**, חד‑דיירי (`AzureADMyOrg`).
- **הרשאות (delegated):** `Sites.ReadWrite.All` + `User.Read` — **הסכמת מנהל ניתנה לכל הארגון** (AllPrincipals). אף משתמש לא רואה חלון הסכמה.
- **Redirect URIs (SPA):**
  - `https://tikatar.gav-yam.co.il/`
  - `https://icy-ground-0f57e4e03.7.azurestaticapps.net/`
  - `http://localhost:5173/` (פיתוח)
- MSAL רץ בדפדפן; `redirectUri` = `window.location.origin + '/'`.
- clientId / tenantId / Object ID של האפליקציה — בפתק הפרטי.

**להוספת כתובת חדשה (redirect URI):** Entra → App registrations → האפליקציה → Authentication → Single-page application → Add URI.

---

## 4. נתונים — SharePoint

| פרט | ערך |
|------|------|
| אתר | `gavyamcoil1.sharepoint.com/sites/GavYamPortal/IT` |
| ספרייה | `TikAtarData` |
| מבנה | קובץ **JSON לכל אתר** (תיק) |
| גישה | Microsoft Graph מהדפדפן (delegated — כל משתמש בשמו) |

**מודל הרשאות עריכה:** נקבע על‑ידי הרשאות ה‑SharePoint על הספרייה, לא על‑ידי האפליקציה. המודל הנבחר: **קבוצה מורשית עורכת, כל השאר קריאה בלבד**. משתמש בלי הרשאת כתיבה → שמירה מחזירה 403 → האפליקציה נועלת עריכה ומציגה "צפייה בלבד".

**להוספת/הסרת עורך:** ספריית `TikAtarData` → Settings → *Library settings* → *Permissions* → *Stop Inheriting Permissions* → קבוצת Members = **Read**, קבוצת העורכים (או משתמש) = **Edit/Contribute** (*Grant Permissions*).

**גיבוי/שחזור נתונים:** SharePoint מנהל **היסטוריית גרסאות** לכל קובץ (שחזור דרך *Version History*), וסל מיחזור. בנוסף, האפליקציה תומכת ב**ייצוא/ייבוא JSON** (תפריט ⋯) לגיבוי ידני.

---

## 5. DNS

`tikatar.gav-yam.co.il` → **CNAME** → `icy-ground-0f57e4e03.7.azurestaticapps.net`

- **ציבורי (סמכותי):** NetVision (`dns/nypop/eupop.netvision.net.il`) — מנוהל דרך תמיכת NetVision.
- **פנימי:** שרת Windows DNS `TOHA-1` (אזור `gav-yam.co.il`) — **split‑brain**, לכן הרשומה קיימת בשני המקומות לאותו יעד.
- **SSL:** מונפק ומתחדש אוטומטית על‑ידי Azure.

**להוספת דומיין מותאם ב‑Azure:** SWA → Custom domains → Add → הזן את השם → Azure מאמת מול ה‑DNS הציבורי ומנפיק SSL. חובה שהרשומה תהיה ב‑DNS **הציבורי**.

---

## 6. CI/CD — GitHub Actions

- Workflow: `.github/workflows/azure-static-web-apps-icy-ground-0f57e4e03.yml`
- **טריגר:** `push` לענף `main` (וגם PRs).
- **זרימה:** `npm ci` → כותב `app/.env` מ‑repo secrets → `npm run build` → מעלה `app/dist` ל‑Azure SWA.
- **Repo secrets (GitHub → Settings → Secrets and variables → Actions):**
  - `VITE_AAD_CLIENT_ID`
  - `VITE_AAD_TENANT_ID`
  - `AZURE_STATIC_WEB_APPS_API_TOKEN_ICY_GROUND_0F57E4E03` (טוקן הפריסה של ה‑SWA)

**לפרוס שינוי:** פשוט `git push` ל‑main → ה‑Action בונה ופורס תוך ~1–2 דקות. אין פעולה ידנית ב‑Azure.

**לשחזר/לפרוס מחדש:** הריפו הוא מקור האמת. הרצה מחדש של ה‑Action (Re‑run) בונה ומעלה מחדש. אם צריך טוקן פריסה חדש: SWA → *Manage deployment token* → עדכן את ה‑secret.

---

## 7. פיתוח מקומי

```bash
git clone https://github.com/oglisko-beep/tik-atar.git
cd tik-atar/app
npm ci
# צור app/.env עם VITE_AAD_CLIENT_ID / VITE_AAD_TENANT_ID / VITE_SP_SITE / VITE_SP_LIBRARY
#   (הערכים בפתק הפרטי INFRA-SECRETS.local.md)
npm run dev      # http://localhost:5173
npm run test     # בדיקות (Vitest)
npm run build    # בנייה ל-app/dist
```

Node 20+. `app/.env` הוא **gitignored** — לעולם לא נכנס ל‑git.

---

## 8. יכולות המערכת (למי ששואל "מה זה עושה")

תיק אתר אינטראקטיבי ל‑IT: 9 פרקים (ציוד קצה, רשת ושרתים, אבטחת מידע, סייבר, ספקים, אנשי קשר, נספחים ועוד) · ריבוי אתרים · אחוז השלמה · חיפוש · יצוא PDF/Word · צירוף קבצים (תמונות, Visio, PDF) · **בחירת פרקים/תתי‑פרקים לכל אתר** · **דשבורד מנהלים** חוצה‑אתרים · מצב משותף עם SSO והרשאות עריכה דרך SharePoint.

---

## 9. מדיניות אבטחה

- **מזהי הארגון (clientId, tenantId) לעולם לא נשמרים בריפו הציבורי.** הם ב‑`app/.env` (מקומי) וב‑GitHub secrets בלבד; מוזרקים בזמן build דרך Vite `define`.
- הנתונים נשארים בתוך ה‑SharePoint הארגוני — לא אצל צד שלישי.
- אין לשמור סיסמאות/מפתחות בתוך תוכן התיק (יש התראה על כך בנספחים).
