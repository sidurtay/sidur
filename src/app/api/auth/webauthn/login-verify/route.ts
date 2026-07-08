import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getWebauthnConfig, CHALLENGE_TTL_MS } from "@/lib/webauthn";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { response } = await req.json();
    if (!response?.id) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: credRow } = await supabase
      .from("webauthn_credentials")
      .select("id, person_id, business_id, public_key, counter")
      .eq("credential_id", response.id)
      .maybeSingle();
    if (!credRow) {
      return NextResponse.json({ error: "כניסה בטביעת אצבע לא מוכרת" }, { status: 401 });
    }

    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("id, challenge, created_at")
      .eq("person_id", credRow.person_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challengeRow || Date.now() - new Date(challengeRow.created_at).getTime() > CHALLENGE_TTL_MS) {
      return NextResponse.json({ error: "תוקף הבקשה פג, נסה שוב" }, { status: 400 });
    }

    const { rpID, origin } = getWebauthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: response.id,
        publicKey: Buffer.from(credRow.public_key, "base64url"),
        counter: credRow.counter,
      },
      requireUserVerification: true,
    });

    await supabase.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    if (!verification.verified) {
      return NextResponse.json({ error: "אימות נכשל" }, { status: 401 });
    }

    await supabase.from("webauthn_credentials").update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq("id", credRow.id);

    // Mirror the exact session payload /api/auth/login returns, so the client
    // can reuse the same "store session → redirect" code path either way.
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id, business_id, name, phone, role_type, businesses!people_business_id_fkey(name)")
      .eq("id", credRow.person_id)
      .maybeSingle();
    if (personError || !person) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const businessName = (person.businesses as unknown as { name: string } | null)?.name || "";
    const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const [{ data: hours }, { data: roles }, { data: business }] = await Promise.all([
      supabase.from("business_hours").select("*").eq("business_id", person.business_id).order("day_of_week"),
      supabase.from("roles").select("key, label").eq("business_id", person.business_id),
      supabase.from("businesses").select("business_id_num").eq("id", person.business_id).maybeSingle(),
    ]);

    const res = NextResponse.json({
      success: true,
      mustChangePassword: false,
      personId: person.id, businessId: person.business_id,
      name: person.name, phone: person.phone, businessName,
      role: person.role_type,
      businessConfig: {
        bizName: businessName,
        bizId: business?.business_id_num || "",
        initialized: true,
        roles: (roles || []).map(r => r.key),
        days: (hours || []).map(h => ({
          name: DAY_NAMES[h.day_of_week],
          open: h.is_open,
          from: h.open_time?.slice(0, 5) || "",
          to: h.close_time?.slice(0, 5) || "",
        })),
      },
    });
    setSessionCookie(res, { personId: person.id, businessId: person.business_id });
    return res;
  } catch (err) {
    console.error("webauthn login-verify error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
