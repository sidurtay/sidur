"use client";
import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Real push notifications outside the app — until now every notification
// (proactive AI bubble, manager_notifications, tips) only ever showed up if
// the person had the app open. Shared between manager and employee settings.
export default function PushNotificationCard({ businessId, personId }: { businessId: string; personId: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.register("/sw.js").then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub);
    }).catch(() => {});
  }, []);

  async function enablePush() {
    setBusy(true);
    setError("");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("התראות לא מוגדרות בשרת");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("ההרשאה להתראות נדחתה — אפשר להפעיל אותה מהגדרות הדפדפן");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, subscription: sub.toJSON(), callerId: personId }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error || "ההרשמה להתראות נכשלה");

      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו נכשל, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div>
      <SectionHeader icon={Bell} title="התראות Push" />
      <Card padded={false}>
      <p className="text-xs px-3 pt-2.5 pb-2 text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {enabled
          ? "התראות מופעלות במכשיר הזה — תקבל/י עדכון גם כשהאפליקציה סגורה."
          : "הפעל/י התראות כדי לקבל עדכונים (בקשות, הודעות, אישורים) גם כשהאפליקציה סגורה."}
      </p>
      {error && (
        <p className="text-xs px-3 pb-1 text-right" style={{ color: "var(--red)" }}>{error}</p>
      )}
      <div className="px-3 pb-3">
        {enabled ? (
          <div className="flex items-center gap-1.5 flex-row justify-end">
            <Check size={13} style={{ color: "var(--green)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>מופעל</p>
          </div>
        ) : (
          <button onClick={enablePush} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: busy ? "#9CA3AF" : "var(--navy)" }}>
            {busy ? "מפעיל..." : "הפעל התראות"}
          </button>
        )}
      </div>
      </Card>
    </div>
  );
}
