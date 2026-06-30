"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X, Sparkles, ChevronLeft } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/businessConfig";
import { PLANS } from "@/lib/plans";
import LogoMark from "@/components/Logo";
import Image from "next/image";

const BUSINESS_TYPES = [
  { key: "cafe",       label: "בית קפה",        emoji: "☕" },
  { key: "restaurant", label: "מסעדה",           emoji: "🍽️" },
  { key: "icecream",   label: "גלידריה",         emoji: "🍦" },
  { key: "bar",        label: "בר / פאב",        emoji: "🍺" },
  { key: "bakery",     label: "מאפייה",          emoji: "🥐" },
  { key: "barbershop", label: "ספרות",           emoji: "✂️" },
  { key: "beauty",     label: "סלון יופי",       emoji: "💅" },
  { key: "gym",        label: "חדר כושר",        emoji: "🏋️" },
  { key: "clothing",   label: "חנות בגדים",      emoji: "👗" },
  { key: "grocery",    label: "מכולת / סופר",    emoji: "🛒" },
  { key: "cleaning",   label: "שירותי ניקיון",   emoji: "🧹" },
  { key: "hotel",      label: "מלון / צימר",     emoji: "🏨" },
  { key: "other",      label: "אחר",             emoji: "🏢" },
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
        loginAt: Date.now(), role: "manager",
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
        <div className="sticky top-0 z-20 flex flex-col" style={{ background: "var(--navy)" }}>
          <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-row">
            <button onClick={back}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <ArrowRight size={17} color="white" />
            </button>
            <div className="flex items-center gap-2 flex-row">
              <p className="text-white font-bold text-sm">Sidur</p>
              <div className="w-7 h-7 rounded-lg overflow-hidden">
                <LogoMark size={28} />
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-row gap-1.5 px-5 pb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: step >= i ? "100%" : "0%", background: step > i ? "#4ADE80" : "#F97316" }} />
              </div>
            ))}
          </div>

          <div className="px-5 pb-5">
            <p className="text-[11px] mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>שלב {step} מתוך 3</p>
            <p className="text-lg font-bold text-white">{STEP_LABELS[step]}</p>
          </div>
        </div>
      )}

      {/* ── Step 1: Business ── */}
      {step === 1 && (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-10">

          {/* Inputs */}
          <div className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Field label="שם העסק" placeholder='למשל: "גלידת הגן" או "ספר בסטייל"'>
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
              {BUSINESS_TYPES.map(t => (
                <button key={t.key} onClick={() => setBizType(t.key)}
                  className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl transition-all"
                  style={{
                    background: bizType === t.key ? "rgba(249,115,22,0.1)" : "var(--surface)",
                    border: `1.5px solid ${bizType === t.key ? "#F97316" : "var(--border)"}`,
                    boxShadow: bizType === t.key ? "0 0 0 3px rgba(249,115,22,0.12)" : "none",
                  }}>
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: bizType === t.key ? "#F97316" : "var(--text-secondary)" }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Cta onClick={next} disabled={!canNext()}>המשך →</Cta>
        </div>
      )}

      {/* ── Step 2: Manager ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4 px-4 pt-5 pb-10">
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
                style={{ background: "var(--gray-bg)", border: `1px solid ${email && !isValidEmail(email) ? "#EF4444" : "var(--border)"}`, color: "var(--text-main)", direction: "ltr", textAlign: "right" }} />
              {email.length > 0 && !isValidEmail(email) && (
                <p className="text-xs text-right mt-1" style={{ color: "#EF4444" }}>כתובת לא תקינה</p>
              )}
            </Field>
            <Field label="סיסמה" sub="לפחות 6 תווים">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: `1px solid ${password && password.length < 6 ? "#EF4444" : "var(--border)"}`, color: "var(--text-main)" }} />
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-right mt-1" style={{ color: "#EF4444" }}>הסיסמה קצרה מדי</p>
              )}
            </Field>
          </div>

          {/* Trust note */}
          <div className="flex items-center gap-2 flex-row px-1">
            <p className="text-[11px] text-right leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
              🔒 הפרטים שלך מוצפנים ומאובטחים. לעולם לא נמכור אותם.
            </p>
          </div>

          <Cta onClick={next} disabled={!canNext()}>המשך →</Cta>
        </div>
      )}

      {/* ── Step 3: Plan ── */}
      {step === 3 && (
        <div className="flex flex-col gap-3 px-4 pt-5 pb-10">

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
            const isFree = p.price === "₪0";
            const isPro = p.key === "business";
            return (
              <button key={p.key} onClick={() => setPlan(p.key)}
                className="relative w-full rounded-2xl text-right transition-all"
                style={{
                  background: isPro ? (selected ? "linear-gradient(145deg,#1C2033,#141820)" : "#1A1F2B") : "var(--surface)",
                  border: selected
                    ? isPro ? "1.5px solid #F97316" : "1.5px solid var(--navy)"
                    : "1.5px solid var(--border)",
                  boxShadow: selected && isPro ? "0 8px 32px rgba(249,115,22,0.2)" : "none",
                  transform: selected && isPro ? "scale(1.01)" : "none",
                }}>

                {p.badge && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ background: "#F97316", boxShadow: "0 3px 10px rgba(249,115,22,0.4)" }}>
                      ✦ {p.badge}
                    </span>
                  </div>
                )}

                <div className="p-4 pt-5">
                  <div className="flex items-start justify-between flex-row mb-3">
                    <div className="flex items-baseline gap-1 flex-row" style={{ direction: "ltr" }}>
                      <span className={`font-bold ${isFree ? "text-xl" : "text-2xl"}`}
                        style={{ color: isPro ? "#fff" : "var(--text-main)" }}>
                        {p.price}
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
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(74,222,128,0.15)" }}>
                          <Check size={9} style={{ color: "#4ADE80" }} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                    {p.missing.length > 0 && (
                      <div className="mt-1 pt-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                        {p.missing.map(f => (
                          <div key={f} className="flex items-center gap-2 flex-row justify-end mb-1.5">
                            <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{f}</span>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(0,0,0,0.04)" }}>
                              <span className="text-[8px]" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>✕</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {error && <p className="text-xs text-center font-medium" style={{ color: "#EF4444" }}>{error}</p>}

          <button onClick={finish} disabled={loading}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mt-1"
            style={{ background: loading ? "#9CA3AF" : "#F97316", boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.35)" }}>
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
        <div className="flex flex-col flex-1" style={{ background: "var(--navy)" }}>
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">

            {/* Confetti-like mascot */}
            <div className="w-24 h-24 rounded-3xl overflow-hidden mb-6 flex items-center justify-center"
              style={{ boxShadow: "0 16px 48px rgba(249,115,22,0.4)", background: "rgba(249,115,22,0.12)", border: "2px solid rgba(249,115,22,0.3)" }}>
              <Image src="/ai-character.png" alt="" width={96} height={96} style={{ objectFit: "cover" }} />
            </div>

            <div className="mb-2 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" }}>
              ✓ החשבון נוצר בהצלחה
            </div>
            <h2 className="text-2xl font-bold text-white mt-3 mb-1">ברוכים הבאים, {managerName.split(" ")[0]}! 🎉</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
              {bizName} מנוהל עכשיו ב-Sidur
            </p>

            {/* Next steps */}
            <div className="w-full max-w-xs rounded-2xl p-4 mb-6 text-right"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-xs font-bold text-white mb-3">3 דברים ראשונים:</p>
              {[
                { emoji: "👥", text: "הוסף את העובדים שלך" },
                { emoji: "📅", text: "הגדר ימי ושעות פעילות" },
                { emoji: "🤖", text: "תן ל-AI לבנות את הסידור הראשון" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 flex-row py-2.5"
                  style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <span className="text-lg">{item.emoji}</span>
                  <p className="text-sm text-white">{item.text}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.replace("/dashboard")}
              className="w-full max-w-xs py-4 rounded-2xl text-base font-bold text-white"
              style={{ background: "#F97316", boxShadow: "0 8px 24px rgba(249,115,22,0.4)" }}>
              כניסה לאפליקציה →
            </button>
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
              <PlanCard title="חינם — צוות קטן שמתחיל" sub="עד 6 עובדים, סידור ונוכחות בסיסיים. אפס עלות, ללא כרטיס אשראי." />
              <PlanCard title="Plus ₪79 — כשהסידור לוקח זמן" sub="ה-AI בונה סידור שלם תוך שניות לפי אילוצי העובדים. טיפים מחושבים אוטומטית. החזר השקעה ביום הראשון." />
              <PlanCard title="Pro ₪149 — עסק בלי גבולות" sub="עובדים ללא הגבלה, מולטי-סניף וגישת API. לעסקים שגדלים ורוצים הכל מסודר." highlight />
            </div>
            <button onClick={() => setShowPlanInfo(false)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mt-5"
              style={{ background: "var(--navy)" }}>
              הבנתי — בחזרה לבחירה
            </button>
          </div>
        </div>
      )}
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
      className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all"
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
