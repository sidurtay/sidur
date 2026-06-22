import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Free Gmail SMTP instead of a paid transactional-email provider — sends as the
// support inbox itself via an App Password (https://myaccount.google.com/apppasswords),
// not the regular account password. Comfortably covers support-ticket volume
// (Gmail's free SMTP limit is ~500 messages/day).
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export async function POST(req: NextRequest) {
  try {
    const { subject, message, senderName, senderPhone, businessName, businessId } = await req.json();

    const supabase = createServiceRoleClient();
    await supabase.from("support_tickets").insert({
      business_id: businessId || null, subject, message,
      sender_name: senderName || null, sender_phone: senderPhone || null,
    });

    const transporter = getTransporter();
    const toEmail = process.env.SUPPORT_EMAIL;

    if (!transporter || !toEmail) {
      // Ticket is safely stored in the DB even though no email could be sent
      return NextResponse.json({ success: true, emailSent: false });
    }

    const html = `
      <div dir="rtl" style="font-family: sans-serif; text-align: right;">
        <p><strong>פנייה חדשה מ-Sidur</strong></p>
        <p>עסק: ${businessName}</p>
        <p>שולח: ${senderName} (${senderPhone})</p>
        <p>נושא: ${subject}</p>
        <hr />
        <p>${String(message).replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `Sidur <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `[Sidur] ${subject}`,
        html,
      });
      return NextResponse.json({ success: true, emailSent: true, id: info.messageId });
    } catch (mailErr) {
      console.error("Gmail send error:", mailErr);
      // Ticket is already safely stored in the DB even though the email failed
      return NextResponse.json({ success: true, emailSent: false });
    }
  } catch (err) {
    console.error("send-support-email error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
