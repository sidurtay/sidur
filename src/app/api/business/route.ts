import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, business_id_num, tips_mode, clockout_requires_approval, plan, shift_split")
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
      plan: data.plan || "starter", shiftSplit: data.shift_split || "none",
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, name, businessIdNum, tipsMode, clockoutRequiresApproval, shiftSplit, callerId } = await req.json();
    if (!businessId || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן את העסק" }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (businessIdNum !== undefined) update.business_id_num = businessIdNum;
    if (tipsMode !== undefined) update.tips_mode = tipsMode;
    if (clockoutRequiresApproval !== undefined) update.clockout_requires_approval = clockoutRequiresApproval;

    // Shift-split is a paid-plan feature — enforce that server-side too, not just
    // in the settings UI, so a starter-plan business can't enable it by calling
    // the API directly.
    if (shiftSplit !== undefined) {
      if (shiftSplit !== "none") {
        const { data: biz, error: planError } = await supabase
          .from("businesses").select("plan").eq("id", businessId).single();
        if (planError || !biz) {
          return NextResponse.json({ error: planError?.message || "העסק לא נמצא" }, { status: 404 });
        }
        if ((biz.plan || "starter") === "starter") {
          return NextResponse.json({ error: "חילוק משמרות זמין רק במסלולים בתשלום" }, { status: 403 });
        }
      }
      update.shift_split = shiftSplit;
    }

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
