import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/passwords";
import { rolePresetFor, hoursPresetFor } from "@/lib/businessTypePresets";

// Seeded immediately at signup so the account is never in a broken state —
// the post-signup onboarding wizard (/onboarding) lets the manager override
// all of this, but these are business-type-appropriate starting points
// instead of one hardcoded restaurant-shaped default for every business.
function buildDefaultHours(bizType: string | null | undefined) {
  const preset = hoursPresetFor(bizType);
  return Array.from({ length: 7 }, (_, day) => {
    const open = preset.openDays.includes(day);
    return { day_of_week: day, is_open: open, open_time: open ? preset.from : null, close_time: open ? preset.to : null };
  });
}

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
      console.error("register business insert error:", bizError?.message);
      return NextResponse.json({ error: "יצירת העסק נכשלה" }, { status: 500 });
    }

    const { error: hoursError } = await supabase
      .from("business_hours")
      .insert(buildDefaultHours(bizType).map(h => ({ ...h, business_id: business.id })));
    if (hoursError) {
      console.error("register hours insert error:", hoursError.message);
      return NextResponse.json({ error: "יצירת שעות הפעילות נכשלה" }, { status: 500 });
    }

    const { error: rolesError } = await supabase
      .from("roles")
      .insert(rolePresetFor(bizType).map(r => ({ ...r, business_id: business.id })));
    if (rolesError) {
      console.error("register roles insert error:", rolesError.message);
      return NextResponse.json({ error: "יצירת התפקידים נכשלה" }, { status: 500 });
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
      if (personError && personError.code !== "23505") console.error("register person insert error:", personError.message);
      const message = personError?.code === "23505" ? "מספר הטלפון הזה כבר רשום במערכת" : "יצירת המנהל נכשלה";
      return NextResponse.json({ error: message }, { status: 500 });
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
