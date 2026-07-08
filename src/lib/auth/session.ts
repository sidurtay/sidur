import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// httpOnly signed session cookie — replaces trusting the personId/businessId
// the client sends in each request body. Before this, every API route just
// believed whatever `callerId`/`businessId` was in the JSON payload, which
// meant anyone could forge those fields (from DevTools or a raw curl call)
// and act as any employee in any business. The cookie is set once at login
// and verified server-side on every request; its value can't be forged
// without SESSION_SECRET, and it's httpOnly so client-side JS can't read or
// tamper with it either.
const COOKIE_NAME = "shiftpro_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = { personId: string; businessId: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env var is not set");
  return s;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed?.personId === "string" && typeof parsed?.businessId === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, payload: SessionPayload) {
  res.cookies.set(COOKIE_NAME, sign(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Returns the verified session, or null if there's no cookie or it was tampered with.
export function getSession(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

// Convenience for API routes: returns the session or a ready-to-return 401 response.
export function requireSession(req: NextRequest): { session: SessionPayload; error: null } | { session: null; error: NextResponse } {
  const session = getSession(req);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 }) };
  }
  return { session, error: null };
}

// Same as requireSession, but also rejects the request if the businessId the
// client is asking about doesn't match the one on the caller's own session —
// e.g. a logged-in employee of business A passing business B's id in the
// query string / body to read or write business B's data.
export function requireBusinessSession(req: NextRequest, businessId: string | null | undefined): { session: SessionPayload; error: null } | { session: null; error: NextResponse } {
  const { session, error } = requireSession(req);
  if (error) return { session: null, error };
  if (!businessId || businessId !== session.businessId) {
    return { session: null, error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  }
  return { session, error: null };
}
