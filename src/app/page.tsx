"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Zap, Rocket, Crown, ShieldCheck, Sparkles, Star, X, Bot, Lightbulb, CheckCircle2, ArrowLeft, Wand2, Fingerprint } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import LandingNav from "@/components/LandingNav";
import LandingSidBot from "@/components/LandingSidBot";
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


const HOW_IT_WORKS_STEPS = [
  {
    n: "1", Icon: Wand2, title: "סידור עבודה בונה את עצמו",
    sub: "מזינים אילוצים וזמינות פעם אחת, וה-AI מרכיב סידור שבועי שלם תוך שניות — מחולק הוגן בין בוקר לערב, בלי להתנגש באף בקשת חופש. אתה רק מאשר, במקום לבזבז שעה בכל שבוע על אקסל.",
  },
  {
    n: "2", Icon: Bot, title: "סיד — עוזר AI שעונה במקומך",
    sub: "עובד שואל \"מתי המשמרת שלי\" או \"כמה טיפים עשיתי\" — וסיד עונה לו, 24/7, בלי שתרים טלפון בשעה 23:00. גם בונה סידורים, מזהה בקשות חופש, ומתריע על התנגשויות לפני שהן קורות.",
  },
  {
    n: "3", Icon: Fingerprint, title: "נוכחות אמיתית, בזמן אמת",
    sub: "העובדים מדווחים כניסה ויציאה בטביעת אצבע דיגיטלית מהטלפון, ואתה רואה בדיוק מי הגיע, מי איחר ומי בכלל לא הגיע — תוך שנייה. אופציונלי גם עם מיקום חי (GPS) בזמן המשמרת, לשקט נפשי מלא.",
  },
];

