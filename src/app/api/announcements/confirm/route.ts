import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { announcementId, personId } = await req.json();
    if (!announcementId || !personId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
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
