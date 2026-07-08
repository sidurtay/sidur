"use client";
import { useState, useEffect } from "react";
import { MapPin, Check, LocateFixed, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

const RADIUS_OPTIONS = [100, 150, 250, 500];

// Sets the business's physical location + a radius, used by the (foreground-only,
// while the app is open) in-shift GPS feature: a manager can see clocked-in staff
// on a map, and gets alerted if someone leaves the radius during their shift.
// Off by default — nothing is tracked until a manager explicitly sets a location here.
export default function GeofenceCard({ businessId, callerId }: { businessId: string; callerId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(150);
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");

  async function syncFromServer() {
    try {
      const res = await fetch(`/api/business?businessId=${businessId}`).then(r => r.json());
      if (!res.success) return;
      const b = res.business;
      setEnabled(!!b.geofenceEnabled);
      setLat(b.geofenceLat ?? null);
      setLng(b.geofenceLng ?? null);
      setRadius(b.geofenceRadiusM || 150);
    } catch {}
  }

  useEffect(() => { if (businessId) syncFromServer(); }, [businessId]);

  async function save(patch: { geofenceEnabled?: boolean; geofenceLat?: number; geofenceLng?: number; geofenceRadiusM?: number }) {
    setError("");
    try {
      const res = await fetch("/api/business", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, callerId, ...patch }),
      }).then(r => r.json());
      if (!res.success) {
        setError(res.error || "השמירה נכשלה");
        await syncFromServer();
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("שגיאת רשת — נסה שוב");
      await syncFromServer();
    }
  }

  async function searchAddress() {
    const q = address.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setResolvedAddress("");
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`).then(r => r.json());
      if (!res.success) {
        setError(res.error || "לא הצלחנו למצוא את הכתובת");
      } else {
        setLat(res.lat); setLng(res.lng);
        setResolvedAddress(res.displayName);
        setEnabled(true);
        await save({ geofenceLat: res.lat, geofenceLng: res.lng, geofenceEnabled: true });
      }
    } catch {
      setError("שגיאת רשת — נסה שוב");
    }
    setSearching(false);
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setError("הדפדפן הזה לא תומך באיתור מיקום");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const newLat = pos.coords.latitude, newLng = pos.coords.longitude;
        setLat(newLat); setLng(newLng);
        setLocating(false);
        save({ geofenceLat: newLat, geofenceLng: newLng, geofenceEnabled: true });
        setEnabled(true);
      },
      () => { setLocating(false); setError("לא הצלחנו לקבל את המיקום שלך — ודא שאישרת הרשאת מיקום"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <SectionHeader icon={MapPin} title="מיקום העסק (למעקב משמרת)" />
      <Card padded={false}>
        <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-row">
          <button
            onClick={() => { const next = !enabled; setEnabled(next); save({ geofenceEnabled: next }); }}
            disabled={!lat}
            className="relative flex-shrink-0"
            style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? "var(--navy)" : "var(--border)", transition: "background 0.2s", opacity: lat ? 1 : 0.5 }}>
            <span className="absolute top-1 rounded-full bg-white transition-all"
              style={{ width: 14, height: 14, right: enabled ? 3 : 19, transition: "right 0.2s" }} />
          </button>
          <p className="text-sm font-semibold">הפעל מעקב מיקום בזמן משמרת</p>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 flex-row">
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") searchAddress(); }}
              placeholder="הקלד כתובת — למשל: הרצל 12, נהריה"
              className="flex-1 text-xs px-3 py-2.5 rounded-xl text-right outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--gray-bg)", color: "var(--text-main)" }}
            />
            <button onClick={searchAddress} disabled={searching || !address.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--navy)", opacity: searching || !address.trim() ? 0.5 : 1 }}>
              <Search size={15} color="#fff" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-row">
            <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
            <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>או</p>
            <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
          </div>

          <button onClick={captureCurrentLocation} disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl flex-row"
            style={{ border: "1px solid var(--border)", background: "var(--gray-bg)", opacity: locating ? 0.6 : 1 }}>
            <LocateFixed size={15} style={{ color: "var(--blue)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--blue)" }}>
              {locating ? "מאתר..." : lat ? "עדכן מיקום — עמוד כאן ולחץ" : "קבע מיקום — עמוד בעסק ולחץ כאן"}
            </span>
          </button>

          {resolvedAddress && (
            <p className="text-[11px] text-center leading-snug" style={{ color: "var(--green)" }}>
              נמצא: {resolvedAddress}
            </p>
          )}

          {lat != null && lng != null && !resolvedAddress && (
            <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)", direction: "ltr" }}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}

          {lat && (
            <div className="flex items-center gap-2 flex-row">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>רדיוס:</p>
              <div className="flex-1 flex flex-row gap-1.5">
                {RADIUS_OPTIONS.map(r => (
                  <button key={r} onClick={() => { setRadius(r); save({ geofenceRadiusM: r }); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                    style={radius === r
                      ? { background: "var(--blue)", color: "#fff" }
                      : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {r}מ&apos;
                  </button>
                ))}
              </div>
            </div>
          )}

          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold justify-center flex-row" style={{ color: "var(--green)" }}>
              <Check size={13} /> נשמר
            </span>
          )}
        </div>

        {error && (
          <p className="text-[11px] px-3 pb-1.5 text-right font-medium" style={{ color: "var(--red)" }}>{error}</p>
        )}
        <p className="text-[10px] px-3 pb-2.5 text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          כשמופעל, עובדים שנכנסו למשמרת משתפים מיקום בזמן שהאפליקציה פתוחה — לא ברקע. אם עובד יוצא מהרדיוס בזמן המשמרת, תישלח התראה למנהל.
        </p>
      </Card>
    </div>
  );
}