export default function Splash() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [sidSide, setSidSide] = useState<"left" | "right">("right");

  useEffect(() => {
    const session = localStorage.getItem("shiftpro_session");
    if (session) router.replace("/dashboard");
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#fff" }}>
      <AccessibilityWidget shiftUp={sidSide === "left"} />
      <LandingSidBot onSideChange={setSidSide} />

      <LandingNav />

      {/* ── Hero — mobile ── */}
      <div className="flex lg:hidden flex-col items-center pb-8 px-6 text-center">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide mb-5"
          style={{ background: ORANGE_LIGHT, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}>
          ✦ מערכת ניהול משמרות מבוססת AI
        </span>

        <div className="relative mb-10 flex items-center justify-center w-full" style={{ maxWidth: 460, aspectRatio: "460 / 360" }}>
          <div className="absolute rounded-full" style={{ width: "88%", aspectRatio: "1 / 1", background: "radial-gradient(circle, rgba(249,115,22,0.16), transparent 70%)", filter: "blur(10px)" }} />
          <div className="hero-frame relative rounded-2xl overflow-hidden w-full h-full" style={{ background: "#fff", boxShadow: "0 30px 70px -20px rgba(11,30,61,0.28), 0 1px 0 rgba(11,30,61,0.04)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-1.5 px-3 flex-row" style={{ height: 24, background: "#F7F8FB", borderBottom: `1px solid ${BORDER}` }}>
              <span className="rounded-full" style={{ width: 7, height: 7, background: "#E7EAF0" }} />
              <span className="rounded-full" style={{ width: 7, height: 7, background: "#E7EAF0" }} />
              <span className="rounded-full" style={{ width: 7, height: 7, background: "#E7EAF0" }} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/carousel-schedule.jpg" alt="תצוגת סידור עבודה באפליקציית Sidur" className="w-full object-contain" style={{ height: "calc(100% - 24px)", objectPosition: "top" }} />
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
            className="w-full py-4 rounded-2xl text-base font-bold text-white whitespace-nowrap" style={{ background: ORANGE }}>
            התחלה בחינם
          </button>
          <button onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold whitespace-nowrap" style={{ color: NAVY, border: `1px solid ${BORDER}` }}>
            כבר יש לי חשבון
          </button>
        </div>
      </div>

      {/* ── Hero — desktop ── */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto px-10 pb-20 pt-6 flex flex-row items-center gap-16">
          <div className="flex-1 text-right">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide mb-6"
              style={{ background: ORANGE_LIGHT, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}>
              ✦ מערכת ניהול משמרות מבוססת AI
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
                  <CheckCircle2 size={16} style={{ color: ORANGE, flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: NAVY }}>{f}</p>
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

          <div className="flex-1 relative flex items-center justify-center" style={{ minHeight: 460 }}>
            <div className="absolute rounded-full" style={{ width: 560, height: 560, background: "radial-gradient(circle, rgba(249,115,22,0.14), transparent 70%)", filter: "blur(20px)" }} />
            <div className="hero-frame relative rounded-2xl overflow-hidden" style={{ width: 620, height: 420, background: "#fff", boxShadow: "0 40px 90px -25px rgba(11,30,61,0.3), 0 1px 0 rgba(11,30,61,0.04)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 px-4 flex-row" style={{ height: 34, background: "#F7F8FB", borderBottom: `1px solid ${BORDER}` }}>
                <span className="rounded-full" style={{ width: 9, height: 9, background: "#E7EAF0" }} />
                <span className="rounded-full" style={{ width: 9, height: 9, background: "#E7EAF0" }} />
                <span className="rounded-full" style={{ width: 9, height: 9, background: "#E7EAF0" }} />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/carousel-schedule.jpg" alt="תצוגת סידור עבודה באפליקציית Sidur" className="w-full object-contain" style={{ height: "calc(100% - 34px)", objectPosition: "top" }} />
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

      {/* ── How it works ── */}
      <div id="how-it-works" className="px-4 lg:px-10 pt-10 lg:pt-20 pb-2 lg:max-w-6xl lg:mx-auto lg:w-full relative" style={{ scrollMarginTop: 88 }}>
        <div className="flex justify-center mb-3 lg:mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold flex-row"
            style={{ background: ORANGE_LIGHT, color: ORANGE, border: `1px solid ${ORANGE_BORDER}` }}>
            <Sparkles size={11} /> למה סידור
          </span>
        </div>
        <p className="text-center text-xl lg:text-3xl font-bold mb-1 lg:mb-2" style={{ color: NAVY }}>שלושה דברים שישנו לך את היום</p>
        <p className="text-center text-xs lg:text-sm mb-8 lg:mb-14" style={{ color: MUTED }}>
          לא עוד תוכנה כללית — הבנוי בדיוק בשביל בתי קפה, מסעדות וגלידריות
        </p>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-5 lg:gap-6 relative">
          {HOW_IT_WORKS_STEPS.map((s, i) => (
            <div key={s.n} className="how-it-works-card flex flex-col rounded-2xl p-5 lg:p-6"
              style={{
                background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 16px 36px -22px rgba(11,30,61,0.22)",
                animationDelay: `${i * 0.15}s`,
              }}>

              <div className="flex items-center justify-between flex-row mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: ORANGE_LIGHT }}>
                  <s.Icon size={22} style={{ color: ORANGE }} />
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold text-white"
                  style={{ background: ORANGE }}>
                  {s.n}
                </div>
              </div>

              <div className="text-right flex-1">
                <p className="text-base lg:text-lg font-bold mb-1.5" style={{ color: NAVY }}>{s.title}</p>
                <p className="text-xs lg:text-sm leading-relaxed" style={{ color: MUTED }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .how-it-works-card {
            animation: how-it-works-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
            transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease;
          }
          .how-it-works-card:hover { transform: translateY(-4px); box-shadow: 0 22px 44px -20px rgba(11,30,61,0.3); }
          @keyframes how-it-works-in {
            0% { opacity: 0; transform: translateY(18px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          button {
            transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease, opacity 0.15s ease;
          }
          button:hover:not(:disabled) { transform: scale(1.035); }
          button:active:not(:disabled) { transform: scale(0.965); }
        `}</style>

        <div className="flex justify-center mt-6 lg:mt-10">
          <Link href="/features" className="flex items-center gap-1.5 text-sm font-bold flex-row" style={{ color: ORANGE }}>
            לכל התכונות והפרטים המלאים <ArrowLeft size={15} />
          </Link>
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
                background: !annual ? ORANGE : "transparent",
                color: !annual ? "#fff" : MUTED,
                border: "1px solid " + (!annual ? ORANGE : BORDER),
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

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 lg:items-stretch">
            {PLANS.map(p => {
              const Icon = PLAN_ICONS[p.key] || Zap;
              const popular = !!p.badge;
              const isFree = p.monthlyPrice === 0;
              const displayPrice = isFree ? "₪0" : annual ? `₪${p.annualPrice}` : `₪${p.monthlyPrice}`;
              const originalPrice = !isFree && annual ? `₪${p.monthlyPrice}` : null;

              return (
                <div key={p.key} className="pricing-card rounded-3xl relative transition-all h-full flex flex-col"
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
                  <div className="p-5 lg:p-6 pt-7 lg:pt-8 flex-1 flex flex-col">
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
                      className="w-full py-3.5 rounded-2xl text-sm font-bold mb-5 transition-transform glow-cta"
                      style={{
                        background: ORANGE,
                        color: "#fff",
                        boxShadow: "0 10px 24px -8px rgba(249,115,22,0.55)",
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
        <p className="flex items-center justify-center gap-1.5 flex-row text-sm lg:text-lg font-bold text-center mb-1" style={{ color: NAVY }}>
          כמה Sidur חוסך לך?
          <Lightbulb size={15} style={{ color: ORANGE }} />
        </p>
        <p className="text-xs lg:text-sm text-center mb-4" style={{ color: MUTED }}>
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

