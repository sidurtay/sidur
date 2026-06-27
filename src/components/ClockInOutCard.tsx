"use client";
import { useState, useEffect } from "react";
import { Fingerprint, Hourglass } from "lucide-react";
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
  };
}

// Central fingerprint tap button for clocking in/out of today's shift, shared
// between the employee dashboard and the manager/אחמ"ש dashboard (managers work
// shifts too and need the same self clock-in flow as anyone else).
export default function ClockInOutCard({ businessId, personId }: { businessId: string; personId: string }) {
  const [clockState, setClockState] = useState<ClockState>({ in: "none", out: "none" });
  const [outNeedsApproval, setOutNeedsApproval] = useState(true);

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
      .then(res => { if (res.success) setOutNeedsApproval(!!res.business.clockoutRequiresApproval); })
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
