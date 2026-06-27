import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { paletteFor, initialsFor, sinceLabel } from "@/lib/avatarPalette";
import { sendMail } from "@/lib/mailer";
import { MINIMUM_WAGE_HOURLY } from "@/lib/minimumWage";
import { isManager, canAddEmployee } from "@/lib/auth/permissions";

function credentialsEmailHtml(employeeName: string, businessName: string, phone: string, tempPassword: string) {
  return `
    <div dir="rtl" style="font-family: sans-serif; text-align: right;">
      <p>שלום ${employeeName}! 👋</p>
      <p>התווספת לצוות <strong>${businessName}</strong> דרך Sidur.</p>
      <p>📱 כניסה לאפליקציה:</p>
      <ul>
        <li>שם משתמש (טלפון): ${phone}</li>
        <li>סיסמה זמנית: <strong>${tempPassword}</strong></li>
      </ul>
      <p>⚠️ תתבקש/י לשנות סיסמה בכניסה הראשונה.</p>
    </div>
  `;
}

function generateTempPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name, phone, email, role_key, initials, color, text_color, since_label, created_at, hourly_wage")
    .eq("business_id", businessId)
    .eq("role_type", "employee")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const employees = (data || []).map(e => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    email: e.email,
    role: e.role_key,
    cat: e.role_key,
    initials: e.initials,
    color: e.color,
    textColor: e.text_color,
    since: e.since_label || sinceLabel(e.created_at),
    hourlyWage: e.hourly_wage != null ? Number(e.hourly_wage) : undefined,
  }));

  return NextResponse.json({ success: true, employees });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, name, phone, email, roleKey, businessName, callerId } = await req.json();
    if (!businessId || !name?.trim() || !phone?.trim() || !email?.trim() || !roleKey || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await canAddEmployee(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה להוסיף עובד" }, { status: 403 });
    }

    const { count } = await supabase
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("role_type", "employee");

    const palette = paletteFor(count || 0);
    const tempPassword = generateTempPassword();
    const initials = initialsFor(name.trim());

    const { data: employee, error } = await supabase
      .from("people")
      .insert({
        business_id: businessId,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        role_type: "employee",
        role_key: roleKey,
        initials,
        color: palette.color,
        text_color: palette.textColor,
        temp_password: tempPassword,
        must_change_password: true,
      })
      .select()
      .single();

    if (error || !employee) {
      const message = error?.code === "23505" ? "מספר הטלפון הזה כבר רשום בעסק" : error?.message;
      return NextResponse.json({ error: message || "הוספת העובד נכשלה" }, { status: 500 });
    }

    let emailSent = false;
    if (employee.email) {
      emailSent = await sendMail(
        employee.email,
        "פרטי כניסה ל-Sidur",
        credentialsEmailHtml(employee.name, businessName || "", employee.phone, tempPassword)
      );
    }

    return NextResponse.json({
      success: true,
      tempPassword,
      emailSent,
      employee: {
        id: employee.id, name: employee.name, phone: employee.phone, email: employee.email,
        role: employee.role_key, cat: employee.role_key,
        initials: employee.initials, color: employee.color, textColor: employee.text_color,
        since: sinceLabel(employee.created_at),
      },
    });
  } catch (err) {
    console.error("create employee error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Manager-initiated password reset — there's no self-service "forgot password"
// flow yet, so this is the only way an employee gets back into their account
// once they're locked out. Issues a new temp password (same shape a brand new
// employee gets) and clears the old hashed password so it stops working.
export async function PATCH(req: NextRequest) {
  try {
    const { id, businessId, action, businessName, roleKey, hourlyWage, callerId } = await req.json();
    if (!id || !businessId || !action || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן עובד" }, { status: 403 });
    }

    if (action === "update_role") {
      if (!roleKey) return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
      const { data, error } = await supabase
        .from("people")
        .update({ role_key: roleKey })
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id, name, phone, email, role_key")
        .single();
      if (error || !data) {
        return NextResponse.json({ error: error?.message || "עדכון התפקיד נכשל" }, { status: 500 });
      }
      return NextResponse.json({ success: true, employee: data });
    }

    if (action === "update_wage") {
      const wageValue = hourlyWage === "" || hourlyWage == null ? null : Number(hourlyWage);
      if (wageValue != null && wageValue < MINIMUM_WAGE_HOURLY) {
        return NextResponse.json({ error: `לא ניתן לשמור — מתחת לשכר המינימום החוקי (₪${MINIMUM_WAGE_HOURLY} לשעה)` }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("people")
        .update({ hourly_wage: wageValue })
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id, name, hourly_wage")
        .single();
      if (error || !data) {
        return NextResponse.json({ error: error?.message || "עדכון השכר נכשל" }, { status: 500 });
      }
      return NextResponse.json({ success: true, employee: { ...data, hourlyWage: data.hourly_wage != null ? Number(data.hourly_wage) : undefined } });
    }

    if (action !== "reset_password") {
      return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();

    const { data, error } = await supabase
      .from("people")
      .update({ temp_password: tempPassword, password_hash: null, must_change_password: true })
      .eq("id", id)
      .eq("business_id", businessId)
      .select("id, name, phone, email")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "איפוס הסיסמה נכשל" }, { status: 500 });
    }

    let emailSent = false;
    if (data.email) {
      emailSent = await sendMail(
        data.email,
        "סיסמה חדשה ל-Sidur",
        credentialsEmailHtml(data.name, businessName || "", data.phone, tempPassword)
      );
    }

    return NextResponse.json({ success: true, tempPassword, emailSent, employee: data });
  } catch (err) {
    console.error("reset employee password error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const businessId = req.nextUrl.searchParams.get("businessId");
  const callerId = req.nextUrl.searchParams.get("callerId");
  if (!id || !businessId || !callerId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!(await isManager(supabase, businessId, callerId))) {
    return NextResponse.json({ error: "אין הרשאה למחוק עובד" }, { status: 403 });
  }

  // Most person_id foreign keys cascade-delete automatically (schedule_assignments,
  // clock_requests, ai_conversations, chat memberships...), but swap_requests.proposed_person
  // and announcements.created_by don't — clear those references first so the FK
  // constraint on the people row itself doesn't block deletion.
  await supabase.from("swap_requests").update({ proposed_person: null }).eq("proposed_person", id);
  await supabase.from("announcements").update({ created_by: null }).eq("created_by", id);

  const { error } = await supabase.from("people").delete().eq("id", id).eq("business_id", businessId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
