"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveLocation = { personId: string; lat: number; lng: number; name: string; initials: string; color: string; textColor: string };

// Plain Leaflet (not react-leaflet) — avoids SSR/hydration headaches for a
// component that's dynamically imported client-only anyway, and keeps this
// dependency-light: no default marker image assets to wire up, just a
// divIcon built from the same colored-initials-circle look used everywhere
// else in the app (employee rows, schedule cells, etc).
export default function TeamMap({
  center, radiusM, locations,
}: {
  center: { lat: number; lng: number } | null;
  radiusM: number;
  locations: LiveLocation[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = center || { lat: 32.0853, lng: 34.7818 }; // Tel Aviv fallback if no geofence set yet
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([initial.lat, initial.lng], 16);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
    if (center) {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusM, color: "#F97316", fillColor: "#F97316", fillOpacity: 0.12, weight: 1.5,
      }).addTo(map);
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, radiusM]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    locations.forEach(loc => {
      seen.add(loc.personId);
      const icon = L.divIcon({
        html: `<div style="width:34px;height:34px;border-radius:999px;background:${loc.color};color:${loc.textColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${loc.initials}</div>`,
        className: "", iconSize: [34, 34], iconAnchor: [17, 17],
      });
      const existing = markersRef.current[loc.personId];
      if (existing) {
        existing.setLatLng([loc.lat, loc.lng]);
      } else {
        markersRef.current[loc.personId] = L.marker([loc.lat, loc.lng], { icon }).addTo(map).bindTooltip(loc.name, { direction: "top" });
      }
    });
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
  }, [locations]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 320 }} />;
}
