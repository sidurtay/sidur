import { NextRequest } from "next/server";

// Derived per-request rather than from an env var so this works unmodified on
// localhost dev, Vercel preview URLs, and the production domain. The WebAuthn
// spec requires rpID to be the bare hostname (no port, no scheme) and the
// origin to be the exact scheme+host+port the browser is calling from.
export function getWebauthnConfig(req: NextRequest) {
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const host = new URL(origin).hostname;
  return { rpID: host, rpName: "Sidur", origin };
}

export const CHALLENGE_TTL_MS = 2 * 60 * 1000;
