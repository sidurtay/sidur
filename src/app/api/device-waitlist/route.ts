import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { name, phone, business } = await req.json();
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("device_waitlist").insert({
      name: name.trim(), phone: phone.trim(), business_name: business?.trim() || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("device waitlist error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
