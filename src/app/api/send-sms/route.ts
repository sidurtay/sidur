import { NextRequest, NextResponse } from "next/server";

// Plain SMS via Twilio — unlike WhatsApp Business, this doesn't require Meta
// business verification, so it works for any phone number immediately.
export async function POST(req: NextRequest) {
  try {
    const { to, employeeName, tempPassword, businessName } = await req.json();

    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_SMS_FROM;

    if (!sid || !token || !from) {
      return NextResponse.json({ error: "Twilio SMS not configured" }, { status: 500 });
    }

    const toNumber = `+972${to.replace(/^0/, "").replace(/-/g, "")}`;

    const message = `שלום ${employeeName}! התווספת לצוות ${businessName} דרך Sidur.\nכניסה לאפליקציה:\nשם משתמש: ${to}\nסיסמה זמנית: ${tempPassword}\nתתבקש/י לשנות סיסמה בכניסה הראשונה.`;

    const body = new URLSearchParams({
      From: from,
      To:   toNumber,
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
      console.error("Twilio SMS error:", data);
      return NextResponse.json({ error: data.message || "Twilio error" }, { status: 400 });
    }

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error("send-sms error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
