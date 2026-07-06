"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, FileText } from "lucide-react";
import LogoMark from "@/components/Logo";
import AccessibilityWidget from "@/components/AccessibilityWidget";

const LAST_UPDATED = "1 ביולי 2026";
const EFFECTIVE_DATE = "1 ביולי 2026";
const CONTACT_EMAIL = "sidur.support@gmail.com";

const SECTIONS: { title: string; body: (string | { bullet: string[] })[] }[] = [
  {
    title: "1. כללי וקבלת התנאים",
    body: [
      `תנאי שימוש אלה ("התנאים") מסדירים את השימוש בפלטפורמת Sidur ("השירות" או "האפליקציה"), המופעלת על-ידי בעלי האפליקציה ("אנחנו", "אותנו"). תאריך תחילת תוקפם: ${EFFECTIVE_DATE}.`,
      "הרשמה לשירות או שימוש בו — לרבות גישה לדאשבורד, שימוש בעוזר ה-AI, ניהול עובדים וסידורי עבודה — מהווה הסכמה מלאה לתנאים אלה ולמדיניות הפרטיות שלנו. אם אינך מסכים, אנא הימנע משימוש בשירות.",
    ],
  },
  {
    title: "2. מהות השירות",
    body: [
      "Sidur היא פלטפורמת SaaS לניהול עסקי במסעדנות ובשירות, המאפשרת:",
      {
        bullet: [
          "בניית סידור עבודה שבועי ועריכתו",
          "מעקב נוכחות בזמן אמת (כניסה/יציאה)",
          "חישוב וחלוקת טיפים אוטומטית לפי שעות",
          "ניהול בקשות חופשה והחלפות משמרות",
          "עוזר דיגיטלי מבוסס AI לשאלות תפעוליות",
          "ייצוא דוחות שעות לאקסל",
        ],
      },
      "השירות מסופק \"כפי שהוא\" (as-is). אנחנו עושים מאמץ סביר לשמור על זמינות ותקינות, אך לא מתחייבים לזמינות רצופה ללא תקלות.",
    ],
  },
  {
    title: "3. חשבון העסק, הרשמה ואבטחה",
    body: [
      "בעל החשבון (המנהל הראשי) הוא האחראי הבלעדי לדיוק המידע שמוזן — שמות עובדים, שעות עבודה, שכר ושאר פרטים תפעוליים.",
      "המנהל אחראי לשמור על סודיות פרטי ההתחברות של כל המשתמשים בחשבון, ולכל פעולה שתתבצע דרכו. יש ליידע אותנו מיד בכל חשד לשימוש לא מורשה.",
      "אנחנו שומרים את הזכות להשעות חשבון שנחשד בשימוש לרעה, ללא הודעה מוקדמת.",
    ],
  },
  {
    title: "4. תוכניות ותשלום",
    body: [
      "השירות מוצע במספר תוכניות (Starter, Plus, Business), כמפורט במסך ההרשמה ובדף התוכניות.",
      {
        bullet: [
          "תוכנית Starter: חינם — ללא הגבלת זמן, עם מגבלת עובדים",
          "תוכניות בתשלום: חיוב חודשי קבוע, מחיר כמוצג בממשק",
          "ביטול: ניתן לבטל בכל עת מהגדרות החשבון; החיוב יפסק בתחילת המחזור הבא",
          "אין החזרים על תקופה שכבר שולמה, אלא אם נקבע אחרת בחוק",
        ],
      },
      "כל שינוי במחיר ייודע לפחות 30 יום מראש. שימוש מתמשך לאחר שינוי המחיר מהווה הסכמה לתעריף החדש.",
    ],
  },
  {
    title: "5. שימוש מותר ואסור",
    body: [
      "מותר: שימוש לצורכי ניהול עסקי לגיטימי, הזנת נתוני עובדים אמיתיים, יצוא נתונים לצרכים תפעוליים.",
      "אסור:",
      {
        bullet: [
          "שימוש למטרה בלתי חוקית לפי דיני מדינת ישראל",
          "הזנת נתונים כוזבים על עובדים — שכר, שעות, נוכחות",
          "ניסיון לפרוץ, לחבל או לבצע הנדסה לאחור של המערכת",
          "שיתוף גישה לחשבון עם גורמים מחוץ לעסק ללא אישורנו",
          "שימוש אוטומטי (בוטים, scrapers) בלי הסכמה מפורשת בכתב",
        ],
      },
    ],
  },
  {
    title: "6. קניין רוחני",
    body: [
      "כל הזכויות בשירות, בקוד, בעיצוב, בלוגו ובסימן המסחרי \"Sidur\" שייכות לבעלי האפליקציה ומוגנות בדיני זכויות יוצרים וקניין רוחני.",
      "אין לשכפל, להפיץ, לתרגם, לשנות או לבצע הנדסה לאחור של כל חלק מהשירות — ללא אישור בכתב מראש.",
      "נתוני העסק שהוזנו על-ידי המשתמש שייכים למשתמש. אנחנו לא רוכשים בעלות על תוכן שהועלה.",
    ],
  },
  {
    title: "7. הגבלת אחריות",
    body: [
      "הגבלות אחריות אלה חלות במידה המרבית המותרת בחוק:",
      {
        bullet: [
          "העוזר ה-AI מסייע בניהול — אינו תחליף לשיקול דעת אנושי, ייעוץ משפטי, רואה חשבון או בדיקת חוקי עבודה",
          "האחריות הסופית על נכונות תלושי שכר, שעות ותאימות לחוק שכר מינימום נותרת על בעל העסק",
          "לא נישא באחריות לנזק ישיר, עקיף, מקרי או תוצאתי הנגרם משימוש בשירות",
          "אחריותנו הכוללת לא תעלה על הסכום ששולם על-ידי המשתמש ב-12 החודשים שקדמו לאירוע",
        ],
      },
    ],
  },
  {
    title: "8. שינויים בתנאים",
    body: [
      "אנחנו עשויים לעדכן תנאים אלה מעת לעת. שינויים מהותיים יפורסמו בהודעה ב-14 יום מראש — דרך האפליקציה או בדוא\"ל לכתובת הרשומה.",
      "שימוש מתמשך בשירות לאחר תאריך כניסת התנאים לתוקף מהווה הסכמה לתנאים המעודכנים.",
    ],
  },
  {
    title: "9. סיום השירות",
    body: [
      "אנחנו שומרים את הזכות להפסיק חשבון שמפר תנאים אלה. במקרה של הפסקה ביוזמת המשתמש, ניתן לייצא את הנתונים לפני סגירת החשבון.",
      "במקרה של הפסקת השירות כולו, נודיע לפחות 30 יום מראש ונאפשר ייצוא נתונים.",
    ],
  },
  {
    title: "10. דין וסמכות שיפוט",
    body: [
      "תנאים אלה כפופים לדיני מדינת ישראל בלבד. כל מחלוקת שתנבע מהם תידון בבתי-המשפט המוסמכים במחוז תל-אביב.",
    ],
  },
  {
    title: "11. יצירת קשר",
    body: [
      `לכל שאלה, הבהרה או פנייה בנוגע לתנאים אלה ניתן לפנות אלינו: ${CONTACT_EMAIL}`,
      "אנחנו מתחייבים לחזור תוך 3 ימי עסקים.",
    ],
  },
];

