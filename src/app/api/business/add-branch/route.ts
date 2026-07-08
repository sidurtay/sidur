import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession, setSessionCookie } from "@/lib/auth/session";

const DEFAULT_HOURS = [
  { day_of_week: 0, is_open: true,  open_time: "08:00", close_time: "23:00" },
  { day_of_week: 1, is_open: true,  open_time: "08:00", close_time: "23:00" },
  { day_of_week: 2, is_open: true,  open_time: "08:00", close_time: "23:00" },
  { day_of_week: 3, is_open: true,  open_time: "08:00", close_time: "23:00" },
  { day_of_week: 4, is_open: true,  open_time: "08:00", close_time: "00:00" },
  { day_of_week: 5, is_open: true,  open_time: "08:00", close_time: "00:00" },
  { day_of_week: 6, is_open: false, open_time: null,     close_time: null    },
];

const DEFAULT_ROLES = [
  { key: 'אחמ"ש', label: 'אחמ"ש' },
  { key: "מלצרים", label: "מלצרים" },
  { key: "מטבח",   label: "מטבח"   },
  { key: "בר",     label: "בר"     },
  { key: "שטיפה",  label: "שטיפה"  },
];

// POST /api/business/add-branch
// Body: { managerPhone, managerName, passwordHash, bizName, bizCity, bizType, plan }
// Creates a new business branch and links it to the existing manager via manager_businesses.
export async function POST(req: NextRequest) {
  try {
    const { managerName, bizName, bizCity, bizType, plan } = await req.json();
    if (!bizName?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;

    const supabase = createServiceRoleClient();

    // Only a manager already logged into an existing branch can add another
    // one — managerPhone/passwordHash are derived server-side from the
    // caller's own verified session/record, never trusted from the client.
    const { data: caller } = await supabase
      .from("people")
      .select("phone, password_hash, role_type")
      .eq("id", session.personId)
      .eq("business_id", session.businessId)
      .maybeSingle();

    if (!caller || caller.role_type !== "manager") {
      return NextResponse.json({ error: "אין הרשאה להוסיף סניף" }, { status: 403 });
    }
    const managerPhone = caller.phone;
    const passwordHash = caller.password_hash;

    // Create the new business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({ name: bizName.trim(), city: bizCity?.trim() || null, business_type: bizType || null, plan: plan || "starter" })
      .select()
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: bizError?.message || "יצירת הסניף נכשלה" }, { status: 500 });
    }

    // Seed hours + roles
    await Promise.all([
      supabase.from("business_hours").insert(DEFAULT_HOURS.map(h => ({ ...h, business_id: business.id }))),
      supabase.from("roles").insert(DEFAULT_ROLES.map(r => ({ ...r, business_id: business.id }))),
    ]);

    // Create manager person record in the new business (reuses same phone + password)
    const { data: manager, error: personError } = await supabase
      .from("people")
      .insert({
        business_id: business.id,
        name: managerName,
        phone: managerPhone,
        password_hash: passwordHash,
        role_type: "manager",
      })
      .select()
      .single();

    if (personError || !manager) {
      return NextResponse.json({ error: personError?.message || "יצירת המנהל בסניף נכשלה" }, { status: 500 });
    }

    // Link manager → new branch
    await supabase.from("manager_businesses").insert({
      manager_phone: managerPhone,
      business_id: business.id,
      person_id: manager.id,
      is_owner: true,
    });

    const res = NextResponse.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      personId: manager.id,
    });
    setSessionCookie(res, { personId: manager.id, businessId: business.id });
    return res;
  } catch (err) {
    console.error("add-branch error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
