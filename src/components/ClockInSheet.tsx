"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { X, ArrowLeftRight, CalendarClock } from "lucide-react";
import ClockInOutCard from "./ClockInOutCard";

const SelfLocationMap = dynamic(() => import("./SelfLocationMap"), { ssr: false });

// The slide-up sheet behind the bottom nav's central fingerprint button —
// deliberately stops short of the top of the screen (not a full-screen modal)
// so the page underneath stays visible, reinforcing that this is a quick
// action layered on top of wherever you already are, not a separate page.
export default function ClockInSheet({ businessId, personId, onClose }: { businessId: string; personId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [geofence, setGeofence] = useState<{ lat: number; lng: number; radiusM: number } | null>(null);
  const [avatar, setAvatar] = useState({ color: "var(--navy)", textColor: "#fff", initials: "" });

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
        if (me) setAvatar({ color: me.color, textColor: me.textColor, initials: me.initials });
      }
    }).catch(() => {});
  }, [businessId, personId]);

  function handleClose() {
    setMounted(false);
    setTimeout(onClose, 220);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: mounted ? "rgba(11,30,61,0.4)" : "rgba(11,30,61,0)", transition: "background 0.2s" }}
      onClick={handleClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg flex flex-col"
        style={{
          background: "var(--gray-bg)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "78vh",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 -10px 40px rgba(11,30,61,0.3)",
        }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-row">
          <button onClick={handleClose}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
          <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>שעון נוכחות</p>
        </div>

        <div className="overflow-y-auto px-4 pb-6 flex flex-col gap-3">
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
