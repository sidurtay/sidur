import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/business/branches?phone=...
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const supabase = createServiceRoleClient();
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
