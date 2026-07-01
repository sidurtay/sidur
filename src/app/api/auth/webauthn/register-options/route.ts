import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getWebauthnConfig } from "@/lib/webauthn";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId } = await req.json();
    if (!businessId || !personId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    // There's no server-side session proving the caller actually IS personId
    // (the whole app trusts client-supplied IDs) — rate limiting is a stopgap
    // against scripted abuse; the real detection is the email alert sent from
    // register-verify once a credential is actually registered.
    if (!rateLimit(`webauthn-register:${personId}`, 5, 60 * 60 * 1000).ok) {
      return NextResponse.json({ error: "יותר מדי ניסיונות, נסה שוב מאוחר יותר" }, { status: 429 });
    }

    const supabase = createServiceRoleClient();
    const { data: person, error: personError } = await supabase
      .from("people").select("id, name, phone").eq("id", personId).eq("business_id", businessId).maybeSingle();
    if (personError || !person) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("webauthn_credentials").select("credential_id").eq("person_id", personId);

    const { rpID, rpName } = getWebauthnConfig(req);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: person.phone,
      userDisplayName: person.name,
      attestationType: "none",
      excludeCredentials: (existing || []).map(c => ({ id: c.credential_id })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
    });

    await supabase.from("webauthn_challenges").insert({ person_id: personId, challenge: options.challenge });

    return NextResponse.json({ success: true, options });
  } catch (err) {
    console.error("webauthn register-options error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
