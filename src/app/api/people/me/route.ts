import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initialsFor } from "@/lib/avatarPalette";

// Small self-serve lookup — used by settings to show the current person's own
// avatar (initials/color fallback + optional uploaded photo), regardless of
// whether they're a manager or employee (managers don't get initials/color
// assigned at signup the way employees do via paletteFor).
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId || !personId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, email, phone, initials, color, text_color, avatar_url")
    .eq("id", personId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    name: data.name,
    email: data.email || "",
    phone: data.phone,
    initials: data.initials || initialsFor(data.name),
    color: data.color || "var(--navy)",
    textColor: data.text_color || "#fff",
    avatarUrl: data.avatar_url || undefined,
  });
}

// Self-service profile edit — name + email only. Phone stays read-only here:
// it's the login username and unique per business, so changing it belongs in
// a more careful flow (or a manager-assisted one), not a plain text field.
export async function PATCH(req: NextRequest) {
  try {
    const { businessId, personId, callerId, name, email } = await req.json();
    if (!businessId || !personId || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    if (personId !== callerId) {
      return NextResponse.json({ error: "אפשר לערוך רק את הפרופיל שלך" }, { status: 403 });
    }
    if (typeof name === "string" && !name.trim()) {
      return NextResponse.json({ error: "השם לא יכול להיות ריק" }, { status: 400 });
    }
    if (typeof email === "string" && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const update: Record<string, string> = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof email === "string") update.email = email.trim();

    const { data, error } = await supabase
      .from("people")
      .update(update)
      .eq("id", personId)
      .eq("business_id", businessId)
      .select("name, email")
      .maybeSingle();

    if (error || !data) {
      console.error("people/me update error:", error?.message);
      return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ success: true, name: data.name, email: data.email || "" });
  } catch (err) {
    console.error("people/me patch error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
