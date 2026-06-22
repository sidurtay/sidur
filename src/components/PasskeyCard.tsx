"use client";
import { useState, useEffect } from "react";
import { Fingerprint, Check } from "lucide-react";

// Fingerprint/Face ID passkey registration for this device — shared between
// the manager settings page and the employee settings page, since both kinds
// of users log in with phone+password and can equally benefit from skipping it.
export default function PasskeyCard({ businessId, personId }: { businessId: string; personId: string }) {
  const [supported, setSupported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      if (session.phone && localStorage.getItem("shiftpro_webauthn_phone") === session.phone) setRegistered(true);
    } catch {}
    import("@simplewebauthn/browser").then(({ browserSupportsWebAuthn }) => {
      setSupported(browserSupportsWebAuthn());
    });
  }, []);

  async function registerPasskey() {
    setBusy(true);
    setError("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId }),
      }).then(r => r.json());
      if (!optionsRes.success) throw new Error(optionsRes.error || "שגיאה בהפעלת טביעת אצבע");

      const attestation = await startRegistration({ optionsJSON: optionsRes.options });

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, response: attestation }),
      }).then(r => r.json());
      if (!verifyRes.success) throw new Error(verifyRes.error || "האימות נכשל");

      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      if (session.phone) localStorage.setItem("shiftpro_webauthn_phone", session.phone);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
        <Fingerprint size={13} style={{ color: "var(--blue)" }} />
        <p className="text-sm font-semibold">כניסה בטביעת אצבע</p>
      </div>
      <p className="text-xs px-3 pt-2.5 pb-2 text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {registered
          ? "כניסה בטביעת אצבע / Face ID מופעלת במכשיר הזה."
          : "הפעל כניסה מהירה במכשיר הזה עם טביעת אצבע או Face ID, בלי להקליד סיסמה."}
      </p>
      {error && (
        <p className="text-xs px-3 pb-1 text-right" style={{ color: "var(--red)" }}>{error}</p>
      )}
      <div className="px-3 pb-3">
        {registered ? (
          <div className="flex items-center gap-1.5 flex-row justify-end">
            <Check size={13} style={{ color: "var(--green)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>מופעל</p>
          </div>
        ) : (
          <button onClick={registerPasskey} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: busy ? "#9CA3AF" : "var(--navy)" }}>
            {busy ? "מפעיל..." : "הפעל כניסה בטביעת אצבע"}
          </button>
        )}
      </div>
    </div>
  );
}
