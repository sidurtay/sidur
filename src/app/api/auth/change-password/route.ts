import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/passwords";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "פרטים חסרים או לא תקינים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;
    const personId = session.personId;

    const supabase = createServiceRoleClient();

    // This endpoint is only for the forced first-login flow — it must not double as
    // a general "reset anyone's password by ID" tool. Only proceed if the target
    // account is actually still pending its first password change.
    const { data: person } = await supabase
      .from("people")
      .select("must_change_password")
      .eq("id", personId)
      .maybeSingle();

    if (!person?.must_change_password) {
      return NextResponse.json({ error: "אין הרשאה לפעולה זו" }, { status: 403 });
    }

    const { error } = await supabase
      .from("people")
      .update({ password_hash: hashPassword(newPassword), temp_password: null, must_change_password: false })
      .eq("id", personId);

    if (error) {
      console.error("change-password update error:", error.message);
      return NextResponse.json({ error: "שמירה נכשלה, נסה שוב" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
