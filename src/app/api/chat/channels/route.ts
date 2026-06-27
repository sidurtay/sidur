import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: channels, error } = await supabase
    .from("chat_channels")
    .select("id, name, emoji, color, icon_color, pinned, created_at")
    .eq("business_id", businessId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const channelIds = (channels || []).map(c => c.id);
  if (channelIds.length === 0) {
    return NextResponse.json({ success: true, channels: [] });
  }

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase.from("chat_channel_members").select("channel_id, person_id").in("channel_id", channelIds),
    supabase.from("chat_messages").select("channel_id, body, created_at, sender_id, people(name)").in("channel_id", channelIds).order("created_at"),
  ]);

  type Msg = { channel_id: string; body: string; created_at: string; sender_id: string | null; people: { name: string } | null };

  const result = (channels || []).map(c => {
    const memberIds = (members || []).filter(m => m.channel_id === c.id).map(m => m.person_id);
    const chMessages = (messages || []).filter(m => (m as unknown as Msg).channel_id === c.id) as unknown as Msg[];
    const lastMsg = chMessages[chMessages.length - 1];
    return {
      id: c.id, name: c.name, emoji: c.emoji, color: c.color, iconColor: c.icon_color, pinned: c.pinned,
      memberIds, messageCount: chMessages.length,
      last: lastMsg ? `${lastMsg.people?.name || "מנהל"}: ${lastMsg.body}` : "אין הודעות עדיין",
      time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "",
    };
  });

  return NextResponse.json({ success: true, channels: result });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, name, emoji, color, iconColor, memberIds, callerId } = await req.json();
    if (!businessId || !name?.trim() || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה ליצור קבוצה" }, { status: 403 });
    }
    const { data: channel, error } = await supabase
      .from("chat_channels")
      .insert({ business_id: businessId, name: name.trim(), emoji, color, icon_color: iconColor })
      .select("id, name, emoji, color, icon_color, pinned")
      .single();

    if (error || !channel) {
      return NextResponse.json({ error: error?.message || "יצירת הקבוצה נכשלה" }, { status: 500 });
    }

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      await supabase.from("chat_channel_members").insert(memberIds.map((personId: string) => ({ channel_id: channel.id, person_id: personId })));
    }

    return NextResponse.json({
      success: true,
      channel: { id: channel.id, name: channel.name, emoji: channel.emoji, color: channel.color, iconColor: channel.icon_color, pinned: channel.pinned, memberIds: memberIds || [], messageCount: 0, last: "קבוצה חדשה נוצרה", time: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) },
    });
  } catch (err) {
    console.error("create channel error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name, emoji, color, iconColor, callerId } = await req.json();
    if (!id || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase
      .from("chat_channels")
      .select("business_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
    }
    if (!(await isManager(supabase, existing.business_id, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן קבוצה" }, { status: 403 });
    }

    const update: Record<string, string> = {};
    if (name !== undefined) update.name = name.trim();
    if (emoji !== undefined) update.emoji = emoji;
    if (color !== undefined) update.color = color;
    if (iconColor !== undefined) update.icon_color = iconColor;

    const { error } = await supabase.from("chat_channels").update(update).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update channel error:", err);
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
    .from("chat_channels")
    .select("business_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
  }
  if (!(await isManager(supabase, existing.business_id, callerId))) {
    return NextResponse.json({ error: "אין הרשאה למחוק קבוצה" }, { status: 403 });
  }
  const { error } = await supabase.from("chat_channels").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
