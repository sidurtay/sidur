export type ClockRequestType = "in" | "out";
export type ClockRequestStatus = "pending" | "approved" | "denied";

export type ClockRequest = {
  id: string;
  employeeName: string;
  type: ClockRequestType;
  requestedAt: number;
  status: ClockRequestStatus;
};

export type ClockState = {
  in: "none" | "pending" | "approved";
  out: "none" | "pending" | "approved";
  inTime?: string;
  outTime?: string;
};

const REQUESTS_KEY = "shiftpro_clock_requests";
const REQUIRE_OUT_KEY = "shiftpro_clockout_requires_approval";

export function getClockRequests(): ClockRequest[] {
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || "[]"); } catch { return []; }
}

function saveClockRequests(list: ClockRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
}

export function requiresClockOutApproval(): boolean {
  const v = localStorage.getItem(REQUIRE_OUT_KEY);
  return v === null ? true : v === "true";
}

export function setRequiresClockOutApproval(v: boolean) {
  localStorage.setItem(REQUIRE_OUT_KEY, String(v));
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// Derives this employee's current clock state from the request log.
// Only the latest "in" and latest "out" request matter.
export function getClockState(employeeName: string): ClockState {
  const mine = getClockRequests().filter(r => r.employeeName === employeeName);
  const lastIn = [...mine].reverse().find(r => r.type === "in");
  const lastOut = [...mine].reverse().find(r => r.type === "out");
  return {
    in: lastIn ? (lastIn.status === "denied" ? "none" : lastIn.status) : "none",
    out: lastOut ? (lastOut.status === "denied" ? "none" : lastOut.status) : "none",
    inTime: lastIn?.status === "approved" ? nowLabelFromTs(lastIn.requestedAt) : undefined,
    outTime: lastOut?.status === "approved" ? nowLabelFromTs(lastOut.requestedAt) : undefined,
  };
}

function nowLabelFromTs(ts: number): string {
  return new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function requestClock(employeeName: string, type: ClockRequestType): ClockRequest {
  const req: ClockRequest = {
    id: `${type}-${employeeName}-${Date.now()}`,
    employeeName, type,
    requestedAt: Date.now(),
    status: "pending",
  };
  const list = getClockRequests();
  saveClockRequests([...list, req]);
  return req;
}

export function respondToRequest(id: string, approve: boolean) {
  const list = getClockRequests();
  saveClockRequests(list.map(r => r.id === id ? { ...r, status: approve ? "approved" : "denied" } : r));
}

export { nowLabel };
