// Best-effort in-memory rate limiter — no external store required, so it works
// out of the box on Vercel. Caveat: state is per serverless instance and resets
// on cold start, so it slows down abuse rather than guaranteeing a hard cap.
// If abuse becomes a real problem, replace with a persistent store (e.g. Upstash Redis).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || "unknown";
}
