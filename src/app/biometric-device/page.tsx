"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Fingerprint, Zap, WifiOff, Cloud, MonitorSmartphone,
  ShieldCheck, Check, Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "זיהוי תוך פחות משנייה", text: "קריאת טביעת אצבע מהירה ומדויקת — בלי תורים, בלי המתנה" },
  { icon: Cloud, title: "מתחבר ישירות לסידור", text: "כל כניסה ויציאה מתעדכנת אוטומטית בדוחות השעות ובסידור" },
  { icon: WifiOff, title: "עובד גם בלי אינטרנט", text: "נשמר במכשיר ומסתנכרן ברגע שיש חיבור — אף נוכחות לא נופלת" },
  { icon: MonitorSmartphone, title: "בלי טלפון, בלי חשבון", text: "מתאים גם לעובדים שלא רוצים או לא יכולים להשתמש באפליקציה" },
  { icon: ShieldCheck, title: "מאובטח ופרטי", text: "טביעות האצבע מוצפנות ונשארות במכשיר — לא נשלחות לשום מקום" },
  { icon: Sparkles, title: "עיצוב שמתאים לכל דלפק", text: "מסך מגע קטן ומינימליסטי, בעיצוב Sidur הייחודי" },
];

export default function BiometricDevicePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!name.trim() || !phone.trim()) return;
    try {
      await fetch("/api/device-waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), business: business.trim() }),
      });
    } catch {}
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 flex-row"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()}>
          <ArrowRight size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 text-right">
          <p className="text-base font-semibold">Sidur Touch</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>שעון נוכחות ביומטרי</p>
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-10 pb-8 px-6 relative overflow-hidden"
        style={{ background: "var(--navy)" }}>
        <span className="text-[10px] font-bold px-3 py-1 rounded-full mb-6"
          style={{ background: "var(--blue)", color: "#fff" }}>
          בקרוב — השקה 2026
        </span>

        {/* Device mockup */}
        <div className="relative" style={{ width: 168 }}>
          <div className="absolute inset-0 rounded-[28px] blur-2xl opacity-40"
            style={{ background: "var(--blue)", transform: "scale(0.85)" }} />
          <div className="relative rounded-[26px] p-2.5 flex flex-col gap-2.5"
            style={{ background: "linear-gradient(160deg, #2A2722, #100F0D)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="rounded-[16px] flex flex-col items-center justify-center gap-3 py-9"
              style={{ background: "#000" }}>
              <div className="rounded-full flex items-center justify-center"
                style={{ width: 64, height: 64, background: "rgba(226,105,26,0.12)", border: "2px solid var(--blue)" }}>
                <Fingerprint size={32} style={{ color: "var(--blue)" }} />
              </div>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>הנח אצבע לאישור</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
          </div>
          {/* Floating success badge */}
          <div className="absolute -left-4 top-10 rounded-xl px-2.5 py-1.5 flex items-center gap-1 flex-row shadow-lg"
            style={{ background: "var(--green)" }}>
            <Check size={12} color="white" />
            <span className="text-[10px] font-semibold text-white">שירה כהן ✓</span>
          </div>
          {/* Base/stand */}
          <div className="mx-auto mt-1 rounded-b-lg" style={{ width: 60, height: 10, background: "#100F0D" }} />
        </div>

        <h1 className="text-white text-xl font-bold leading-relaxed mt-7 mb-2 text-center">
          הדיוק שעסק גדול צריך,<br />בלי כאב הראש
        </h1>
        <p className="text-sm leading-relaxed text-center" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 280 }}>
          מכשיר טביעת אצבע ייעודי של Sidur — כניסה ויציאה מדויקת לשנייה, מתחברת אוטומטית לסידור ולדוחות השעות שלך
        </p>
      </div>

      {/* Features */}
      <div className="px-4 py-5">
        <p className="text-sm font-semibold text-right mb-3">למה Sidur Touch</p>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-xl p-3 flex flex-col gap-2"
                style={{ border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "var(--blue-light)" }}>
                  <Icon size={15} style={{ color: "var(--blue)" }} />
                </div>
                <p className="text-xs font-semibold leading-snug">{f.title}</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing teaser */}
      <div className="px-4 pb-2">
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>מחיר ההשקה יתפרסם בקרוב</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>נרשמים מוקדם יקבלו הטבת השקה מיוחדת</p>
        </div>
      </div>

      {/* Waitlist form */}
      <div className="px-4 py-5">
        {submitted ? (
          <div className="bg-white rounded-2xl p-6 text-center flex flex-col items-center gap-2" style={{ border: "1px solid var(--border)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: "var(--green-light)" }}>
              <Check size={22} style={{ color: "var(--green)" }} />
            </div>
            <p className="text-base font-semibold">נרשמת לרשימת ההמתנה!</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>נעדכן אותך ברגע ש-Sidur Touch יהיה מוכן להזמנה</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 flex flex-col gap-3" style={{ border: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold text-right">השאירו פרטים — נעדכן כשאפשר להזמין</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="שם מלא"
              className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
              style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="מספר טלפון"
              className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
              style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            <input value={business} onChange={e => setBusiness(e.target.value)}
              placeholder="שם העסק (אופציונלי)"
              className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
              style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
            <button onClick={submit} disabled={!name.trim() || !phone.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: name.trim() && phone.trim() ? "var(--navy)" : "#ADA89D" }}>
              הרשמה לרשימת ההמתנה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
