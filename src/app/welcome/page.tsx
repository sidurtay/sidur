"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Fingerprint, MessageCircle, Bell, ChevronLeft } from "lucide-react";

// One-time first-login tour for a brand-new employee — until now they only
// ever got a temp password with zero introduction to the app, so their very
// first real screen was a bare dashboard. Shown once (after change-password),
// then never again.
const STEPS = [
  {
    icon: CalendarDays,
    title: "הסידור שלך",
    body: "בעמוד \"סידור\" תראה את כל המשמרות שלך ושל הצוות — מתי מתחילים, מתי מסיימים, ומי עובד איתך.",
  },
  {
    icon: Fingerprint,
    title: "כניסה ויציאה ממשמרת",
    body: "בדשבורד יש כפתור עגול לדיווח כניסה/יציאה — בטביעת אצבע אם הפעלת, או בלחיצה רגילה. המנהל מאשר ואתה מתועד.",
  },
  {
    icon: MessageCircle,
    title: "תכיר את סיד",
    body: "העוזר החכם שלנו. אפשר לשאול אותו כמה שעות עבדת, מי עובד היום, ואפילו לבקש חופש או החלפת משמרת — הכל בשיחה רגילה.",
  },
  {
    icon: Bell,
    title: "מוכנים להתחיל",
    body: "כל עדכון חשוב — הודעה מהמנהל, אישור בקשה, טיפים — יגיע אליך בהתראה. בהצלחה!",
  },
];

export default function Welcome() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setName(s.name?.split(" ")[0] || "");
    } catch {}
  }, []);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function next() {
    if (isLast) { router.replace("/dashboard"); return; }
    setStep(s => s + 1);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center" style={{ background: "var(--navy)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.12)" }}>
          <Icon size={30} color="white" />
        </div>
        {step === 0 && name && (
          <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>ברוך/ה הבא/ה, {name}!</p>
        )}
        <p className="text-white text-xl font-bold mb-3">{current.title}</p>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{current.body}</p>
      </div>

      <div className="px-5 pt-6 pb-8 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-1.5 flex-row">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 20 : 6, background: i <= step ? "var(--navy)" : "var(--border)" }} />
          ))}
        </div>

        <button onClick={next}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 flex-row"
          style={{ background: "var(--navy)" }}>
          {isLast ? "בואו נתחיל" : "המשך"}
          <ChevronLeft size={16} />
        </button>

        {!isLast && (
          <button onClick={() => router.replace("/dashboard")} className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            דלג
          </button>
        )}
      </div>
    </div>
  );
}
