"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// A small single-person map for "here's where you are right now" — shown
// inside the clock-in sheet so the employee can see their own position
// relative to the workplace geofence before/while clocking in. Purely a
// visual reassurance; the actual GPS reporting loop lives in ClockInOutCard.
export default function SelfLocationMap({
  geofence, avatarColor, avatarText, initials,
}: {
  geofence: { lat: number; lng: number; radiusM: number } | null;
  avatarColor: string; avatarText: string; initials: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const fallback = geofence || { lat: 32.0853, lng: 34.7818 };
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false })
      .setView([fallback.lat, fallback.lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    if (geofence) {
      L.circle([geofence.lat, geofence.lng], {
        radius: geofence.radiusM, color: "#F97316", fillColor: "#F97316", fillOpacity: 0.12, weight: 1.5,
      }).addTo(map);
    }

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setDenied(true); return; }
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const map = mapRef.current;
        if (!map) return;
        const { latitude, longitude } = pos.coords;
        const icon = L.divIcon({
          html: `<div style="width:38px;height:38px;border-radius:999px;background:${avatarColor};color:${avatarText};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35)">${initials}</div>`,
          className: "", iconSize: [38, 38], iconAnchor: [19, 19],
        });
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        } else {
          markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
          map.setView([latitude, longitude], 17);
        }
      },
      () => setDenied(true),
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [avatarColor, avatarText, initials]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden flex-shrink-0" style={{ height: 150 }}>
      <div ref={containerRef} className="w-full h-full" />
      {denied && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--gray-bg)" }}>
          <p className="text-xs text-center px-6" style={{ color: "var(--text-secondary)" }}>
            אין גישה למיקום — אפשר עדיין לדווח נוכחות, פשוט לא נראה אותך על המפה
          </p>
        </div>
      )}
    </div>
  );
}
