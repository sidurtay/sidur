import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/passwords";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    if (!phone?.trim() || !password) {
      return NextResponse.json({ error: "יש למלא טלפון וסיסמה" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: person, error } = await supabase
      .from("people")
      .select("id, business_id, name, phone, password_hash, temp_password, must_change_password, role_type, businesses!people_business_id_fkey(name)")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (error || !person) {
      return NextResponse.json({ error: "טלפון או סיסמה שגויים" }, { status: 401 });
    }

    const passwordOk =
      (person.temp_password && person.temp_password === password) ||
      (person.password_hash && verifyPassword(password, person.password_hash));

    if (!passwordOk) {
      return NextResponse.json({ error: "טלפון או סיסמה שגויים" }, { status: 401 });
    }

    const businessName = (person.businesses as unknown as { name: string } | null)?.name || "";

    // For managers: check if they manage multiple branches
    let branches: { businessId: string; businessName: string; personId: string }[] = [];
    if (person.role_type === "manager") {
      const { data: mbRows } = await supabase
        .from("manager_businesses")
        .select("business_id, person_id, businesses!manager_businesses_business_id_fkey(name)")
        .eq("manager_phone", phone.trim());

      if (mbRows && mbRows.length > 1) {
        branches = mbRows.map(row => ({
          businessId: row.business_id,
          personId: row.person_id,
          businessName: (row.businesses as unknown as { name: string } | null)?.name || "",
        }));
      }
    }

    const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const [{ data: hours }, { data: roles }, { data: business }] = await Promise.all([
      supabase.from("business_hours").select("*").eq("business_id", person.business_id).order("day_of_week"),
      supabase.from("roles").select("key, label").eq("business_id", person.business_id),
      supabase.from("businesses").select("business_id_num").eq("id", person.business_id).maybeSingle(),
    ]);

    return NextResponse.json({
      success: true,
      mustChangePassword: !!(person.temp_password && person.temp_password === password),
      personId: person.id, businessId: person.business_id,
      name: person.name, phone: person.phone, businessName,
      role: person.role_type,
      // Populated only when manager has >1 branch — triggers branch-picker in the client
      branches: branches.length > 1 ? branches : [],
      businessConfig: {
        bizName: businessName,
        bizId: business?.business_id_num || "",
        initialized: true,
        roles: (roles || []).map(r => r.key),
        days: (hours || []).map(h => ({
          name: DAY_NAMES[h.day_of_week],
          open: h.is_open,
          from: h.open_time?.slice(0, 5) || "",
          to: h.close_time?.slice(0, 5) || "",
        })),
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
