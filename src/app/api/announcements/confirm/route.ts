import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  try {
    const { announcementId, personId, callerId, businessId } = await req.json();
    if (!announcementId || !personId || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // You can confirm an announcement as yourself, or a manager can mark it
    // confirmed on someone else's behalf (e.g. they confirmed it in person).
    if (personId !== callerId) {
      if (!businessId || !(await isManager(supabase, businessId, callerId))) {
        return NextResponse.json({ error: "אין הרשאה לאשר הודעה בשם עובד אחר" }, { status: 403 });
      }
    }
    const { error } = await supabase
      .from("announcement_confirmations")
      .upsert({ announcement_id: announcementId, person_id: personId }, { onConflict: "announcement_id,person_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("confirm announcement error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
