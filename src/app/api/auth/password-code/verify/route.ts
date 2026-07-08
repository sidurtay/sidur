import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/passwords";
import { rateLimit } from "@/lib/rateLimit";
import { requireBusinessSession } from "@/lib/auth/session";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, code, newPassword } = await req.json();
    if (!businessId || !code || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "פרטים חסרים או לא תקינים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    const personId = session.personId;

    // Slows brute-forcing the 6-digit code — a handful of guesses is normal
    // typo recovery, hundreds is an attack.
    if (!rateLimit(`password-code-verify:${personId}`, 6, 15 * 60 * 1000).ok) {
      return NextResponse.json({ error: "יותר מדי ניסיונות, בקש קוד חדש" }, { status: 429 });
    }

    const supabase = createServiceRoleClient();
    const { data: person } = await supabase.from("people").select("id").eq("id", personId).eq("business_id", businessId).maybeSingle();
    if (!person) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const { data: codeRow } = await supabase
      .from("password_reset_codes")
      .select("id, code_hash, expires_at, used")
      .eq("person_id", personId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!codeRow || codeRow.used || new Date(codeRow.expires_at).getTime() < Date.now() || codeRow.code_hash !== hashCode(String(code))) {
      return NextResponse.json({ error: "הקוד שגוי או שפג תוקפו" }, { status: 400 });
    }

    await supabase.from("password_reset_codes").update({ used: true }).eq("id", codeRow.id);

    const { error: updateError } = await supabase
      .from("people")
      .update({ password_hash: hashPassword(newPassword), temp_password: null, must_change_password: false })
      .eq("id", personId);
    if (updateError) {
      console.error("password-code verify update error:", updateError.message);
      return NextResponse.json({ error: "שמירת הסיסמה נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("password-code verify error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
