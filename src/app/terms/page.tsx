"use client";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. כללי",
    body: [
      "תנאי שימוש אלה מסדירים את השימוש באפליקציית Sidur (\"השירות\"), המופעלת על ידי בעלי האפליקציה (\"אנחנו\"). הרשמה לשירות או שימוש בו מהווה הסכמה לתנאים אלה ולמדיניות הפרטיות שלנו.",
    ],
  },
  {
    title: "2. מהות השירות",
    body: [
      "Sidur הוא כלי לניהול סידור עבודה, נוכחות, חופשות, החלפות משמרות וחלוקת טיפים לעסקים בתחום המסעדנות. השירות כולל עוזר דיגיטלי מבוסס AI שעונה על שאלות לגבי המידע השמור בחשבון העסק.",
      "השירות מסופק \"as is\". אנחנו עושים מאמץ סביר לשמור על זמינות ותקינות, אך לא מתחייבים לזמינות רצופה ללא תקלות.",
    ],
  },
  {
    title: "3. חשבון העסק והרשמה",
    body: [
      "בעל החשבון (המנהל) אחראי לנכונות הפרטים שמוזנים במערכת, כולל פרטי עובדים, שעות עבודה ושכר.",
      "המנהל אחראי לשמירה על סודיות פרטי ההתחברות של כל המשתמשים בחשבון העסק, ולכל פעולה שמתבצעת בו.",
    ],
  },
  {
    title: "4. תוכניות ותשלום",
    body: [
      "השירות מוצע במספר תוכניות, כמפורט במסך ההרשמה ובהגדרות החשבון. ניתן לשנות או לבטל תוכנית בכל עת מתוך הגדרות החשבון.",
      "פרטים מלאים על מחיר, מועדי חיוב וביטול יוצגו בעת הצטרפות לתוכנית בתשלום.",
    ],
  },
  {
    title: "5. שימוש הוגן",
    body: [
      "אין לעשות בשירות שימוש למטרה בלתי חוקית, להזין מידע כוזב לגבי עובדים, או לנסות לפגוע בתפקוד המערכת.",
    ],
  },
  {
    title: "6. קניין רוחני",
    body: [
      "כל הזכויות בשירות, בקוד, בעיצוב ובסימן \"Sidur\" שייכות לבעלי האפליקציה. אין לשכפל, להפיץ או לבצע הנדסה לאחור לשירות ללא אישור מפורש.",
    ],
  },
  {
    title: "7. הגבלת אחריות",
    body: [
      "השירות, כולל העוזר הדיגיטלי, נועד לסייע בניהול ואינו מהווה תחליף לשיקול דעת אנושי, לייעוץ משפטי או לבדיקה ידנית של חוקי עבודה ושכר מינימום. האחריות הסופית על נכונות תלושי השכר, שעות העבודה והתאמתם לחוק נותרת על בעל העסק.",
      "לא נישא באחריות לנזק עקיף שייגרם משימוש בשירות או מהפסקת השירות.",
    ],
  },
  {
    title: "8. שינויים בתנאים",
    body: [
      "אנחנו עשויים לעדכן תנאים אלה מעת לעת. שימוש מתמשך בשירות לאחר עדכון מהווה הסכמה לתנאים המעודכנים.",
    ],
  },
  {
    title: "9. דין וסמכות שיפוט",
    body: [
      "תנאים אלה כפופים לדיני מדינת ישראל, וכל מחלוקת תידון בבתי המשפט המוסמכים בישראל.",
    ],
  },
  {
    title: "10. יצירת קשר",
    body: ["לכל שאלה בנוגע לתנאים אלה ניתן לפנות אלינו במייל sidur.support@gmail.com."],
  },
];

export default function TermsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-bg)", direction: "rtl" }}>
      <div className="flex items-center gap-3 px-4 py-4 flex-row" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={() => router.back()} className="p-1">
          <ArrowRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>תנאי שימוש</p>
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
