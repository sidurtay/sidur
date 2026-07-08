import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToManagers, sendPushToPerson } from "@/lib/push";
import { canApproveSwaps } from "@/lib/auth/permissions";
import { requireBusinessSession, requireSession } from "@/lib/auth/session";

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
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

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
    const { businessId, assignmentId, requestedBy, proposedPerson } = await req.json();
    if (!businessId || !assignmentId || !requestedBy) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    // You can only request a swap on your own behalf.
    if (requestedBy !== session.personId) {
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
      title: "🔄 בקשת החלפה ממתינה לך",
      body: `${mapped.requesterName} רוצה להחליף משמרת — 2 שניות לאשר או לדחות 👀`,
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
    const { id, approve, proposedPerson } = await req.json();
    if (!id || approve === undefined) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    const { data: existing, error: fetchError } = await supabase
      .from("swap_requests")
      .select("id, business_id, assignment_id, proposed_person, requested_by")
      .eq("id", id)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: fetchError?.message || "הבקשה לא נמצאה" }, { status: 404 });
    }
    if (existing.business_id !== session.businessId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    if (!(await canApproveSwaps(supabase, existing.business_id, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לאשר/לדחות בקשות החלפה" }, { status: 403 });
    }

    const finalProposed = proposedPerson || existing.proposed_person;
    let warning: string | undefined;

    if (approve) {
      if (!finalProposed) {
        return NextResponse.json({ error: "לא נבחר עובד מחליף" }, { status: 400 });
      }
      // Guard against assigning a person from a different business — proposedPerson
      // arrives from the request body and must be re-checked server-side.
      const { data: proposedPersonRow } = await supabase
        .from("people")
        .select("id, name")
        .eq("id", finalProposed)
        .eq("business_id", existing.business_id)
        .maybeSingle();
      if (!proposedPersonRow) {
        return NextResponse.json({ error: "העובד המוצע לא שייך לעסק הזה" }, { status: 400 });
      }

      // Awareness-only check — never blocks the approval — for whether the
      // takeover person already has a different shift that same day.
      const { data: targetAssignment } = await supabase
        .from("schedule_assignments")
        .select("week_start, day_of_week")
        .eq("id", existing.assignment_id)
        .maybeSingle();
      if (targetAssignment) {
        const { data: sameDayShift } = await supabase
          .from("schedule_assignments")
          .select("id")
          .eq("business_id", existing.business_id)
          .eq("week_start", targetAssignment.week_start)
          .eq("day_of_week", targetAssignment.day_of_week)
          .eq("person_id", finalProposed)
          .neq("id", existing.assignment_id)
          .maybeSingle();
        if (sameDayShift) {
          warning = `${proposedPersonRow.name} כבר משובץ/ת למשמרת אחרת באותו יום`;
        }
      }

      const { error: assignError } = await supabase
        .from("schedule_assignments")
        .update({ person_id: finalProposed })
        .eq("id", existing.assignment_id);
      if (assignError) {
        console.error("swap approve assign error:", assignError.message);
        return NextResponse.json({ error: "האישור נכשל, נסה שוב" }, { status: 500 });
      }
    }

    const { error } = await supabase
      .from("swap_requests")
      .update({ status: approve ? "approved" : "denied", proposed_person: finalProposed })
      .eq("id", id);
    if (error) {
      console.error("swap status update error:", error.message);
      return NextResponse.json({ error: "העדכון נכשל, נסה שוב" }, { status: 500 });
    }

    sendPushToPerson(existing.requested_by, {
      title: approve ? "✅ ההחלפה אושרה!" : "בקשת ההחלפה נדחתה",
      body: approve ? "יש לך אור ירוק — המשמרת הוחלפה בהצלחה 🎉" : "הפעם לא יצא. אפשר לנסות עם עובד אחר או תאריך אחר.",
      url: "/schedule",
    }).catch(() => {});

    return NextResponse.json({ success: true, warning });
  } catch (err) {
    console.error("update swap request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
