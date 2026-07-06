import { NextRequest, NextResponse } from "next/server";

// Thin server-side proxy to OpenStreetMap's free Nominatim geocoder — free,
// no API key, but requires a real User-Agent and shouldn't be called directly
// from the browser (CORS + usage-policy reasons), hence this route instead of
// hitting nominatim.openstreetmap.org straight from GeofenceCard.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "כתובת חסרה" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Sidur-App/1.0 (contact: support@sidur.app)" } });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "לא נמצאה כתובת כזו — נסה לנסח אחרת" }, { status: 404 });
    }

    const match = data[0] as { lat: string; lon: string; display_name: string };
    return NextResponse.json({
      success: true,
      lat: parseFloat(match.lat), lng: parseFloat(match.lon),
      displayName: match.display_name,
    });
  } catch (err) {
    console.error("geocode error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
