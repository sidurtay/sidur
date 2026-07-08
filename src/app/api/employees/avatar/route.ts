import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — plenty for a profile photo, small enough to keep storage/API calls cheap
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Anyone can upload a photo for their own account only — personId/businessId
// come from the verified session, so it's never possible to overwrite
// someone else's avatar no matter what the form data claims.
export async function POST(req: NextRequest) {
  try {
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;
    const { personId, businessId } = session;

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "רק תמונות JPG/PNG/WEBP נתמכות" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "התמונה גדולה מדי (מקסימום 3MB)" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: person } = await supabase.from("people").select("id").eq("id", personId).eq("business_id", businessId).maybeSingle();
    if (!person) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/${personId}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error("avatar upload error:", uploadError.message);
      return NextResponse.json({ error: "העלאת התמונה נכשלה" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new photo shows immediately instead of the browser
    // reusing a cached image at the same URL.
    const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase.from("people").update({ avatar_url: avatarUrl }).eq("id", personId);
    if (updateError) {
      console.error("avatar url save error:", updateError.message);
      return NextResponse.json({ error: "שמירת התמונה נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("avatar upload error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
