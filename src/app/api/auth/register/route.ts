import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/passwords";

const DEFAULT_HOURS = [
  { day_of_week: 0, is_open: true, open_time: "08:00", close_time: "23:00" },
  { day_of_week: 1, is_open: true, open_time: "08:00", close_time: "23:00" },
  { day_of_week: 2, is_open: true, open_time: "08:00", close_time: "23:00" },
  { day_of_week: 3, is_open: true, open_time: "08:00", close_time: "23:00" },
  { day_of_week: 4, is_open: true, open_time: "08:00", close_time: "00:00" },
  { day_of_week: 5, is_open: true, open_time: "08:00", close_time: "00:00" },
  { day_of_week: 6, is_open: false, open_time: null, close_time: null },
];

const DEFAULT_ROLES = [
  { key: "אחמ\"ש", label: "אחמ\"ש" },
  { key: "מלצרים", label: "מלצרים" },
  { key: "מטבח", label: "מטבח" },
  { key: "בר", label: "בר" },
  { key: "שטיפה", label: "שטיפה" },
];

export async function POST(req: NextRequest) {
  try {
    const { bizName, bizCity, bizType, managerName, phone, email, password, plan } = await req.json();
    if (!bizName?.trim() || !phone?.trim() || !email?.trim() || !password || password.length < 6) {
      return NextResponse.json({ error: "פרטים חסרים או לא תקינים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({ name: bizName.trim(), city: bizCity?.trim() || null, business_type: bizType || null, plan: plan || "basic" })
      .select()
      .single();
    if (bizError || !business) {
      return NextResponse.json({ error: bizError?.message || "יצירת העסק נכשלה" }, { status: 500 });
    }

    const { error: hoursError } = await supabase
      .from("business_hours")
      .insert(DEFAULT_HOURS.map(h => ({ ...h, business_id: business.id })));
    if (hoursError) {
      return NextResponse.json({ error: hoursError.message }, { status: 500 });
    }

    const { error: rolesError } = await supabase
      .from("roles")
      .insert(DEFAULT_ROLES.map(r => ({ ...r, business_id: business.id })));
    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    const { data: manager, error: personError } = await supabase
      .from("people")
      .insert({
        business_id: business.id,
        name: managerName?.trim() || "מנהל",
        phone: phone.trim(),
        email: email.trim(),
        password_hash: hashPassword(password),
        role_type: "manager",
      })
      .select()
      .single();
    if (personError || !manager) {
      const message = personError?.code === "23505" ? "מספר הטלפון הזה כבר רשום במערכת" : personError?.message;
      return NextResponse.json({ error: message || "יצירת המנהל נכשלה" }, { status: 500 });
    }

    // Link manager phone → business in the multi-branch table
    await supabase.from("manager_businesses").insert({
      manager_phone: phone.trim(),
      business_id: business.id,
      person_id: manager.id,
      is_owner: true,
    });

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      personId: manager.id,
      name: manager.name,
      phone: manager.phone,
      email: manager.email,
      role: "manager",
    });
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
