"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Users } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import type { LiveLocation } from "@/components/TeamMap";

const TeamMap = dynamic(() => import("@/components/TeamMap"), { ssr: false });

export default function TeamMapPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusM, setRadiusM] = useState(150);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let biz = "";
    try { biz = JSON.parse(localStorage.getItem("shiftpro_session") || "{}").businessId || ""; } catch {}
    if (!biz) { router.replace("/login"); return; }
    setBusinessId(biz);

    fetch(`/api/business?businessId=${biz}`).then(r => r.json()).then(res => {
      if (res.success) {
        setGeofenceEnabled(!!res.business.geofenceEnabled);
        setRadiusM(res.business.geofenceRadiusM || 150);
        if (res.business.geofenceLat != null && res.business.geofenceLng != null) {
          setCenter({ lat: res.business.geofenceLat, lng: res.business.geofenceLng });
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    async function pollLocations() {
      try {
        const res = await fetch(`/api/location?businessId=${biz}`).then(r => r.json());
        if (res.success) setLocations(res.locations);
      } catch {}
    }
    pollLocations();
    const interval = setInterval(pollLocations, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 relative flex items-center justify-between flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()}><ChevronRight size={20} style={{ color: "var(--text-secondary)" }} /></button>
        <p className="text-base font-semibold">מפה חיה — צוות במשמרת</p>
        <Logo size={20} />
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        {!geofenceEnabled ? (
          <div className="bg-white rounded-2xl p-6 text-center flex flex-col items-center gap-2" style={{ border: "1px solid var(--border)" }}>
            <MapPin size={28} style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>מעקב מיקום לא מופעל</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              הפעל את זה בהגדרות → מיקום העסק, כדי לראות כאן את הצוות שנמצא כרגע במשמרת.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", height: 420 }}>
              {!loading && <TeamMap center={center} radiusM={radiusM} locations={locations} />}
            </div>

            <div className="bg-white rounded-2xl p-3 flex flex-col gap-2" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 flex-row justify-end">
                <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>במשמרת עכשיו</p>
                <Users size={15} style={{ color: "var(--blue)" }} />
              </div>
              {locations.length === 0 ? (
                <p className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>
                  אף אחד לא משתף מיקום כרגע — זה קורה אוטומטית כשעובד נכנס למשמרת והאפליקציה שלו פתוחה.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {locations.map(l => (
                    <div key={l.personId} className="flex items-center gap-2 flex-row justify-end px-2 py-1.5 rounded-xl" style={{ background: "var(--gray-bg)" }}>
                      <p className="text-xs font-medium flex-1 text-right" style={{ color: "var(--text-main)" }}>{l.name}</p>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
                        style={{ background: l.color, color: l.textColor }}>{l.initials}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-center leading-relaxed px-4" style={{ color: "var(--text-secondary)" }}>
              המיקום מתעדכן רק כשהעובד במשמרת והאפליקציה פתוחה (לא ברקע). אם עובד יוצא מהרדיוס המוגדר, תתקבל התראה.
            </p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
