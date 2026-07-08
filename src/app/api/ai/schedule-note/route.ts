import { NextRequest, NextResponse } from "next/server";
import { classifyScheduleNote } from "@/lib/ai/scheduleNote";
import { requireSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { error: authError } = requireSession(req);
    if (authError) return authError;
    const { text, employeeNames } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "טקסט חסר" }, { status: 400 });
    }
    const intent = await classifyScheduleNote(text.trim(), Array.isArray(employeeNames) ? employeeNames : []);
    return NextResponse.json({ success: true, intent });
  } catch {
    return NextResponse.json({ success: true, intent: { type: "other" } });
  }
}
