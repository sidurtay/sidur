"use client";
import { useRouter } from "next/navigation";
import { Coins, BarChart3, Bot, Building2, CheckCircle2, Users, ShieldCheck, Megaphone, CalendarOff, CalendarDays, MapPin } from "lucide-react";
import LandingNav from "@/components/LandingNav";

const NAVY = "#0B1E3D";
const MUTED = "#5B6472";
const ORANGE = "#F97316";
const ORANGE_LIGHT = "#FFF1E6";
const BORDER = "#E7EAF0";
const BG_ALT = "#F7F8FB";

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#fff" }}>
      <LandingNav />

      <div className="px-5 lg:px-10 pt-6 lg:pt-10 pb-4 max-w-5xl mx-auto w-full text-center">
        <h1 className="text-2xl lg:text-4xl font-bold mb-2" style={{ color: NAVY }}>כל התכונות של Sidur</h1>
        <p className="text-sm lg:text-base" style={{ color: MUTED }}>
          פירוט מלא — כל מה שבנוי בדיוק בשביל איך שמסעדות ובתי קפה באמת עובדים
        </p>
      </div>

      {/* ── Detailed feature sections — one per mega-menu item ── */}
      <div className="px-5 lg:px-10 pt-6 lg:pt-10 pb-4 max-w-5xl mx-auto w-full flex flex-col gap-4">
        {[
          { slug: "employees", Icon: Users, category: "ניהול צוות", title: "עובדים ותפקידים",
            body: "מאגר עובדים מרכזי עם תפקידים מותאמים אישית לעסק שלכם — אחמ\"ש, מלצרים, מטבח, בר ועוד. כל עובד מנוהל עם פרופיל, פרטי קשר ותפקיד קבוע, שמוזן אוטומטית לכל סידור בלי להקליד שוב." },
          { slug: "branches", Icon: Building2, category: "ניהול צוות", title: "מבנה סניפים",
            body: "מנהלים כמה סניפים מחשבון אחד, ועוברים ביניהם בלחיצה — בלי להתנתק ולהתחבר מחדש. לכל סניף הסידור, הצוות וההגדרות שלו בנפרד, ותמונת מצב מלאה על כל העסק במקום אחד." },
          { slug: "permissions", Icon: ShieldCheck, category: "ניהול צוות", title: "הרשאות מנהלים",
            body: "קובעים בדיוק מי רואה מה ומי יכול לערוך מה — מנהל בכיר, אחמ\"ש עם הרשאות מוגבלות, או עובד רגיל. שליטה מלאה על מי נוגע במה, בלי לוותר על שקיפות מול הצוות." },
          { slug: "sid-ai", Icon: Bot, category: "תקשורת", title: "סיד — עוזר AI",
            body: "עוזר ה-AI שבונה סידור שבועי שלם תוך שניות, עונה לעובדים 24/7 על שאלות כמו \"מתי המשמרת שלי\" או \"כמה טיפים עשיתי\", ומזהה בקשות חופש והתנגשויות עוד לפני שהן קורות." },
          { slug: "announcements", Icon: Megaphone, category: "תקשורת", title: "הודעות לצוות",
            body: "שולחים עדכון אחד וכל הצוות רואה אותו מיד באפליקציה — בלי קבוצות וואטסאפ מבולגנות ובלי הודעות שהולכות לאיבוד בין כל השאר." },
          { slug: "time-off", Icon: CalendarOff, category: "תקשורת", title: "בקשות חופש והחלפות",
            body: "עובדים מבקשים חופש או מציעים החלפת משמרת ישירות מהטלפון, והמנהל מאשר בלחיצה אחת — עם התראה אוטומטית לכל הצדדים, בלי הודעות בשעה 23:00." },
          { slug: "scheduling", Icon: CalendarDays, category: "תפעול", title: "סידור עבודה חכם",
            body: "מזינים אילוצים וזמינות פעם אחת, וה-AI מרכיב סידור שבועי שלם — מחולק הוגן בין בוקר לערב, בלי להתנגש באף בקשת חופש. אתם רק מאשרים, במקום לבזבז שעה בכל שבוע על אקסל." },
          { slug: "attendance", Icon: MapPin, category: "תפעול", title: "נוכחות ו-GPS",
            body: "עובדים מדווחים כניסה ויציאה בטביעת אצבע דיגיטלית מהטלפון, עם אימות מיקום (GPS) אופציונלי — כדי לדעת בוודאות שהם נכנסו מהעסק עצמו, בזמן אמת." },
          { slug: "tips", Icon: Coins, category: "תפעול", title: "חלוקת טיפים",
            body: "חישוב אוטומטי של טיפים לפי שעות עבודה, מחולק בנפרד בין משמרות בוקר וערב — אפס ויכוחים בסוף המשמרת, ושקיפות מלאה מול כל עובד." },
          { slug: "payroll", Icon: BarChart3, category: "תפעול", title: "דוח שכר",
            body: "שעות, שכר וטיפים לכל עובד בדוח מוכן בלחיצה אחת, מיוצא ל-Excel — בדיוק מה שרואה החשבון צריך בסוף החודש, בלי עבודה ידנית." },
        ].map(f => (
          <div key={f.slug} id={f.slug} className="rounded-2xl p-5 lg:p-6 flex items-start gap-4 flex-row"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, scrollMarginTop: 24 }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ORANGE_LIGHT }}>
              <f.Icon size={21} style={{ color: ORANGE }} />
            </div>
            <div className="text-right flex-1">
              <p className="text-[10px] font-bold mb-0.5" style={{ color: ORANGE }}>{f.category}</p>
              <p className="text-base lg:text-lg font-bold mb-1" style={{ color: NAVY }}>{f.title}</p>
              <p className="text-xs lg:text-sm leading-relaxed" style={{ color: MUTED }}>{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Why choose us — specialization + a real number, not just claims ── */}
      <div className="px-5 lg:px-10 pt-10 lg:pt-16 pb-2 max-w-5xl mx-auto w-full">
        <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>למה לבחור ב-Sidur?</p>
        <p className="text-center text-xs lg:text-sm mb-6 lg:mb-10" style={{ color: MUTED }}>
          לא עוד תוכנה כללית לכל עסק — בנוי סביב איך שבאמת עובדים במסעדות ובתי קפה
        </p>

        <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-10 lg:items-center">
          <div className="flex-1 rounded-3xl p-5 lg:p-8" style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 20px 45px -25px rgba(11,30,61,0.25)" }}>
            <p className="text-xs lg:text-sm font-bold text-right mb-5" style={{ color: NAVY }}>זמן בנייה של סידור שבועי</p>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between flex-row mb-1.5">
                  <span className="text-xs font-bold" style={{ color: MUTED }}>כ-3 שעות</span>
                  <span className="text-xs font-medium" style={{ color: MUTED }}>לפני Sidur — אקסל / וואטסאפ</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 14, background: BG_ALT }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#CBD3E1" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between flex-row mb-1.5">
                  <span className="text-xs font-bold" style={{ color: ORANGE }}>כ-5 דקות</span>
                  <span className="text-xs font-medium" style={{ color: MUTED }}>עם Sidur — סיד בונה, אתה מאשר</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 14, background: BG_ALT }}>
                  <div className="h-full rounded-full" style={{ width: "5%", background: ORANGE }} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-right mt-4" style={{ color: MUTED }}>
              מבוסס על ממוצע זמן בנייה שדיווחו לנו עסקים עם 8–20 עובדים.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {[
              { title: "בנוי למסעדות ובתי קפה, לא לכל עסק", sub: "תפקידים, משמרות בוקר/ערב, וטיפים — כבר מוגדרים בדיוק איך שהעולם הזה עובד, לא תבנית גנרית שצריך להתאים." },
              { title: "לומד את התפקידים האמיתיים שלך", sub: "אחמ\"ש, מלצרים, מטבח, בר — סיד שואל על התפקידים שבאמת יש אצלך, לא מציע שאלות שלא רלוונטיות." },
              { title: "מודע לחוקי העבודה בישראל", sub: "התראות לא-חוסמות על שעות שבועיות וימי עבודה לפי החוק — אתה מקבל מידע, לא הגבלה." },
              { title: "עובד גם כשאתה לא מול המחשב", sub: "מהטלפון, בלחיצה — לעובדים ולמנהלים כאחד." },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 flex-row rounded-2xl p-4"
                style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: ORANGE_LIGHT }}>
                  <CheckCircle2 size={15} style={{ color: ORANGE }} />
                </div>
                <div className="text-right flex-1">
                  <p className="text-sm font-bold" style={{ color: NAVY }}>{item.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: MUTED }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Closing CTA ── */}
      <div className="flex flex-col items-center px-6 py-14 lg:py-20 mt-6 text-center" style={{ background: NAVY }}>
        <p className="text-xl lg:text-2xl font-bold text-white mb-2">מוכנים להפסיק לבנות סידורים?</p>
        <p className="text-sm mb-7" style={{ color: "rgba(255,255,255,0.6)" }}>14 יום חינם, בלי כרטיס אשראי, ביטול בכל רגע</p>
        <button onClick={() => router.push("/register")}
          className="px-8 py-4 rounded-2xl text-base font-bold" style={{ background: ORANGE, color: "#fff" }}>
          התחל בחינם עכשיו
        </button>
      </div>

      <p className="text-[10px] text-center py-6" style={{ color: MUTED }}>
        © 2026 Sidur · כל הזכויות שמורות
      </p>
    </div>
  );
}
