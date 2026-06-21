import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const [{ data: anns, error }, { data: confirmations }] = await Promise.all([
    supabase.from("announcements").select("id, title, body, created_at").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("announcement_confirmations").select("announcement_id, person_id, people(name)"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Conf = { announcement_id: string; person_id: string; people: { name: string } | null };
  const announcements = (anns || []).map(a => ({
    id: a.id, title: a.title, text: a.body, createdAt: a.created_at,
    confirmedBy: (confirmations || [])
      .filter(c => (c as unknown as Conf).announcement_id === a.id)
      .map(c => (c as unknown as Conf).people?.name || ""),
  }));

  return NextResponse.json({ success: true, announcements });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, title, body, createdBy } = await req.json();
    if (!businessId || !title?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({ business_id: businessId, title: title.trim(), body: (body || "").trim(), created_by: createdBy || null })
      .select("id, title, body, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "השמירה נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ success: true, announcement: { id: data.id, title: data.title, text: data.body, createdAt: data.created_at, confirmedBy: [] } });
  } catch (err) {
    console.error("create announcement error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, title, body } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id חסר" }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const update: Record<string, string> = {};
    if (title !== undefined) update.title = title.trim();
    if (body !== undefined) update.body = body.trim();
    const { error } = await supabase.from("announcements").update(update).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update announcement error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id חסר" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
