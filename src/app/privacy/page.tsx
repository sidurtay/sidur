"use client";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. כללי",
    body: [
      "מדיניות פרטיות זו מסבירה איזה מידע אפליקציית Sidur (\"השירות\") אוספת, איך אנחנו משתמשים בו, ועם מי הוא משותף. שימוש בשירות מהווה הסכמה למדיניות זו.",
    ],
  },
  {
    title: "2. איזה מידע נאסף",
    body: [
      "פרטי עסק ומשתמשים: שם עסק, שם מנהל/עובד, מספר טלפון, אימייל, תפקיד.",
      "מידע תפעולי: סידור עבודה, נוכחות (כניסה/יציאה), בקשות חופשה והחלפת משמרות, חלוקת טיפים.",
      "תוכן שיחות עם העוזר הדיגיטלי (AI) — כדי שנוכל לשפר את השירות ולתמוך בבעיות.",
      "מידע טכני בסיסי כגון סוג מכשיר, לצורך תמיכה והתראות Push.",
    ],
  },
  {
    title: "3. כיצד נעשה שימוש במידע",
    body: [
      "המידע משמש להפעלת השירות עצמו: הצגת סידור עבודה, חישוב שעות וטיפים, שליחת התראות, ומענה לשאלות בעוזר ה-AI.",
      "אנחנו לא מוכרים מידע אישי לצדדי ג׳ לצורכי שיווק.",
    ],
  },
  {
    title: "4. שירותי צד שלישי",
    body: [
      "כדי להפעיל את השירות אנחנו משתמשים בספקים חיצוניים שמעבדים חלק מהמידע בשמנו:",
      "Supabase — אחסון מסד הנתונים.",
      "Anthropic (Claude) — כאשר נשלחת שאלה לעוזר ה-AI שהמנוע הפנימי לא מכיר, תוכן השאלה (וחלק מנתוני העסק הרלוונטיים לתשובה, כגון שעות/משמרות) מועבר לעיבוד על ידי Anthropic לצורך יצירת התשובה.",
      "Twilio — שליחת הודעות WhatsApp/SMS.",
      "Google (Gmail SMTP) — שליחת מיילי תמיכה ואיפוס סיסמה.",
      "Vercel — אחסון והרצת האפליקציה.",
      "כל אחד מהספקים הללו מחויב במדיניות הפרטיות והאבטחה שלו.",
    ],
  },
  {
    title: "5. אבטחת מידע",
    body: [
      "הגישה למסד הנתונים מוגבלת ומבוקרת (Row Level Security), וסיסמאות נשמרות בצורה מוצפנת ולא כטקסט פתוח.",
      "במכשירים שתומכים בכך, ניתן להתחבר גם באמצעות טביעת אצבע/פנים (Passkey) במקום סיסמה.",
    ],
  },
  {
    title: "6. שמירת מידע",
    body: [
      "המידע נשמר כל עוד החשבון פעיל. בעל עסק שמבקש לסגור את החשבון יכול לפנות אלינו לצורך מחיקת המידע, בכפוף לכל דרישת שמירה הקבועה בחוק (כגון רישומי שכר).",
    ],
  },
  {
    title: "7. הזכויות שלך",
    body: [
      "כל משתמש (מנהל או עובד) יכול לבקש לעיין במידע שנשמר עליו, לתקן פרטים שגויים, או לבקש את מחיקתם — בפנייה למנהל העסק שלו או אלינו ישירות.",
    ],
  },
  {
    title: "8. עוגיות ואחסון מקומי",
    body: [
      "האפליקציה משתמשת באחסון מקומי בדפדפן (localStorage) כדי לשמור על מצב ההתחברות ועל הגדרות תצוגה (כגון מצב כהה/בהיר), ולא לצורכי מעקב שיווקי.",
    ],
  },
  {
    title: "9. שינויים במדיניות",
    body: ["מדיניות זו עשויה להתעדכן מעת לעת. נעדכן את התאריך בראש העמוד בכל שינוי מהותי."],
  },
  {
    title: "10. יצירת קשר",
    body: ["לכל שאלה לגבי המידע שלך ניתן לפנות אלינו במייל sidur.support@gmail.com."],
  },
];

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-bg)", direction: "rtl" }}>
      <div className="flex items-center gap-3 px-4 py-4 flex-row" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={() => router.back()} className="p-1">
          <ArrowRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>מדיניות פרטיות</p>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6 max-w-2xl mx-auto">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>עודכן לאחרונה: יוני 2026</p>
        {SECTIONS.map(s => (
          <div key={s.title} className="flex flex-col gap-2">
            <p className="text-sm font-bold text-right" style={{ color: "var(--text-main)" }}>{s.title}</p>
            {s.body.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{p}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
