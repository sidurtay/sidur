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
  inRequestedAt?: string;
  outRequestedAt?: string;
};

const REQUIRE_OUT_KEY = "shiftpro_clockout_requires_approval";

export function requiresClockOutApproval(): boolean {
  const v = localStorage.getItem(REQUIRE_OUT_KEY);
  return v === null ? true : v === "true";
}

export function setRequiresClockOutApproval(v: boolean) {
  localStorage.setItem(REQUIRE_OUT_KEY, String(v));
}
