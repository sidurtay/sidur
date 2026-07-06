"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Eye, Trash2, Mail, ShieldCheck, Database, FileText, Server, ShieldAlert, Archive, Users, Cookie, RefreshCw, Headset, Check } from "lucide-react";
import LogoMark from "@/components/Logo";
import AccessibilityWidget from "@/components/AccessibilityWidget";

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

// Quick-nav chips — jump straight to any section instead of scrolling
// through the whole policy top to bottom.
const NAV_SECTIONS = [
  { id: "sec-1", label: "מה אוספים" },
  { id: "sec-2", label: "שימוש במידע" },
  { id: "sec-3", label: "ספקים חיצוניים" },
  { id: "sec-4", label: "אבטחה" },
  { id: "sec-5", label: "שמירה ומחיקה" },
  { id: "sec-6", label: "הזכויות שלך" },
  { id: "sec-7", label: "עוגיות" },
  { id: "sec-8", label: "שינויים" },
  { id: "sec-9", label: "יצירת קשר" },
];

// A small icon badge per numbered section, matching the reference layout
// (icon top-left of each section's own boxed card).
const SECTION_ICONS: Record<string, typeof Database> = {
  "sec-1": Database, "sec-2": FileText, "sec-3": Server, "sec-4": ShieldAlert,
  "sec-5": Archive, "sec-6": Users, "sec-7": Cookie, "sec-8": RefreshCw, "sec-9": Headset,
};

// "At a glance" summary — the headline facts, up top, before the legal detail.
const AT_A_GLANCE = [
  "המידע שלך מוגן בצורה מקסימלית",
  "אנחנו לא מוכרים את המידע שלך לצדדים שלישיים",
  "תמיד אפשר לבקש למחוק את המידע שלך",
  "אנחנו עומדים בתקני GDPR ובחוק הגנת הפרטיות הישראלי",
];

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-bg)", direction: "rtl" }}>
      <AccessibilityWidget />

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

      {/* Quick nav — jump to any section */}
      <div className="flex flex-row gap-1.5 overflow-x-auto px-4 py-3 sticky z-[9]"
        style={{ top: 57, background: "var(--gray-bg)", borderBottom: "1px solid var(--border)" }}>
        {NAV_SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            {s.label}
          </a>
        ))}
      </div>

      <div className="px-5 py-6 flex flex-col gap-5 max-w-2xl mx-auto">

        {/* Meta */}
        <div className="rounded-2xl px-4 py-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>Sidur — מדיניות פרטיות</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>עודכן לאחרונה: {LAST_UPDATED} · חל על כל משתמשי Sidur</p>
        </div>

        {/* At a glance — the headline facts up top, before the legal detail */}
        <div className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <p className="text-sm font-bold mb-3 flex items-center gap-1.5 justify-end" style={{ color: "var(--text-main)" }}>
            בקצרה — מה חשוב לדעת <ShieldCheck size={15} style={{ color: "var(--blue)" }} />
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {AT_A_GLANCE.map(item => (
              <div key={item} className="flex items-center gap-2 flex-row justify-end">
                <p className="text-[12px] leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{item}</p>
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--green-light)" }}>
                  <Check size={10} style={{ color: "var(--green)" }} strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1 */}
        <Section id="sec-1" title="1. מה אנחנו אוספים">
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
        <Section id="sec-2" title="2. איך אנחנו משתמשים במידע">
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
        <Section id="sec-3" title="3. ספקים חיצוניים שמעבדים את המידע">
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
        <Section id="sec-4" title="4. אבטחת מידע">
          <BulletList items={[
            "הצפנת תעבורה מלאה (HTTPS/TLS) בין המכשיר לשרת",
            "Row Level Security (RLS) — כל עסק רואה אך ורק את הנתונים שלו",
            "סיסמאות נשמרות כ-hash (bcrypt) — אפילו אנחנו לא יכולים לקרוא אותן",
            "אפשרות כניסה עם טביעת אצבע/פנים (Passkey) כחלופה לסיסמה",
            "גישת צוות הפיתוח למסד הנתונים מוגבלת ומבוקרת",
          ]} />
        </Section>

        {/* Section 5 — Retention */}
        <Section id="sec-5" title="5. שמירת מידע ומחיקה">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            המידע נשמר כל עוד החשבון פעיל. בעל עסק שמבקש לסגור חשבון יכול לפנות אלינו למחיקת המידע — נבצע זאת תוך 14 יום, בכפוף לחובות שמירה חוקיות (כגון רישומי שכר הנדרשים לפי חוק הגנת הפרטיות ודיני עבודה ישראלים).
          </p>
        </Section>

        {/* Section 6 — Your rights */}
        <Section id="sec-6" title="6. הזכויות שלך">
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
        <Section id="sec-7" title="7. עוגיות ואחסון מקומי">
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
        <Section id="sec-8" title="8. שינויים במדיניות">
          <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
            מדיניות זו עשויה להתעדכן מעת לעת. שינויים מהותיים יפורסמו בהודעה מקדמית של לפחות 14 יום — דרך האפליקציה או בדוא״ל. המשך השימוש לאחר מכן מהווה הסכמה לגרסה המעודכנת.
          </p>
        </Section>

        {/* Section 9 — Contact */}
        <Section id="sec-9" title="9. יצירת קשר — ממונה פרטיות">
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

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  const Icon = (id && SECTION_ICONS[id]) || FileText;
  return (
    <div id={id} className="flex flex-col gap-2.5 rounded-2xl px-4 py-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", scrollMarginTop: 120 }}>
      <div className="flex items-center justify-between flex-row">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue-light)" }}>
          <Icon size={15} style={{ color: "var(--blue)" }} />
        </div>
        <p className="text-sm font-bold text-right" style={{ color: "var(--text-main)" }}>{title}</p>
      </div>
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
