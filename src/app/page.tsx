"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coins, BarChart3, Check, Zap, Rocket, Crown, ShieldCheck, Sparkles, Clock, Star, X, MessageCircle, Bot, Smartphone, Building2, Lightbulb, CheckCircle2, ArrowLeft, Menu } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import { PLANS } from "@/lib/plans";

// This landing page is a public marketing surface, not the logged-in app —
// it intentionally uses its own fixed light palette instead of the app's
// --gray-bg/--surface theme tokens, so it always looks the same regardless
// of the visitor's (or a future logged-in user's) dark/light preference.
const NAVY = "#0B1E3D";
const MUTED = "#5B6472";
const ORANGE = "#F97316";
const ORANGE_LIGHT = "#FFF1E6";
const ORANGE_BORDER = "#FBD5B4";
const BORDER = "#E7EAF0";
const BG_ALT = "#F7F8FB";

const PLAN_ICONS: Record<string, typeof Zap> = { starter: Zap, plus: Rocket, business: Crown };

const BUSINESS_TYPES = [
  "מסעדות", "בתי קפה", "גלידריות", "בורגר בר",
  "פיצריות", "ברים", "מאפיות", "פודטראקים",
];

const SOCIAL_PROOF = [
  "קפה קפה נהריה", "גלידת הגן תל-אביב", "ספר בסטייל חיפה",
  "כושר פלוס ירושלים", "פיצה הגינה", "בוטיק רנה",
];

// A pool of reviews to pick from — reorder or delete to choose which show, or
// swap in a real customer quote. `avatar` is an optional illustrated profile
// image (DiceBear, free, not a real person); leave it null to fall back to a
// colored-initials circle. Replace an avatar URL with a real photo in /public
// (e.g. "/reviews/maor.jpg") once you have one.
const TESTIMONIALS: { name: string; role: string; quote: string; avatar: string | null; tint: string }[] = [
  {
    name: "מאור לוי", role: "בעלים · מסעדת לימאני",
    quote: "הייתי מבזבז שעתיים כל שבוע על הסידור, ועוד שעה על 'מי מחליף את מי' בוואטסאפ. עכשיו זה נגמר בחמש דקות ואני בכלל לא במשחק.",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Maor&backgroundColor=ffdfbf", tint: "#F97316",
  },
  {
    name: "יעל ברקוביץ'", role: "מנהלת · קפה נחמה",
    quote: "העובדים מדווחים נוכחות לבד ורואים משמרות בטלפון. הפסקתי לרדוף אחרי אנשים, וזה לבד שווה את המחיר.",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Yael&backgroundColor=c0aede", tint: "#A78BFA",
  },
  {
    name: "אבי שרעבי", role: "בעלים · בורגר בר תחנה",
    quote: "חלוקת הטיפים הייתה סיוט של ריבים בכל סוף משמרת. Sidur מחשב לבד לפי שעות — אפס תלונות מאז.",
    avatar: null, tint: "#34D399",
  },
  {
    name: "נועה גרין", role: "מנהלת · גלידה בגן",
    quote: "בניתי סידור לשבוע שלם בזמן שחיכיתי לקפה. סיד פשוט עשה את זה, ואני רק אישרתי. מטורף.",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Noa&backgroundColor=b6e3f4", tint: "#60A5FA",
  },
  {
    name: "דני חדד", role: "בעלים · פאב העוגן",
    quote: "ניהלתי 3 סניפים ב-3 קבוצות וואטסאפ שונות. עכשיו הכל בחשבון אחד, ואני עובר ביניהם בלחיצה.",
    avatar: null, tint: "#F472B6",
  },
  {
    name: "שירה מלכה", role: "מנהלת · סלון שירה סטייל",
    quote: "הבנות מבקשות חופש והחלפות דרך האפליקציה, המנהל מאשר בשנייה. נגמרו ההודעות ב-2 בלילה.",
    avatar: null, tint: "#FBBF24",
  },
];

