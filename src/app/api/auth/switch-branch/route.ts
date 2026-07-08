import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession, setSessionCookie } from "@/lib/auth/session";

// Re-issues the session cookie for a different branch the caller manages.
// Verifies the target businessId/personId pair is actually one of the
// caller's own branches (via manager_businesses, keyed off their own phone —
// never a client-supplied one) before switching, so a manager of business A
// can't jump into business B just by knowing its id.
export async function POST(req: NextRequest) {
  try {
    const { businessId, personId } = await req.json();
    if (!businessId || !personId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    const { data: caller } = await supabase
      .from("people")
      .select("phone")
      .eq("id", session.personId)
      .eq("business_id", session.businessId)
      .maybeSingle();
    if (!caller) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { data: target } = await supabase
      .from("manager_businesses")
      .select("business_id, person_id")
      .eq("manager_phone", caller.phone)
      .eq("business_id", businessId)
      .eq("person_id", personId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: "הסניף הזה לא שייך לך" }, { status: 403 });
    }

    const res = NextResponse.json({ success: true });
    setSessionCookie(res, { personId, businessId });
    return res;
  } catch (err) {
    console.error("switch-branch error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
