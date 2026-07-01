"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePassword() {
  const router = useRouter();
  const [name,     setName]    = useState("");
  const [personId, setPersonId] = useState("");
  const [newPw,    setNewPw]   = useState("");
  const [confirm,  setConfirm] = useState("");
  const [showPw,   setShowPw]  = useState(false);
  const [error,    setError]   = useState("");
  const [loading,  setLoading] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setName(s.name || "");
      setPersonId(s.personId || "");
    } catch {}
  }, []);

  async function handleSave() {
    setError("");
    if (newPw.length < 6) { setError("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (newPw !== confirm)  { setError("הסיסמאות אינן תואמות"); return; }
    setLoading(true);

    if (!personId) { setError("שגיאה — נסה להתחבר מחדש"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, newPassword: newPw }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "שמירה נכשלה"); setLoading(false); return; }
      router.replace("/dashboard");
    } catch {
      setError("שגיאת רשת"); setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-14 pb-8 px-6 text-center"
        style={{ background: "var(--navy)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(255,255,255,0.12)" }}>
          <ShieldCheck size={28} color="white" />
        </div>
        <p className="text-white text-xl font-bold">כניסה ראשונה</p>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          {name ? `שלום ${name}` : "שלום!"} בחר סיסמה אישית
        </p>
      </div>

      <div className="px-5 pt-6 flex flex-col gap-4">
        <div className="rounded-xl px-4 py-3 text-xs text-right"
          style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)", color: "var(--blue)" }}>
          קיבלת סיסמה זמנית. יש להחליף אותה עכשיו לסיסמה אישית שרק אתה מכיר.
        </div>

        <div className="bg-white rounded-2xl p-5 flex flex-col gap-4"
          style={{ border: "1px solid var(--border)" }}>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
              סיסמה חדשה <span className="font-normal">(לפחות 6 תווים)</span>
            </label>
            <div className="relative flex items-center">
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-3">
                {showPw
                  ? <EyeOff size={16} style={{ color: "var(--text-secondary)" }} />
                  : <Eye     size={16} style={{ color: "var(--text-secondary)" }} />}
              </button>
              <input
                type={showPw ? "text" : "password"}
                placeholder="בחר סיסמה חדשה"
                value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
              אימות סיסמה
            </label>
            <input
              type="password"
              placeholder="הכנס שוב את הסיסמה"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}
            />
          </div>

          {/* Password strength */}
          {newPw.length > 0 && (
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full"
                  style={{ background: newPw.length >= (i + 1) * 3 ? (newPw.length >= 8 ? "var(--green)" : "var(--amber)") : "var(--border)" }} />
              ))}
              <span className="text-xs mr-1" style={{ color: "var(--text-secondary)" }}>
                {newPw.length < 6 ? "קצרה" : newPw.length < 8 ? "בסדר" : "חזקה"}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-right font-medium" style={{ color: "var(--red)" }}>{error}</p>
          )}

          <button onClick={handleSave} disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
            style={{ background: loading ? "var(--border)" : "var(--navy)" }}>
            {loading ? "שומר..." : "שמור וכנס לאפליקציה"}
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <CalendarDays size={14} style={{ color: "var(--text-secondary)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Sidur</p>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
      </div>
    </div>
  );
}
