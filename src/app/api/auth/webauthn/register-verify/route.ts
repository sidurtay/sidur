import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getWebauthnConfig, CHALLENGE_TTL_MS } from "@/lib/webauthn";
import { sendMail, emailLayout } from "@/lib/mailer";
import { requireBusinessSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { businessId, response, deviceLabel } = await req.json();
    if (!businessId || !response) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    const personId = session.personId;

    const supabase = createServiceRoleClient();

    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("id, challenge, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challengeRow || Date.now() - new Date(challengeRow.created_at).getTime() > CHALLENGE_TTL_MS) {
      return NextResponse.json({ error: "תוקף הבקשה פג, נסה שוב" }, { status: 400 });
    }

    const { rpID, origin } = getWebauthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    await supabase.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "אימות נכשל" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    const { error: insertError } = await supabase.from("webauthn_credentials").insert({
      business_id: businessId,
      person_id: personId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      device_label: deviceLabel || null,
    });
    if (insertError) {
      console.error("webauthn credential insert error:", insertError.message);
      return NextResponse.json({ error: "ההרשמה נכשלה" }, { status: 500 });
    }

    // Alert the account by email whenever a new device is added, the way
    // banks alert on new-device logins — defense in depth on top of the
    // session check above, in case the session itself was ever compromised.
    const { data: person } = await supabase.from("people").select("name, email").eq("id", personId).maybeSingle();
    if (person?.email) {
      sendMail(
        person.email,
        "מכשיר חדש נוסף לכניסה בטביעת אצבע — Sidur",
        emailLayout({
          heading: "מכשיר חדש חובר לחשבון 📱",
          intro: `שלום ${person.name.split(" ")[0]}, כניסה בטביעת אצבע / Face ID הופעלה זה עתה בחשבון שלך ב-Sidur${deviceLabel ? ` (${deviceLabel})` : ""}.`,
          bodyHtml: `<p style="margin:0;font-size:14px;color:#374151;">אם זה היית את/ה — הכל בסדר, אין צורך לעשות כלום. ✅</p>`,
          footnote: "לא את/ה חיברת מכשיר? השב/י למייל הזה מיד ונאבטח את החשבון.",
        })
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("webauthn register-verify error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
