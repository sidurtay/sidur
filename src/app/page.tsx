"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Users, Coins, BarChart3, Check, Zap, Rocket, Crown, ShieldCheck, Sparkles, Clock, Star, X, MessageCircle, Bot, Smartphone, Building2, Lightbulb } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";
import { PLANS } from "@/lib/plans";

const PLAN_ICONS: Record<string, typeof Zap> = { starter: Zap, plus: Rocket, business: Crown };

const BUSINESS_TYPES = [
  "קפה ומסעדות", "גלידריות", "סלוני יופי", "ספרות",
  "חנויות בגדים", "חדרי כושר", "מכולות", "שירותי ניקיון",
];

const SOCIAL_PROOF = [
  "קפה קפה נהריה", "גלידת הגן תל-אביב", "ספר בסטייל חיפה",
  "כושר פלוס ירושלים", "פיצה הגינה", "בוטיק רנה",
];

export default function Splash() {
  const router = useRouter();
  const [checked, setChecked]   = useState(false);
  const [annual, setAnnual]     = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("shiftpro_session");
    if (session) router.replace("/dashboard");
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center pt-14 pb-10 px-6 text-center"
        style={{ background: "var(--navy)" }}>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide mb-5"
          style={{ background: "rgba(249,115,22,0.15)", color: "var(--blue)", border: "1px solid rgba(249,115,22,0.3)" }}>
          ✦ לכל עסק שיש בו עובדים
        </span>
        <span className="text-2xl font-extrabold tracking-tight mb-5" style={{ color: "#fff", direction: "ltr" }}>
          Sidur
        </span>
        <h1 className="text-white text-2xl font-bold leading-tight mb-3">
          תפסיק לבנות סידור.<br />תתחיל לאשר אותו.
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 300 }}>
          Sidur בונה לך סידור עבודה שלם תוך שניות, עוקב אחרי נוכחות בזמן אמת, ומתריע לפני שמשהו ידלוף לך בין הידיים
        </p>
        <div className="flex flex-row gap-1.5 mb-7 flex-wrap justify-center" style={{ maxWidth: 340 }}>
          {BUSINESS_TYPES.map(b => (
            <span key={b} className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {b}
            </span>
          ))}
        </div>
        <div className="flex flex-row flex-wrap justify-center gap-2 mb-8">
          {[
            { icon: <Sparkles size={11} />,      label: "AI בונה סידור" },
            { icon: <CalendarDays size={11} />,  label: "סידור עבודה" },
            { icon: <Clock size={11} />,         label: "נוכחות חכמה" },
            { icon: <Coins size={11} />,         label: "חישוב טיפים" },
            { icon: <BarChart3 size={11} />,     label: "דוחות שעות" },
            { icon: <MessageCircle size={11} />, label: "התראות לעובדים" },
          ].map(f => (
            <span key={f.label} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}>
              {f.icon} {f.label}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 320 }}>
          <button onClick={() => router.push("/register")}
            className="w-full py-4 rounded-2xl text-base font-bold"
            style={{ background: "#fff", color: "var(--navy)" }}>
            התחל בחינם — בלי כרטיס אשראי
          </button>
          <button onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            כבר יש לי חשבון — כניסה
          </button>
        </div>
      </div>

      {/* ── Social proof ── */}
      <div className="flex flex-col items-center py-5 px-6">
        <div className="flex items-center gap-1.5 mb-3 flex-row">
          <Star size={11} fill="#F97316" style={{ color: "#F97316" }} />
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>מנוהלים כבר איתנו</p>
        </div>
        <div className="flex flex-row gap-2 flex-wrap justify-center">
          {SOCIAL_PROOF.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── ROI Calculator ── */}
      <RoiCalculator />

      {/* ── Features ── */}
      <div className="mx-4 mb-4 rounded-2xl px-5 py-4 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-bold text-right" style={{ color: "var(--text-main)" }}>למה Sidur?</p>
        {[
          { Icon: Bot,        title: "AI שבונה את הסידור לך",     sub: "מזין את האילוצים פעם אחת — הסידור מוכן תוך שניות" },
          { Icon: Smartphone, title: "התראות לעובדים",              sub: "כל עובד מקבל התראה על המשמרת שלו ישר לטלפון" },
          { Icon: Clock,      title: "נוכחות בזמן אמת",           sub: "כניסה ויציאה דרך QR, טביעת אצבע, או ידני" },
          { Icon: Coins,      title: "חלוקת טיפים הוגנת",         sub: "חישוב אוטומטי לפי שעות — בוקר וערב בנפרד" },
          { Icon: BarChart3,  title: "דוחות מוכנים לשכר",         sub: "ייצוא ל-Excel בלחיצה אחת, בלי להעתיק ידנית" },
          { Icon: Building2,  title: "מולטי-סניף",                sub: "נהל כמה סניפים מחשבון אחד" },
        ].map(f => (
          <div key={f.title} className="flex items-center gap-3 flex-row">
            <div className="text-right flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{f.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{f.sub}</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--blue-light)" }}>
              <f.Icon size={17} style={{ color: "var(--blue)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Pricing ── */}
      <div className="px-4 pt-8 pb-8">
        <p className="text-center text-xl font-bold mb-1" style={{ color: "var(--text-main)" }}>תוכנית לכל גודל עסק</p>
        <p className="text-center text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
          מתחילים בחינם, משלמים רק כשגדלים — בלי הפתעות
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-2 flex-row mb-6">
          <button onClick={() => setAnnual(false)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: !annual ? "var(--navy)" : "transparent",
              color: !annual ? "#fff" : "var(--text-secondary)",
              border: "1px solid " + (!annual ? "var(--navy)" : "var(--border)"),
            }}>
            חודשי
          </button>
          <button onClick={() => setAnnual(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-row"
            style={{
              background: annual ? "var(--blue)" : "var(--blue-light)",
              color: annual ? "#fff" : "var(--blue)",
              border: "1px solid " + (annual ? "var(--blue)" : "var(--blue-border)"),
            }}>
            <span>שנתי</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: annual ? "rgba(255,255,255,0.25)" : "rgba(249,115,22,0.18)" }}>
              חסכו 20%
            </span>
          </button>
        </div>

        {annual && (
          <p className="text-center text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            שלם 10 חודשים — קבל 12
          </p>
        )}

        <div className="flex flex-col gap-3">
          {PLANS.map(p => {
            const Icon = PLAN_ICONS[p.key] || Zap;
            const popular = !!p.badge;
            const isFree = p.monthlyPrice === 0;
            const displayPrice = isFree ? "₪0" : annual ? `₪${p.annualPrice}` : `₪${p.monthlyPrice}`;
            const originalPrice = !isFree && annual ? `₪${p.monthlyPrice}` : null;

            return (
              <div key={p.key} className="rounded-2xl relative"
                style={{
                  background: "var(--surface)",
                  border: popular ? "1.5px solid var(--blue)" : "1px solid var(--border)",
                }}>
                {popular && (
                  <div className="absolute -top-3 right-5">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold flex-row"
                      style={{ background: "var(--blue)", color: "#fff" }}>
                      <Crown size={11} /> {p.badge}
                    </span>
                  </div>
                )}
                <div className="p-5 pt-6">
                  <div className="flex items-center justify-between flex-row mb-4">
                    <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>{p.name}</p>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: popular ? "var(--blue-light)" : "var(--gray-bg)" }}>
                      <Icon size={15} style={{ color: popular ? "var(--blue)" : "var(--text-secondary)" }} />
                    </div>
                  </div>

                  <div className="flex items-end gap-2 flex-row mb-1" style={{ direction: "ltr" }}>
                    <span className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>{displayPrice}</span>
                    {originalPrice && (
                      <span className="text-base line-through mb-0.5" style={{ color: "var(--text-secondary)" }}>
                        {originalPrice}
                      </span>
                    )}
                    <span className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{isFree ? "לתמיד" : "לחודש"}</span>
                  </div>

                  {!isFree && annual && (
                    <p className="text-[10px] mb-3 text-right" style={{ color: "var(--green)" }}>
                      חסכון של ₪{(p.monthlyPrice - p.annualPrice) * 12} בשנה
                    </p>
                  )}
                  {!isFree && !annual && (
                    <p className="text-[10px] mb-3 text-right" style={{ color: "var(--blue)" }}>
                      {p.key === "plus" ? "פחות מ-₪5 ליום" : "פחות מ-₪10 ליום — לרשת ללא הגבלה"}
                    </p>
                  )}
                  {isFree && <div className="mb-4" />}

                  <div className="flex flex-col gap-2 mb-4">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2 flex-row justify-end">
                        <p className="text-xs" style={{ color: "var(--text-main)" }}>{f}</p>
                        <Check size={13} style={{ color: "var(--blue)", flexShrink: 0 }} strokeWidth={2.5} />
                      </div>
                    ))}
                    {p.missing.length > 0 && (
                      <div className="mt-1 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                        {p.missing.map(f => (
                          <div key={f} className="flex items-center gap-2 flex-row justify-end mb-1.5">
                            <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.55 }}>{f}</p>
                            <X size={11} style={{ color: "var(--text-secondary)", opacity: 0.4, flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => router.push(`/register?plan=${p.key}`)}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{
                      background: popular ? "var(--blue)" : "var(--gray-bg)",
                      color: popular ? "#fff" : "var(--text-main)",
                      border: popular ? "none" : "1px solid var(--border)",
                    }}>
                    {isFree ? "התחל בחינם — עכשיו" : popular ? `בחר ${p.name} — התחל 14 יום חינם` : `שדרג ל-${p.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <div className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-1">
            {[
              "14 יום ניסיון חינם",
              "ביטול בכל עת",
              "ללא כרטיס אשראי",
              "ללא קנסות",
            ].map(t => (
              <div key={t} className="flex items-center gap-1 flex-row">
                <ShieldCheck size={11} style={{ color: "var(--text-secondary)" }} />
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <a href="https://instagram.com/sidur.app" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 flex-row text-xs font-medium pt-4"
        style={{ color: "var(--blue)" }}>
        <InstagramIcon size={13} /> sidur.app
      </a>
      <div className="flex items-center justify-center gap-3 flex-row pt-2">
        <Link href="/terms" className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>תנאי שימוש</Link>
        <span className="text-[11px]" style={{ color: "var(--border)" }}>·</span>
        <Link href="/privacy" className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>מדיניות פרטיות</Link>
      </div>
      <p className="text-[10px] text-center pb-8 pt-1" style={{ color: "var(--text-secondary)" }}>
        © 2026 Sidur · כל הזכויות שמורות
      </p>
    </div>
  );
}

function RoiCalculator() {
  const [employees, setEmployees] = useState(10);
  const hourlyValue   = 60;
  const hoursPerWeek  = Math.round((1 + employees * 0.18) * 10) / 10; // scales with team size
  const hoursPerMonth = Math.round(hoursPerWeek * 4 * 10) / 10;
  const actualSaved   = Math.round(hoursPerMonth * hourlyValue);

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-5 pt-4 pb-3" style={{ background: "var(--surface)" }}>
        <p className="flex items-center justify-end gap-1.5 flex-row text-sm font-bold text-right mb-1" style={{ color: "var(--text-main)" }}>
          כמה Sidur חוסך לך?
          <Lightbulb size={15} style={{ color: "#F97316" }} />
        </p>
        <p className="text-xs text-right mb-4" style={{ color: "var(--text-secondary)" }}>
          הזז לפי מספר העובדים בעסק שלך
        </p>

        <div className="flex items-center justify-between flex-row mb-2">
          <span className="text-2xl font-bold" style={{ color: "#F97316" }}>{employees}</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>עובדים</span>
        </div>
        <input type="range" min={3} max={50} value={employees}
          onChange={e => setEmployees(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none mb-4"
          style={{ accentColor: "#F97316", background: `linear-gradient(to left, #F97316 ${((employees - 3) / 47) * 100}%, var(--border) 0%)` }} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-secondary)" }}>שעות חסכון בחודש</p>
            <p className="text-lg font-bold" style={{ color: "#F97316" }}>{hoursPerMonth} שעות</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-secondary)" }}>שווי כסף לחודש</p>
            <p className="text-lg font-bold" style={{ color: "#4ADE80" }}>₪{actualSaved}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 text-right" style={{ background: "rgba(249,115,22,0.06)", borderTop: "1px solid rgba(249,115,22,0.15)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          תוכנית Essential עולה <strong style={{ color: "#F97316" }}>₪149 לחודש</strong> —
          {" "}החזר השקעה ביום השלישי של החודש. שאר החודש? רווח נקי.
        </p>
      </div>
    </div>
  );
}
