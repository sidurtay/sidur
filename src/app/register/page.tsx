"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ArrowRight, Check, ChevronLeft, Store, Coffee, Utensils, Beer, X, Sparkles } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/businessConfig";
import { PLANS } from "@/lib/plans";

const BUSINESS_TYPES = [
  { key: "cafe",       label: "בית קפה",  icon: <Coffee size={20} /> },
  { key: "restaurant", label: "מסעדה",    icon: <Utensils size={20} /> },
  { key: "bar",        label: "בר",       icon: <Beer size={20} /> },
  { key: "other",      label: "אחר",      icon: <Store size={20} /> },
];

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
  return <Suspense><Register /></Suspense>;
}

function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Business
  const [bizName,    setBizName]    = useState("");
  const [bizCity,    setBizCity]    = useState("");
  const [bizType,    setBizType]    = useState("");

  // Step 2 — Manager
  const [managerName, setManagerName] = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");

  // Step 3 — Plan, pre-selected from the landing page's pricing section
  // (?plan=starter|plus|business) when the visitor arrives via a "בחר תוכנית"
  // CTA there, so the choice they already made carries through instead of
  // forcing them to re-pick it.
  const requestedPlan = searchParams.get("plan");
  const [plan, setPlan] = useState(
    PLANS.some(p => p.key === requestedPlan) ? requestedPlan! : "business"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPlanInfo, setShowPlanInfo] = useState(false);

  function next() { setStep(s => (s < 4 ? (s + 1) as Step : s)); }
  function back() {
    if (step === 1) { router.back(); return; }
    setStep(s => (s - 1) as Step);
  }

  // Digits only, capped at 10 and dash-formatted after the area code — matches
  // the same helper used for adding employees, so phone numbers look and
  // validate consistently everywhere they're entered in the app.
  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + "-" + digits.slice(3);
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function canNext() {
    if (step === 1) return bizName.trim() && bizCity.trim() && bizType;
    if (step === 2) return managerName.trim() && phone.replace(/\D/g, "").length === 10 && isValidEmail(email) && password.length >= 6;
    if (step === 3) return !!plan;
    return false;
  }

  async function finish() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizName, bizCity, bizType, managerName, phone, email, password, plan }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "ההרשמה נכשלה, נסה שוב");
        setLoading(false);
        return;
      }
      const session = {
        businessId: data.businessId, personId: data.personId,
        businessName: data.businessName, name: data.name, phone: data.phone, email,
        password, plan,
        loginAt: Date.now(),
        role: "manager",
      };
      localStorage.setItem("shiftpro_session", JSON.stringify(session));
      // Mirrored locally too — the rest of the app still reads business config from here
      // until those pages are migrated to read from Supabase directly.
      localStorage.setItem("shiftpro_business_config", JSON.stringify({
        permanent: { ...DEFAULT_CONFIG, bizName, initialized: true },
      }));
      setStep(4);
    } catch {
      setError("שגיאת רשת — בדוק חיבור ונסה שוב");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* Header */}
      <div className="flex flex-col pt-14 pb-5 px-5"
        style={{ background: "var(--navy)" }}>
        <div className="flex items-center justify-between flex-row mb-5">
          {step < 4
            ? <button onClick={back}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <ArrowRight size={18} color="white" />
              </button>
            : <div className="w-9" />
          }
          <div className="flex items-center gap-2 flex-row">
            <p className="text-white font-bold text-base">Sidur</p>
            <CalendarDays size={18} color="white" />
          </div>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>שלב {step} מתוך 3</p>
            <p className="text-white font-semibold text-base mt-1">
              {step === 1 && "פרטי העסק"}
              {step === 2 && "פרטי המנהל"}
              {step === 3 && "בחר תוכנית"}
            </p>
          </div>
        )}
      </div>

      {/* Slim vertical progress rail, left edge */}
      {step < 4 && (
        <div className="fixed top-1/2 left-0 -translate-y-1/2 z-40" style={{ width: 3, height: 120, borderRadius: 2, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div className="transition-all" style={{ width: "100%", height: `${(step / 3) * 100}%`, background: "var(--navy)" }} />
        </div>
      )}

      {/* ── Step 1: Business details ── */}
      {step === 1 && (
        <div className="px-5 pt-5 flex flex-col gap-4 pb-8">
          <div className="bg-white rounded-2xl p-5 flex flex-col gap-4"
            style={{ border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                שם העסק
              </label>
              <input placeholder="קפה קפה נהריה"
                value={bizName} onChange={e => setBizName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                עיר
              </label>
              <input placeholder="נהריה"
                value={bizCity} onChange={e => setBizCity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-right px-1" style={{ color: "var(--text-secondary)" }}>
              סוג עסק
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map(t => (
                <button key={t.key} onClick={() => setBizType(t.key)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                  style={{
                    background: bizType === t.key ? "var(--blue-light)" : "var(--surface)",
                    border: `1px solid ${bizType === t.key ? "var(--navy)" : "var(--border)"}`,
                    color: bizType === t.key ? "var(--blue)" : "var(--text-main)",
                  }}>
                  <span style={{ color: bizType === t.key ? "var(--blue)" : "var(--text-secondary)" }}>
                    {t.icon}
                  </span>
                  <span className="text-sm font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={next} disabled={!canNext()}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mt-2"
            style={{ background: canNext() ? "var(--navy)" : "#C4C2B8" }}>
            המשך
          </button>
        </div>
      )}

      {/* ── Step 2: Manager details ── */}
      {step === 2 && (
        <div className="px-5 pt-5 flex flex-col gap-4 pb-8">
          <div className="bg-white rounded-2xl p-5 flex flex-col gap-4"
            style={{ border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                שם מלא
              </label>
              <input placeholder="איתי כהן"
                value={managerName} onChange={e => setManagerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                מספר טלפון
              </label>
              <input type="tel" inputMode="numeric" placeholder="05X-XXXXXXX" maxLength={11}
                value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", direction: "ltr" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                אימייל <span className="font-normal">(לאיפוס סיסמה ועדכונים)</span>
              </label>
              <input type="email" placeholder="itay@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", direction: "ltr", textAlign: "right" }} />
              {email.length > 0 && !isValidEmail(email) && (
                <p className="text-xs text-right" style={{ color: "var(--red)" }}>
                  כתובת אימייל לא תקינה
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
                סיסמה <span className="font-normal">(לפחות 6 תווים)</span>
              </label>
              <input type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-right" style={{ color: "var(--red)" }}>
                  הסיסמה קצרה מדי
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 text-xs text-right"
            style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)", color: "var(--blue)" }}>
            הפרטים שלך מוגנים ומוצפנים. לא נשתף את המידע שלך עם צד שלישי.
          </div>

          <button onClick={next} disabled={!canNext()}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white"
            style={{ background: canNext() ? "var(--navy)" : "#C4C2B8" }}>
            המשך
          </button>
        </div>
      )}

      {/* ── Step 3: Plan selection ── */}
      {step === 3 && (
        <div className="px-5 pt-5 flex flex-col gap-3 pb-8">
          <div className="flex items-center justify-between flex-row px-1">
            <button onClick={() => setShowPlanInfo(true)} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>
              איזו תוכנית מתאימה לי?
            </button>
            <p className="text-xs text-right" style={{ color: "var(--text-secondary)" }}>
              ניתן לשדרג או לשנות תוכנית בכל עת
            </p>
          </div>

          {PLANS.map(p => (
            <button key={p.key} onClick={() => setPlan(p.key)}
              className="relative w-full rounded-2xl p-4 text-right transition-all flex flex-col gap-3"
              style={{
                background: plan === p.key ? p.bg : "var(--surface)",
                border: `2px solid ${plan === p.key ? p.border : "var(--border)"}`,
              }}>

              {p.badge && (
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--navy)", color: "#fff" }}>
                  {p.badge}
                </span>
              )}

              <div className="flex items-start justify-between flex-row">
                <div className="flex items-baseline gap-1 flex-row">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.priceNote}</span>
                  <span className="text-2xl font-bold" style={{ color: p.color }}>{p.price}</span>
                </div>
                <div className="flex items-center gap-2 flex-row">
                  <p className="text-base font-bold">{p.name}</p>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: plan === p.key ? p.color : "var(--border)",
                             background:  plan === p.key ? p.color : "transparent" }}>
                    {plan === p.key && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {p.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 flex-row justify-end">
                    <span className="text-xs">{f}</span>
                    <Check size={11} style={{ color: "var(--green)", flexShrink: 0 }} strokeWidth={3} />
                  </div>
                ))}
                {p.missing.map(f => (
                  <div key={f} className="flex items-center gap-1.5 flex-row justify-end opacity-40">
                    <span className="text-xs line-through">{f}</span>
                    <ChevronLeft size={11} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </button>
          ))}

          {error && (
            <p className="text-xs text-center font-medium" style={{ color: "var(--red)" }}>{error}</p>
          )}

          <button onClick={finish} disabled={loading}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white mt-1"
            style={{ background: loading ? "#ADA89D" : "var(--navy)" }}>
            {loading ? "יוצר חשבון..." : `התחל עם תוכנית ${PLANS.find(p2 => p2.key === plan)?.name}`}
          </button>
        </div>
      )}

      {/* ── Step 4: Success ── */}
      {step === 4 && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "var(--green-light)", border: "2px solid #A8D9BB" }}>
            <Check size={36} style={{ color: "var(--green)" }} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold mb-2">ברוכים הבאים!</h2>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            העסק <strong>{bizName}</strong> נוצר בהצלחה
          </p>
          <p className="text-xs mb-8" style={{ color: "var(--text-secondary)" }}>
            תוכנית: <strong>{PLANS.find(p => p.key === plan)?.name}</strong>
          </p>

          <div className="w-full max-w-xs bg-white rounded-2xl p-4 mb-6 text-right"
            style={{ border: "1px solid var(--border)" }}>
            {[
              "הוסף עובדים ראשונים",
              "הגדר ימי פעילות",
              "בנה את הסידור הראשון",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3 py-2.5 flex-row"
                style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: "var(--blue-light)", color: "var(--blue)" }}>{i + 1}</div>
                <p className="text-sm">{step}</p>
              </div>
            ))}
          </div>

          <button onClick={() => router.replace("/dashboard")}
            className="w-full max-w-xs py-4 rounded-2xl text-sm font-bold text-white"
            style={{ background: "var(--navy)" }}>
            כניסה לאפליקציה
          </button>
        </div>
      )}

      {/* ── Plan comparison popup ── */}
      {showPlanInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowPlanInfo(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#D1D5DB" }} />
            <div className="flex items-center justify-between flex-row mb-4">
              <button onClick={() => setShowPlanInfo(false)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <div className="flex items-center gap-1.5 flex-row">
                <p className="text-base font-bold">איזו תוכנית מתאימה לי?</p>
                <Sparkles size={15} style={{ color: "var(--blue)" }} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl px-4 py-3 text-right" style={{ border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold mb-0.5">Sidur Starter — צוות קטן שמתחיל</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  עד 10 עובדים, סידור ונוכחות בסיסיים. מצוין לבדיקה ראשונה בלי שום עלות.
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 text-right" style={{ border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold mb-0.5">Sidur Plus — כשהסידור מתחיל לתפוס זמן</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  ה-AI בונה לך סידור תוך דקות לפי אילוצי העובדים, וטיפים מתחשבים אוטומטית.
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 text-right" style={{ border: "2px solid var(--blue-border)", background: "var(--blue-light)" }}>
                <p className="text-sm font-bold mb-0.5">Sidur Business — לרשתות וסניפים מרובים</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  עובדים ללא הגבלה, ניהול מולטי-סניף וגישת API — הבחירה הפופולרית ביותר שלנו.
                </p>
              </div>
            </div>
            <button onClick={() => setShowPlanInfo(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-4"
              style={{ background: "var(--navy)" }}>
              הבנתי, בחזרה לבחירה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
