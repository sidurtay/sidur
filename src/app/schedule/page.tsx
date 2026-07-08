"use client";
import { useState, useEffect, Suspense } from "react";
import { X, Plus, Coins, AlertTriangle, ArrowLeftRight, ClipboardList, ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { shiftBucket, SHIFT_BUCKET_LABEL, statusHasBucket, bucketsForSplit, type ShiftSplit, type ShiftBucketKey } from "@/lib/businessConfig";
import ScheduleConstraintsStrip from "@/components/ScheduleConstraintsStrip";
import { checkLaborWarnings } from "@/lib/laborLaw";
import { ADHOC_ROLE_KEY, ADHOC_ROLE_LABEL } from "@/lib/adhoc";

type ClockSource = "qr" | "fingerprint" | "manual";
type ClockEvent  = { time: string; source: ClockSource };

type EmployeeRow = { id: string; name: string; initials: string; role: string; color: string; textColor: string };
type RoleRow = { key: string; label: string; recurring?: boolean | null };

type Assignment = {
  id: string; dayOfWeek: number; personId: string;
  name: string; initials: string; role: string;
  homeRole?: string;                      // employee's regular role, if different from the section they're slotted into
  color: string; textColor: string;
  timeIn: string; timeOut: string;       // scheduled times
  actualIn?:  ClockEvent;                 // actual clock-in
  actualOut?: ClockEvent;                 // actual clock-out
};

type OpenShift = { id: string; dayOfWeek: number; role: string; timeIn: string; timeOut: string };

function inColor(src?: ClockSource)  { return src === "manual" ? "var(--amber)" : "var(--green)"; }
function outColor(src?: ClockSource) { return src === "manual" ? "var(--amber)" : "var(--red)"; }

// Desktop grid cell tints — deliberately a warm orange/amber family (the
// brand accent) cycled per role, with blue kept to a single small badge
// elsewhere rather than used as a grid color.
const ORANGE_TINTS = [
  { bg: "#FFE4D1", text: "#C2410C", border: "#F7C59F" },
  { bg: "#FDECC8", text: "#92400E", border: "#F5DBA0" },
  { bg: "#FCE1D6", text: "#9A3412", border: "#F4C7B4" },
  { bg: "#FBEAD1", text: "#B45309", border: "#F0D4A8" },
  { bg: "#F5EDE4", text: "#78350F", border: "#E4D5C3" },
  { bg: "#FFF1E6", text: "#C2410C", border: "#F9DCC2" },
];
function roleTint(i: number) { return ORANGE_TINTS[i % ORANGE_TINTS.length]; }

// The app-wide frozen "today" — Tuesday 2026-06-23, in the week starting Sunday 2026-06-21.
const BASE_WEEK_START = new Date(2026, 5, 21); // month is 0-indexed: June
const TODAY_DAY_OF_WEEK = 2;
const DAY_LETTERS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function pad(n: number) { return String(n).padStart(2, "0"); }

// Default clock-in/out for a newly added employee, keyed by which shift is
// currently selected at the top of the page — chosen so each one lands
// squarely inside the matching bucket per shiftBucket() in businessConfig.ts.
const SHIFT_DEFAULT_TIMES: Record<"morning" | "evening" | "night", { timeIn: string; timeOut: string }> = {
  morning: { timeIn: "08:00", timeOut: "16:00" },
  evening: { timeIn: "16:00", timeOut: "00:00" },
  night:   { timeIn: "22:00", timeOut: "06:00" },
};

// weekOffset 0 = the frozen "today"'s week, negative = past weeks, positive = future —
// lets the manager navigate arbitrarily far back to fix old records, not just one week each way.
function getWeekInfo(weekOffset: number) {
  const start = new Date(BASE_WEEK_START);
  start.setDate(start.getDate() + weekOffset * 7);

  const days = DAY_LETTERS.map((label, d) => {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    return { label, date: `${date.getDate()}.${date.getMonth() + 1}`, d };
  });

  const weekStart = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const range = `${days[0].label} ${days[0].date} — ${days[6].label} ${days[6].date}`;
  const today = weekOffset === 0 ? TODAY_DAY_OF_WEEK : -1;
  const label = weekOffset === 0 ? "השבוע" : weekOffset === 1 ? "שבוע הבא" : weekOffset === -1 ? "השבוע שעבר"
    : weekOffset > 1 ? `בעוד ${weekOffset} שבועות` : `לפני ${Math.abs(weekOffset)} שבועות`;

  return { weekOffset, weekStart, days, range, today, label };
}

export default function SchedulePage() { return <Suspense><Schedule /></Suspense>; }

function Schedule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [employees,  setEmployees]  = useState<EmployeeRow[]>([]);
  const [jobRoles,   setJobRoles]   = useState<RoleRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingSwaps, setPendingSwaps] = useState<{ assignmentId: string; weekStart?: string; dayOfWeek?: number }[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay,  setActiveDay]  = useState(TODAY_DAY_OF_WEEK);
  const [addRole,    setAddRole]    = useState<string|null>(null);
  const [swapTarget, setSwapTarget] = useState<Assignment|null>(null);
  const [editTarget, setEditTarget] = useState<Assignment|null>(null);
  const [editIn,     setEditIn]     = useState("");
  const [editOut,    setEditOut]    = useState("");
  const [saved,      setSaved]      = useState(false);
  const [addingCustomRole, setAddingCustomRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [recurrencePrompt, setRecurrencePrompt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftSplit, setShiftSplitState] = useState<ShiftSplit>("none");
  const [selectedShift, setSelectedShift] = useState<"morning" | "evening" | "night">("morning");
  const [myPersonId, setMyPersonId] = useState("");
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [openShiftError, setOpenShiftError] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [rolePerms, setRolePerms] = useState<Record<string, Record<string, boolean>>>({});
  // Awareness-only (never blocking) flags — constraint conflicts + Israeli labor-law
  // heuristics, surfaced to the manager/אחמ"ש while building the schedule by hand.
  const [constraintsByPerson, setConstraintsByPerson] = useState<Record<string, { availability: Record<number, string> }>>({});
  const [laborWarning, setLaborWarning] = useState<string | null>(null);

  const myRoleKey = employees.find(e => e.id === myPersonId)?.role || "";
  const canEditSchedule = isManager || !!rolePerms[myRoleKey]?.editSchedule;

  async function loadWeek(biz: string, weekStart: string) {
    try {
      const [schedRes, swapRes, openRes, consRes] = await Promise.all([
        fetch(`/api/schedule?businessId=${biz}&weekStart=${weekStart}`).then(r => r.json()),
        fetch(`/api/swap-requests?businessId=${biz}`).then(r => r.json()),
        fetch(`/api/open-shifts?businessId=${biz}&weekStart=${weekStart}`).then(r => r.json()),
        fetch(`/api/constraints?businessId=${biz}&weekStart=${weekStart}`).then(r => r.json()),
      ]);
      if (schedRes.success) setAssignments(schedRes.assignments);
      if (swapRes.success) setPendingSwaps(swapRes.requests.filter((r: { status: string }) => r.status === "pending"));
      if (openRes.success) setOpenShifts(openRes.openShifts);
      if (consRes.success) {
        const map: Record<string, { availability: Record<number, string> }> = {};
        consRes.people.forEach((p: { personId: string; availability: Record<number, string> }) => { map[p.personId] = { availability: p.availability }; });
        setConstraintsByPerson(map);
      }
    } catch {}
  }

  useEffect(() => {
    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
      setMyPersonId(s.personId || "");
      setIsManager(s.role === "manager");
    } catch {}
    setBusinessId(biz);

    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [rolesRes, empRes, bizRes, permsRes] = await Promise.all([
          fetch(`/api/roles?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/business?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/role-permissions?businessId=${biz}`).then(r => r.json()),
        ]);
        if (rolesRes.success) setJobRoles(rolesRes.roles);
        if (empRes.success) setEmployees(empRes.employees);
        if (bizRes.success) setShiftSplitState(bizRes.business.shiftSplit || "none");
        if (permsRes.success) setRolePerms(permsRes.perms || {});
        const initialOffset = searchParams.get("week") === "next" ? 1 : 0;
        setWeekOffset(initialOffset);
        setActiveDay(initialOffset === 0 ? TODAY_DAY_OF_WEEK : 0);
        await loadWeek(biz, getWeekInfo(initialOffset).weekStart);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const week = getWeekInfo(weekOffset);
  const dayAssignments: Assignment[] = assignments.filter(a => a.dayOfWeek === activeDay);
  const dayOpenShifts: OpenShift[] = openShifts.filter(s => s.dayOfWeek === activeDay);

  // בלת"ם — unplanned walk-ins who clocked in without a schedule slot get
  // auto-added under this bucket (see /api/clock-requests). Only shown once
  // it's actually in use this week, so it doesn't clutter an empty schedule.
  const hasAdhocThisWeek = assignments.some(a => a.role === ADHOC_ROLE_KEY);
  const displayRoles = hasAdhocThisWeek
    ? [...jobRoles, { key: ADHOC_ROLE_KEY, label: ADHOC_ROLE_LABEL }]
    : jobRoles;

  function goToWeek(offset: number) {
    setWeekOffset(offset);
    setActiveDay(offset === 0 ? TODAY_DAY_OF_WEEK : 0);
    loadWeek(businessId, getWeekInfo(offset).weekStart);
  }

  function renderEmployeeCard(emp: Assignment) {
    const isEmergency = !!emp.homeRole;
    const hasIn       = !!emp.actualIn;
    const hasOut      = !!emp.actualOut;
    const inSrc    = emp.actualIn?.source;
    const outSrc   = emp.actualOut?.source;
    const inTime   = emp.actualIn?.time  || emp.timeIn;
    const outTime  = emp.actualOut?.time || emp.timeOut;
    const hasPendingSwap = pendingSwaps.some(r => r.assignmentId === emp.id);

    return (
      <div key={emp.id} className="relative rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderInlineEnd: `3px solid ${isEmergency ? "var(--amber)" : "var(--blue)"}`,
        }}>
        {/* Top row — name + tiny remove/swap icons, no separate header band */}
        <div className="flex items-center justify-between gap-1 flex-row">
          {canEditSchedule && (
            <div className="flex items-center gap-1 flex-row flex-shrink-0">
              <button onClick={() => removeEmployee(emp.id)}>
                <X size={10} style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
              </button>
              <button onClick={() => setSwapTarget(emp)} className="relative">
                {hasPendingSwap && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--amber)" }} title="בקשת החלפה ממתינה לאישור" />
                )}
                <ArrowLeftRight size={10} style={{ color: "var(--blue)" }} />
              </button>
            </div>
          )}
          <p className="text-[11px] font-bold truncate" style={{ color: "var(--text-main)" }}>{emp.name}</p>
        </div>

        {/* Time row — click to edit (manager/permitted only) */}
        <button onClick={() => openEdit(emp)} disabled={!canEditSchedule}
          className="flex items-center justify-center gap-1 flex-row" style={{ direction: "ltr", cursor: canEditSchedule ? "pointer" : "default" }}>
          <span className="text-[11px] font-semibold" style={{ color: hasIn ? inColor(inSrc) : "var(--text-secondary)" }}>
            {inTime}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>–</span>
          <span className="text-[11px] font-semibold" style={{ color: hasOut ? outColor(outSrc) : "var(--text-secondary)" }}>
            {outTime}
          </span>
        </button>

        {isEmergency && (
          <p className="text-[8px] font-medium flex items-center gap-0.5 justify-center" style={{ color: "var(--amber)" }}>
            <AlertTriangle size={8} /> בד״כ {emp.homeRole}
          </p>
        )}
      </div>
    );
  }

  // When shift-split is on, each role's list is filtered down to the currently
  // selected shift — the picker switches between three separate schedules
  // (morning / evening / night) rather than just sub-grouping one combined list.
  function getByRole(role: string) {
    const all = dayAssignments.filter(a => a.role === role);
    if (shiftSplit === "none" || role === ADHOC_ROLE_KEY) return all;
    return all.filter(a => shiftBucket(a.actualIn?.time || a.timeIn, shiftSplit) === selectedShift);
  }
  function getAvailable(role: string) {
    const assignedIds = new Set(dayAssignments.map(a => a.personId));
    if (role === ADHOC_ROLE_KEY) return employees.filter(e => !assignedIds.has(e.id));
    return employees.filter(e => e.role === role && !assignedIds.has(e.id));
  }

  // Does this employee's own submitted constraint say they're unavailable for
  // the shift bucket being staffed right now? Awareness only — never hides or
  // blocks the pick, just flags it in the picker.
  function hasConstraintConflict(personId: string): boolean {
    const entry = constraintsByPerson[personId];
    if (!entry) return false;
    const bucket: ShiftBucketKey = shiftSplit === "none" ? "morning" : selectedShift;
    return !statusHasBucket(entry.availability[activeDay], bucket);
  }

  async function addEmployee(emp: EmployeeRow, targetRole: string) {
    if (!canEditSchedule) return;
    const homeRole = targetRole !== emp.role ? emp.role : undefined;
    const { timeIn, timeOut } = shiftSplit !== "none" ? SHIFT_DEFAULT_TIMES[selectedShift] : { timeIn: "09:00", timeOut: "17:00" };
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, weekStart: week.weekStart, dayOfWeek: activeDay,
          personId: emp.id, roleKey: targetRole, homeRoleKey: homeRole || null,
          timeIn, timeOut, callerId: myPersonId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Israeli labor-law awareness check across this person's whole week,
        // now that this new shift is included — flagged, never blocked.
        const theirShifts = [...assignments, data.assignment].filter(a => a.personId === emp.id);
        const laborFlags = checkLaborWarnings(theirShifts.map(a => ({ dayOfWeek: a.dayOfWeek, timeIn: a.timeIn, timeOut: a.timeOut })));
        if (laborFlags.length > 0) {
          setLaborWarning(`${emp.name}: ${laborFlags[0].message}`);
        } else if (hasConstraintConflict(emp.id)) {
          setLaborWarning(`${emp.name} סימן/ה זמינות שלילית ליום זה — שובץ/ה בכל זאת`);
        }
        setAssignments(prev => [...prev, data.assignment]);
      }
    } catch {}
    setAddRole(null);
  }

  async function removeEmployee(id: string) {
    if (!canEditSchedule) return;
    try { await fetch(`/api/schedule?id=${id}&callerId=${myPersonId}`, { method: "DELETE" }); } catch {}
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  // Publishes an unassigned shift for a role — any eligible employee can
  // claim it themselves later instead of the manager having to pick someone.
  async function publishOpenShift(roleKey: string) {
    if (!canEditSchedule) return;
    const { timeIn, timeOut } = shiftSplit !== "none" ? SHIFT_DEFAULT_TIMES[selectedShift] : { timeIn: "09:00", timeOut: "17:00" };
    try {
      const res = await fetch("/api/open-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, weekStart: week.weekStart, dayOfWeek: activeDay, roleKey, timeIn, timeOut, callerId: myPersonId }),
      }).then(r => r.json());
      if (res.success) setOpenShifts(prev => [...prev, res.openShift]);
    } catch {}
  }

  async function claimOpenShift(shift: OpenShift) {
    if (!myPersonId) return;
    setClaimingId(shift.id);
    setOpenShiftError("");
    try {
      const res = await fetch("/api/open-shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shift.id, businessId, personId: myPersonId, callerId: myPersonId }),
      }).then(r => r.json());
      if (res.success) {
        setAssignments(prev => [...prev, res.assignment]);
        setOpenShifts(prev => prev.filter(s => s.id !== shift.id));
      } else {
        setOpenShiftError(res.error || "תפיסת המשמרת נכשלה");
        setOpenShifts(prev => prev.filter(s => s.id !== shift.id));
      }
    } catch {
      setOpenShiftError("שגיאת רשת — נסה שוב");
    } finally {
      setClaimingId(null);
    }
  }

  async function cancelOpenShift(id: string) {
    if (!canEditSchedule) return;
    try { await fetch(`/api/open-shifts?id=${id}&businessId=${businessId}&callerId=${myPersonId}`, { method: "DELETE" }); } catch {}
    setOpenShifts(prev => prev.filter(s => s.id !== id));
  }

  async function swapEmployee(replacement: EmployeeRow) {
    if (!canEditSchedule) return;
    if (!swapTarget) return;
    const homeRole = replacement.role !== swapTarget.role ? replacement.role : undefined;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: swapTarget.id, callerId: myPersonId, personId: replacement.id, roleKey: swapTarget.role, homeRoleKey: homeRole || null }),
      });
      const data = await res.json();
      if (data.success) setAssignments(prev => prev.map(a => a.id === swapTarget.id ? data.assignment : a));
    } catch {}
    setSwapTarget(null);
  }

  function openEdit(emp: Assignment) {
    if (!canEditSchedule) return;
    setEditTarget(emp);
    setEditIn(emp.actualIn?.time  || emp.timeIn);
    setEditOut(emp.actualOut?.time || emp.timeOut);
  }

  async function saveTime() {
    if (!canEditSchedule) return;
    if (!editTarget) return;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id, callerId: myPersonId, timeIn: editIn, timeOut: editOut,
          actualInTime: editIn, actualInSource: "manual",
          actualOutTime: editOut, actualOutSource: "manual",
        }),
      });
      const data = await res.json();
      if (data.success) setAssignments(prev => prev.map(a => a.id === editTarget.id ? data.assignment : a));
    } catch {}
    setEditTarget(null);
  }

  async function addCustomRole() {
    if (!canEditSchedule) return;
    const name = newRoleName.trim();
    if (!name || jobRoles.some(r => r.key === name)) { setNewRoleName(""); setAddingCustomRole(false); return; }

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name, callerId: myPersonId }),
      });
      const data = await res.json();
      if (data.success) {
        setJobRoles(prev => [...prev, data.role]);
        setRecurrencePrompt(name);
      }
    } catch {}
    setNewRoleName(""); setAddingCustomRole(false);
  }

  async function setRoleRecurring(role: string, recurring: boolean) {
    try {
      await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, key: role, recurring, callerId: myPersonId }),
      });
    } catch {}
    setRecurrencePrompt(null);
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
    <div className="hidden flex-col">
      {/* Superseded by the grid view below on every screen size — kept in the
          DOM instead of deleted for now, just permanently hidden. */}
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <div className="flex items-center justify-between flex-row mb-3">
          <div className="flex items-center gap-2 flex-row">
            <Link href="/tips"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
              <Coins size={13} /> פרסום טיפים
            </Link>
            <Link href="/constraints"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green-border)" }}>
              <ClipboardList size={13} /> אילוצים
            </Link>
          </div>
          <p className="text-base font-semibold">סידור עבודה</p>
        </div>
        <div className="flex items-center gap-2 flex-row">
          <button onClick={() => goToWeek(weekOffset - 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}>
            <ChevronRight size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">{week.label}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{week.range}</p>
          </div>
          <button onClick={() => goToWeek(weekOffset + 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}>
            <ChevronLeft size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
        {weekOffset !== 0 && (
          <button onClick={() => goToWeek(0)}
            className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
            חזרה להיום
          </button>
        )}
      </div>

      {laborWarning && (
        <div className="mx-3 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl flex-row"
          style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
          <button onClick={() => setLaborWarning(null)} className="flex-shrink-0"><X size={13} style={{ color: "var(--amber)" }} /></button>
          <p className="flex-1 text-xs text-right leading-relaxed" style={{ color: "var(--amber)" }}>{laborWarning}</p>
          <AlertTriangle size={14} style={{ color: "var(--amber)", flexShrink: 0 }} />
        </div>
      )}

      <div className="px-3 py-3 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>טוען סידור...</p>
        ) : (
        <>
        {/* Tiny per-employee constraints check — for managers building the week
            by hand instead of using the AI builder. Deliberately minimal so it
            doesn't compete with the schedule itself. */}
        {canEditSchedule && (
          <ScheduleConstraintsStrip businessId={businessId} weekStart={week.weekStart} employees={employees} shiftSplit={shiftSplit} />
        )}

        {/* Day selector — sticky so it stays reachable while scrolling through roles */}
        <div className="sticky -mx-3 px-3 pt-1 flex flex-row gap-2 overflow-x-auto pb-1 z-10" style={{ top: 0, background: "var(--gray-bg)" }}>
          {week.days.map(d => {
            const count   = assignments.filter(a => a.dayOfWeek === d.d).length;
            const isToday = d.d === week.today;
            const hasPendingSwap = pendingSwaps.some(r => r.weekStart === week.weekStart && r.dayOfWeek === d.d);
            return (
              <button key={d.d} onClick={() => setActiveDay(d.d)}
                className="relative flex flex-col items-center px-3 py-1.5 rounded-2xl flex-shrink-0 text-xs font-medium"
                style={activeDay === d.d
                  ? { background: "var(--blue)", color: "#fff" }
                  : { background: "var(--surface)", color: "var(--text-secondary)", border: `1px solid ${isToday ? "var(--blue)" : "var(--border)"}` }}>
                {hasPendingSwap && (
                  <span className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full" style={{ background: "var(--blue)" }} title="בקשת החלפה ממתינה" />
                )}
                {d.label}
                <span className="text-[9px] mt-0.5 opacity-80">{d.date}</span>
                {isToday && activeDay !== d.d && (
                  <span className="text-[8px] mt-0.5 font-bold" style={{ color: "var(--blue)" }}>היום</span>
                )}
                {count > 0 && <span className="text-[8px] mt-0.5 font-semibold opacity-70">{count} עוב׳</span>}
              </button>
            );
          })}
        </div>

        {/* Shift picker — only when shift-split is enabled in settings. Adding an
            employee to a role now drops them straight into this shift's time
            range, so they land in the right bucket below without manual editing. */}
        {shiftSplit !== "none" && (
          <div className="flex flex-row gap-1.5">
            {(["morning", "evening", "night"] as const)
              .filter(s => s !== "night" || shiftSplit === "morning_evening_night")
              .map(s => (
                <button key={s} onClick={() => setSelectedShift(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                  style={selectedShift === s
                    ? { background: "var(--blue)", color: "#fff" }
                    : { background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  {SHIFT_BUCKET_LABEL[s]}
                </button>
              ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-row gap-1.5 flex-wrap">
          {[
            { dot: "#6B6966", label: "מתוכנן"   },
            { dot: "var(--green)", label: "כניסה QR/אצבע" },
            { dot: "var(--red)", label: "יציאה QR/אצבע" },
            { dot: "var(--amber)", label: "עדכון ידני"     },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.dot }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Employee search — filters the rows below by name, like Tabit's sidebar search */}
        <div className="relative flex items-center">
          <Search size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute left-3.5">
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="חיפוש עובד..."
            className="w-full pr-10 pl-9 py-2.5 rounded-xl text-sm text-right outline-none transition-shadow"
            style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
          />
        </div>

        {openShiftError && (
          <p className="text-xs text-center font-medium py-1" style={{ color: "var(--red)" }}>{openShiftError}</p>
        )}

        {/* Role tables */}
        {displayRoles.map(({ key, label }) => {
          const allAssigned = getByRole(key);
          const assigned  = searchTerm.trim()
            ? allAssigned.filter(a => a.name.includes(searchTerm.trim()))
            : allAssigned;
          const available = getAvailable(key);
          const assignedIds = new Set(dayAssignments.map(a => a.personId));
          const anyAddable  = employees.some(e => !assignedIds.has(e.id));
          if (searchTerm.trim() && assigned.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center justify-between gap-1.5 mb-2 px-3 py-1.5 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <ChevronDown size={13} style={{ color: "var(--text-secondary)" }} />
                <div className="flex items-center gap-1.5 flex-row">
                  {allAssigned.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "var(--blue)", color: "#fff" }}>{allAssigned.length}</span>
                  )}
                  <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{label}</p>
                </div>
              </div>

              {assigned.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2" style={{ gridAutoRows: "1fr" }}>
                  {assigned.map(emp => renderEmployeeCard(emp))}
                </div>
              )}

              {dayOpenShifts.filter(s => s.role === key).length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2" style={{ gridAutoRows: "1fr" }}>
                  {dayOpenShifts.filter(s => s.role === key).map(shift => (
                    <div key={shift.id} className="relative rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
                      style={{ background: "var(--green-light)", border: "1px dashed var(--green-border)" }}>
                      <div className="flex items-center justify-between gap-1 flex-row">
                        {canEditSchedule && (
                          <button onClick={() => cancelOpenShift(shift.id)}>
                            <X size={10} style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
                          </button>
                        )}
                        <p className="text-[10px] font-bold" style={{ color: "var(--green)" }}>משמרת פתוחה</p>
                      </div>
                      <p className="text-[11px] font-semibold text-center" style={{ direction: "ltr", color: "var(--text-main)" }}>
                        {shift.timeIn}–{shift.timeOut}
                      </p>
                      <button onClick={() => claimOpenShift(shift)} disabled={claimingId === shift.id}
                        className="text-[10px] font-bold py-1 rounded-md text-white text-center"
                        style={{ background: "var(--green)", opacity: claimingId === shift.id ? 0.5 : 1 }}>
                        {claimingId === shift.id ? "תופס..." : "תפוס משמרת"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {anyAddable && canEditSchedule && (
                <button onClick={() => setAddRole(key)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl flex-row"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <Plus size={13} style={{ color: "var(--blue)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--blue)" }}>הוסף ל{label}</span>
                </button>
              )}

              {canEditSchedule && (
                <button onClick={() => publishOpenShift(key)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-xl flex-row">
                  <Plus size={11} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>פרסם משמרת פתוחה</span>
                </button>
              )}

              {!anyAddable && assigned.length === 0 && (
                <div className="flex items-center justify-center px-4 py-3 rounded-xl bg-white" style={{ border: "1px solid var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>כל העובדים משובצים היום</p>
                </div>
              )}

              {recurrencePrompt === key && (
                <div className="mt-2 rounded-xl px-3 py-2.5 flex flex-col gap-2" style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
                  <p className="text-xs text-right" style={{ color: "var(--blue)" }}>
                    הוספת תפקיד חדש: <strong>{label}</strong>. להשאיר אותו בסידור גם בשבועות הבאים?
                  </p>
                  <div className="flex gap-2 flex-row">
                    <button onClick={() => setRoleRecurring(key, true)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white glow-cta" style={{ background: "var(--blue)" }}>
                      כן, השאר קבוע
                    </button>
                    <button onClick={() => setRoleRecurring(key, false)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      רק השבוע
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add custom role */}
        {canEditSchedule && (addingCustomRole ? (
          <div className="bg-white rounded-xl p-3 flex items-center gap-2 flex-row" style={{ border: "1px solid var(--blue)" }}>
            <button onClick={addCustomRole} className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--blue)" }}>הוסף</button>
            <button onClick={() => { setAddingCustomRole(false); setNewRoleName(""); }} className="flex-shrink-0">
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input autoFocus value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomRole()}
              placeholder="לדוגמא: מארחת"
              className="flex-1 text-sm text-right px-3 py-2 rounded-lg"
              style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
          </div>
        ) : (
          <button onClick={() => setAddingCustomRole(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ border: "1.5px dashed var(--border)", color: "var(--blue)" }}>
            <Plus size={14} /> הוסף תפקיד לסידור
          </button>
        ))}

        {/* Save */}
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`w-full py-3 rounded-xl text-sm font-semibold text-white mt-1 ${saved ? "" : "glow-cta"}`}
          style={{ background: saved ? "var(--green)" : "var(--blue)" }}>
          {saved ? "הסידור נשמר" : "שמור סידור"}
        </button>
        </>
        )}
      </div>
    </div>

    {/* ── Full week grid (columns = days, rows = employees per role) — same
        table on mobile and desktop, just scrollable horizontally on narrow
        screens instead of squeezing the columns. ── */}
    <div className="flex flex-col px-3 lg:px-8 pt-4 lg:pt-8 pb-16 mx-auto w-full" style={{ maxWidth: 1400 }}>
      <div className="flex items-center justify-between flex-row flex-wrap gap-2 mb-4 lg:mb-6">
        <div className="flex items-center gap-2 lg:gap-3 flex-row">
          <Link href="/tips"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
            <Coins size={13} /> פרסום טיפים
          </Link>
          <Link href="/constraints"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green-border)" }}>
            <ClipboardList size={13} /> אילוצים
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-row">
          <p className="text-lg lg:text-2xl font-bold" style={{ color: "var(--navy)" }}>סידור עבודה</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-row flex-wrap gap-2 mb-4 lg:mb-5">
        <div className="relative flex items-center w-full lg:w-auto" style={{ maxWidth: 260 }}>
          <Search size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute left-3.5">
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="חיפוש עובד..."
            className="w-full pr-10 pl-9 py-2.5 rounded-xl text-sm text-right outline-none"
            style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }} />
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-row flex-wrap">
          {shiftSplit !== "none" && (
            <div className="flex flex-row gap-1.5 rounded-xl p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {(["morning", "evening", "night"] as const)
                .filter(s => s !== "night" || shiftSplit === "morning_evening_night")
                .map(s => (
                  <button key={s} onClick={() => setSelectedShift(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={selectedShift === s
                      ? { background: "var(--blue)", color: "#fff" }
                      : { background: "transparent", color: "var(--text-secondary)" }}>
                    {SHIFT_BUCKET_LABEL[s]}
                  </button>
                ))}
            </div>
          )}
          <button onClick={() => goToWeek(weekOffset - 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ChevronRight size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="text-center" style={{ minWidth: 140 }}>
            <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{week.label}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{week.range}</p>
          </div>
          <button onClick={() => goToWeek(weekOffset + 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ChevronLeft size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => goToWeek(0)}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
              חזרה להיום
            </button>
          )}
        </div>
      </div>

      {laborWarning && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl flex-row mb-4"
          style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
          <button onClick={() => setLaborWarning(null)} className="flex-shrink-0"><X size={13} style={{ color: "var(--amber)" }} /></button>
          <p className="flex-1 text-xs text-right leading-relaxed" style={{ color: "var(--amber)" }}>{laborWarning}</p>
          <AlertTriangle size={14} style={{ color: "var(--amber)", flexShrink: 0 }} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>טוען סידור...</p>
      ) : (
      <div className="overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0">
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "#fff", minWidth: 780 }}>
        {/* Day header row */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(130px, 1fr))" }}>
          {week.days.map(d => {
            const isToday = d.d === week.today;
            const count = assignments.filter(a => a.dayOfWeek === d.d).length;
            return (
              <button key={d.d} onClick={() => setActiveDay(d.d)}
                className="flex flex-col items-center justify-center py-3 gap-0.5"
                style={{
                  background: isToday ? "var(--blue-light)" : "var(--gray-bg)",
                  borderBottom: `2px solid ${isToday ? "var(--blue)" : "var(--border)"}`,
                  borderInlineStart: "1px solid var(--border)",
                }}>
                <span className="text-xs font-bold" style={{ color: isToday ? "var(--blue)" : "var(--navy)" }}>{d.label} · {d.date}</span>
                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{count} עובדים</span>
              </button>
            );
          })}
        </div>

        {/* Role sections */}
        {displayRoles.map(({ key, label }, roleIdx) => {
          const tint = roleTint(roleIdx);
          // בלת"ם has no employees registered under it in /api/roles — anyone
          // in the business can end up here, so the picker/count uses the
          // full employee list instead of a role match.
          const roleEmployees = key === ADHOC_ROLE_KEY ? employees : employees.filter(e => e.role === key);

          // No fixed employee-per-row anymore — each role has as many rows as
          // its busiest day needs, and every cell can hold a different person
          // day to day. The name now lives inside the filled cell itself.
          const dayLists: Record<number, Assignment[]> = {};
          week.days.forEach(d => {
            dayLists[d.d] = assignments
              .filter(a => a.dayOfWeek === d.d && a.role === key
                && (shiftSplit === "none" || key === ADHOC_ROLE_KEY || shiftBucket(a.actualIn?.time || a.timeIn, shiftSplit) === selectedShift))
              .sort((a, b) => a.name.localeCompare(b.name, "he"));
          });
          // Always one row more than the busiest day needs — a trailing empty
          // "+" row that's never fully used up, so adding another person to a
          // day that already has someone never feels blocked or capped.
          const slotCount = Math.max(0, ...week.days.map(d => dayLists[d.d].length)) + 1;
          // בלת"ם can hold someone who isn't in the employees roster at all
          // (e.g. a manager clocking themselves in unplanned) — so its section
          // must stay visible whenever it already has assignments, even if the
          // employees list itself is empty.
          const hasAnyAssignment = Object.values(dayLists).some(list => list.length > 0);
          const showEmptyState = roleEmployees.length === 0 && !(key === ADHOC_ROLE_KEY && hasAnyAssignment);

          return (
            <div key={key}>
              <div className="px-4 py-2 flex items-center gap-2 flex-row" style={{ background: tint.bg, borderTop: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: tint.text }}>{label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#fff", color: tint.text }}>
                  {roleEmployees.length}
                </span>
              </div>

              {showEmptyState && (
                <div className="px-4 py-3 flex items-center" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>אין עדיין עובדים בתפקיד זה</p>
                </div>
              )}

              {!showEmptyState && Array.from({ length: slotCount }).map((_, slot) => (
                <div key={slot} className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(130px, 1fr))" }}>
                  {week.days.map(d => {
                    const a = dayLists[d.d][slot];
                    const isToday = d.d === week.today;
                    return (
                      <div key={d.d} className="p-1.5 flex items-stretch"
                        style={{ borderTop: "1px solid var(--border)", borderInlineStart: "1px solid var(--border)", background: isToday ? "rgba(249,115,22,0.03)" : "transparent" }}>
                        {a ? (
                          <div role="button" tabIndex={0}
                            onClick={() => canEditSchedule && openEdit(a)}
                            onKeyDown={e => { if (canEditSchedule && (e.key === "Enter" || e.key === " ")) openEdit(a); }}
                            className="flex-1 rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 relative"
                            style={{ background: tint.bg, border: `1px solid ${tint.border}`, cursor: canEditSchedule ? "pointer" : "default" }}>
                            {canEditSchedule && (
                              <div className="absolute top-1 left-1 flex items-center gap-1 flex-row">
                                <button onClick={e => { e.stopPropagation(); removeEmployee(a.id); }}>
                                  <X size={9} style={{ color: tint.text, opacity: 0.6 }} />
                                </button>
                              </div>
                            )}
                            <span className="text-[11px] font-bold truncate w-full text-center" style={{ color: tint.text }}>
                              {a.name}
                            </span>
                            <span className="text-[10px] font-semibold" style={{ color: tint.text, direction: "ltr", opacity: 0.85 }}>
                              {a.actualIn?.time || a.timeIn}–{a.actualOut?.time || a.timeOut}
                            </span>
                            {a.homeRole && (
                              <span className="text-[9px] flex items-center gap-0.5" style={{ color: tint.text }}>
                                <AlertTriangle size={8} /> בד״כ {a.homeRole}
                              </span>
                            )}
                          </div>
                        ) : canEditSchedule ? (
                          <button onClick={() => { setActiveDay(d.d); setAddRole(key); }}
                            className="flex-1 rounded-lg flex items-center justify-center py-1.5"
                            style={{ border: "1.5px dashed var(--border)" }}>
                            <Plus size={13} style={{ color: "var(--blue)" }} />
                          </button>
                        ) : (
                          <div className="flex-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      </div>
      )}

      {/* Save */}
      {!loading && (
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`mt-6 px-8 py-3 rounded-xl text-sm font-semibold text-white self-start ${saved ? "" : "glow-cta"}`}
          style={{ background: saved ? "var(--green)" : "var(--blue)" }}>
          {saved ? "הסידור נשמר" : "שמור סידור"}
        </button>
      )}
    </div>

      {/* Add popup */}
      {canEditSchedule && addRole && (() => {
        const primary   = getAvailable(addRole);
        const assignedIds = new Set(dayAssignments.map(a => a.personId));
        const emergency = employees.filter(e => e.role !== addRole && !assignedIds.has(e.id));
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setAddRole(null)}>
            <div className="w-full max-w-lg rounded-t-2xl pb-20"
              style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between px-4 mb-4 flex-row">
                <button onClick={() => setAddRole(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
                <p className="text-base font-semibold">הוסף עובד — {jobRoles.find(r => r.key === addRole)?.label}</p>
              </div>
              <div className="px-4 flex flex-col gap-2">
                {primary.length === 0 && <p className="text-sm text-center py-2" style={{ color: "var(--text-secondary)" }}>כל העובדים בתפקיד זה כבר משובצים</p>}
                {primary.map(emp => {
                  const conflict = hasConstraintConflict(emp.id);
                  return (
                    <button key={emp.id} onClick={() => addEmployee(emp, addRole!)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white flex-row"
                      style={{ border: `1px solid ${conflict ? "var(--amber-border)" : "var(--border)"}` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--blue-light)" }}>
                        <Plus size={11} style={{ color: "var(--blue)" }} />
                      </div>
                      <p className="flex-1 text-right text-sm font-medium">{emp.name}</p>
                      {conflict && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                          <AlertTriangle size={9} /> סימן/ה לא זמין/ה
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                    </button>
                  );
                })}
                {emergency.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-2 mb-1 flex-row">
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                        style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
                        <AlertTriangle size={11} style={{ color: "var(--amber)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--amber)" }}>מקרה חירום</span>
                      </div>
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                    </div>
                    <div className="flex flex-row flex-wrap gap-2">
                      {emergency.map(emp => (
                        <button key={emp.id} onClick={() => addEmployee(emp, addRole!)}
                          className="flex flex-col items-center rounded-xl py-2 px-2 gap-1"
                          style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)", flex: "1 1 calc(33% - 8px)", minWidth: 90 }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                            style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                          <p className="text-[11px] font-medium text-center leading-tight">{emp.name}</p>
                          <div className="flex items-center gap-0.5">
                            <AlertTriangle size={9} style={{ color: "var(--amber)" }} />
                            <span className="text-[9px]" style={{ color: "var(--amber)" }}>{emp.role}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Swap popup */}
      {canEditSchedule && swapTarget && (() => {
        const assignedIds = new Set(dayAssignments.map(a => a.personId));
        const sameRole  = employees.filter(e => e.role === swapTarget.role && e.id !== swapTarget.personId && !assignedIds.has(e.id));
        const emergency = employees.filter(e => e.role !== swapTarget.role && e.id !== swapTarget.personId && !assignedIds.has(e.id));
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSwapTarget(null)}>
            <div className="w-full max-w-lg rounded-t-2xl pb-20"
              style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between px-4 mb-1 flex-row">
                <button onClick={() => setSwapTarget(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
                <p className="text-base font-semibold">החלף עובד</p>
              </div>
              <p className="text-xs text-right px-4 mb-4" style={{ color: "var(--text-secondary)" }}>מחליף את {swapTarget.name}</p>
              <div className="px-4 flex flex-col gap-2">
                {sameRole.length === 0 && <p className="text-sm text-center py-3" style={{ color: "var(--text-secondary)" }}>אין כרגע עובד אחר באותו תפקיד להחלפה 🤷</p>}
                {sameRole.map(emp => (
                  <button key={emp.id} onClick={() => swapEmployee(emp)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white flex-row"
                    style={{ border: "1px solid var(--border)" }}>
                    <ArrowLeftRight size={14} style={{ color: "var(--blue)" }} />
                    <p className="flex-1 text-right text-sm font-medium">{emp.name}</p>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                  </button>
                ))}
                {emergency.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-2 mb-1 flex-row">
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                        style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
                        <AlertTriangle size={11} style={{ color: "var(--amber)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--amber)" }}>מקרה חירום</span>
                      </div>
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                    </div>
                    <div className="flex flex-row flex-wrap gap-2">
                      {emergency.map(emp => (
                        <button key={emp.id} onClick={() => swapEmployee(emp)}
                          className="flex flex-col items-center rounded-xl py-2 px-2 gap-1"
                          style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)", flex: "1 1 calc(33% - 8px)", minWidth: 90 }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                            style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                          <p className="text-[11px] font-medium text-center leading-tight">{emp.name}</p>
                          <span className="text-[9px]" style={{ color: "var(--amber)" }}>{emp.role}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit time popup — compact centered card, saves both as manual (orange) */}
      {canEditSchedule && editTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(11,30,61,0.45)" }}
          onClick={() => setEditTarget(null)}>
          <div className="w-full rounded-3xl p-5" style={{ maxWidth: 320, background: "#fff", boxShadow: "0 30px 60px -20px rgba(11,30,61,0.4)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-0.5 flex-row">
              <button onClick={() => setEditTarget(null)}><X size={17} style={{ color: "var(--text-secondary)" }} /></button>
              <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>שעות — {editTarget.name}</p>
            </div>
            <p className="text-[11px] text-right mb-3.5" style={{ color: "var(--text-secondary)" }}>
              עריכה ידנית — שניהם יסומנו בכתום
            </p>
            <div className="flex gap-2.5 mb-3.5 flex-row">
              <div className="flex-1">
                <p className="text-[11px] mb-1 text-right font-medium" style={{ color: "var(--text-secondary)" }}>יציאה</p>
                <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl text-sm text-center"
                  style={{ border: "1.5px solid var(--border)", background: "var(--gray-bg)", color: "var(--navy)" }} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] mb-1 text-right font-medium" style={{ color: "var(--text-secondary)" }}>כניסה</p>
                <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl text-sm text-center"
                  style={{ border: "1.5px solid var(--border)", background: "var(--gray-bg)", color: "var(--navy)" }} />
              </div>
            </div>
            <button onClick={saveTime}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white glow-cta"
              style={{ background: "var(--blue)" }}>
              שמור — עדכון ידני
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
