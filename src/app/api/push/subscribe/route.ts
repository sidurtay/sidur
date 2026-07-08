import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;
    const { businessId, personId } = session;

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
  if (!endpoint) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const { session, error: authError } = requireSession(req);
  if (authError) return authError;
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("person_id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (existing && existing.person_id !== session.personId) {
    return NextResponse.json({ error: "אין הרשאה להסיר רישום מכשיר זה" }, { status: 403 });
  }
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
