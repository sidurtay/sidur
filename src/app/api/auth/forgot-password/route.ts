import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mailer";

function generateTempPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function resetEmailHtml(name: string, phone: string, tempPassword: string) {
  return `
    <div dir="rtl" style="font-family: sans-serif; text-align: right;">
      <p>שלום ${name},</p>
      <p>קיבלנו בקשה לאיפוס הסיסמה שלך ל-Sidur.</p>
      <p>📱 כניסה לאפליקציה:</p>
      <ul>
        <li>שם משתמש (טלפון): ${phone}</li>
        <li>סיסמה זמנית: <strong>${tempPassword}</strong></li>
      </ul>
      <p>⚠️ תתבקש/י לבחור סיסמה חדשה בכניסה הראשונה.</p>
      <p>לא ביקשת לאפס סיסמה? אפשר להתעלם מהמייל הזה.</p>
    </div>
  `;
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
