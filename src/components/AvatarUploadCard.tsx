"use client";
import { useState, useRef } from "react";
import { ImageIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

// Lets a person set a real profile photo (picked from their device gallery)
// instead of only the colored-initials avatar shown everywhere else in the
// app. Self-service only — the API enforces personId === callerId.
export default function AvatarUploadCard({
  businessId, personId, initialAvatarUrl, initials, color, textColor,
}: {
  businessId: string; personId: string; initialAvatarUrl?: string;
  initials: string; color: string; textColor: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader icon={ImageIcon} title="תמונת פרופיל" />
      <Card padded={false}>
        <div className="flex items-center gap-3 px-3 py-3 flex-row justify-end">
          <div className="text-right flex-1">
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              בחר/י תמונה מהגלריה של המכשיר במקום האותיות הצבעוניות.
            </p>
            {error && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{error}</p>}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="text-xs font-semibold mt-1.5"
              style={{ color: "var(--blue)" }}
            >
              {busy ? "מעלה..." : avatarUrl ? "החלף תמונה" : "העלה תמונה"}
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
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden text-sm font-bold"
            style={{ background: color, color: textColor }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : initials}
          </div>
        </div>
      </Card>
    </div>
  );
}
