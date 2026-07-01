import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/business/branches?phone=...&personId=... — this endpoint has no
// current caller in the app, but it was reachable by anyone who knew a phone
// number (leaking which businesses/plans that phone manages). Requiring a
// personId that actually matches the phone means the caller must already
// have logged in as that manager, closing the enumeration hole.
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!phone || !personId) return NextResponse.json({ error: "phone ו-personId חסרים" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: caller } = await supabase
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("phone", phone)
    .eq("role_type", "manager")
    .maybeSingle();
  if (!caller) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { data, error } = await supabase
    .from("manager_businesses")
    .select("business_id, person_id, is_owner, added_at, businesses!manager_businesses_business_id_fkey(name, city, business_type, plan)")
    .eq("manager_phone", phone)
    .order("added_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type BizData = { name: string; city: string; business_type: string; plan: string } | null;
  const branches = (data || []).map(row => {
    const biz = (row.businesses as unknown as BizData);
    return {
      businessId: row.business_id,
      personId: row.person_id,
      isOwner: row.is_owner,
      addedAt: row.added_at,
      name: biz?.name || "",
      city: biz?.city || "",
      businessType: biz?.business_type || "",
      plan: biz?.plan || "",
    };
  });

  return NextResponse.json({ success: true, branches });
}
