import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, business_id_num, tips_mode, clockout_requires_approval, plan, shift_split, constraints_deadline_day, constraints_deadline_time, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m")
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
      constraintsDeadlineDay: data.constraints_deadline_day,
      constraintsDeadlineTime: data.constraints_deadline_time ? data.constraints_deadline_time.slice(0, 5) : null,
      geofenceEnabled: !!data.geofence_enabled,
      geofenceLat: data.geofence_lat,
      geofenceLng: data.geofence_lng,
      geofenceRadiusM: data.geofence_radius_m || 150,
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const {
      businessId, name, businessIdNum, tipsMode, clockoutRequiresApproval, shiftSplit,
      constraintsDeadlineDay, constraintsDeadlineTime,
      geofenceEnabled, geofenceLat, geofenceLng, geofenceRadiusM,
    } = await req.json();
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן את העסק" }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (businessIdNum !== undefined) update.business_id_num = businessIdNum;
    if (tipsMode !== undefined) update.tips_mode = tipsMode;
    if (clockoutRequiresApproval !== undefined) update.clockout_requires_approval = clockoutRequiresApproval;
    // null clears the deadline (no reminder shown); a day requires 0–6.
    if (constraintsDeadlineDay !== undefined) update.constraints_deadline_day = constraintsDeadlineDay;
    if (constraintsDeadlineTime !== undefined) update.constraints_deadline_time = constraintsDeadlineTime;
    if (geofenceEnabled !== undefined) update.geofence_enabled = geofenceEnabled;
    if (geofenceLat !== undefined) update.geofence_lat = geofenceLat;
    if (geofenceLng !== undefined) update.geofence_lng = geofenceLng;
    if (geofenceRadiusM !== undefined) update.geofence_radius_m = geofenceRadiusM;

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
