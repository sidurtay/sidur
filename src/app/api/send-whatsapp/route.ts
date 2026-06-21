import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, employeeName, tempPassword, businessName } = await req.json();

    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_WHATSAPP_FROM;

    if (!sid || !token || !from) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
    }

    const toWhatsApp = `whatsapp:+972${to.replace(/^0/, "").replace(/-/g, "")}`;

    const message = `שלום ${employeeName} 👋\n\nהתווספת לצוות *${businessName}* דרך Sidur.\n\n📱 כניסה לאפליקציה:\n• שם משתמש: ${to}\n• סיסמה זמנית: *${tempPassword}*\n\n⚠️ תתבקש לשנות סיסמה בכניסה הראשונה.`;

    const body = new URLSearchParams({
      From: from,
      To:   toWhatsApp,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method:  "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);
      return NextResponse.json({ error: data.message || "Twilio error" }, { status: 400 });
    }

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error("send-whatsapp error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
