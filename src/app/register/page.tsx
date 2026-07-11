"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X, Sparkles, Coffee, UtensilsCrossed, IceCream2, Beer, Croissant, Truck, ChefHat, Building2, Lock, Users, CalendarDays, Bot } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/businessConfig";
import { PLANS } from "@/lib/plans";
import Image from "next/image";

const BUSINESS_TYPES = [
  { key: "cafe",       label: "בית קפה",        Icon: Coffee },
  { key: "restaurant", label: "מסעדה",           Icon: UtensilsCrossed },
  { key: "icecream",   label: "גלידריה",         Icon: IceCream2 },
  { key: "bar",        label: "בר / פאב",        Icon: Beer },
  { key: "bakery",     label: "מאפייה",          Icon: Croissant },
  { key: "foodtruck",  label: "פודטראק",         Icon: Truck },
  { key: "catering",   label: "קייטרינג",        Icon: ChefHat },
  { key: "other",      label: "אחר",             Icon: Building2 },
];

// A distinct tint per business-type icon chip, cycled — reads as more
// deliberate/designed than one flat gray icon color for every option.
const TYPE_TINTS = [
  { bg: "#FFE4D1", fg: "#C2410C" },
  { bg: "#FDECC8", fg: "#92400E" },
  { bg: "#E0F2E9", fg: "#15803D" },
  { bg: "#FCE1D6", fg: "#9A3412" },
  { bg: "#E4E9FB", fg: "#3730A3" },
  { bg: "#FBEAD1", fg: "#B45309" },
  { bg: "#FDE2E9", fg: "#BE185D" },
  { bg: "#F5EDE4", fg: "#78350F" },
];

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
  return <Suspense><Register /></Suspense>;
}

