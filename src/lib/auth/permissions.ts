import { createServiceRoleClient } from "@/lib/supabase/server";

export async function isManager(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  const { data: caller } = await supabase
    .from("people")
    .select("role_type")
    .eq("id", callerId)
    .eq("business_id", businessId)
    .maybeSingle();

  return caller?.role_type === "manager";
}

// Server-side mirror of the client-side permission gates (settings/page.tsx PERMISSIONS) —
// managers always pass, everyone else needs an explicit role_permissions row for their role_key.
export async function hasPermission(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string,
  permissionKey: string
): Promise<boolean> {
  const { data: caller } = await supabase
    .from("people")
    .select("role_type, role_key")
    .eq("id", callerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!caller) return false;
  if (caller.role_type === "manager") return true;
  if (!caller.role_key) return false;

  const { data: perm } = await supabase
    .from("role_permissions")
    .select("enabled")
    .eq("business_id", businessId)
    .eq("role_key", caller.role_key)
    .eq("permission_key", permissionKey)
    .maybeSingle();

  return !!perm?.enabled;
}

export function canEditSchedule(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  return hasPermission(supabase, businessId, callerId, "editSchedule");
}

export function canAddEmployee(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  return hasPermission(supabase, businessId, callerId, "addEmployee");
}

export function canApproveSwaps(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  return hasPermission(supabase, businessId, callerId, "approveSwaps");
}

export function canPublishTips(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  return hasPermission(supabase, businessId, callerId, "publishTips");
}

export function canManageAnnouncements(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
  callerId: string
): Promise<boolean> {
  return hasPermission(supabase, businessId, callerId, "manageAnnouncements");
}
