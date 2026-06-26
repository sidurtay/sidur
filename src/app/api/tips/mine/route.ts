import { NextRequest, NextResponse } from "next/server";
import { getTipsToday } from "@/lib/ai/tools";

// Thin wrapper around the same proportional tip-split the AI assistant uses,
// so an employee's own dashboard can show a real number directly instead of
// only being reachable by asking the chat.
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId || !personId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }

  const res = await getTipsToday({ businessId, personId, isManager: false });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, ...res });
}
