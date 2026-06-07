# פריסה — תיק אתר אינטראקטיבי

האפליקציה היא **אתר סטטי** (build של Vite). היא נבנית לתיקיית `app/dist` ורצה בכל שרת קבצים.

## בנייה
```powershell
cd app
npm install      # פעם ראשונה בלבד
npm run build    # פלט: app/dist
```

> ⚠️ **חשוב:** יש לארח מעל **HTTP** (שרת אינטרנט), ולא לפתוח את `index.html` ישירות מהדיסק (`file://`).
> ייצוא ה-Word טוען מודול בעצלתיים (dynamic import) שחסום תחת `file://`.

## אפשרויות אירוח

### א. IIS (Windows) — הנפוץ בארגון
1. צרו אתר/תיקייה ב-IIS.
2. העתיקו את **כל תוכן** `app/dist` ל-root של האתר.
3. קובץ `web.config` כבר כלול ב-build (MIME ו-Cache מוגדרים).

### ב. nginx / Apache
העתיקו את תוכן `app/dist` ל-web root (למשל `/var/www/tik-atar`). אין צורך בהגדרות מיוחדות.

### ג. הרצה מהירה ברשת המקומית (LAN)
```powershell
cd app
npm run preview -- --host
```
מציג כתובת ברשת המקומית (למשל `http://192.168.x.x:4173`) לשיתוף מיידי.

### ד. Docker (נייד לכל סביבה)
```powershell
docker build -t tik-atar app/
docker run -p 8080:80 tik-atar      # http://localhost:8080
```

### ה. GitHub Pages (אירוח ענן אוטומטי) — ✅ מוגדר
ה-workflow מוכן ב-`.github/workflows/deploy.yml`: בכל `push` ל-`main` הוא בונה את `app/` ומפרסם אוטומטית.

**שלבים חד-פעמיים (דורשים חשבון GitHub):**
1. צרו ריפו ריק ב-GitHub (ציבורי — Pages חינמי דורש ריפו ציבורי).
2. חברו את ה-remote ודחפו:
   ```powershell
   git -C C:\ITSiteProfolio remote add origin https://github.com/<user>/<repo>.git
   git -C C:\ITSiteProfolio push -u origin main
   ```
3. ב-GitHub: **Settings → Pages → Source: GitHub Actions**.
4. ה-Action ירוץ ויפרסם. הכתובת תהיה: `https://<user>.github.io/<repo>/`

עדכונים עתידיים: כל `git push` ל-`main` בונה ומפרסם מחדש אוטומטית.

> ⚠️ GitHub Pages חושף את האתר **לאינטרנט הציבורי**. האפליקציה עצמה אינה מכילה נתונים (כל הנתונים נשמרים בדפדפן של כל משתמש) — אך אם נדרש פנימי בלבד, העדיפו IIS/Docker.

## עדכון גרסה
ערכו את המקור ב-`app/src` → `npm run build` → העתיקו את `app/dist` מחדש ליעד.

## נתונים ושיתוף
- הנתונים נשמרים **בדפדפן של כל משתמש** (localStorage) — אינם משותפים אוטומטית.
- לשיתוף/גיבוי בין משתמשים: תפריט → **ייצוא JSON**, והצד השני → **ייבוא JSON**.
