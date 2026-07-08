import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToBusiness } from "@/lib/push";
import { canManageAnnouncements } from "@/lib/auth/permissions";
import { requireBusinessSession, requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

  const supabase = createServiceRoleClient();
  const { data: anns, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const annIds = (anns || []).map(a => a.id);
  const { data: confirmations } = annIds.length
    ? await supabase.from("announcement_confirmations").select("announcement_id, person_id, people(name)").in("announcement_id", annIds)
    : { data: [] };

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
    const { businessId, title, body } = await req.json();
    if (!businessId || !title?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    const createdBy = session.personId;

    const supabase = createServiceRoleClient();
    if (!(await canManageAnnouncements(supabase, businessId, createdBy))) {
      return NextResponse.json({ error: "אין הרשאה לפרסם הודעות" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({ business_id: businessId, title: title.trim(), body: (body || "").trim(), created_by: createdBy || null })
      .select("id, title, body, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "השמירה נכשלה" }, { status: 500 });
    }

    sendPushToBusiness(businessId, { title: `📣 ${data.title}`, body: data.body || "הודעה חדשה מהמנהל — הקש/י לצפייה", url: "/dashboard" }, createdBy || undefined).catch(() => {});

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
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;
    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase
      .from("announcements")
      .select("business_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
    }
    if (existing.business_id !== session.businessId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    if (!(await canManageAnnouncements(supabase, existing.business_id, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן הודעות" }, { status: 403 });
    }

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
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const { session, error: authError } = requireSession(req);
  if (authError) return authError;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("announcements")
    .select("business_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
  }
  if (existing.business_id !== session.businessId) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  if (!(await canManageAnnouncements(supabase, existing.business_id, session.personId))) {
    return NextResponse.json({ error: "אין הרשאה למחוק הודעות" }, { status: 403 });
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
