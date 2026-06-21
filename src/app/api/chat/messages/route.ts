import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
    const { channelId, senderId, body } = await req.json();
    if (!channelId || !body?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
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
  if (!id) {
    return NextResponse.json({ error: "id חסר" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