function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  const [bizName,     setBizName]     = useState("");
  const [bizCity,     setBizCity]     = useState("");
  const [bizType,     setBizType]     = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");

  const requestedPlan = searchParams.get("plan");
  const [plan, setPlan] = useState(
    PLANS.some(p => p.key === requestedPlan) ? requestedPlan! : "business"
  );

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [showPlanInfo, setShowPlanInfo] = useState(false);

  function next() { setStep(s => (s < 4 ? (s + 1) as Step : s)); }
  function back() {
    if (step === 1) { router.back(); return; }
    setStep(s => (s - 1) as Step);
  }

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + "-" + digits.slice(3);
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  function canNext() {
    if (step === 1) return bizName.trim() && bizCity.trim() && bizType;
    if (step === 2) return managerName.trim() && phone.replace(/\D/g, "").length === 10 && isValidEmail(email) && password.length >= 6;
    if (step === 3) return !!plan;
    return false;
  }

  async function finish() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizName, bizCity, bizType, managerName, phone, email, password, plan }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "ההרשמה נכשלה, נסה שוב"); setLoading(false); return; }
      localStorage.setItem("shiftpro_session", JSON.stringify({
        businessId: data.businessId, personId: data.personId,
        businessName: data.businessName, name: data.name, phone: data.phone, email, password, plan,
        bizType, loginAt: Date.now(), role: "manager",
      }));
      localStorage.setItem("shiftpro_business_config", JSON.stringify({
        permanent: { ...DEFAULT_CONFIG, bizName, initialized: true },
      }));
      setStep(4);
    } catch { setError("שגיאת רשת — בדוק חיבור ונסה שוב"); }
    finally { setLoading(false); }
  }

  const STEP_LABELS = ["", "פרטי העסק", "פרטי המנהל", "בחר תוכנית"];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* ── Header ── */}
      {step < 4 && (
        <div className="sticky top-0 z-20 flex flex-col overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #F97316, #FB8B3D)" }}>
          <div className="register-header-glow" />
          <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-row relative">
            <button onClick={back}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
              style={{ background: "rgba(255,255,255,0.16)" }}>
              <ArrowRight size={17} color="white" />
            </button>
            <p className="text-white font-bold text-sm" style={{ direction: "ltr" }}>Sidur</p>
          </div>

          {/* Progress bar */}
          <div className="flex flex-row gap-1.5 px-5 pb-4 relative">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.22)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: step >= i ? "100%" : "0%", background: step > i ? "#1F2937" : "#0B1E3D" }} />
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 relative" key={step}>
            <p className="text-[11px] mb-0.5 register-step-fade" style={{ color: "rgba(255,255,255,0.75)" }}>שלב {step} מתוך 3</p>
            <p className="text-lg font-bold text-white register-step-fade" style={{ animationDelay: "0.04s" }}>{STEP_LABELS[step]}</p>
          </div>
        </div>
      )}

      {/* ── Step 1: Business ── */}
      {step === 1 && (
        <div key="step1" className="flex flex-col gap-5 px-4 pt-5 pb-10 register-step-content">

          {/* Inputs */}
          <div className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Field label="שם העסק">
              <input value={bizName} onChange={e => setBizName(e.target.value)}
                placeholder='למשל: "גלידת הגן" או "ספר בסטייל"'
                className="w-full px-4 py-3.5 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)" }} />
            </Field>
            <Field label="עיר">
              <input value={bizCity} onChange={e => setBizCity(e.target.value)}
                placeholder="תל-אביב, חיפה, ירושלים..."
                className="w-full px-4 py-3.5 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)" }} />
            </Field>
          </div>

          {/* Business type grid */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-right px-1" style={{ color: "var(--text-main)" }}>סוג העסק</p>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((t, i) => {
                const tint = TYPE_TINTS[i % TYPE_TINTS.length];
                const selected = bizType === t.key;
                return (
                  <button key={t.key} onClick={() => setBizType(t.key)}
                    className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl transition-all active:scale-95 register-type-pop"
                    style={{
                      background: selected ? "var(--blue-light)" : "var(--surface)",
                      border: `1.5px solid ${selected ? "var(--blue)" : "var(--border)"}`,
                      boxShadow: selected ? "0 0 0 3px rgba(249,115,22,0.12)" : "none",
                      animationDelay: `${i * 0.035}s`,
                    }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: selected ? "var(--blue)" : tint.bg,
                        transform: selected ? "scale(1.1)" : "scale(1)",
                      }}>
                      <t.Icon size={17} strokeWidth={2}
                        style={{ color: selected ? "#fff" : tint.fg }} />
                    </div>
                    <span className="text-[10px] font-semibold text-center leading-tight"
                      style={{ color: selected ? "var(--blue)" : "var(--text-secondary)" }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Cta onClick={next} disabled={!canNext()}>המשך →</Cta>
        </div>
      )}

      {/* ── Step 2: Manager ── */}
      {step === 2 && (
        <div key="step2" className="flex flex-col gap-4 px-4 pt-5 pb-10 register-step-content">
          <div className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Field label="שם מלא">
              <input value={managerName} onChange={e => setManagerName(e.target.value)}
                placeholder="השם שלך"
                className="w-full px-4 py-3.5 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)" }} />
            </Field>
            <Field label="מספר טלפון">
              <input type="tel" inputMode="numeric" maxLength={11}
                value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="05X-XXXXXXX"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)", direction: "ltr", textAlign: "right" }} />
            </Field>
            <Field label="אימייל">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-bg)", border: `1px solid ${email && !isValidEmail(email) ? "var(--red)" : "var(--border)"}`, color: "var(--text-main)", direction: "ltr", textAlign: "right" }} />
              {email.length > 0 && !isValidEmail(email) && (
                <p className="text-xs text-right mt-1" style={{ color: "var(--red)" }}>כתובת לא תקינה</p>
              )}
            </Field>
            <Field label="סיסמה" sub="לפחות 6 תווים">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: `1px solid ${password && password.length < 6 ? "var(--red)" : "var(--border)"}`, color: "var(--text-main)" }} />
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-right mt-1" style={{ color: "var(--red)" }}>הסיסמה קצרה מדי</p>
              )}
            </Field>
          </div>

          {/* Trust note */}
          <div className="flex items-center gap-1.5 flex-row px-1 justify-end">
            <p className="text-[11px] text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              הפרטים שלך מוצפנים ומאובטחים. לעולם לא נמכור אותם.
            </p>
            <Lock size={12} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          </div>

          <Cta onClick={next} disabled={!canNext()}>המשך →</Cta>
        </div>
      )}

      {/* ── Step 3: Plan ── */}
      {step === 3 && (
        <div key="step3" className="flex flex-col gap-3 px-4 pt-5 pb-10 register-step-content">

          <div className="flex items-center justify-between flex-row px-1 mb-1">
            <button onClick={() => setShowPlanInfo(true)}
              className="text-xs font-semibold flex items-center gap-1 flex-row"
              style={{ color: "#F97316" }}>
              <Sparkles size={12} /> מה מתאים לי?
            </button>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>ניתן לשנות בכל עת</p>
          </div>

          {PLANS.map(p => {
            const selected = plan === p.key;
            const isFree = p.monthlyPrice === 0;
            const isPro = p.key === "business";
            const displayPrice = isFree ? "₪0" : `₪${p.monthlyPrice}`;
            return (
              <button key={p.key} onClick={() => setPlan(p.key)}
                className="relative w-full rounded-2xl text-right transition-all"
                style={{
                  background: isPro ? "var(--navy)" : "var(--surface)",
                  border: selected
                    ? isPro ? "1.5px solid var(--blue)" : "1.5px solid var(--navy)"
                    : "1.5px solid var(--border)",
                  boxShadow: selected && isPro ? "0 8px 32px rgba(249,115,22,0.2)" : "none",
                }}>

                {p.badge && (
                  <div className="absolute -top-3 right-4">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex-row"
                      style={{ background: "var(--blue)" }}>
                      <Sparkles size={10} /> {p.badge}
                    </span>
                  </div>
                )}

                <div className="p-4 pt-5">
                  <div className="flex items-start justify-between flex-row mb-3">
                    <div className="flex items-baseline gap-1 flex-row" style={{ direction: "ltr" }}>
                      <span className={`font-bold ${isFree ? "text-xl" : "text-2xl"}`}
                        style={{ color: isPro ? "#fff" : "var(--text-main)" }}>
                        {displayPrice}
                      </span>
                      <span className="text-xs" style={{ color: isPro ? "rgba(255,255,255,0.4)" : "var(--text-secondary)" }}>
                        {p.priceNote}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-row">
                      <p className="text-base font-bold" style={{ color: isPro ? "#fff" : "var(--text-main)" }}>
                        {p.name}
                      </p>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: selected ? (isPro ? "#F97316" : "var(--navy)") : "var(--border)",
                          background: selected ? (isPro ? "#F97316" : "var(--navy)") : "transparent",
                        }}>
                        {selected && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>

                  {/* Value note */}
                  {!isFree && (
                    <p className="text-[10px] mb-3 text-right"
                      style={{ color: isPro ? "rgba(249,115,22,0.85)" : "var(--text-secondary)" }}>
                      {p.key === "plus" ? "פחות מ-₪3 ליום" : "פחות מ-₪5 ליום — ללא הגבלת עובדים"}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2 flex-row justify-end">
                        <span className="text-xs" style={{ color: isPro ? "rgba(255,255,255,0.85)" : "var(--text-main)" }}>{f}</span>
                        <Check size={13} style={{ color: "var(--blue)", flexShrink: 0 }} strokeWidth={2.5} />
                      </div>
                    ))}
                    {p.missing.length > 0 && (
                      <div className="mt-1 pt-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                        {p.missing.map(f => (
                          <div key={f} className="flex items-center gap-2 flex-row justify-end mb-1.5">
                            <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{f}</span>
                            <X size={11} style={{ color: "var(--text-secondary)", opacity: 0.4, flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {error && <p className="text-xs text-center font-medium" style={{ color: "var(--red)" }}>{error}</p>}

          <button onClick={finish} disabled={loading}
            className={`w-full py-4 rounded-2xl text-sm font-bold text-white mt-1 ${loading ? "" : "glow-cta"}`}
            style={{ background: loading ? "var(--border)" : "var(--blue)", boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.35)" }}>
            {loading ? "יוצר את החשבון שלך..." : `התחל עם ${PLANS.find(p2 => p2.key === plan)?.name} →`}
          </button>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            בלחיצה אתה מסכים ל
            <Link href="/terms" className="font-semibold" style={{ color: "#F97316" }}> תנאי השימוש </Link>
            ול
            <Link href="/privacy" className="font-semibold" style={{ color: "#F97316" }}> מדיניות הפרטיות</Link>
          </p>
        </div>
      )}

      {/* ── Step 4: Success ── */}
      {step === 4 && (
        <div className="flex flex-col flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #F97316, #FB8B3D)" }}>
          <div className="register-header-glow" />

          {/* A sliver of the orange backdrop stays visible above — the
              content below sits in a sheet with rounded top corners, echoing
              the same layered look as the in-app clock-in sheet. */}
          <div className="flex-1 flex flex-col justify-end relative">
            <div className="register-success-pop rounded-t-[32px] flex flex-col items-center px-6 pt-8 pb-10 text-center relative"
              style={{ background: "var(--gray-bg)", boxShadow: "0 -20px 50px rgba(0,0,0,0.15)" }}>

              <div className="w-10 h-1 rounded-full mb-5" style={{ background: "var(--border)" }} />

              <div className="w-20 h-20 flex items-center justify-center mb-4"
                style={{ filter: "drop-shadow(0 14px 24px rgba(249,115,22,0.3))" }}>
                <Image src="/ai-character-v3.png" alt="" width={80} height={80} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
              </div>

              <div className="mb-2 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 flex-row"
                style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.25)" }}>
                <Check size={12} strokeWidth={3} /> החשבון נוצר בהצלחה
              </div>
              <h2 className="text-2xl font-bold mt-3 mb-1" style={{ color: "var(--text-main)" }}>ברוכים הבאים, {managerName.split(" ")[0]}!</h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                {bizName} מנוהל עכשיו ב-Sidur
              </p>

              {/* Next steps */}
              <div className="w-full max-w-xs rounded-2xl p-4 mb-7 text-right"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 40px -24px rgba(11,30,61,0.25)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "var(--text-main)" }}>עוד 2 דקות ומוכנים:</p>
                {[
                  { Icon: CalendarDays, text: "שעות פעילות ומשמרות" },
                  { Icon: Users,        text: "התאמת התפקידים לעסק שלך" },
                  { Icon: Bot,          text: "אז — AI בונה את הסידור הראשון" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 flex-row py-2.5"
                    style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--blue-light)" }}>
                      <item.Icon size={14} style={{ color: "var(--blue)" }} />
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-main)" }}>{item.text}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => router.replace("/onboarding")}
                className="w-full max-w-xs py-4 rounded-2xl text-base font-bold text-white glow-cta"
                style={{ background: "var(--blue)", boxShadow: "0 8px 24px rgba(249,115,22,0.35)" }}>
                בואו נכיר את העסק שלך →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan info popup ── */}
      {showPlanInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowPlanInfo(false)}>
          <div className="w-full max-w-lg rounded-t-3xl p-5 pb-10"
            style={{ background: "var(--surface)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
            <div className="flex items-center justify-between flex-row mb-5">
              <button onClick={() => setShowPlanInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--gray-bg)" }}>
                <X size={15} style={{ color: "var(--text-secondary)" }} />
              </button>
              <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>איזו תוכנית מתאימה לי?</p>
            </div>
            <div className="flex flex-col gap-3">
              <PlanCard title="חינם — צוות קטן שמתחיל" sub="עד 10 עובדים, סידור ונוכחות בסיסיים. אפס עלות, ללא כרטיס אשראי." />
              <PlanCard title="Essential ₪149 — כשהסידור לוקח זמן" sub="ה-AI בונה סידור שלם תוך שניות. התראות לעובדים, טיפים אוטומטיים. החזר השקעה ביום השלישי." />
              <PlanCard title="Pro ₪299 — עסק בלי גבולות" sub="עובדים ללא הגבלה, מולטי-סניף ודוחות עלות עבודה. לרשתות שרוצות הכל." highlight />
            </div>
            <button onClick={() => setShowPlanInfo(false)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mt-5"
              style={{ background: "var(--navy)" }}>
              הבנתי — בחזרה לבחירה
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .register-header-glow {
          position: absolute;
          inset: -40% -10% auto -10%;
          height: 140%;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 60%);
          pointer-events: none;
        }
        .register-step-fade {
          animation: register-fade-in 0.32s cubic-bezier(0.22,1,0.36,1) both;
        }
        .register-step-content {
          animation: register-slide-up 0.36s cubic-bezier(0.22,1,0.36,1) both;
        }
        .register-type-pop {
          animation: register-fade-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes register-fade-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes register-slide-up {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .register-success-pop { animation: register-success-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes register-success-pop {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
        {label}{sub && <span className="font-normal"> ({sub})</span>}
      </label>
      {children}
    </div>
  );
}

function Cta({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full py-4 rounded-2xl text-base font-bold text-white transition-all ${disabled ? "" : "glow-cta"}`}
      style={{
        background: disabled ? "var(--border)" : "#F97316",
        boxShadow: disabled ? "none" : "0 4px 20px rgba(249,115,22,0.3)",
      }}>
      {children}
    </button>
  );
}

function PlanCard({ title, sub, highlight }: { title: string; sub: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl px-4 py-3.5 text-right"
      style={{
        background: highlight ? "rgba(249,115,22,0.06)" : "var(--gray-bg)",
        border: `1.5px solid ${highlight ? "rgba(249,115,22,0.3)" : "var(--border)"}`,
      }}>
      <p className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{sub}</p>
    </div>
  );
}
