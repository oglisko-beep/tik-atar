# אירוח ב-Azure Static Web Apps + הטמעה ב-SharePoint

מדריך להעלאת התיק כ-**אתר סטטי מנוהל** ב-Azure, עם פריסה אוטומטית מהריפו והטמעה בעמוד SharePoint.
*(אין backend — האפליקציה סטטית; הנתונים בדפדפן של כל משתמש.)*

---

## חלק א׳ — יצירת ה-Static Web App (חד-פעמי, בפורטל Azure)

1. היכנס ל-**[portal.azure.com](https://portal.azure.com)** → **Create a resource** → חפש **Static Web App** → **Create**.
2. מלא:
   | שדה | ערך |
   |------|------|
   | Subscription | המנוי הארגוני שלך |
   | Resource Group | חדש: `rg-tik-atar` |
   | Name | `tik-atar` |
   | Plan type | **Free** |
   | Region | קרוב (למשל West Europe) |
   | Source | **GitHub** → Authorize → Org `oglisko-beep`, Repo `tik-atar`, Branch `main` |
3. **Build Details** — בחר **Custom** ומלא **בדיוק**:
   | שדה | ערך |
   |------|------|
   | App location | `app` |
   | Api location | *(השאר ריק)* |
   | Output location | `dist` |
4. **Review + Create** → **Create**.

Azure יוסיף אוטומטית workflow לריפו (`.github/workflows/azure-static-web-apps-*.yml`) + secret, ויפרוס. תוך ~2 דקות האתר חי בכתובת:
`https://<random-name>.azurestaticapps.net`
*(הכתובת המדויקת מופיעה ב-Overview של המשאב.)*

> קובץ `app/public/staticwebapp.config.json` (כבר בריפו) מטפל ב-SPA fallback, כותרות אבטחה, והרשאת הטמעה מ-SharePoint.

---

## חלק ב׳ — הטמעה בעמוד SharePoint

1. ב-SharePoint: ערוך עמוד → **+** → רכיב **"Embed" / "הטמעה"**.
2. הדבק (החלף את הכתובת בכתובת ה-SWA שלך):
   ```html
   <iframe src="https://<your-app>.azurestaticapps.net/" width="100%" height="900" style="border:0"></iframe>
   ```
3. **פרסם**. העובדים נכנסים לעמוד ה-SharePoint ומשתמשים בתיק בתוכו.

**אם SharePoint חוסם את ההטמעה** ("domain not allowed"):
admin צריך להוסיף את `azurestaticapps.net` ל-**SharePoint Admin Center → Settings → אתרי הטמעה מורשים** (Embed / HTML Field Security). זה הצעד היחיד שעשוי לדרוש admin.

---

## חלק ג׳ — (אופציונלי) גישה לעובדי הארגון בלבד (Entra ID)

האפליקציה עצמה **לא מכילה נתונים** (הכול בדפדפן), אז חשיפת התבנית הריקה היא סיכון נמוך — לכן כברירת מחדל אין דרישת התחברות, וזה מאפשר הטמעה חלקה ב-iframe.

אם בכל זאת תרצה לחסום לעובדי הארגון בלבד, הוסף ל-`staticwebapp.config.json` את הבלוק:
```json
"routes": [
  { "route": "/*", "allowedRoles": ["authenticated"] }
],
"responseOverrides": {
  "401": { "statusCode": 302, "redirect": "/.auth/login/aad" }
}
```
- להגבלה ל-**tenant שלכם בלבד** (ולא כל חשבון Microsoft): הגדר **Custom Azure AD provider** עם ה-Tenant ID שלכם — ראה [docs](https://learn.microsoft.com/azure/static-web-apps/authentication-custom).
- ⚠️ **ניואנס iframe:** דף ההתחברות של מיקרוסופט חוסם הצגה ב-iframe. אם העובד כבר מחובר ל-M365 בדפדפן — ההזדהות עוברת בשקט (SSO) וההטמעה עובדת. בכניסה ראשונה ללא session: שיפתחו פעם אחת את כתובת ה-SWA **ישירות** (לא ב-iframe) כדי להתחבר, ואז ההטמעה ב-SharePoint תעבוד.
- **חלופה ללא ניואנסים:** אם רוצים גישה פנימית בלבד בלי auth — ארח על **IIS פנימי** (ברשת הארגונית, נגיש רק מבפנים). ראה `DEPLOY.md`.

---

## עדכונים
כל `git push` ל-`main` → Azure בונה ומפרס מחדש אוטומטית (כמו GitHub Pages). אין צורך בפעולה ידנית.

## חלופת CLI (למתקדמים)
במקום הפורטל אפשר: `az staticwebapp create` + חיבור הריפו. הפורטל פשוט יותר ומומלץ.