export default function TermsPage() {
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
          <FileText size={16} style={{ color: "var(--blue)" }} />
          <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>תנאי שימוש</p>
        </div>
        <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0">
          <LogoMark size={24} />
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-1 max-w-2xl mx-auto">

        {/* Meta */}
        <div className="rounded-2xl px-4 py-3 mb-4 flex flex-col gap-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>Sidur — תנאי שימוש</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>עודכן לאחרונה: {LAST_UPDATED} · תחילת תוקף: {EFFECTIVE_DATE}</p>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-2 flex-row px-4 py-3 rounded-2xl mb-4"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Shield size={14} style={{ color: "#4ADE80" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            אנחנו מחויבים לשקיפות מלאה. התנאים כאן נכתבו בשפה ברורה — לא בז׳רגון משפטי.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5">
          {SECTIONS.map(s => (
            <div key={s.title} className="flex flex-col gap-2">
              <p className="text-sm font-bold text-right" style={{ color: "var(--text-main)" }}>{s.title}</p>
              {s.body.map((item, i) =>
                typeof item === "string" ? (
                  <p key={i} className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{item}</p>
                ) : (
                  <ul key={i} className="flex flex-col gap-1.5 pr-2">
                    {item.bullet.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 flex-row justify-end">
                        <p className="text-sm leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>{b}</p>
                        <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--blue)" }} />
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>
            © 2026 Sidur · כל הזכויות שמורות
          </p>
          <p className="text-[10px] text-center" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
            {CONTACT_EMAIL}
          </p>
        </div>

      </div>
    </div>
  );
}
