import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { subject, message, senderName, senderPhone, businessName, businessId } = await req.json();

    const supabase = createServiceRoleClient();
    await supabase.from("support_tickets").insert({
      business_id: businessId || null, subject, message,
      sender_name: senderName || null, sender_phone: senderPhone || null,
    });

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.SUPPORT_EMAIL;

    if (!apiKey || !toEmail) {
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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sidur <support@sidur.local>",
        to: [toEmail],
        subject: `[Sidur] ${subject}`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend error:", data);
      // Ticket is already safely stored in the DB even though the email failed
      return NextResponse.json({ success: true, emailSent: false });
    }

    return NextResponse.json({ success: true, emailSent: true, id: data.id });
  } catch (err) {
    console.error("send-support-email error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
