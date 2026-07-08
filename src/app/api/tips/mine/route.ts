import { NextRequest, NextResponse } from "next/server";
import { getTipsToday } from "@/lib/ai/tools";
import { requireSession } from "@/lib/auth/session";

// Thin wrapper around the same proportional tip-split the AI assistant uses,
// so an employee's own dashboard can show a real number directly instead of
// only being reachable by asking the chat. Always the caller's own tips —
// personId/businessId come from the verified session, never the query string.
export async function GET(req: NextRequest) {
  const { session, error: authError } = requireSession(req);
  if (authError) return authError;
  const { businessId, personId } = session;

  const res = await getTipsToday({ businessId, personId, isManager: false });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, ...res });
}
