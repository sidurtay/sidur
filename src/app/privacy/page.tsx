"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Eye, Trash2, Mail } from "lucide-react";
import LogoMark from "@/components/Logo";

const LAST_UPDATED = "1 ביולי 2026";
const CONTACT_EMAIL = "sidur.support@gmail.com";

const THIRD_PARTIES = [
  { name: "Supabase", role: "מסד נתונים מאובטח — אחסון כל נתוני העסק, העובדים והמשמרות", flag: "🇺🇸", link: "https://supabase.com/privacy" },
  { name: "Anthropic (Claude)", role: "עוזר AI — שאלות שהמנוע הפנימי לא מזהה מועברות לעיבוד יחד עם נתוני העסק הרלוונטיים ליצירת תשובה", flag: "🇺🇸", link: "https://www.anthropic.com/privacy" },
  { name: "Twilio", role: "שליחת הודעות WhatsApp ו-SMS לעובדים", flag: "🇺🇸", link: "https://www.twilio.com/legal/privacy" },
  { name: "Google (Gmail SMTP)", role: "שליחת מיילי תמיכה ואיפוס סיסמה", flag: "🇺🇸", link: "https://policies.google.com/privacy" },
  { name: "Vercel", role: "אחסון והרצת אפליקציית הווב", flag: "🇺🇸", link: "https://vercel.com/legal/privacy-policy" },
];

