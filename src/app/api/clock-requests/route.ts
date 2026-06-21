import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

function mapRow(row: {
  id: string; person_id: string; type: string; status: string; requested_at: string; resolved_at: string | null;
  people: { name: string } | null;
}) {
  return {
    id: row.id,
    personId: row.person_id,
    employeeName: row.people?.name || "",
    type: row.type as "in" | "out",
    status: row.status as "pending" | "approved" | "denied",
    requestedAt: new Date(row.requested_at).getTime(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("clock_requests")
    .select("id, person_id, type, status, requested_at, resolved_at, people(name)")
    .eq("business_id", businessId)
    .order("requested_at");

  if (personId) query = query.eq("person_id", personId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = Parameters<typeof mapRow>[0];
  return NextResponse.json({ success: true, requests: (data || []).map(r => mapRow(r as unknown as Row)) });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, type, autoApprove } = await req.json();
    if (!businessId || !personId || !type) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("clock_requests")
      .insert({
        business_id: businessId, person_id: personId, type,
        status: autoApprove ? "approved" : "pending",
        resolved_at: autoApprove ? new Date().toISOString() : null,
      })
      .select("id, person_id, type, status, requested_at, resolved_at, people(name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "הבקשה נכשלה" }, { status: 500 });
    }

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, request: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("create clock request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, approve } = await req.json();
    if (!id || approve === undefined) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("clock_requests")
      .update({ status: approve ? "approved" : "denied", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, person_id, type, status, requested_at, resolved_at, people(name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "העדכון נכשל" }, { status: 500 });
    }

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, request: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("update clock request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
