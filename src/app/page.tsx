"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Coins, BarChart3 } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";

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
