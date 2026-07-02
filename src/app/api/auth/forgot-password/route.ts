import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail, emailLayout } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Same alphabet as the employees route's generateTempPassword — kept in sync there.
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateTempPassword() {
  let out = "";
  for (let i = 0; i < 8; i++) out += TEMP_PASSWORD_ALPHABET[Math.floor(Math.random() * TEMP_PASSWORD_ALPHABET.length)];
  return out;
}

function resetEmailHtml(name: string, phone: string, tempPassword: string) {
  return emailLayout({
    heading: "איפוס סיסמה 🔑",
    intro: `שלום ${name.split(" ")[0]}, קיבלנו בקשה לאיפוס הסיסמה שלך ל-Sidur. הנה סיסמה זמנית חדשה:`,
    bodyHtml: `
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:4px 0;">
        <p style="margin:0 0 4px;font-size:14px;color:#374151;">מספר טלפון (שם משתמש):</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1A1F29;direction:ltr;text-align:right;">${phone}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#374151;">סיסמה זמנית:</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#F97316;letter-spacing:2px;direction:ltr;text-align:right;">${tempPassword}</p>
      </div>
      <p style="margin:14px 0 0;font-size:13px;color:#6B7280;">🔒 בכניסה הבאה תתבקש/י לבחור סיסמה חדשה משלך.</p>
    `,
    footnote: "לא ביקשת לאפס סיסמה? אפשר להתעלם מהמייל הזה — לא בוצע שום שינוי בחשבון.",
  });
}

// Works for any person (manager or employee) — same temp_password mechanism
// the login route and change-password flow already understand. Always
// responds with a generic success regardless of whether the phone matched
// anything or whether that person even has an email on file, so this
// endpoint can't be used to enumerate which phone numbers are registered.
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone?.trim()) {
      return NextResponse.json({ error: "יש להזין מספר טלפון" }, { status: 400 });
    }

    // Prevents mass-emailing a phone number's owner and slows brute-forcing the temp password.
    const limited = rateLimit(`forgot-password:${clientIp(req)}:${phone.trim()}`, 3, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServiceRoleClient();
    const { data: person } = await supabase
      .from("people")
      .select("id, name, email, phone")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (person?.email) {
      const tempPassword = generateTempPassword();
      await supabase
        .from("people")
        .update({ temp_password: tempPassword, password_hash: null, must_change_password: true })
        .eq("id", person.id);
      await sendMail(person.email, "איפוס סיסמה ל-Sidur", resetEmailHtml(person.name, person.phone, tempPassword));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ success: true });
  }
}
