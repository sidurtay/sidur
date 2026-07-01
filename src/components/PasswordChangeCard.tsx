"use client";
import { useState } from "react";
import { KeyRound, Eye, EyeOff, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

// In-app password change via a 6-digit email code (5 min TTL) — distinct from
// the "forgot password / locked out" flow, this is for someone already
// logged in who just wants to set a new password safely.
export default function PasswordChangeCard({ businessId, personId }: { businessId: string; personId: string }) {
  const [stage, setStage] = useState<"idle" | "code-sent" | "done">("idle");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-code/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, callerId: personId }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "שליחת הקוד נכשלה");
      setStage("code-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSave() {
    setError("");
    if (!code.trim()) { setError("יש להזין את הקוד שקיבלת במייל"); return; }
    if (newPw.length < 6) { setError("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (newPw !== confirm) { setError("הסיסמאות אינן תואמות"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-code/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, callerId: personId, code: code.trim(), newPassword: newPw }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "שינוי הסיסמה נכשל");
      setStage("done");
      setCode(""); setNewPw(""); setConfirm("");
      setTimeout(() => setStage("idle"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader icon={KeyRound} title="שינוי סיסמה" />
      <Card padded={false}>
        <div className="px-3 py-3 flex flex-col gap-3">
          {stage === "idle" && (
            <>
              <p className="text-xs leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
                נשלח לך קוד לאימייל שלך, תקף ל-5 דקות, לאימות לפני שינוי הסיסמה.
              </p>
              {error && <p className="text-xs text-right" style={{ color: "var(--red)" }}>{error}</p>}
              <button onClick={requestCode} disabled={busy}
                className="self-end text-xs font-bold px-4 py-2 rounded-xl text-white"
                style={{ background: busy ? "var(--border)" : "var(--navy)" }}>
                {busy ? "שולח..." : "שלח קוד לאימייל"}
              </button>
            </>
          )}

          {stage === "code-sent" && (
            <>
              <p className="text-xs leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
                שלחנו קוד בן 6 ספרות לאימייל שלך. הזן אותו יחד עם הסיסמה החדשה.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>קוד מהמייל</label>
                <input
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric" dir="ltr" placeholder="000000"
                  className="text-sm px-3 py-2 rounded-xl outline-none text-center tracking-widest"
                  style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>סיסמה חדשה</label>
                <div className="relative flex items-center">
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-3">
                    {showPw ? <EyeOff size={14} style={{ color: "var(--text-secondary)" }} /> : <Eye size={14} style={{ color: "var(--text-secondary)" }} />}
                  </button>
                  <input
                    type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>אימות סיסמה</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verifyAndSave()}
                  className="text-sm px-3 py-2 rounded-xl outline-none"
                  style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
                />
              </div>

              {error && <p className="text-xs text-right" style={{ color: "var(--red)" }}>{error}</p>}

              <div className="flex items-center gap-2 flex-row justify-end">
                <button onClick={() => { setStage("idle"); setError(""); }} className="text-xs font-semibold px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  ביטול
                </button>
                <button onClick={requestCode} disabled={busy} className="text-xs font-semibold px-3 py-2" style={{ color: "var(--blue)" }}>
                  שלח קוד שוב
                </button>
                <button onClick={verifyAndSave} disabled={busy}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                  style={{ background: busy ? "var(--border)" : "var(--navy)" }}>
                  {busy ? "שומר..." : "אשר ושמור"}
                </button>
              </div>
            </>
          )}

          {stage === "done" && (
            <div className="flex items-center gap-1.5 flex-row justify-end py-1">
              <span className="text-sm font-semibold" style={{ color: "var(--green)" }}>הסיסמה עודכנה בהצלחה</span>
              <Check size={16} style={{ color: "var(--green)" }} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
