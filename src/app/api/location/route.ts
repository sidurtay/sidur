import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToManagers } from "@/lib/push";

// Haversine distance in meters — good enough for a workplace-radius check,
// no need for anything fancier at this scale.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Only one alert per person per "outside the radius" episode — without this,
// a phone hovering right at the boundary would fire a push every few seconds.
const recentlyAlerted = new Set<string>();

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  // Only "live" positions — anything older than a few minutes means the
  // employee's app isn't actively reporting anymore (closed, backgrounded,
  // or clocked out), so don't show a stale pin as if they're still there.
  const staleCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("employee_locations")
    .select("person_id, lat, lng, updated_at, people(name, initials, color, text_color)")
    .eq("business_id", businessId)
    .gte("updated_at", staleCutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const locations = (data || []).map(r => {
    const person = r.people as unknown as { name: string; initials: string; color: string; text_color: string } | null;
    return {
      personId: r.person_id, lat: r.lat, lng: r.lng, updatedAt: r.updated_at,
      name: person?.name || "", initials: person?.initials || "",
      color: person?.color || "#F1EFE8", textColor: person?.text_color || "#444441",
    };
  });
  return NextResponse.json({ success: true, locations });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, lat, lng } = await req.json();
    if (!businessId || !personId || lat == null || lng == null) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    await supabase.from("employee_locations").upsert({
      person_id: personId, business_id: businessId, lat, lng, updated_at: new Date().toISOString(),
    });

    const { data: biz } = await supabase
      .from("businesses")
      .select("geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m")
      .eq("id", businessId).maybeSingle();

    let outsideRadius = false;
    if (biz?.geofence_enabled && biz.geofence_lat != null && biz.geofence_lng != null) {
      const dist = distanceMeters(lat, lng, biz.geofence_lat, biz.geofence_lng);
      outsideRadius = dist > (biz.geofence_radius_m || 150);

      const alertKey = `${businessId}:${personId}`;
      if (outsideRadius && !recentlyAlerted.has(alertKey)) {
        recentlyAlerted.add(alertKey);
        setTimeout(() => recentlyAlerted.delete(alertKey), 15 * 60 * 1000); // re-alert after 15 min if still out
        const { data: person } = await supabase.from("people").select("name").eq("id", personId).maybeSingle();
        await sendPushToManagers(businessId, {
          title: "עובד יצא מאזור העבודה",
          body: `${person?.name || "עובד"} יצא/ה מהאזור המוגדר בזמן שהוא/היא במשמרת`,
        });
      } else if (!outsideRadius) {
        recentlyAlerted.delete(alertKey);
      }
    }

    return NextResponse.json({ success: true, outsideRadius });
  } catch (err) {
    console.error("update location error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
