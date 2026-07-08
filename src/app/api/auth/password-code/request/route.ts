import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail, emailLayout } from "@/lib/mailer";
import { rateLimit } from "@/lib/rateLimit";
import { requireBusinessSession } from "@/lib/auth/session";

const CODE_TTL_MS = 5 * 60 * 1000;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

// Self-service only — sends a 6-digit code to the account's own email, valid
// 5 minutes, for changing the password while already logged in. personId
// comes from the verified session, not the request body.
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    const personId = session.personId;

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
      emailLayout({
        heading: "קוד לשינוי סיסמה 🔐",
        intro: `שלום ${person.name.split(" ")[0]}, הזן/י את הקוד הבא באפליקציה כדי לשנות את הסיסמה שלך:`,
        bodyHtml: `
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:18px;margin:4px 0;text-align:center;">
            <p style="margin:0;font-size:34px;font-weight:800;color:#F97316;letter-spacing:8px;direction:ltr;">${code}</p>
          </div>
          <p style="margin:14px 0 0;font-size:13px;color:#6B7280;">⏱️ הקוד תקף ל-5 דקות בלבד.</p>
        `,
        footnote: "לא ביקשת לשנות סיסמה? אפשר להתעלם מהמייל הזה.",
      })
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
