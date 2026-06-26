"use client";
import { useState, useEffect, Suspense } from "react";
import { X, Plus, Coins, AlertTriangle, ArrowLeftRight, ClipboardList, ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { shiftBucket, SHIFT_BUCKET_LABEL, type ShiftSplit } from "@/lib/businessConfig";

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

function inColor(src?: ClockSource)  { return src === "manual" ? "var(--amber)" : "var(--green)"; }
function outColor(src?: ClockSource) { return src === "manual" ? "var(--amber)" : "var(--red)"; }

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

  async function loadWeek(biz: string, weekStart: string) {
    try {
      const [schedRes, swapRes] = await Promise.all([
        fetch(`/api/schedule?businessId=${biz}&weekStart=${weekStart}`).then(r => r.json()),
        fetch(`/api/swap-requests?businessId=${biz}`).then(r => r.json()),
      ]);
      if (schedRes.success) setAssignments(schedRes.assignments);
      if (swapRes.success) setPendingSwaps(swapRes.requests.filter((r: { status: string }) => r.status === "pending"));
    } catch {}
  }

  useEffect(() => {
    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
    } catch {}
    setBusinessId(biz);

    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [rolesRes, empRes, bizRes] = await Promise.all([
          fetch(`/api/roles?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/business?businessId=${biz}`).then(r => r.json()),
        ]);
        if (rolesRes.success) setJobRoles(rolesRes.roles);
        if (empRes.success) setEmployees(empRes.employees);
        if (bizRes.success) setShiftSplitState(bizRes.business.shiftSplit || "none");
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
          background: isEmergency ? "var(--amber-light)" : "var(--blue-light)",
          border: `1px solid ${isEmergency ? "#EBC395" : "var(--blue-border)"}`,
        }}>
        {/* Top row — name + tiny remove/swap icons, no separate header band */}
        <div className="flex items-center justify-between gap-1 flex-row">
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
          <p className="text-[11px] font-bold truncate" style={{ color: "var(--navy)" }}>{emp.name}</p>
        </div>

        {/* Time row — click to edit */}
        <button onClick={() => openEdit(emp)} className="flex items-center justify-center gap-1 flex-row" style={{ direction: "ltr" }}>
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
    if (shiftSplit === "none") return all;
    return all.filter(a => shiftBucket(a.actualIn?.time || a.timeIn, shiftSplit) === selectedShift);
  }
  function getAvailable(role: string) {
    const assignedIds = new Set(dayAssignments.map(a => a.personId));
    return employees.filter(e => e.role === role && !assignedIds.has(e.id));
  }

  async function addEmployee(emp: EmployeeRow, targetRole: string) {
    const homeRole = targetRole !== emp.role ? emp.role : undefined;
    const { timeIn, timeOut } = shiftSplit !== "none" ? SHIFT_DEFAULT_TIMES[selectedShift] : { timeIn: "09:00", timeOut: "17:00" };
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, weekStart: week.weekStart, dayOfWeek: activeDay,
          personId: emp.id, roleKey: targetRole, homeRoleKey: homeRole || null,
          timeIn, timeOut,
        }),
      });
      const data = await res.json();
      if (data.success) setAssignments(prev => [...prev, data.assignment]);
    } catch {}
    setAddRole(null);
  }

  async function removeEmployee(id: string) {
    try { await fetch(`/api/schedule?id=${id}`, { method: "DELETE" }); } catch {}
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  async function swapEmployee(replacement: EmployeeRow) {
    if (!swapTarget) return;
    const homeRole = replacement.role !== swapTarget.role ? replacement.role : undefined;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: swapTarget.id, personId: replacement.id, roleKey: swapTarget.role, homeRoleKey: homeRole || null }),
      });
      const data = await res.json();
      if (data.success) setAssignments(prev => prev.map(a => a.id === swapTarget.id ? data.assignment : a));
    } catch {}
    setSwapTarget(null);
  }

  function openEdit(emp: Assignment) {
    setEditTarget(emp);
    setEditIn(emp.actualIn?.time  || emp.timeIn);
    setEditOut(emp.actualOut?.time || emp.timeOut);
  }

  async function saveTime() {
    if (!editTarget) return;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id, timeIn: editIn, timeOut: editOut,
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
    const name = newRoleName.trim();
    if (!name || jobRoles.some(r => r.key === name)) { setNewRoleName(""); setAddingCustomRole(false); return; }

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name }),
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
        body: JSON.stringify({ businessId, key: role, recurring }),
      });
    } catch {}
    setRecurrencePrompt(null);
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
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
              style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid #A8D9BB" }}>
              <ClipboardList size={13} /> אילוצים
            </Link>
          </div>
          <p className="text-base font-semibold">סידור עבודה</p>
        </div>
        <div className="flex items-center gap-2 flex-row">
          <button onClick={() => goToWeek(weekOffset + 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}>
            <ChevronLeft size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">{week.label}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{week.range}</p>
          </div>
          <button onClick={() => goToWeek(weekOffset - 1)}
            className="p-2 rounded-xl flex-shrink-0" style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}>
            <ChevronRight size={16} style={{ color: "var(--text-secondary)" }} />
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

      <div className="px-3 py-3 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>טוען סידור...</p>
        ) : (
        <>
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
                  ? { background: "var(--navy)", color: "#fff" }
                  : { background: "var(--surface)", color: "var(--text-secondary)", border: `1px solid ${isToday ? "var(--navy)" : "var(--border)"}` }}>
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
                    ? { background: "var(--navy)", color: "#fff" }
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

        {/* Role tables */}
        {jobRoles.map(({ key, label }) => {
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
                style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
                <ChevronDown size={13} style={{ color: "var(--blue)", opacity: 0.6 }} />
                <div className="flex items-center gap-1.5 flex-row">
                  {allAssigned.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "var(--navy)", color: "#fff" }}>{allAssigned.length}</span>
                  )}
                  <p className="text-xs font-bold" style={{ color: "var(--navy)" }}>{label}</p>
                </div>
              </div>

              {assigned.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2" style={{ gridAutoRows: "1fr" }}>
                  {assigned.map(emp => renderEmployeeCard(emp))}
                </div>
              )}

              {anyAddable && (
                <button onClick={() => setAddRole(key)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl flex-row"
                  style={{ border: "1.5px dashed var(--blue-border)", background: "var(--blue-light)" }}>
                  <Plus size={13} style={{ color: "var(--blue)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--blue)" }}>הוסף ל{label}</span>
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
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--navy)" }}>
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
        {addingCustomRole ? (
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
        )}

        {/* Save */}
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1"
          style={{ background: saved ? "var(--green)" : "var(--navy)" }}>
          {saved ? "✓ הסידור נשמר" : "שמור סידור"}
        </button>
        </>
        )}
      </div>

      {/* Add popup */}
      {addRole && (() => {
        const primary   = getAvailable(addRole);
        const assignedIds = new Set(dayAssignments.map(a => a.personId));
        const emergency = employees.filter(e => e.role !== addRole && !assignedIds.has(e.id));
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setAddRole(null)}>
            <div className="w-full max-w-lg rounded-t-2xl pb-20"
              style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "#C4C2B8" }} />
              <div className="flex items-center justify-between px-4 mb-4 flex-row">
                <button onClick={() => setAddRole(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
                <p className="text-base font-semibold">הוסף עובד — {jobRoles.find(r => r.key === addRole)?.label}</p>
              </div>
              <div className="px-4 flex flex-col gap-2">
                {primary.length === 0 && <p className="text-sm text-center py-2" style={{ color: "var(--text-secondary)" }}>כל העובדים בתפקיד זה כבר משובצים</p>}
                {primary.map(emp => (
                  <button key={emp.id} onClick={() => addEmployee(emp, addRole!)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white flex-row"
                    style={{ border: "1px solid var(--border)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--blue-light)" }}>
                      <Plus size={11} style={{ color: "var(--blue)" }} />
                    </div>
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
                        style={{ background: "var(--amber-light)", border: "1px solid #EBC395" }}>
                        <AlertTriangle size={11} style={{ color: "var(--amber)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--amber)" }}>מקרה חירום</span>
                      </div>
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                    </div>
                    <div className="flex flex-row flex-wrap gap-2">
                      {emergency.map(emp => (
                        <button key={emp.id} onClick={() => addEmployee(emp, addRole!)}
                          className="flex flex-col items-center rounded-xl py-2 px-2 gap-1"
                          style={{ background: "var(--amber-light)", border: "1px solid #EBC395", flex: "1 1 calc(33% - 8px)", minWidth: 90 }}>
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
      {swapTarget && (() => {
        const assignedIds = new Set(dayAssignments.map(a => a.personId));
        const sameRole  = employees.filter(e => e.role === swapTarget.role && e.id !== swapTarget.personId && !assignedIds.has(e.id));
        const emergency = employees.filter(e => e.role !== swapTarget.role && e.id !== swapTarget.personId && !assignedIds.has(e.id));
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSwapTarget(null)}>
            <div className="w-full max-w-lg rounded-t-2xl pb-20"
              style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "#C4C2B8" }} />
              <div className="flex items-center justify-between px-4 mb-1 flex-row">
                <button onClick={() => setSwapTarget(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
                <p className="text-base font-semibold">החלף עובד</p>
              </div>
              <p className="text-xs text-right px-4 mb-4" style={{ color: "var(--text-secondary)" }}>מחליף את {swapTarget.name}</p>
              <div className="px-4 flex flex-col gap-2">
                {sameRole.length === 0 && <p className="text-sm text-center py-2" style={{ color: "var(--text-secondary)" }}>אין עובדים פנויים באותו תפקיד</p>}
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
                        style={{ background: "var(--amber-light)", border: "1px solid #EBC395" }}>
                        <AlertTriangle size={11} style={{ color: "var(--amber)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--amber)" }}>מקרה חירום</span>
                      </div>
                      <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                    </div>
                    <div className="flex flex-row flex-wrap gap-2">
                      {emergency.map(emp => (
                        <button key={emp.id} onClick={() => swapEmployee(emp)}
                          className="flex flex-col items-center rounded-xl py-2 px-2 gap-1"
                          style={{ background: "var(--amber-light)", border: "1px solid #EBC395", flex: "1 1 calc(33% - 8px)", minWidth: 90 }}>
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

      {/* Edit time popup — saves both as manual (orange) */}
      {editTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4 pb-8" style={{ background: "var(--gray-bg)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between mb-1 flex-row">
              <button onClick={() => setEditTarget(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <p className="text-base font-semibold">שעות — {editTarget.name}</p>
            </div>
            <p className="text-xs text-right mb-4" style={{ color: "var(--text-secondary)" }}>
              עריכה ידנית — שניהם יסומנו בכתום
            </p>
            <div className="bg-white rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="flex gap-3 mb-3 flex-row">
                <div className="flex-1">
                  <p className="text-xs mb-1 text-right" style={{ color: "var(--text-secondary)" }}>כניסה</p>
                  <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-1 text-right" style={{ color: "var(--text-secondary)" }}>יציאה</p>
                  <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg text-sm"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
                </div>
              </div>
              <button onClick={saveTime}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--navy)" }}>
                שמור — עדכון ידני
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
