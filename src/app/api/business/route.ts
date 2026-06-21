import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, business_id_num, tips_mode, clockout_requires_approval")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "העסק לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    business: {
      name: data.name, businessIdNum: data.business_id_num || "",
      tipsMode: data.tips_mode, clockoutRequiresApproval: data.clockout_requires_approval,
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, name, businessIdNum, tipsMode, clockoutRequiresApproval } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (businessIdNum !== undefined) update.business_id_num = businessIdNum;
    if (tipsMode !== undefined) update.tips_mode = tipsMode;
    if (clockoutRequiresApproval !== undefined) update.clockout_requires_approval = clockoutRequiresApproval;

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("businesses").update(update).eq("id", businessId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update business error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
