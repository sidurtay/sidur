"use client";
import { useState, useRef, useEffect } from "react";
import { UserRound, Check, Pencil } from "lucide-react";
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
      </Card>
    </div>
  );
}
