import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getWebauthnConfig } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone?.trim()) {
      return NextResponse.json({ error: "יש למלא טלפון" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: person } = await supabase
      .from("people").select("id").eq("phone", phone.trim()).maybeSingle();
    if (!person) {
      return NextResponse.json({ error: "לא נמצא משתמש עם הכניסה בטביעת אצבע" }, { status: 404 });
    }

    const { data: credentials } = await supabase
      .from("webauthn_credentials").select("credential_id").eq("person_id", person.id);
    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ error: "אין כניסה בטביעת אצבע מוגדרת למספר הזה" }, { status: 404 });
    }

    const { rpID } = getWebauthnConfig(req);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: credentials.map(c => ({ id: c.credential_id })),
    });

    await supabase.from("webauthn_challenges").insert({ person_id: person.id, challenge: options.challenge });

    return NextResponse.json({ success: true, options });
  } catch (err) {
    console.error("webauthn login-options error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
