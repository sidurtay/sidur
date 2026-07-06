"use client";
import { useState, useEffect, useRef } from "react";
import { Fingerprint, Hourglass, MapPin } from "lucide-react";
import { type ClockState } from "@/lib/clockRequests";

type ApiClockRequest = { id: string; personId: string; type: "in" | "out"; status: "pending" | "approved" | "denied"; requestedAt: number };

function deriveClockState(requests: ApiClockRequest[]): ClockState {
  const lastIn = [...requests].reverse().find(r => r.type === "in");
  const lastOut = [...requests].reverse().find(r => r.type === "out");
  const label = (ts: number) => new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return {
    in: lastIn ? (lastIn.status === "denied" ? "none" : lastIn.status) : "none",
    out: lastOut ? (lastOut.status === "denied" ? "none" : lastOut.status) : "none",
    inTime: lastIn?.status === "approved" ? label(lastIn.requestedAt) : undefined,
    outTime: lastOut?.status === "approved" ? label(lastOut.requestedAt) : undefined,
    inRequestedAt: lastIn && lastIn.status !== "denied" ? label(lastIn.requestedAt) : undefined,
    outRequestedAt: lastOut && lastOut.status !== "denied" ? label(lastOut.requestedAt) : undefined,
    inTimestamp: lastIn?.status === "approved" ? lastIn.requestedAt : undefined,
  };
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Live-ticking "how long have I been on shift" counter — purely a client-side
// display computed from the approved clock-in timestamp, no extra API calls.
function ShiftTimer({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-full rounded-xl px-4 py-3 text-center" style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
      <p className="text-[10px] font-medium mb-1" style={{ color: "var(--blue)" }}>זמן במשמרת</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--blue)", direction: "ltr" }}>
        {formatElapsed(now - since)}
      </p>
    </div>
  );
}

// Reports live position while the employee is clocked in and this screen is
// open — foreground only, on purpose (see Settings → מיקום העסק). Stops the
// moment the component unmounts or the shift ends; nothing runs in the
// background. Visible to the employee via the pin badge, never silent.
function LiveLocationSharing({ businessId, personId }: { businessId: string; personId: string }) {
  const [sharing, setSharing] = useState(false);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setSharing(true);
        const now = Date.now();
        if (now - lastSentRef.current < 20000) return; // throttle to once per ~20s
        lastSentRef.current = now;
        fetch("/api/location", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, personId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => setSharing(false),
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [businessId, personId]);

  if (!sharing) return null;
  return (
    <div className="flex items-center gap-1.5 justify-center flex-row w-full">
      <MapPin size={11} style={{ color: "var(--blue)" }} />
      <p className="text-[10px] font-medium" style={{ color: "var(--blue)" }}>משתף/ת מיקום בזמן המשמרת</p>
    </div>
  );
}

// Central fingerprint tap button for clocking in/out of today's shift, shared
// between the employee dashboard and the manager/אחמ"ש dashboard (managers work
// shifts too and need the same self clock-in flow as anyone else).
export default function ClockInOutCard({ businessId, personId }: { businessId: string; personId: string }) {
  const [clockState, setClockState] = useState<ClockState>({ in: "none", out: "none" });
  const [outNeedsApproval, setOutNeedsApproval] = useState(true);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);

  async function refreshClockState() {
    try {
      const res = await fetch(`/api/clock-requests?businessId=${businessId}&personId=${personId}`).then(r => r.json());
      if (res.success) setClockState(deriveClockState(res.requests));
    } catch {}
  }

  useEffect(() => {
    // The manager's clockout-approval setting lives on the business record in
    // Supabase, not localStorage — a per-device flag would go stale the moment
    // the manager changes it from a different device than the employee's.
    fetch(`/api/business?businessId=${businessId}`).then(r => r.json())
      .then(res => {
        if (res.success) {
          setOutNeedsApproval(!!res.business.clockoutRequiresApproval);
          setGeofenceEnabled(!!res.business.geofenceEnabled);
        }
      })
      .catch(() => {});
    refreshClockState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, personId]);

  useEffect(() => {
    if (clockState.in !== "pending" && clockState.out !== "pending") return;
    const interval = setInterval(refreshClockState, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockState.in, clockState.out]);

  async function handleClockIn() {
    await fetch("/api/clock-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, personId, type: "in", callerId: personId }),
    }).catch(() => {});
    refreshClockState();
  }
  async function handleClockOut() {
    await fetch("/api/clock-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, personId, type: "out", autoApprove: !outNeedsApproval, callerId: personId }),
    }).catch(() => {});
    refreshClockState();
  }

  return (
    <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-3" style={{ border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold self-start">דיווח נוכחות</p>

      {clockState.out === "approved" ? (
        <div className="w-full rounded-xl px-4 py-3 text-center" style={{ background: "var(--green-light)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>✓ סיימת את המשמרת היום</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>כניסה {clockState.inTime} · יציאה {clockState.outTime}</p>
        </div>
      ) : clockState.in === "none" ? (
        <>
          <button onClick={handleClockIn} aria-label="כניסה למשמרת בטביעת אצבע"
            className="rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ width: 88, height: 88, background: "var(--navy)", boxShadow: "0 8px 20px -6px rgba(20,24,31,0.45)" }}>
            <Fingerprint size={40} color="#fff" />
          </button>
          <p className="text-sm font-semibold">לחץ לכניסה למשמרת</p>
        </>
      ) : clockState.in === "pending" ? (
        <>
          <div className="rounded-full flex items-center justify-center"
            style={{ width: 88, height: 88, background: "var(--blue-light)" }}>
            <Hourglass size={32} style={{ color: "var(--blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>ממתין לאישור מנהל/אחמ&quot;ש...</p>
          {clockState.inRequestedAt && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              הבקשה לכניסה למשמרת נשלחה בשעה {clockState.inRequestedAt}
            </p>
          )}
        </>
      ) : clockState.out === "none" ? (
        <>
          <div className="rounded-xl px-3 py-2 text-center w-full" style={{ background: "var(--green-light)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>✓ נכנסת למשמרת ב-{clockState.inTime}</p>
          </div>
          {clockState.inTimestamp && <ShiftTimer since={clockState.inTimestamp} />}
          {geofenceEnabled && <LiveLocationSharing businessId={businessId} personId={personId} />}
          <button onClick={handleClockOut} aria-label="סיום משמרת בטביעת אצבע"
            className="rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ width: 88, height: 88, background: "var(--navy)", boxShadow: "0 8px 20px -6px rgba(20,24,31,0.45)" }}>
            <Fingerprint size={40} color="#fff" />
          </button>
          <p className="text-sm font-semibold">לחץ לסיום משמרת</p>
        </>
      ) : (
        <>
          <div className="rounded-full flex items-center justify-center"
            style={{ width: 88, height: 88, background: "var(--blue-light)" }}>
            <Hourglass size={32} style={{ color: "var(--blue)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>ממתין לאישור מנהל/אחמ&quot;ש לסיום משמרת...</p>
          {clockState.outRequestedAt && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              הבקשה לסיום משמרת נשלחה בשעה {clockState.outRequestedAt}
            </p>
          )}
        </>
      )}
    </div>
  );
}
