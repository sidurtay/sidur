"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { X, ArrowLeftRight, CalendarClock, CalendarOff } from "lucide-react";
import ClockInOutCard from "./ClockInOutCard";

const SelfLocationMap = dynamic(() => import("./SelfLocationMap"), { ssr: false });

const WEEKDAY_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTH_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

type TodayShift = { role: string; timeIn: string; timeOut: string } | null;

// Live-ticking clock in the sheet header — purely cosmetic, but a real-time
// clock reads as "this is an actual attendance system" the way a static
// timestamp doesn't.
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <p className="text-3xl font-extrabold tabular-nums" style={{ color: "#fff", direction: "ltr" }}>
      {hh}:{mm}<span style={{ opacity: 0.6, fontSize: "1.5rem" }}>:{ss}</span>
    </p>
  );
}

// The slide-up sheet behind the bottom nav's central clock-in button —
// deliberately stops short of the top of the screen (not a full-screen modal)
// so the page underneath stays visible, reinforcing that this is a quick
// action layered on top of wherever you already are, not a separate page.
export default function ClockInSheet({ businessId, personId, onClose }: { businessId: string; personId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [geofence, setGeofence] = useState<{ lat: number; lng: number; radiusM: number } | null>(null);
  const [avatar, setAvatar] = useState({ color: "var(--navy)", textColor: "#fff", initials: "", name: "" });
  const [todayShift, setTodayShift] = useState<TodayShift>(null);
  const [shiftLoaded, setShiftLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    fetch(`/api/business?businessId=${businessId}`).then(r => r.json()).then(res => {
      if (res.success && res.business.geofenceEnabled && res.business.geofenceLat != null) {
        setGeofence({ lat: res.business.geofenceLat, lng: res.business.geofenceLng, radiusM: res.business.geofenceRadiusM || 150 });
      }
    }).catch(() => {});
    fetch(`/api/employees?businessId=${businessId}`).then(r => r.json()).then(res => {
      if (res.success) {
        const me = res.employees.find((e: { id: string }) => e.id === personId);
        if (me) setAvatar({ color: me.color, textColor: me.textColor, initials: me.initials, name: me.name?.split(" ")[0] || "" });
      }
    }).catch(() => {});
    fetch(`/api/ai/snapshot?businessId=${businessId}&personId=${personId}`).then(r => r.json()).then(res => {
      if (res.success && res.shift) {
        setTodayShift(res.shift.none ? null : { role: res.shift.role, timeIn: res.shift.timeIn, timeOut: res.shift.timeOut });
      }
      setShiftLoaded(true);
    }).catch(() => setShiftLoaded(true));
  }, [businessId, personId]);

  function handleClose() {
    setMounted(false);
    setTimeout(onClose, 220);
  }

  const now = new Date();
  const dateLabel = `יום ${WEEKDAY_HE[now.getDay()]}, ${now.getDate()} ב${MONTH_HE[now.getMonth()]}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: mounted ? "rgba(11,30,61,0.45)" : "rgba(11,30,61,0)", transition: "background 0.25s ease" }}
      onClick={handleClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg flex flex-col overflow-hidden"
        style={{
          background: "var(--gray-bg)",
          borderRadius: "26px 26px 0 0",
          maxHeight: "84vh",
          transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
          opacity: mounted ? 1 : 0,
          transformOrigin: "bottom center",
          transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.24s ease",
          boxShadow: "0 -16px 50px rgba(11,30,61,0.35)",
        }}
      >
        {/* Header — orange gradient, live clock, employee + today's shift */}
        <div className="relative px-5 pt-4 pb-5" style={{ background: "linear-gradient(150deg, #FB8B3D, #F97316 60%, #EA6A0E)" }}>
          <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: "rgba(255,255,255,0.35)" }} />
          <div className="flex items-start justify-between flex-row">
            <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)" }}>
              <X size={16} color="#fff" />
            </button>
            <div className="text-right flex-1 mr-2">
              <p className="text-xs font-semibold mb-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>{dateLabel}</p>
              <LiveClock />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-row mt-4">
            {avatar.initials && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: avatar.color, color: avatar.textColor, border: "2px solid rgba(255,255,255,0.5)" }}>
                {avatar.initials}
              </div>
            )}
            <div className="flex-1 rounded-xl px-3 py-2 text-right" style={{ background: "rgba(255,255,255,0.16)" }}>
              {!shiftLoaded ? (
                <p className="text-xs font-medium" style={{ color: "#fff" }}>&nbsp;</p>
              ) : todayShift ? (
                <p className="text-xs font-semibold" style={{ color: "#fff" }}>
                  המשמרת שלך היום · {todayShift.role} · <span dir="ltr">{todayShift.timeIn}–{todayShift.timeOut}</span>
                </p>
              ) : (
                <p className="text-xs font-medium flex items-center gap-1.5 justify-end flex-row" style={{ color: "rgba(255,255,255,0.9)" }}>
                  אין לך משמרת מתוכננת היום <CalendarOff size={12} />
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pt-3.5 pb-6 flex flex-col gap-3">
          <SelfLocationMap geofence={geofence} avatarColor={avatar.color} avatarText={avatar.textColor} initials={avatar.initials} />
          <ClockInOutCard businessId={businessId} personId={personId} />

          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <Link href="/dashboard" onClick={handleClose}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl"
              style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--blue-light)" }}>
                <ArrowLeftRight size={15} style={{ color: "var(--blue)" }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>בקשות שלי</span>
            </Link>
            <Link href="/my-hours" onClick={handleClose}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl"
              style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--green-light)" }}>
                <CalendarClock size={15} style={{ color: "var(--green)" }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>גיליון שעות</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
