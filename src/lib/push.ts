import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

async function sendToSubscription(
  supabase: ReturnType<typeof createServiceRoleClient>,
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410 means the browser dropped this subscription (uninstalled,
    // cleared data, expired) — it'll never succeed again, so clean it up
    // instead of retrying it on every future notification.
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error("push send error:", err);
    }
  }
}

export async function sendPushToPerson(personId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("person_id", personId);
  await Promise.all((subs || []).map(s => sendToSubscription(supabase, s, payload)));
}

// Sends to everyone in a business except (optionally) the person who triggered
// the event — e.g. an announcement shouldn't notify the manager who just wrote it.
export async function sendPushToBusiness(businessId: string, payload: PushPayload, excludePersonId?: string) {
  if (!ensureConfigured()) return;
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth, person_id").eq("business_id", businessId);
  const filtered = (subs || []).filter(s => s.person_id !== excludePersonId);
  await Promise.all(filtered.map(s => sendToSubscription(supabase, s, payload)));
}

// Sends only to managers — for events like a new swap/absence request that
// only the manager(s) of the business need to act on, not every employee.
export async function sendPushToManagers(businessId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;
  const supabase = createServiceRoleClient();
  const { data: managers } = await supabase.from("people").select("id").eq("business_id", businessId).eq("role_type", "manager");
  await Promise.all((managers || []).map(m => sendPushToPerson(m.id, payload)));
}
