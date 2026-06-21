"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ArrowRight, Check, ChevronLeft, Store, Coffee, Utensils, Beer } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/businessConfig";

const BUSINESS_TYPES = [
  { key: "cafe",       label: "בית קפה",  icon: <Coffee size={20} /> },
  { key: "restaurant", label: "מסעדה",    icon: <Utensils size={20} /> },
  { key: "bar",        label: "בר",       icon: <Beer size={20} /> },
  { key: "other",      label: "אחר",      icon: <Store size={20} /> },
];

const PLANS = [
  {
    key: "basic",
    name: "Sidur Basic",
    price: "חינם",
    priceNote: "לתמיד",
    color: "#6B6966",
    bg: "#F3F3F2",
    border: "#DEDCDA",
    features: [
      "עד 10 עובדים",
      "סידור עבודה",
      "נוכחות ידנית",
      "צ'אט פנימי",
    ],
    missing: ["AI לסידור", "חישוב טיפים", "דוחות מתקדמים"],
  },
  {
    key: "growth",
    name: "Sidur Growth",
    price: "₪99",
    priceNote: "לחודש",
    color: "var(--blue)",
    bg: "var(--blue-light)",
    border: "var(--blue-border)",
    badge: "הכי פופולרי",
    features: [
      "עד 20 עובדים",
      "כל יכולות הבסיסי",
      "AI לבניית סידור",
      "חישוב טיפים",
      "דוחות חודשיים",
    ],
    missing: ["מולטי-סניף"],
  },
  {
    key: "business",
    name: "Sidur Business",
    price: "₪199",
    priceNote: "לחודש",
    color: "var(--navy)",
    bg: "#E8ECF4",
    border: "#C2CCE0",
    features: [
      "עובדים ללא הגבלה",
      "כל יכולות הצמיחה",
      "מולטי-סניף",
      "API גישה",
      "תמיכה עדיפה",
    ],
    missing: [],
  },
];

type Step = 1 | 2 | 3 | 4;

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Business
  const [bizName,    setBizName]    = useState("");
  const [bizCity,    setBizCity]    = useState("");
  const [bizType,    setBizType]    = useState("");

  // Step 2 — Manager
  const [managerName, setManagerName] = useState("");
  const [phone,       setPhone]       = useState("");
  const [password,    setPassword]    = useState("");

  // Step 3 — Plan
  const [plan, setPlan] = useState("growth");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function next() { setStep(s => (s < 4 ? (s + 1) as Step : s)); }
  function back() {
    if (step === 1) { router.back(); return; }
    setStep(s => (s - 1) as Step);
  }

  function canNext() {
    if (step === 1) return bizName.trim() && bizCity.trim() && bizType;
    if (step === 2) return managerName.trim() && phone.trim() && password.length >= 6;
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
        body: JSON.stringify({ bizName, bizCity, bizType, managerName, phone, password, plan }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "ההרשמה נכשלה, נסה שוב");
        setLoading(false);
        return;
      }
      const session = {
        businessId: data.businessId, personId: data.personId,
        businessName: data.businessName, name: data.name, phone: data.phone,
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
            <div className="flex flex-row gap-1.5 w-full">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: s <= step ? "#fff" : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
            <p className="text-white font-semibold text-base mt-1">
              {step === 1 && "פרטי העסק"}
              {step === 2 && "פרטי המנהל"}
              {step === 3 && "בחר תוכנית"}
            </p>
          </div>
        )}
      </div>

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
                    border: `1px solid ${bizType === t.key ? "var(--blue)" : "var(--border)"}`,
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
              <input type="tel" inputMode="numeric" placeholder="05X-XXXXXXX"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", direction: "ltr" }} />
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
          <p className="text-xs text-right px-1" style={{ color: "var(--text-secondary)" }}>
            ניתן לשדרג או לשנות תוכנית בכל עת
          </p>

          {PLANS.map(p => (
            <button key={p.key} onClick={() => setPlan(p.key)}
              className="relative w-full rounded-2xl p-4 text-right transition-all flex flex-col gap-3"
              style={{
                background: plan === p.key ? p.bg : "var(--surface)",
                border: `2px solid ${plan === p.key ? p.border : "var(--border)"}`,
              }}>

              {p.badge && (
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--blue)", color: "#fff" }}>
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
            style={{ background: "var(--green-light)", border: "2px solid #C5E0A8" }}>
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
    </div>
  );
}
