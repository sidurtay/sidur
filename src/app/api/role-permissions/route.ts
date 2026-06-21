import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role_key, permission_key, enabled")
    .eq("business_id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const perms: Record<string, Record<string, boolean>> = {};
  (data || []).forEach(row => {
    if (!perms[row.role_key]) perms[row.role_key] = {};
    perms[row.role_key][row.permission_key] = row.enabled;
  });

  return NextResponse.json({ success: true, perms });
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, roleKey, perms } = await req.json();
    if (!businessId || !roleKey || !perms) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const rows = Object.entries(perms).map(([permissionKey, enabled]) => ({
      business_id: businessId, role_key: roleKey, permission_key: permissionKey, enabled: !!enabled,
    }));

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("role_permissions").upsert(rows, { onConflict: "business_id,role_key,permission_key" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update role permissions error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
