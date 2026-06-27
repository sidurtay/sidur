import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";

function mapRow(row: {
  id: string; body: string; created_at: string; sender_id: string | null;
  people: { name: string; initials: string; color: string; text_color: string } | null;
}) {
  return {
    id: row.id,
    text: row.body,
    senderId: row.sender_id,
    from: row.people?.name || "מנהל",
    isManager: !row.people,
    initials: row.people?.initials, color: row.people?.color, textColor: row.people?.text_color,
    time: new Date(row.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
  };
}

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "channelId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, sender_id, people(name, initials, color, text_color)")
    .eq("channel_id", channelId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = Parameters<typeof mapRow>[0];
  return NextResponse.json({ success: true, messages: (data || []).map(r => mapRow(r as unknown as Row)) });
}

export async function POST(req: NextRequest) {
  try {
    const { channelId, senderId, body, callerId } = await req.json();
    if (!channelId || !body?.trim() || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // A message either carries your own personId, or — if sent "as the manager"
    // with no personId — the caller must actually be a manager on this channel's business.
    if (senderId) {
      if (senderId !== callerId) {
        return NextResponse.json({ error: "אין הרשאה לשלוח הודעה בשם עובד אחר" }, { status: 403 });
      }
    } else {
      const { data: channel } = await supabase
        .from("chat_channels")
        .select("business_id")
        .eq("id", channelId)
        .maybeSingle();
      if (!channel || !(await isManager(supabase, channel.business_id, callerId))) {
        return NextResponse.json({ error: "אין הרשאה לשלוח הודעה בשם המנהל" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: channelId, sender_id: senderId || null, body: body.trim() })
      .select("id, body, created_at, sender_id, people(name, initials, color, text_color)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "השליחה נכשלה" }, { status: 500 });
    }

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, message: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("send message error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const callerId = req.nextUrl.searchParams.get("callerId");
  if (!id || !callerId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("sender_id, chat_channels(business_id)")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
  }
  const channel = existing.chat_channels as unknown as { business_id: string } | null;
  const isOwner = existing.sender_id === callerId;
  if (!isOwner && (!channel || !(await isManager(supabase, channel.business_id, callerId)))) {
    return NextResponse.json({ error: "אין הרשאה למחוק הודעה זו" }, { status: 403 });
  }
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
