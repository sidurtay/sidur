"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Menu, X, ChevronDown, Users, Building2, ShieldCheck, Bot, MessageCircle, Megaphone, CalendarOff, Zap, CalendarDays, MapPin, Coins, BarChart3, ArrowLeft } from "lucide-react";

const NAVY = "#0B1E3D";
const MUTED = "#5B6472";
const ORANGE = "#F97316";
const BORDER = "#E7EAF0";
const BG_ALT = "#F7F8FB";

const MEGA_MENU_COLUMNS = [
  {
    title: "ניהול צוות", Icon: Users,
    items: [
      { label: "עובדים ותפקידים", Icon: Users, slug: "employees" },
      { label: "מבנה סניפים", Icon: Building2, slug: "branches" },
      { label: "הרשאות מנהלים", Icon: ShieldCheck, slug: "permissions" },
    ],
  },
  {
    title: "תקשורת", Icon: MessageCircle,
    items: [
      { label: "סיד — עוזר AI", Icon: Bot, slug: "sid-ai" },
      { label: "הודעות לצוות", Icon: Megaphone, slug: "announcements" },
      { label: "בקשות חופש והחלפות", Icon: CalendarOff, slug: "time-off" },
    ],
  },
  {
    title: "תפעול", Icon: Zap,
    items: [
      { label: "סידור עבודה חכם", Icon: CalendarDays, slug: "scheduling" },
      { label: "נוכחות ו-GPS", Icon: MapPin, slug: "attendance" },
      { label: "חלוקת טיפים", Icon: Coins, slug: "tips" },
      { label: "דוח שכר", Icon: BarChart3, slug: "payroll" },
    ],
  },
];

function FeaturesMegaMenu() {
  return (
    <div className="absolute top-full right-1/2 pt-4" style={{ transform: "translateX(50%)", width: 620, zIndex: 100 }}>
      <div className="rounded-2xl p-7" style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 30px 70px -20px rgba(11,30,61,0.28)" }}>
        <div className="grid grid-cols-3 gap-8">
          {MEGA_MENU_COLUMNS.map(col => (
            <div key={col.title}>
              <p className="text-xs font-bold mb-3 pb-2 text-right" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>{col.title}</p>
              <div className="flex flex-col gap-3">
                {col.items.map(item => (
                  <Link key={item.label} href={`/features#${item.slug}`} className="flex items-center gap-2 flex-row text-sm font-medium"
                    style={{ color: NAVY }}>
                    <item.Icon size={15} style={{ color: MUTED, flexShrink: 0 }} />
                    <span className="text-right flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <Link href="/features" className="flex items-center gap-1.5 text-sm font-bold flex-row" style={{ color: ORANGE }}>
            לכל התכונות והפרטים המלאים <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Shared top nav for every public marketing page (landing + /features) — kept
// as a single component so the header always looks and behaves identically
// no matter which page a visitor lands on.
export default function LandingNav() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);

  return (
    <>
      {/* ── Top bar (desktop) ── */}
      <div className="hidden lg:flex flex-col w-full sticky top-0" style={{ borderBottom: `1px solid ${BORDER}`, background: "#fff", zIndex: 98 }}>
        <div className="flex items-center justify-center gap-1.5 py-1.5 flex-row" style={{ background: NAVY }}>
          <Star size={10} fill={ORANGE} style={{ color: ORANGE }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            הדור הבא של ניהול משמרות — נבנה עם בעלי מסעדות ובתי קפה אמיתיים בישראל
          </span>
        </div>
        <div className="relative flex items-center justify-between px-10 py-4 max-w-6xl mx-auto w-full">
          <Link href="/" className="text-xl font-extrabold tracking-tight" style={{ color: NAVY, direction: "ltr" }}>Sidur</Link>
          <div className="flex items-center gap-7 flex-row">
            <div className="relative">
              <button onClick={() => setFeaturesMenuOpen(v => !v)} className="flex items-center gap-1 text-sm font-medium flex-row" style={{ color: NAVY }}>
                המוצר
                <ChevronDown size={14} style={{ transform: featuresMenuOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
              </button>
              {featuresMenuOpen && (
                <>
                  <div className="fixed inset-0" style={{ zIndex: 99 }} onClick={() => setFeaturesMenuOpen(false)} />
                  <FeaturesMegaMenu />
                </>
              )}
            </div>
            <Link href="/#customers" className="text-sm font-medium" style={{ color: NAVY }}>לקוחות שלנו</Link>
            <Link href="/#pricing" className="text-sm font-medium" style={{ color: NAVY }}>מחירים</Link>
            <a href="mailto:sidur.support@gmail.com" className="text-sm font-medium" style={{ color: NAVY }}>צור קשר</a>
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

      {/* ── Top bar (mobile) ── */}
      <div className="flex lg:hidden items-center justify-between px-5 py-4 sticky top-0" style={{ background: "#fff", zIndex: 98, borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => setMobileMenuOpen(true)} aria-label="תפריט"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: BG_ALT, border: `1px solid ${BORDER}` }}>
          <Menu size={17} style={{ color: NAVY }} />
        </button>
        <Link href="/" className="text-lg font-extrabold tracking-tight" style={{ color: NAVY, direction: "ltr" }}>Sidur</Link>
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
                { href: "/features", label: "המוצר" },
                { href: "/#customers", label: "לקוחות שלנו" },
                { href: "/#pricing", label: "מחירים" },
                { href: "mailto:sidur.support@gmail.com", label: "צור קשר" },
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
    </>
  );
}
