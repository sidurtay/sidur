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
    .select("id, name, initials, color, text_color, avatar_url")
    .eq("id", personId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    initials: data.initials || initialsFor(data.name),
    color: data.color || "var(--navy)",
    textColor: data.text_color || "#fff",
    avatarUrl: data.avatar_url || undefined,
  });
}
