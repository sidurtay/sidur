"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Coins, BarChart3, Check, Zap, Rocket, Crown, ShieldCheck } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";
import { PLANS } from "@/lib/plans";

const PLAN_ICONS: Record<string, typeof Zap> = { starter: Zap, plus: Rocket, business: Crown };

export default function Splash() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("shiftpro_session");
    if (session) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* Hero */}
      <div className="flex flex-col items-center pt-16 pb-10 px-6 text-center"
        style={{ background: "var(--navy)" }}>

        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
          <CalendarDays size={30} color="white" />
        </div>
        <p className="text-white text-2xl font-bold tracking-tight mb-1">Sidur</p>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>ניהול עובדים חכם למסעדות</p>

        <h1 className="text-white text-xl font-bold leading-relaxed mb-2">
          סידור עבודה, טיפים ונוכחות<br />במקום אחד
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 280 }}>
          התוכנה שבנויה במיוחד עבור מסעדות ובתי קפה בישראל
        </p>

        {/* Feature pills */}
        <div className="flex flex-row flex-wrap justify-center gap-2 mb-8">
          {[
            { icon: <CalendarDays size={11} />, label: "סידור עבודה" },
            { icon: <Coins size={11} />,        label: "חישוב טיפים" },
            { icon: <Users size={11} />,        label: "ניהול עובדים" },
            { icon: <BarChart3 size={11} />,    label: "דוחות שעות" },
          ].map(f => (
            <span key={f.label} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}>
              {f.icon} {f.label}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 320 }}>
          <button onClick={() => router.push("/register")}
            className="w-full py-4 rounded-2xl text-base font-bold"
            style={{ background: "#fff", color: "var(--navy)" }}>
            צור עסק חדש — חינם
          </button>
          <button onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            כבר יש לי חשבון — כניסה
          </button>
        </div>
      </div>

      {/* Social proof */}
      <div className="flex flex-col items-center py-5 px-6">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>✦ מנוהלים כבר איתנו</p>
        <div className="flex flex-row gap-2 flex-wrap justify-center">
          {["קפה קפה נהריה", "ביסטרו תל-אביב", "פיצה הגינה", "בר 54"].map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Feature list */}
      <div className="mx-4 mb-4 rounded-2xl bg-white px-5 py-4 flex flex-col gap-4"
        style={{ border: "1px solid var(--border)" }}>
        {[
          { emoji: "📅", title: "סידור עבודה + AI",     sub: "AI שבונה את הסידור לפי אילוצי העובדים" },
          { emoji: "💸", title: "חלוקת טיפים הוגנת",   sub: "חישוב אוטומטי לפי שעות — בוקר וערב בנפרד" },
          { emoji: "⏱️", title: "נוכחות בזמן אמת",     sub: "קריאת QR, אצבע, או עדכון ידני" },
          { emoji: "📊", title: "דוחות חודשיים",        sub: "ייצוא ל-Excel בלחיצה אחת" },
        ].map(f => (
          <div key={f.title} className="flex items-center gap-3 flex-row">
            <div className="text-right flex-1">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{f.sub}</p>
            </div>
            <span className="text-2xl w-9 text-center flex-shrink-0">{f.emoji}</span>
          </div>
        ))}
      </div>

      {/* Pricing — visible to anyone before they ever start registering,
          unlike the "contact us" pricing model most Israeli competitors use */}
      <div className="px-4 pt-2 pb-6" style={{ background: "var(--navy)" }}>
        <div className="flex justify-center mb-3">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
            style={{ background: "rgba(249,115,22,0.15)", color: "var(--blue)", border: "1px solid rgba(249,115,22,0.3)" }}>
            תמחור
          </span>
        </div>
        <p className="text-center text-white text-xl font-bold mb-1.5">מחיר שקוף, בלי הפתעות</p>
        <p className="text-center text-xs mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          בוחרים תוכנית ומתחילים מיד — בלי &quot;השאר פרטים ונחזור אליך&quot;
        </p>

        <div className="flex flex-col gap-4">
          {PLANS.map(p => {
            const Icon = PLAN_ICONS[p.key] || Zap;
            const popular = !!p.badge;
            return (
              <div key={p.key} className="rounded-3xl relative"
                style={{
                  background: popular ? "linear-gradient(165deg, #1F2937, #14181F)" : "#1B202B",
                  border: popular ? "1px solid rgba(249,115,22,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: popular ? "0 12px 40px rgba(249,115,22,0.18)" : "none",
                  transform: popular ? "scale(1.02)" : "none",
                }}>
                {popular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold text-white flex-row"
                      style={{ background: "var(--blue)", boxShadow: "0 4px 12px rgba(249,115,22,0.4)" }}>
                      <Crown size={11} /> {p.badge}
                    </span>
                  </div>
                )}
                <div className="p-5 pt-6">
                  <div className="flex items-center justify-between flex-row mb-4">
                    <div className="flex items-center gap-2.5 flex-row">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: popular ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.06)" }}>
                        <Icon size={16} style={{ color: popular ? "var(--blue)" : "rgba(255,255,255,0.7)" }} />
                      </div>
                      <p className="text-base font-bold text-white">{p.name}</p>
                    </div>
                  </div>

                  <div className="flex items-end gap-1.5 flex-row mb-5" style={{ direction: "ltr" }}>
                    <span className="text-3xl font-bold text-white tracking-tight">{p.price}</span>
                    <span className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{p.priceNote}</span>
                  </div>

                  <div className="flex flex-col gap-2.5 mb-5">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2 flex-row justify-end">
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>{f}</p>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(34,197,94,0.15)" }}>
                          <Check size={10} style={{ color: "#4ADE80" }} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => router.push(`/register?plan=${p.key}`)}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ background: popular ? "var(--blue)" : "rgba(255,255,255,0.08)", color: "#fff", border: popular ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                    {p.price === "חינם" ? "התחל בחינם" : `בחר ${p.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-row mt-5">
          <ShieldCheck size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            בלי כרטיס אשראי בהרשמה · אפשר לשנות תוכנית בכל עת
          </p>
        </div>
      </div>

      <a href="https://instagram.com/sidur.app" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 flex-row text-xs font-medium pt-2"
        style={{ color: "var(--blue)" }}>
        <InstagramIcon size={13} /> sidur.app
      </a>
      <p className="text-[10px] text-center pb-8 pt-1" style={{ color: "var(--text-secondary)" }}>
        © 2026 Sidur · כל הזכויות שמורות
      </p>
    </div>
  );
}
