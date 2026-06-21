import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/passwords";

export async function POST(req: NextRequest) {
  try {
    const { personId, newPassword } = await req.json();
    if (!personId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "פרטים חסרים או לא תקינים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("people")
      .update({ password_hash: hashPassword(newPassword), temp_password: null, must_change_password: false })
      .eq("id", personId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
