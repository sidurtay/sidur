import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { paletteFor, initialsFor, sinceLabel } from "@/lib/avatarPalette";

function generateTempPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, phone, role_key, initials, color, text_color, since_label, created_at")
    .eq("business_id", businessId)
    .eq("role_type", "employee")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const employees = (data || []).map(e => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    role: e.role_key,
    cat: e.role_key,
    initials: e.initials,
    color: e.color,
    textColor: e.text_color,
    since: e.since_label || sinceLabel(e.created_at),
  }));

  return NextResponse.json({ success: true, employees });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, name, phone, roleKey } = await req.json();
    if (!businessId || !name?.trim() || !phone?.trim() || !roleKey) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { count } = await supabase
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("role_type", "employee");

    const palette = paletteFor(count || 0);
    const tempPassword = generateTempPassword();
    const initials = initialsFor(name.trim());

    const { data: employee, error } = await supabase
      .from("people")
      .insert({
        business_id: businessId,
        name: name.trim(),
        phone: phone.trim(),
        role_type: "employee",
        role_key: roleKey,
        initials,
        color: palette.color,
        text_color: palette.textColor,
        temp_password: tempPassword,
        must_change_password: true,
      })
      .select()
      .single();

    if (error || !employee) {
      const message = error?.code === "23505" ? "מספר הטלפון הזה כבר רשום בעסק" : error?.message;
      return NextResponse.json({ error: message || "הוספת העובד נכשלה" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tempPassword,
      employee: {
        id: employee.id, name: employee.name, phone: employee.phone,
        role: employee.role_key, cat: employee.role_key,
        initials: employee.initials, color: employee.color, textColor: employee.text_color,
        since: sinceLabel(employee.created_at),
      },
    });
  } catch (err) {
    console.error("create employee error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
