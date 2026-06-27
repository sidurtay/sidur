import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, subscription, callerId } = await req.json();
    if (!businessId || !personId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    // You can only subscribe your own device to your own notifications.
    if (personId !== callerId) {
      return NextResponse.json({ error: "אין הרשאה לרשום מכשיר בשם עובד אחר" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          business_id: businessId, person_id: personId,
          endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("push subscribe error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  const callerId = req.nextUrl.searchParams.get("callerId");
  if (!endpoint || !callerId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("person_id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (existing && existing.person_id !== callerId) {
    return NextResponse.json({ error: "אין הרשאה להסיר רישום מכשיר זה" }, { status: 403 });
  }
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
