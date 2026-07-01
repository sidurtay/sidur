"use client";
import { useState, useEffect } from "react";
import { Fingerprint, Bell, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Fingerprint/Face ID login and push notifications used to be two separate
// full-width cards, each mostly explaining the same idea ("turn this on").
// Merged into one minimalist split row — icon, one-line status, small action
// — since together they're really just "device-level conveniences", not two
// distinct settings areas.
export default function SecurityRow({ businessId, personId }: { businessId: string; personId: string }) {
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      if (session.phone && localStorage.getItem("shiftpro_webauthn_phone") === session.phone) setPasskeyRegistered(true);
    } catch {}
    import("@simplewebauthn/browser").then(({ browserSupportsWebAuthn }) => {
      setPasskeySupported(browserSupportsWebAuthn());
    });

    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      navigator.serviceWorker.register("/sw.js").then(async reg => {
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
      }).catch(() => {});
    }
  }, []);

  async function registerPasskey() {
    setPasskeyBusy(true);
    setPasskeyError("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId }),
      }).then(r => r.json());
      if (!optionsRes.success) throw new Error(optionsRes.error || "שגיאה בהפעלה");

      const attestation = await startRegistration({ optionsJSON: optionsRes.options });

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, response: attestation }),
      }).then(r => r.json());
      if (!verifyRes.success) throw new Error(verifyRes.error || "האימות נכשל");

      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      if (session.phone) localStorage.setItem("shiftpro_webauthn_phone", session.phone);
      setPasskeyRegistered(true);
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "משהו נכשל");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setPushError("");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("לא מוגדר בשרת");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("ההרשאה נדחתה");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, subscription: sub.toJSON(), callerId: personId }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "ההרשמה נכשלה");

      setPushEnabled(true);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "משהו נכשל");
    } finally {
      setPushBusy(false);
    }
  }

  if (!passkeySupported && !pushSupported) return null;

  return (
    <div>
      <SectionHeader icon={Fingerprint} title="כניסה מהירה והתראות" />
      <Card padded={false}>
        <div className="flex flex-row" style={{ direction: "rtl" }}>
          {passkeySupported && (
            <div
              className="flex-1 flex flex-col items-center gap-2 px-3 py-4 text-center"
              style={pushSupported ? { borderInlineStart: "1px solid var(--border)" } : undefined}
            >
              <Fingerprint size={20} style={{ color: passkeyRegistered ? "var(--green)" : "var(--text-secondary)" }} />
              <p className="text-xs font-semibold">טביעת אצבע</p>
              {passkeyError && <p className="text-[10px]" style={{ color: "var(--red)" }}>{passkeyError}</p>}
              {passkeyRegistered ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold flex-row" style={{ color: "var(--green)" }}>
                  <Check size={11} /> מופעל
                </span>
              ) : (
                <button onClick={registerPasskey} disabled={passkeyBusy}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: passkeyBusy ? "var(--border)" : "var(--navy)" }}>
                  {passkeyBusy ? "מפעיל..." : "הפעל"}
                </button>
              )}
            </div>
          )}
          {pushSupported && (
            <div className="flex-1 flex flex-col items-center gap-2 px-3 py-4 text-center">
              <Bell size={20} style={{ color: pushEnabled ? "var(--green)" : "var(--text-secondary)" }} />
              <p className="text-xs font-semibold">התראות Push</p>
              {pushError && <p className="text-[10px]" style={{ color: "var(--red)" }}>{pushError}</p>}
              {pushEnabled ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold flex-row" style={{ color: "var(--green)" }}>
                  <Check size={11} /> מופעל
                </span>
              ) : (
                <button onClick={enablePush} disabled={pushBusy}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: pushBusy ? "var(--border)" : "var(--navy)" }}>
                  {pushBusy ? "מפעיל..." : "הפעל"}
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
