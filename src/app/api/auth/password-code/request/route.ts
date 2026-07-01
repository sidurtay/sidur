import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mailer";
import { rateLimit } from "@/lib/rateLimit";

const CODE_TTL_MS = 5 * 60 * 1000;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

// Self-service only — sends a 6-digit code to the account's own email, valid
// 5 minutes, for changing the password while already logged in.
export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, callerId } = await req.json();
    if (!businessId || !personId || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    if (personId !== callerId) {
      return NextResponse.json({ error: "אפשר לשנות רק את הסיסמה שלך" }, { status: 403 });
    }

    if (!rateLimit(`password-code-request:${personId}`, 4, 15 * 60 * 1000).ok) {
      return NextResponse.json({ error: "יותר מדי ניסיונות, נסה שוב מאוחר יותר" }, { status: 429 });
    }

    const supabase = createServiceRoleClient();
    const { data: person } = await supabase
      .from("people").select("id, name, email").eq("id", personId).eq("business_id", businessId).maybeSingle();
    if (!person) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }
    if (!person.email) {
      return NextResponse.json({ error: "אין כתובת אימייל מוגדרת בפרופיל שלך" }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: insertError } = await supabase.from("password_reset_codes").insert({
      person_id: personId,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (insertError) {
      console.error("password-code insert error:", insertError.message);
      return NextResponse.json({ error: "שליחת הקוד נכשלה" }, { status: 500 });
    }

    const sent = await sendMail(
      person.email,
      "קוד לשינוי סיסמה — Sidur",
      `<div dir="rtl" style="font-family: sans-serif; text-align: right;">
        <p>שלום ${person.name},</p>
        <p>קוד לשינוי הסיסמה שלך ב-Sidur:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>הקוד תקף ל-5 דקות בלבד.</p>
        <p>לא ביקשת לשנות סיסמה? אפשר להתעלם מהמייל הזה.</p>
      </div>`
    );
    if (!sent) {
      return NextResponse.json({ error: "שליחת המייל נכשלה, נסה שוב" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("password-code request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
