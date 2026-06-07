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

### ה. GitHub / GitLab Pages (אירוח ענן)
דחיפה ל-remote + הפעלת Pages. אפשר להוסיף workflow אוטומטי לבנייה ופריסה — בקשו ואגדיר.

## עדכון גרסה
ערכו את המקור ב-`app/src` → `npm run build` → העתיקו את `app/dist` מחדש ליעד.

## נתונים ושיתוף
- הנתונים נשמרים **בדפדפן של כל משתמש** (localStorage) — אינם משותפים אוטומטית.
- לשיתוף/גיבוי בין משתמשים: תפריט → **ייצוא JSON**, והצד השני → **ייבוא JSON**.
