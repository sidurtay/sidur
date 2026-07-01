"use client";
import { useState, useRef, useEffect } from "react";
import { UserRound, Check, Pencil, KeyRound, Eye, EyeOff, ChevronDown } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

type Profile = { name: string; email: string; phone: string; initials: string; color: string; textColor: string; avatarUrl?: string };

// Full self-service profile editor — photo, name, email. Phone is shown but
// read-only (it's the login username, unique per business). One unified card
// instead of separate avatar/name pieces, so it reads as one coherent
// "your account" section rather than scattered settings.
export default function ProfileCard({
  businessId, personId, profile, onSaved,
}: {
  businessId: string; personId: string; profile: Profile;
  onSaved?: (p: { name: string; email: string }) => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [editing, setEditing] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwStage, setPwStage] = useState<"idle" | "code-sent" | "done">("idle");
  const [pwCode, setPwCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    setAvatarUrl(profile.avatarUrl || "");
    setName(profile.name);
    setEmail(profile.email);
  }, [profile.avatarUrl, profile.name, profile.email]);

  async function handleFile(file: File) {
    setBusyPhoto(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("personId", personId);
      form.append("businessId", businessId);
      form.append("callerId", personId);
      const res = await fetch("/api/employees/avatar", { method: "POST", body: form }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "העלאה נכשלה");
      setAvatarUrl(res.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setBusyPhoto(false);
    }
  }

  async function save() {
    if (!name.trim()) { setError("השם לא יכול להיות ריק"); return; }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/people/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, callerId: personId, name: name.trim(), email: email.trim() }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "השמירה נכשלה");
      setEditing(false);
      setSaved(true);
      onSaved?.({ name: res.name, email: res.email });
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setSaving(false);
    }
  }

  async function requestPwCode() {
    setPwBusy(true);
    setPwError("");
    try {
      const res = await fetch("/api/auth/password-code/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, callerId: personId }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "שליחת הקוד נכשלה");
      setPwStage("code-sent");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setPwBusy(false);
    }
  }

  async function verifyAndSavePw() {
    setPwError("");
    if (!pwCode.trim()) { setPwError("יש להזין את הקוד שקיבלת במייל"); return; }
    if (newPw.length < 6) { setPwError("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (newPw !== confirmPw) { setPwError("הסיסמאות אינן תואמות"); return; }
    setPwBusy(true);
    try {
      const res = await fetch("/api/auth/password-code/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, callerId: personId, code: pwCode.trim(), newPassword: newPw }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "שינוי הסיסמה נכשל");
      setPwStage("done");
      setPwCode(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setPwStage("idle"); setPwOpen(false); }, 2500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader icon={UserRound} title="הפרופיל שלי" />
      <Card padded={false}>
        <div className="flex items-center gap-3 px-3 pt-3.5 pb-3 flex-row justify-end">
          <div className="text-right flex-1">
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              תמונה, שם ואימייל — כפי שיוצגו לצוות ולמנהל.
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busyPhoto}
              className="text-xs font-semibold mt-1.5"
              style={{ color: "var(--blue)" }}
            >
              {busyPhoto ? "מעלה..." : avatarUrl ? "החלף תמונה" : "העלה תמונה"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden text-base font-bold"
            style={{ background: profile.color, color: profile.textColor }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : profile.initials}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <div className="px-3 py-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>שם מלא</label>
            {editing ? (
              <input
                value={name} onChange={e => setName(e.target.value)}
                className="text-sm px-3 py-2 rounded-xl text-right outline-none"
                style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
              />
            ) : (
              <p className="text-sm font-semibold text-right">{name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>אימייל</label>
            {editing ? (
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                dir="ltr"
                className="text-sm px-3 py-2 rounded-xl text-left outline-none"
                style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
              />
            ) : (
              <p className="text-sm text-right" style={{ color: email ? "var(--text-main)" : "var(--text-secondary)", direction: "ltr", textAlign: "right" }}>
                {email || "לא הוגדר"}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>טלפון (לכניסה למערכת)</label>
            <p className="text-sm text-right" style={{ color: "var(--text-secondary)", direction: "ltr", textAlign: "right" }}>{profile.phone}</p>
          </div>

          {error && <p className="text-xs text-right" style={{ color: "var(--red)" }}>{error}</p>}

          <div className="flex items-center gap-2 flex-row justify-end">
            {saved && !editing && (
              <span className="flex items-center gap-1 text-xs font-semibold flex-row" style={{ color: "var(--green)" }}>
                <Check size={13} /> נשמר
              </span>
            )}
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setName(profile.name); setEmail(profile.email); setError(""); }}
                  className="text-xs font-semibold px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  ביטול
                </button>
                <button onClick={save} disabled={saving}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                  style={{ background: saving ? "var(--border)" : "var(--navy)" }}>
                  {saving ? "שומר..." : "שמור"}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-row"
                style={{ color: "var(--blue)", background: "var(--blue-light)" }}>
                <Pencil size={12} /> עריכה
              </button>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }} />

        <div className="px-3 py-2.5">
          <button onClick={() => setPwOpen(v => !v)} className="w-full flex items-center justify-between flex-row">
            <ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: pwOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
            <span className="flex items-center gap-1.5 text-sm font-semibold flex-row" style={{ color: "var(--text-main)" }}>
              שינוי סיסמה <KeyRound size={14} style={{ color: "var(--text-secondary)" }} />
            </span>
          </button>

          {pwOpen && (
            <div className="flex flex-col gap-3 mt-3">
              {pwStage === "idle" && (
                <>
                  <p className="text-xs leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
                    נשלח לך קוד לאימייל שלך, תקף ל-5 דקות, לאימות לפני שינוי הסיסמה.
                  </p>
                  {pwError && <p className="text-xs text-right" style={{ color: "var(--red)" }}>{pwError}</p>}
                  <button onClick={requestPwCode} disabled={pwBusy}
                    className="self-end text-xs font-bold px-4 py-2 rounded-xl text-white"
                    style={{ background: pwBusy ? "var(--border)" : "var(--navy)" }}>
                    {pwBusy ? "שולח..." : "שלח קוד לאימייל"}
                  </button>
                </>
              )}

              {pwStage === "code-sent" && (
                <>
                  <p className="text-xs leading-relaxed text-right" style={{ color: "var(--text-secondary)" }}>
                    שלחנו קוד בן 6 ספרות לאימייל שלך. הזן אותו יחד עם הסיסמה החדשה.
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-right" style={{ color: "var(--text-secondary)" }}>קוד מהמייל</label>
                    <input
                      value={pwCode} onChange={e => setPwCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
                      type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && verifyAndSavePw()}
                      className="text-sm px-3 py-2 rounded-xl outline-none"
                      style={{ border: "1px solid var(--blue-border)", background: "var(--gray-bg)" }}
                    />
                  </div>

                  {pwError && <p className="text-xs text-right" style={{ color: "var(--red)" }}>{pwError}</p>}

                  <div className="flex items-center gap-2 flex-row justify-end">
                    <button onClick={() => { setPwStage("idle"); setPwError(""); }} className="text-xs font-semibold px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                      ביטול
                    </button>
                    <button onClick={requestPwCode} disabled={pwBusy} className="text-xs font-semibold px-3 py-2" style={{ color: "var(--blue)" }}>
                      שלח קוד שוב
                    </button>
                    <button onClick={verifyAndSavePw} disabled={pwBusy}
                      className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                      style={{ background: pwBusy ? "var(--border)" : "var(--navy)" }}>
                      {pwBusy ? "שומר..." : "אשר ושמור"}
                    </button>
                  </div>
                </>
              )}

              {pwStage === "done" && (
                <div className="flex items-center gap-1.5 flex-row justify-end py-1">
                  <span className="text-sm font-semibold" style={{ color: "var(--green)" }}>הסיסמה עודכנה בהצלחה</span>
                  <Check size={16} style={{ color: "var(--green)" }} />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
