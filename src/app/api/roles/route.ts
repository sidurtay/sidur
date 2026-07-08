import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canEditSchedule } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("roles")
    .select("key, label, is_custom, recurring")
    .eq("business_id", businessId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, roles: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, name } = await req.json();
    if (!businessId || !name?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    if (!(await canEditSchedule(supabase, businessId, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה להוסיף תפקיד" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("roles")
      .insert({ business_id: businessId, key: name.trim(), label: name.trim(), is_custom: true })
      .select("key, label, is_custom, recurring")
      .single();

    if (error) {
      const message = error.code === "23505" ? "תפקיד בשם הזה כבר קיים" : error.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (err) {
    console.error("create role error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, key, recurring } = await req.json();
    if (!businessId || !key || recurring === undefined) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    if (!(await canEditSchedule(supabase, businessId, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן תפקיד" }, { status: 403 });
    }

    const { error } = await supabase
      .from("roles")
      .update({ recurring })
      .eq("business_id", businessId)
      .eq("key", key);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update role error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const key = req.nextUrl.searchParams.get("key");
  if (!businessId || !key) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const { session, error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;
  const supabase = createServiceRoleClient();
  if (!(await canEditSchedule(supabase, businessId, session.personId))) {
    return NextResponse.json({ error: "אין הרשאה למחוק תפקיד" }, { status: 403 });
  }
  const { error } = await supabase.from("roles").delete().eq("business_id", businessId).eq("key", key);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
