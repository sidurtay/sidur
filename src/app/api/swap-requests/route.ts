import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToManagers, sendPushToPerson } from "@/lib/push";
import { canApproveSwaps } from "@/lib/auth/permissions";

type Row = {
  id: string; status: string; created_at: string;
  assignment_id: string;
  requested_by: string; proposed_person: string | null;
  schedule_assignments: { day_of_week: number; week_start: string; role_key: string; time_in: string; time_out: string } | null;
  requester: { name: string; initials: string; color: string; text_color: string } | null;
  proposer: { name: string; initials: string; color: string; text_color: string } | null;
};

function mapRow(row: Row) {
  const a = row.schedule_assignments;
  return {
    id: row.id, status: row.status, createdAt: row.created_at,
    assignmentId: row.assignment_id,
    dayOfWeek: a?.day_of_week, weekStart: a?.week_start, roleKey: a?.role_key, timeIn: a?.time_in?.slice(0, 5), timeOut: a?.time_out?.slice(0, 5),
    requestedBy: row.requested_by,
    requesterName: row.requester?.name || "", requesterInitials: row.requester?.initials || "", requesterColor: row.requester?.color || "", requesterTextColor: row.requester?.text_color || "",
    proposedPerson: row.proposed_person || undefined,
    proposerName: row.proposer?.name, proposerInitials: row.proposer?.initials, proposerColor: row.proposer?.color, proposerTextColor: row.proposer?.text_color,
  };
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("swap_requests")
    .select(`
      id, status, created_at, assignment_id, requested_by, proposed_person,
      schedule_assignments(day_of_week, week_start, role_key, time_in, time_out),
      requester:people!swap_requests_requested_by_fkey(name, initials, color, text_color),
      proposer:people!swap_requests_proposed_person_fkey(name, initials, color, text_color)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, requests: (data || []).map(r => mapRow(r as unknown as Row)) });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, assignmentId, requestedBy, proposedPerson, callerId } = await req.json();
    if (!businessId || !assignmentId || !requestedBy || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    // You can only request a swap on your own behalf.
    if (requestedBy !== callerId) {
      return NextResponse.json({ error: "אין הרשאה לבקש החלפה בשם עובד אחר" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("swap_requests")
      .insert({ business_id: businessId, assignment_id: assignmentId, requested_by: requestedBy, proposed_person: proposedPerson || null })
      .select(`
        id, status, created_at, assignment_id, requested_by, proposed_person,
        schedule_assignments(day_of_week, week_start, role_key, time_in, time_out),
        requester:people!swap_requests_requested_by_fkey(name, initials, color, text_color),
        proposer:people!swap_requests_proposed_person_fkey(name, initials, color, text_color)
      `)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "הבקשה נכשלה" }, { status: 500 });
    }

    const mapped = mapRow(data as unknown as Row);
    sendPushToManagers(businessId, {
      title: "בקשת החלפת משמרת חדשה",
      body: `${mapped.requesterName} מבקש/ת להחליף משמרת`,
      url: "/schedule",
    }).catch(() => {});

    return NextResponse.json({ success: true, request: mapped });
  } catch (err) {
    console.error("create swap request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, approve, proposedPerson, callerId } = await req.json();
    if (!id || approve === undefined || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: existing, error: fetchError } = await supabase
      .from("swap_requests")
      .select("id, business_id, assignment_id, proposed_person, requested_by")
      .eq("id", id)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: fetchError?.message || "הבקשה לא נמצאה" }, { status: 404 });
    }
    if (!(await canApproveSwaps(supabase, existing.business_id, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לאשר/לדחות בקשות החלפה" }, { status: 403 });
    }

    const finalProposed = proposedPerson || existing.proposed_person;

    if (approve) {
      if (!finalProposed) {
        return NextResponse.json({ error: "לא נבחר עובד מחליף" }, { status: 400 });
      }
      const { error: assignError } = await supabase
        .from("schedule_assignments")
        .update({ person_id: finalProposed })
        .eq("id", existing.assignment_id);
      if (assignError) {
        return NextResponse.json({ error: assignError.message }, { status: 500 });
      }
    }

    const { error } = await supabase
      .from("swap_requests")
      .update({ status: approve ? "approved" : "denied", proposed_person: finalProposed })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    sendPushToPerson(existing.requested_by, {
      title: approve ? "בקשת ההחלפה אושרה ✅" : "בקשת ההחלפה נדחתה",
      body: approve ? "המנהל אישר את בקשת ההחלפה שלך" : "המנהל דחה את בקשת ההחלפה שלך",
      url: "/schedule",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update swap request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