const YOUR_RIGHTS = [
  { icon: Eye, label: "עיון", desc: "לקבל עותק של המידע השמור עליך" },
  { icon: Mail, label: "תיקון", desc: "לתקן פרטים שגויים או לא עדכניים" },
  { icon: Trash2, label: "מחיקה", desc: "לבקש מחיקת המידע שלך בכפוף לחובות שמירה חוקיות" },
  { icon: Lock, label: "הגבלה", desc: "להגביל עיבוד המידע שלך בנסיבות מסוימות" },
];

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-bg)", direction: "rtl" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 flex-row sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={() => router.back()} className="p-1">
          <ArrowRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex items-center gap-2 flex-row flex-1">
          <Lock size={16} style={{ color: "var(--blue)" }} />
          <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>מדיניות פרטיות</p>
        </div>
        <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0">
          <LogoMark size={24} />
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-5 max-w-2xl mx-auto">

        {/* Meta */}
        <div className="rounded-2xl px-4 py-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>Sidur — מדיניות פרטיות</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>עודכן לאחרונה: {LAST_UPDATED} · חל על כל משתמשי Sidur</p>
        </div>

        {/* Trust statement */}
        <div className="rounded-2xl px-4 py-3.5"
          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>המחויבות שלנו אליך</p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            המידע שאתה מפקיד אצלנו — שמות עובדים, שעות, הכנסות — הוא רגיש. אנחנו לא מוכרים אותו, לא מפרסמים איתו, ולא עושים בו שימוש מחוץ להפעלת השירות. המדיניות הזו מסבירה בדיוק מה קורה עם המידע שלך.
          </p>
        </div>

        {/* Section 1 */}
        <Section title="1. מה אנחנו אוספים">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            אנחנו אוספים רק מה שנדרש להפעלת השירות:
          </p>
          <BulletList items={[
            "פרטי עסק ומשתמשים: שם עסק, שם מנהל/עובד, מספר טלפון, אימייל, תפקיד",
            "מידע תפעולי: סידורי עבודה, נוכחות (שעת כניסה/יציאה), בקשות חופשה והחלפות משמרות, חלוקת טיפים",
            "שיחות עם העוזר ה-AI — לצורך מענה ולשיפור השירות",
            "מידע טכני בסיסי: סוג מכשיר ומערכת הפעלה, לצורך תמיכה",
            "טוקן להתראות Push (אם אישרת) — לשליחת עדכוני משמרות",
          ]} />
          <p className="text-[11px] leading-relaxed text-right mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
            אנחנו לא אוספים מספרי תעודת זהות, נתוני בריאות, או כל מידע שאינו נחוץ לניהול סידורי עבודה.
          </p>
        </Section>

        {/* Section 2 */}
        <Section title="2. איך אנחנו משתמשים במידע">
          <BulletList items={[
            "הצגת סידור עבודה ועדכונו בזמן אמת",
            "חישוב שעות עבודה, טיפים ויצוא דוחות",
            "שליחת התראות על משמרות ובקשות",
            "מענה לשאלות דרך עוזר ה-AI",
            "שיפור ופיתוח השירות לאורך זמן",
            "תמיכה טכנית בפנייה אלינו",
          ]} />
          <p className="text-sm leading-relaxed text-right mt-1" style={{ color: "var(--text-secondary)" }}>
            <strong>לא</strong> נמכור, נחכיר, ולא נשתף מידע אישי עם צדדים שלישיים למטרות שיווקיות — לעולם.
          </p>
        </Section>

        {/* Section 3 — Third parties with cards */}
        <Section title="3. ספקים חיצוניים שמעבדים את המידע">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            להלן רשימה מלאה ושקופה של הספקים שמעבדים חלק מהמידע בשמנו, בהתאם לחוק הגנת הפרטיות:
          </p>
          <div className="flex flex-col gap-2 mt-1">
            {THIRD_PARTIES.map(t => (
              <div key={t.name} className="rounded-xl px-3.5 py-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between flex-row mb-0.5">
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{t.flag} ארה״ב</span>
                  <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{t.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{t.role}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-right mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
            כל הספקים מחויבים בהסכמי עיבוד נתונים (DPA) ועומדים בתקני אבטחה גבוהים. שרתים מאוחסנים בארה״ב ובאיחוד האירופי.
          </p>
        </Section>

        {/* Section 4 — Security */}
        <Section title="4. אבטחת מידע">
          <BulletList items={[
            "הצפנת תעבורה מלאה (HTTPS/TLS) בין המכשיר לשרת",
            "Row Level Security (RLS) — כל עסק רואה אך ורק את הנתונים שלו",
            "סיסמאות נשמרות כ-hash (bcrypt) — אפילו אנחנו לא יכולים לקרוא אותן",
            "אפשרות כניסה עם טביעת אצבע/פנים (Passkey) כחלופה לסיסמה",
            "גישת צוות הפיתוח למסד הנתונים מוגבלת ומבוקרת",
          ]} />
        </Section>

        {/* Section 5 — Retention */}
        <Section title="5. שמירת מידע ומחיקה">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            המידע נשמר כל עוד החשבון פעיל. בעל עסק שמבקש לסגור חשבון יכול לפנות אלינו למחיקת המידע — נבצע זאת תוך 14 יום, בכפוף לחובות שמירה חוקיות (כגון רישומי שכר הנדרשים לפי חוק הגנת הפרטיות ודיני עבודה ישראלים).
          </p>
        </Section>

        {/* Section 6 — Your rights */}
        <Section title="6. הזכויות שלך">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            בהתאם לחוק הגנת הפרטיות (תשמ״א-1981) ותיקוניו, לכל משתמש הזכות:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {YOUR_RIGHTS.map(r => (
              <div key={r.label} className="rounded-xl px-3 py-2.5 flex flex-col gap-1 items-end"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-1.5 flex-row">
                  <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{r.label}</p>
                  <r.icon size={13} style={{ color: "var(--blue)" }} />
                </div>
                <p className="text-[10px] leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{r.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-right mt-1" style={{ color: "var(--text-secondary)" }}>
            לממש זכות — פנה למנהל העסק שלך, או ישירות אלינו ב-{CONTACT_EMAIL}. נחזור תוך 14 יום.
          </p>
        </Section>

        {/* Section 7 — Cookies */}
        <Section title="7. עוגיות ואחסון מקומי">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            האפליקציה משתמשת ב-localStorage בדפדפן לצרכים תפעוליים בלבד:
          </p>
          <BulletList items={[
            "שמירת מצב ההתחברות (session) — כדי שלא תצטרך להתחבר מחדש בכל פעם",
            "העדפות תצוגה: מצב כהה/בהיר, שפה",
          ]} />
          <p className="text-[11px] leading-relaxed text-right mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
            אנחנו לא משתמשים בעוגיות מעקב, פרסום, או אנליטיקה חיצוניים (כגון Google Analytics).
          </p>
        </Section>

        {/* Section 8 — Changes */}
        <Section title="8. שינויים במדיניות">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            מדיניות זו עשויה להתעדכן מעת לעת. שינויים מהותיים יפורסמו בהודעה מקדמית של לפחות 14 יום — דרך האפליקציה או בדוא״ל. המשך השימוש לאחר מכן מהווה הסכמה לגרסה המעודכנת.
          </p>
        </Section>

        {/* Section 9 — Contact */}
        <Section title="9. יצירת קשר — ממונה פרטיות">
          <div className="rounded-xl px-4 py-3.5 flex flex-col gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-bold text-right" style={{ color: "var(--text-main)" }}>Sidur — צוות פרטיות ותמיכה</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-right font-medium" style={{ color: "var(--blue)" }}>
              {CONTACT_EMAIL}
            </a>
            <p className="text-[11px] text-right" style={{ color: "var(--text-secondary)" }}>זמן מענה: עד 3 ימי עסקים</p>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-2 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>
            © 2026 Sidur · כל הזכויות שמורות
          </p>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-right" style={{ color: "var(--text-main)" }}>{title}</p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pr-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 flex-row justify-end">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{item}</p>
          <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--blue)" }} />
        </li>
      ))}
    </ul>
  );
}
