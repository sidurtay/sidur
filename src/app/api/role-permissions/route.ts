import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

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
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    // Only managers may grant/revoke permissions — otherwise a role with editSchedule
    // could escalate itself (or any other role) to addEmployee/approveSwaps/etc.
    if (!(await isManager(supabase, businessId, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן הרשאות" }, { status: 403 });
    }

    const rows = Object.entries(perms).map(([permissionKey, enabled]) => ({
      business_id: businessId, role_key: roleKey, permission_key: permissionKey, enabled: !!enabled,
    }));

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