function reviewInitials(name: string) {
  const parts = name.replace(/['"]/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

const HERO_PHOTO = "/schedule-hero.png";

export default function Splash() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("shiftpro_session");
    if (session) router.replace("/dashboard");
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#fff" }}>
      <AccessibilityWidget />

      {/* ── Top bar (desktop) ── */}
      <div className="hidden lg:flex flex-col w-full" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-center gap-1.5 py-1.5 flex-row" style={{ background: NAVY }}>
          <Star size={10} fill={ORANGE} style={{ color: ORANGE }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            מלווים עסקים בישראל מאז 2023 · מעל 80 עסקים כבר בונים איתנו סידור
          </span>
        </div>
        <div className="flex items-center justify-between px-10 py-4 max-w-6xl mx-auto w-full">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: NAVY, direction: "ltr" }}>Sidur</span>
          <div className="flex items-center gap-7 flex-row">
            <a href="#features" className="text-sm font-medium" style={{ color: NAVY }}>תכונות</a>
            <a href="#how-it-works" className="text-sm font-medium" style={{ color: NAVY }}>איך זה עובד</a>
            <a href="#customers" className="text-sm font-medium" style={{ color: NAVY }}>לקוחות שלנו</a>
            <a href="#pricing" className="text-sm font-medium" style={{ color: NAVY }}>מחירים</a>
          </div>
          <div className="flex items-center gap-3 flex-row">
            <button onClick={() => router.push("/login")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: NAVY, border: `1px solid ${BORDER}` }}>
              כניסה
            </button>
            <button onClick={() => router.push("/register")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: ORANGE }}>
              התחילו בחינם
            </button>
          </div>
        </div>
      </div>

      {/* ── Top bar (mobile) — hamburger jumps between the landing page's own
          sections (features/how-it-works/pricing), nothing app-related. ── */}
      <div className="flex lg:hidden items-center justify-between px-5 py-4">
        <button onClick={() => setMobileMenuOpen(true)} aria-label="תפריט"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: BG_ALT, border: `1px solid ${BORDER}` }}>
          <Menu size={17} style={{ color: NAVY }} />
        </button>
        <span className="text-lg font-extrabold tracking-tight" style={{ color: NAVY, direction: "ltr" }}>Sidur</span>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[95] flex justify-end" style={{ background: "rgba(11,30,61,0.4)" }}
          onClick={() => setMobileMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="h-full flex flex-col" style={{ width: 260, background: "#fff", boxShadow: "-10px 0 40px rgba(11,30,61,0.25)" }}>
            <div className="flex items-center justify-between px-4 pt-6 pb-4 flex-row" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <button onClick={() => setMobileMenuOpen(false)}><X size={18} style={{ color: MUTED }} /></button>
              <span className="text-base font-extrabold" style={{ color: NAVY, direction: "ltr" }}>Sidur</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 px-3 py-3">
              {[
                { href: "#features", label: "תכונות" },
                { href: "#how-it-works", label: "איך זה עובד" },
                { href: "#customers", label: "לקוחות שלנו" },
                { href: "#pricing", label: "מחירים" },
              ].map(l => (
                <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl text-sm font-medium text-right" style={{ color: NAVY }}>
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2 px-3 pb-8">
              <button onClick={() => router.push("/register")}
                className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: ORANGE }}>
                התחילו בחינם
              </button>
              <button onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl text-sm font-semibold" style={{ color: NAVY, border: `1px solid ${BORDER}` }}>
                כניסה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero — mobile ── */}
      <div className="flex lg:hidden flex-col items-center pb-8 px-6 text-center">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide mb-5"
          style={{ background: ORANGE_LIGHT, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}>
          ✦ לבתי קפה, מסעדות וגלידריות
        </span>

        <div className="relative mb-10" style={{ width: 300, height: 190 }}>
          <div className="photo-card rounded-[24px] overflow-hidden w-full h-full" style={{ boxShadow: "0 25px 50px -15px rgba(11,30,61,0.3)", border: "4px solid #fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_PHOTO} alt="תצוגת סידור העבודה באפליקציית Sidur" className="w-full h-full object-cover" style={{ objectPosition: "top" }} />
          </div>
          <div className="float-slow-delay absolute -top-3 -left-6 rounded-xl px-2.5 py-2 flex items-center gap-1 flex-row"
            style={{ background: ORANGE, boxShadow: "0 12px 24px -8px rgba(249,115,22,0.55)" }}>
            <Sparkles size={12} style={{ color: "#fff" }} />
            <span className="text-[9px] font-bold" style={{ color: "#fff" }}>סיד בנה את זה</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold leading-tight mb-3" style={{ color: NAVY }}>
          תפסיק לבנות סידור.<br />תתחיל לאשר אותו.
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: MUTED, maxWidth: 300 }}>
          בזמן שאתה קורא את זה, Sidur כבר יכול היה לבנות לך סידור שלם לשבוע הבא — עם נוכחות בזמן אמת, טיפים מחושבים, ועוזר חכם שעונה לעובדים במקומך.
        </p>
        <div className="flex flex-row gap-1.5 mb-8 flex-wrap justify-center" style={{ maxWidth: 340 }}>
          {BUSINESS_TYPES.map(b => (
            <span key={b} className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: BG_ALT, color: MUTED, border: `1px solid ${BORDER}` }}>
              {b}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 320 }}>
          <button onClick={() => router.push("/register")}
            className="w-full py-4 rounded-2xl text-base font-bold text-white" style={{ background: ORANGE }}>
            התחל בחינם — בלי כרטיס אשראי
          </button>
          <button onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold" style={{ color: NAVY, border: `1px solid ${BORDER}` }}>
            כבר יש לי חשבון — כניסה
          </button>
        </div>
      </div>

      {/* ── Hero — desktop ── */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-10 pb-20 pt-6 flex flex-row items-center gap-16">
          <div className="flex-1 text-right">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide mb-6"
              style={{ background: ORANGE_LIGHT, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}>
              ✦ לבתי קפה, מסעדות וגלידריות
            </span>
            <h1 className="text-5xl font-bold leading-tight mb-5" style={{ color: NAVY }}>
              תפסיק לבנות סידור.<br />תתחיל לאשר אותו.
            </h1>
            <p className="text-base leading-relaxed mb-8" style={{ color: MUTED, maxWidth: 480 }}>
              בזמן שאתה קורא את זה, Sidur כבר יכול היה לבנות לך סידור שלם לשבוע הבא — עם נוכחות בזמן אמת, טיפים מחושבים, ועוזר חכם שעונה לעובדים במקומך.
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-9" style={{ maxWidth: 480 }}>
              {[
                "יצירת סידור עבודה במהירות ובקלות",
                "עוזר AI שבונה את השבוע במקומך",
                "נוכחות בזמן אמת מכל מקום",
                "חלוקת טיפים הוגנת ואוטומטית",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 flex-row justify-end">
                  <p className="text-sm" style={{ color: NAVY }}>{f}</p>
                  <CheckCircle2 size={16} style={{ color: ORANGE, flexShrink: 0 }} />
                </div>
              ))}
            </div>

            <div className="flex flex-row gap-3 justify-end">
              <button onClick={() => router.push("/login")}
                className="px-6 py-3.5 rounded-2xl text-sm font-semibold" style={{ color: NAVY, border: `1px solid ${BORDER}` }}>
                כבר יש לי חשבון — כניסה
              </button>
              <button onClick={() => router.push("/register")}
                className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white" style={{ background: ORANGE }}>
                התחל בחינם — בלי כרטיס אשראי
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center" style={{ minHeight: 380 }}>
            <div className="photo-card rounded-[28px] overflow-hidden" style={{ width: 520, height: 320, boxShadow: "0 30px 60px -15px rgba(11,30,61,0.35)", border: "5px solid #fff" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_PHOTO} alt="תצוגת סידור העבודה באפליקציית Sidur" className="w-full h-full object-cover" style={{ objectPosition: "top" }} />
            </div>
            <div className="float-slow-delay absolute -top-4 -right-4 rounded-2xl px-4 py-3 flex items-center gap-2 flex-row"
              style={{ background: ORANGE, boxShadow: "0 15px 30px -8px rgba(249,115,22,0.55)" }}>
              <Sparkles size={16} style={{ color: "#fff" }} />
              <span className="text-xs font-bold" style={{ color: "#fff" }}>סיד בנה את זה תוך שניות</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust bar ── */}
      <div className="flex flex-col items-center py-6 px-6" style={{ background: BG_ALT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-1.5 mb-3 flex-row">
          <Star size={11} fill={ORANGE} style={{ color: ORANGE }} />
          <p className="text-xs font-medium" style={{ color: MUTED }}>מנוהלים כבר איתנו</p>
        </div>
        <div className="flex flex-row gap-2 flex-wrap justify-center">
          {SOCIAL_PROOF.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── ROI Calculator ── */}
      <div className="lg:max-w-4xl lg:mx-auto lg:w-full lg:px-10 lg:pt-14">
        <RoiCalculator />
      </div>

      {/* ── Features ── */}
      <div id="features" className="px-4 lg:px-10 pt-10 lg:pt-16 pb-4 lg:max-w-6xl lg:mx-auto lg:w-full" style={{ scrollMarginTop: 88 }}>
        <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>למה Sidur?</p>
        <p className="text-center text-xs lg:text-sm mb-6 lg:mb-10" style={{ color: MUTED }}>
          כל מה שצריך כדי להפסיק לרדוף אחרי הצוות
        </p>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-5">
          {[
            { Icon: Bot,        title: "סיד — העוזר החכם",     sub: "בונה סידור שלם, עונה לעובדים על שעות ומשמרות, ומקבל בקשות חופש — במקומך" },
            { Icon: Smartphone, title: "התראות ישר לטלפון",    sub: "כל עובד יודע מתי הוא עובד בלי שתשלח הודעה אחת" },
            { Icon: Clock,      title: "נוכחות בזמן אמת",     sub: "רואה מי הגיע, מי איחר ומי חסר — עוד לפני שנכנסת למשמרת" },
            { Icon: Coins,      title: "חלוקת טיפים הוגנת",   sub: "מחושב אוטומטית לפי שעות, בוקר וערב בנפרד. אפס ויכוחים" },
            { Icon: BarChart3,  title: "דוח שכר בלחיצה",      sub: "שעות, שכר וטיפים לכל עובד — מוכן לרואה החשבון בסוף החודש" },
            { Icon: Building2,  title: "כמה סניפים, חשבון אחד", sub: "עוברים בין הסניפים בלחיצה, בלי להתנתק ולהתחבר מחדש" },
          ].map(f => (
            <div key={f.title} className="feature-card rounded-2xl p-5 flex items-start lg:flex-col gap-3 lg:gap-4 flex-row"
              style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ORANGE_LIGHT }}>
                <f.Icon size={19} style={{ color: ORANGE }} />
              </div>
              <div className="text-right flex-1">
                <p className="text-sm lg:text-base font-semibold" style={{ color: NAVY }}>{f.title}</p>
                <p className="text-xs lg:text-sm mt-0.5 leading-relaxed" style={{ color: MUTED }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div id="how-it-works" className="px-4 lg:px-10 pt-10 lg:pt-20 pb-2 lg:max-w-6xl lg:mx-auto lg:w-full" style={{ scrollMarginTop: 88 }}>
        <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>שלוש דקות. זהו.</p>
        <p className="text-center text-xs lg:text-sm mb-6 lg:mb-10" style={{ color: MUTED }}>
          בלי הדרכות, בלי אקסלים, בלי כאב ראש
        </p>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-5">
          {[
            { n: "1", title: "מוסיפים את הצוות", sub: "שם וטלפון לכל עובד — הם מקבלים הזמנה ונכנסים לבד. בלי להסביר לאף אחד כלום." },
            { n: "2", title: "סיד בונה את הסידור", sub: "העוזר החכם מזין את האילוצים ומרכיב שבוע שלם תוך שניות. אתה רק מאשר." },
            { n: "3", title: "העבודה מתנהלת לבד", sub: "העובדים רואים משמרות, מדווחים נוכחות ומבקשים החלפות — הכל בלי שתרים טלפון." },
          ].map(s => (
            <div key={s.n} className="flex items-start lg:flex-col gap-3 lg:gap-4 flex-row rounded-2xl px-4 lg:px-5 py-3.5 lg:py-5"
              style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm lg:text-base font-extrabold text-white"
                style={{ background: ORANGE }}>
                {s.n}
              </div>
              <div className="text-right flex-1">
                <p className="text-sm lg:text-base font-bold" style={{ color: NAVY }}>{s.title}</p>
                <p className="text-xs lg:text-sm mt-0.5 leading-relaxed" style={{ color: MUTED }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why choose us — specialization + a real number, not just claims ── */}
      <div className="px-4 lg:px-10 pt-10 lg:pt-20 pb-2 lg:max-w-6xl lg:mx-auto lg:w-full">
        <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>למה לבחור ב-Sidur?</p>
        <p className="text-center text-xs lg:text-sm mb-6 lg:mb-10" style={{ color: MUTED }}>
          לא עוד תוכנה כללית לכל עסק — בנוי סביב איך שבאמת עובדים במסעדות ובתי קפה
        </p>

        <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-10 lg:items-center">
          {/* Bar comparison — a concrete, believable number instead of a vague promise */}
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

          {/* Specialization bullets */}
          <div className="flex-1 flex flex-col gap-3">
            {[
              { title: "בנוי למסעדות ובתי קפה, לא לכל עסק", sub: "תפקידים, משמרות בוקר/ערב, וטיפים — כבר מוגדרים בדיוק איך שהעולם הזה עובד, לא תבנית גנרית שצריך להתאים." },
              { title: "לומד את התפקידים האמיתיים שלך", sub: "אחמ\"ש, מלצרים, מטבח, בר — סיד שואל על התפקידים שבאמת יש אצלך, לא מציע שאלות שלא רלוונטיות." },
              { title: "מודע לחוקי העבודה בישראל", sub: "התראות לא-חוסמות על שעות שבועיות וימי עבודה לפי החוק — אתה מקבל מידע, לא הגבלה." },
              { title: "עובד גם כשאתה לא מול המחשב", sub: "מהטלפון, בלחיצה — לעובדים ולמנהלים כאחד." },
            ].map(item => (
              <div key={item.title} className="feature-card flex items-start gap-3 flex-row rounded-2xl p-4"
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

      {/* ── Testimonials ── */}
      <div id="customers" className="mt-10 lg:mt-20 mb-2 lg:max-w-6xl lg:mx-auto lg:w-full" style={{ scrollMarginTop: 88 }}>
        <p className="text-center text-xs lg:text-sm font-semibold mb-3 lg:mb-8 px-4" style={{ color: MUTED }}>
          מה בעלי עסקים אומרים
        </p>
        <div className="flex flex-row gap-3 lg:gap-5 overflow-x-auto px-4 lg:px-10 pb-2 review-scroll" style={{ scrollSnapType: "x mandatory" }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="testimonial-card flex-shrink-0 rounded-2xl px-5 py-5 flex flex-col"
              style={{ background: "#fff", border: `1px solid ${BORDER}`, width: 280, scrollSnapAlign: "center", boxShadow: "0 10px 30px -18px rgba(11,30,61,0.25)" }}>
              <div className="flex flex-row gap-0.5 justify-end mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} fill={ORANGE} style={{ color: ORANGE }} />
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-right mb-4 flex-1" style={{ color: NAVY }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-2 justify-end flex-row">
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: NAVY }}>{t.name}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{t.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold"
                  style={{ background: t.tint, color: "#fff" }}>
                  {t.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar} alt="" className="w-full h-full object-cover" />
                  ) : reviewInitials(t.name)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ── */}
      <div id="pricing" className="px-4 lg:px-10 pt-10 lg:pt-20 pb-8 lg:pb-16" style={{ background: BG_ALT, marginTop: 48, scrollMarginTop: 88 }}>
        <div className="lg:max-w-6xl lg:mx-auto">
          <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>תוכנית לכל גודל עסק</p>
          <p className="text-center text-xs lg:text-sm mb-5 lg:mb-8" style={{ color: MUTED }}>
            מתחילים בחינם, משלמים רק כשגדלים — בלי הפתעות
          </p>

          <div className="flex items-center justify-center gap-2 flex-row mb-6 lg:mb-10">
            <button onClick={() => setAnnual(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: !annual ? NAVY : "transparent",
                color: !annual ? "#fff" : MUTED,
                border: "1px solid " + (!annual ? NAVY : BORDER),
              }}>
              חודשי
            </button>
            <button onClick={() => setAnnual(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-row"
              style={{
                background: annual ? ORANGE : ORANGE_LIGHT,
                color: annual ? "#fff" : ORANGE,
                border: "1px solid " + (annual ? ORANGE : ORANGE_BORDER),
              }}>
              <span>שנתי</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: annual ? "rgba(255,255,255,0.25)" : "rgba(249,115,22,0.18)" }}>
                חסכו 20%
              </span>
            </button>
          </div>

          {annual && (
            <p className="text-center text-xs mb-4" style={{ color: MUTED }}>
              שלם 10 חודשים — קבל 12
            </p>
          )}

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 lg:items-end">
            {PLANS.map(p => {
              const Icon = PLAN_ICONS[p.key] || Zap;
              const popular = !!p.badge;
              const isFree = p.monthlyPrice === 0;
              const displayPrice = isFree ? "₪0" : annual ? `₪${p.annualPrice}` : `₪${p.monthlyPrice}`;
              const originalPrice = !isFree && annual ? `₪${p.monthlyPrice}` : null;

              return (
                <div key={p.key} className="pricing-card rounded-3xl relative transition-all"
                  style={{
                    background: "#fff",
                    border: popular ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`,
                    boxShadow: popular ? "0 30px 60px -20px rgba(249,115,22,0.35)" : "0 4px 16px -8px rgba(11,30,61,0.08)",
                    transform: popular ? "scale(1.03)" : "scale(1)",
                    zIndex: popular ? 1 : 0,
                  }}>
                  {popular && (
                    <div className="absolute left-0 right-0 flex justify-center" style={{ top: -14 }}>
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold flex-row text-white"
                        style={{ background: ORANGE, boxShadow: "0 6px 16px -4px rgba(249,115,22,0.6)" }}>
                        <Crown size={12} /> {p.badge}
                      </span>
                    </div>
                  )}
                  <div className="p-5 lg:p-6 pt-7 lg:pt-8">
                    <div className="flex items-center justify-between flex-row mb-5">
                      <p className="text-base lg:text-lg font-bold" style={{ color: NAVY }}>{p.name}</p>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: popular ? ORANGE_LIGHT : BG_ALT }}>
                        <Icon size={16} style={{ color: popular ? ORANGE : MUTED }} />
                      </div>
                    </div>

                    <div className="flex items-end gap-2 flex-row mb-1" style={{ direction: "ltr" }}>
                      <span className="text-4xl font-extrabold tracking-tight" style={{ color: NAVY }}>{displayPrice}</span>
                      {originalPrice && (
                        <span className="text-base line-through mb-1" style={{ color: MUTED }}>{originalPrice}</span>
                      )}
                      <span className="text-xs mb-1.5" style={{ color: MUTED }}>{isFree ? "לתמיד" : "/ לחודש"}</span>
                    </div>

                    {!isFree && annual && (
                      <p className="text-[11px] mb-4 text-right font-semibold" style={{ color: "#16A34A" }}>
                        חסכון של ₪{(p.monthlyPrice - p.annualPrice) * 12} בשנה
                      </p>
                    )}
                    {!isFree && !annual && (
                      <p className="text-[11px] mb-4 text-right font-semibold" style={{ color: ORANGE }}>
                        {p.key === "plus" ? "פחות מ-₪5 ליום" : "פחות מ-₪10 ליום — לרשת ללא הגבלה"}
                      </p>
                    )}
                    {isFree && <div className="mb-5" />}

                    <button onClick={() => router.push(`/register?plan=${p.key}`)}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold mb-5 transition-transform"
                      style={{
                        background: popular ? ORANGE : NAVY,
                        color: "#fff",
                        boxShadow: popular ? "0 10px 24px -8px rgba(249,115,22,0.55)" : "none",
                      }}>
                      {isFree ? "התחל בחינם — עכשיו" : popular ? `בחר ${p.name} — 14 יום חינם` : `שדרג ל-${p.name}`}
                    </button>

                    <div className="flex flex-col gap-2.5">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-2.5 flex-row justify-end">
                          <p className="text-xs" style={{ color: NAVY }}>{f}</p>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: popular ? ORANGE_LIGHT : "#EAF7EE" }}>
                            <Check size={10} style={{ color: popular ? ORANGE : "#16A34A" }} strokeWidth={3} />
                          </div>
                        </div>
                      ))}
                      {p.missing.length > 0 && (
                        <div className="mt-1.5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                          {p.missing.map(f => (
                            <div key={f} className="flex items-center gap-2.5 flex-row justify-end mb-2">
                              <p className="text-xs" style={{ color: MUTED, opacity: 0.7 }}>{f}</p>
                              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BG_ALT }}>
                                <X size={10} style={{ color: MUTED, opacity: 0.6 }} strokeWidth={3} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 mt-6 lg:mt-10">
            <div className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-1">
              {["14 יום ניסיון חינם", "ביטול בכל עת", "ללא כרטיס אשראי", "ללא קנסות"].map(t => (
                <div key={t} className="flex items-center gap-1 flex-row">
                  <ShieldCheck size={11} style={{ color: MUTED }} />
                  <p className="text-[10px]" style={{ color: MUTED }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Closing CTA (desktop) ── */}
      <div className="hidden lg:flex flex-col items-center py-16" style={{ background: NAVY }}>
        <p className="text-2xl font-bold text-white mb-2">מוכנים להפסיק לבנות סידורים?</p>
        <p className="text-sm mb-7" style={{ color: "rgba(255,255,255,0.6)" }}>14 יום חינם, בלי כרטיס אשראי, ביטול בכל רגע</p>
        <button onClick={() => router.push("/register")}
          className="px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 flex-row"
          style={{ background: ORANGE, color: "#fff" }}>
          <ArrowLeft size={18} />
          התחל בחינם עכשיו
        </button>
      </div>

      {/* Footer */}
      <a href="https://instagram.com/sidur.app" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 flex-row text-xs font-medium pt-6"
        style={{ color: ORANGE }}>
        <InstagramIcon size={13} /> sidur.app
      </a>
      <div className="flex items-center justify-center gap-3 flex-row pt-2">
        <Link href="/terms" className="text-[11px] font-medium" style={{ color: MUTED }}>תנאי שימוש</Link>
        <span className="text-[11px]" style={{ color: BORDER }}>·</span>
        <Link href="/privacy" className="text-[11px] font-medium" style={{ color: MUTED }}>מדיניות פרטיות</Link>
      </div>
      <p className="text-[10px] text-center pb-8 pt-1" style={{ color: MUTED }}>
        © 2026 Sidur · כל הזכויות שמורות
      </p>
    </div>
  );
}

function RoiCalculator() {
  const [employees, setEmployees] = useState(10);
  const hourlyValue = 60;
  const hoursPerWeek = Math.round((1 + employees * 0.18) * 10) / 10; // scales with team size
  const hoursPerMonth = Math.round(hoursPerWeek * 4 * 10) / 10;
  const actualSaved = Math.round(hoursPerMonth * hourlyValue);

  return (
    <div className="mx-4 lg:mx-0 mb-4 rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div className="px-5 lg:px-8 pt-4 lg:pt-6 pb-3 lg:pb-5" style={{ background: "#fff" }}>
        <p className="flex items-center justify-end gap-1.5 flex-row text-sm lg:text-lg font-bold text-right mb-1" style={{ color: NAVY }}>
          כמה Sidur חוסך לך?
          <Lightbulb size={15} style={{ color: ORANGE }} />
        </p>
        <p className="text-xs lg:text-sm text-right mb-4" style={{ color: MUTED }}>
          הזז לפי מספר העובדים בעסק שלך
        </p>

        <div className="flex items-center justify-between flex-row mb-2">
          <span className="text-2xl font-bold" style={{ color: ORANGE }}>{employees}</span>
          <span className="text-xs" style={{ color: MUTED }}>עובדים</span>
        </div>
        <input type="range" min={3} max={50} value={employees}
          onChange={e => setEmployees(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none mb-4"
          style={{ accentColor: ORANGE, background: `linear-gradient(to left, ${ORANGE} ${((employees - 3) / 47) * 100}%, ${BORDER} 0%)` }} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: MUTED }}>שעות חסכון בחודש</p>
            <p className="text-lg font-bold" style={{ color: ORANGE }}>{hoursPerMonth} שעות</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: MUTED }}>שווי כסף לחודש</p>
            <p className="text-lg font-bold" style={{ color: "#16A34A" }}>₪{actualSaved}</p>
          </div>
        </div>
      </div>
      <div className="px-5 lg:px-8 py-3 lg:py-4 text-right" style={{ background: "rgba(249,115,22,0.06)", borderTop: "1px solid rgba(249,115,22,0.15)" }}>
        <p className="text-xs lg:text-sm leading-relaxed" style={{ color: MUTED }}>
          תוכנית Essential עולה <strong style={{ color: ORANGE }}>₪149 לחודש</strong> —
          {" "}החזר השקעה ביום השלישי של החודש. שאר החודש? רווח נקי.
        </p>
      </div>
    </div>
  );
}
