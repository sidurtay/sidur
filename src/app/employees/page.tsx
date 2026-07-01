"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Phone, Calendar, Lock, Download, ChevronRight, ChevronLeft, Clock, TrendingUp, FileSpreadsheet, Mail, User, IdCard, Briefcase, Trash2, AlertTriangle, Wallet, Check } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";
import {
  calcHours, formatHours, calcOvertimeHours, calcPay, formatCurrency, exportMonthToExcel, exportAllToExcel,
  buildRealAttendance, compareWeekToSchedule, findNoShows,
  type AttendanceMonth, type ComparedShift,
} from "@/lib/shiftData";
import { MINIMUM_WAGE_HOURLY, isBelowMinimumWage } from "@/lib/minimumWage";

type Employee = { id?: string; name: string; initials: string; role: string; phone: string; email?: string; since: string; cat: string; color: string; textColor: string; hourlyWage?: number };

const DEFAULT_JOB_ROLES = ["מלצרים", "מטבח", "בר", "שטיפה"];

// The only week with real schedule_assignments backing it in this frozen-date
// demo — matches CURRENT_WEEK_START used elsewhere across the app.
const CURRENT_WEEK_START = "2026-06-21";
const CURRENT_WEEK_RANGE = "21.6–27.6";

const STATUS_LABEL: Record<ComparedShift["status"], { label: string; bg: string; color: string }> = {
  ok:           { label: "תקין",      bg: "var(--green-light)", color: "var(--green)" },
  late:         { label: "איחור",     bg: "var(--red-light)",   color: "var(--red)"   },
  "early-leave":{ label: "יציאה מוקדמת", bg: "var(--amber-light)", color: "var(--amber)" },
  "no-show":    { label: "לא הגיע/ה", bg: "var(--red-light)",   color: "var(--red)"   },
  unscheduled:  { label: "לא היה מתוכנן", bg: "var(--gray-bg)", color: "var(--text-secondary)" },
};

export default function Employees() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [jobRoles, setJobRoles] = useState<string[]>(DEFAULT_JOB_ROLES);
  const [rolePerms, setRolePerms] = useState<Record<string, Record<string, boolean>>>({});
  const [activeCat, setActiveCat] = useState("הכל");
  const [selected,  setSelected]  = useState<Employee | null>(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newId,      setNewId]      = useState("");
  const [newPhone,   setNewPhone]   = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [newRole,    setNewRole]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [sentResult, setSentResult] = useState<{ tempPassword: string; success: boolean; created: boolean; emailSent?: boolean; error?: string } | null>(null);
  const [bizName,    setBizName]    = useState("Sidur");
  const [businessId, setBusinessId] = useState("");
  const [myPersonId, setMyPersonId] = useState("");
  const [isManager,  setIsManager]  = useState(true);
  const [resetting,  setResetting]  = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; emailSent?: boolean } | { error: string } | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [currentWeekAssignments, setCurrentWeekAssignments] = useState<{ dayOfWeek: number; timeIn: string; timeOut: string }[]>([]);
  const [exportingAll, setExportingAll] = useState(false);
  const [wageInput, setWageInput] = useState("");
  const [savingWage, setSavingWage] = useState(false);
  const [wageError, setWageError] = useState("");
  const [wageSaved, setWageSaved] = useState(false);

  const cats = ["הכל", ...jobRoles];

  useEffect(() => {
    let bizId = "";
    try {
      const s = localStorage.getItem("shiftpro_session");
      if (s) {
        const p = JSON.parse(s);
        setBizName(p.businessName || "Sidur");
        setIsManager(p.role !== "employee");
        setMyPersonId(p.personId || "");
        bizId = p.businessId || "";
        setBusinessId(bizId);
      }
    } catch {}

    if (!bizId) { router.replace("/login"); return; }

    (async () => {
      try {
        const [rolesRes, empRes, permsRes] = await Promise.all([
          fetch(`/api/roles?businessId=${bizId}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${bizId}`).then(r => r.json()),
          fetch(`/api/role-permissions?businessId=${bizId}`).then(r => r.json()),
        ]);
        if (rolesRes.success) {
          const labels: string[] = rolesRes.roles.map((r: { label: string }) => r.label);
          setJobRoles(labels.length > 0 ? labels : DEFAULT_JOB_ROLES);
          setNewRole(labels[0] || DEFAULT_JOB_ROLES[0]);
        }
        if (empRes.success) setEmployees(empRes.employees);
        if (permsRes.success) setRolePerms(permsRes.perms || {});
      } catch {
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  function overtimeEnabledFor(role: string) {
    return !rolePerms[role]?.disableOvertimeBonus;
  }

  // Attendance — now monthly
  const [attendanceEmp, setAttendanceEmp] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceMonth[]>([]);
  const [monthIdx,      setMonthIdx]      = useState(0);
  const [expandedWeek,  setExpandedWeek]  = useState<number | null>(0); // which week accordion is open

  const filtered = activeCat === "הכל" ? employees : employees.filter(e => e.cat === activeCat);

  async function resetPassword(emp: Employee) {
    if (!emp.id || !businessId) return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, businessId, action: "reset_password", businessName: bizName, callerId: myPersonId }),
      }).then(r => r.json());
      if (res.success) setResetResult({ tempPassword: res.tempPassword, emailSent: res.emailSent });
      else setResetResult({ error: res.error || "איפוס הסיסמה נכשל" });
    } catch {
      setResetResult({ error: "שגיאת רשת — נסה שוב" });
    } finally {
      setResetting(false);
    }
  }

  async function changeRole(emp: Employee, roleKey: string) {
    if (!emp.id || !businessId || roleKey === emp.role) return;
    setChangingRole(true);
    setRoleChangeError("");
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, businessId, action: "update_role", roleKey, callerId: myPersonId }),
      }).then(r => r.json());
      if (res.success) {
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, role: roleKey, cat: roleKey } : e));
        setSelected(prev => prev && prev.id === emp.id ? { ...prev, role: roleKey, cat: roleKey } : prev);
      } else {
        setRoleChangeError(res.error || "עדכון התפקיד נכשל");
      }
    } catch {
      setRoleChangeError("שגיאת רשת — נסה שוב");
    } finally {
      setChangingRole(false);
    }
  }

  // Foundation for future cost-related reporting (overtime cost in ₪, labor
  // cost vs. revenue) — purely informational for now, optional per employee.
  async function saveWage(emp: Employee) {
    if (!emp.id || !businessId) return;
    setWageError("");
    if (wageInput.trim() && Number(wageInput) < MINIMUM_WAGE_HOURLY) {
      setWageError(`לא ניתן לשמור — מתחת לשכר המינימום החוקי (₪${MINIMUM_WAGE_HOURLY} לשעה)`);
      return;
    }
    setSavingWage(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emp.id, businessId, action: "update_wage", hourlyWage: wageInput, callerId: myPersonId }),
      }).then(r => r.json());
      if (res.success) {
        const wage = res.employee.hourlyWage;
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, hourlyWage: wage } : e));
        setSelected(prev => prev && prev.id === emp.id ? { ...prev, hourlyWage: wage } : prev);
        setWageSaved(true);
        setTimeout(() => setWageSaved(false), 2000);
      } else {
        setWageError(res.error || "עדכון השכר נכשל");
      }
    } catch {
      setWageError("שגיאת רשת — נסה שוב");
    } finally {
      setSavingWage(false);
    }
  }

  async function deleteEmployee(emp: Employee) {
    if (!emp.id || !businessId) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/employees?id=${emp.id}&businessId=${businessId}&callerId=${myPersonId}`, { method: "DELETE" }).then(r => r.json());
      if (res.success) {
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
        setSelected(null);
        setDeleteConfirm(false);
      } else {
        setDeleteError(res.error || "הסרת העובד נכשלה");
      }
    } catch {
      setDeleteError("שגיאת רשת — נסה שוב");
    } finally {
      setDeleting(false);
    }
  }

  // One payroll-ready CSV across every employee's current-month attendance,
  // instead of having to download and merge N separate per-employee files.
  async function exportAllEmployees() {
    if (!businessId || employees.length === 0) return;
    setExportingAll(true);
    try {
      const rows: { name: string; role: string; day: string; date: string; timeIn: string; timeOut: string; hourlyWage?: number; overtimeEnabled?: boolean }[] = [];
      await Promise.all(employees.map(async emp => {
        if (!emp.id) return;
        const res = await fetch(`/api/clock-requests?businessId=${businessId}&personId=${emp.id}`).then(r => r.json());
        if (!res.success) return;
        const months = buildRealAttendance(res.requests);
        const current = months[0];
        if (!current) return;
        current.weeks.flatMap(w => w.shifts).forEach(s => {
          rows.push({ name: emp.name, role: emp.role, day: s.day, date: s.date, timeIn: s.timeIn, timeOut: s.timeOut, hourlyWage: emp.hourlyWage, overtimeEnabled: overtimeEnabledFor(emp.role) });
        });
      }));
      await exportAllToExcel(rows, bizName, `דוח_שכר_כל_העובדים_${new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" })}.xlsx`);
    } finally {
      setExportingAll(false);
    }
  }

  function openAttendance(emp: Employee) {
    setAttendanceEmp(emp);
    setAttendanceData([]);
    setCurrentWeekAssignments([]);
    setMonthIdx(0);
    setExpandedWeek(0);
    setSelected(null);
    if (businessId && emp.id) {
      fetch(`/api/clock-requests?businessId=${businessId}&personId=${emp.id}`)
        .then(r => r.json())
        .then(res => { if (res.success) setAttendanceData(buildRealAttendance(res.requests)); })
        .catch(() => {});
      fetch(`/api/schedule?businessId=${businessId}&weekStart=${CURRENT_WEEK_START}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setCurrentWeekAssignments(
              res.assignments
                .filter((a: { personId: string }) => a.personId === emp.id)
                .map((a: { dayOfWeek: number; timeIn: string; timeOut: string }) => ({ dayOfWeek: a.dayOfWeek, timeIn: a.timeIn, timeOut: a.timeOut }))
            );
          }
        })
        .catch(() => {});
    }
  }

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + "-" + digits.slice(3);
  }

  async function confirmAdd() {
    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) return;
    setSending(true);
    setSentResult(null);

    let tempPassword: string;

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name: newName.trim(), phone: newPhone, email: newEmail.trim() || undefined, roleKey: newRole, businessName: bizName, callerId: myPersonId }),
      });
      const data = await res.json();
      if (!data.success) {
        setSentResult({ tempPassword: "", success: false, created: false, error: data.error || "הוספת העובד נכשלה" });
        setSending(false);
        return;
      }
      tempPassword = data.tempPassword;
      setEmployees(prev => [...prev, data.employee]);
      setSentResult({ tempPassword, success: !!data.emailSent, created: true, emailSent: data.emailSent });
    } catch {
      setSentResult({ tempPassword: "", success: false, created: false, error: "שגיאת רשת — נסה שוב" });
      setSending(false);
      return;
    }

    setSending(false);
    setNewName(""); setNewId(""); setNewPhone(""); setNewEmail(""); setNewRole(jobRoles[0] || "");
  }

  const monthData    = attendanceData;
  const currentMonth = monthData[monthIdx];

  const allShiftsInMonth = currentMonth ? currentMonth.weeks.flatMap(w => w.shifts) : [];
  const totalMonthHours  = allShiftsInMonth.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  const totalShifts      = allShiftsInMonth.length;
  const avgPerShift      = totalShifts > 0 ? totalMonthHours / totalShifts : 0;
  const totalMonthPay    = attendanceEmp?.hourlyWage != null
    ? allShiftsInMonth.reduce((sum, s) => sum + calcPay(s.timeIn, s.timeOut, attendanceEmp.hourlyWage!, overtimeEnabledFor(attendanceEmp.role)), 0)
    : null;

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <div className="flex items-center justify-between flex-row">
          {isManager ? (
            <div className="flex items-center gap-2 flex-row">
              <div onClick={() => setAddOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                <Plus size={16} />
              </div>
              <button onClick={exportAllEmployees} disabled={exportingAll}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--green-light)", color: "var(--green)", opacity: exportingAll ? 0.5 : 1 }}
                title="ייצוא לשכר — כל העובדים">
                <FileSpreadsheet size={15} />
              </button>
            </div>
          ) : <div className="w-8 h-8" />}
          <div className="text-right">
            <p className="text-base font-bold">עובדים</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{employees.length} בצוות</p>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-row gap-2 px-3 pt-3 pb-1 overflow-x-auto">
        {cats.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap transition-all"
            style={activeCat === cat
              ? { background: "var(--navy)", color: "#fff" }
              : { background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-3 pt-2 flex flex-col gap-2">
        {loadingList && (
          <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>טוען עובדים...</p>
        )}
        {!loadingList && filtered.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>אין עדיין עובדים — לחץ על + להוספה</p>
        )}
        {filtered.map(emp => (
          <Card key={emp.id || emp.name} padded={false}
            className="px-3 py-3 flex items-center gap-3 flex-row cursor-pointer"
            onClick={() => { setSelected(emp); setResetResult(null); setRoleChangeError(""); setDeleteConfirm(false); setDeleteError(""); setWageInput(emp.hourlyWage != null ? String(emp.hourlyWage) : String(MINIMUM_WAGE_HOURLY)); setWageError(""); }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: emp.color, color: emp.textColor }}>
              {emp.initials}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-semibold flex items-center gap-1 justify-end">
                {emp.name}
                {isBelowMinimumWage(emp.hourlyWage) && (
                  <span title="מתחת לשכר המינימום"><AlertTriangle size={11} style={{ color: "var(--red)" }} /></span>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{emp.role}</p>
            </div>
            <p className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)", direction: "ltr" }}>{emp.phone}</p>
          </Card>
        ))}
      </div>

      {/* ── Employee detail sheet ──────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4 pb-10" style={{ background: "var(--gray-bg)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-3 mb-4 flex-row">
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <div className="flex-1 text-right">
                <p className="text-base font-semibold">{selected.name}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.role}</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ background: selected.color, color: selected.textColor }}>
                {selected.initials}
              </div>
            </div>
            <div className="bg-white rounded-xl overflow-hidden mb-3" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 px-3 py-3 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="flex-1 text-sm font-medium text-left" style={{ direction: "ltr" }}>{selected.phone}</p>
                <p className="text-xs w-16 text-right" style={{ color: "var(--text-secondary)" }}>טלפון</p>
                <Phone size={16} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="flex items-center gap-3 px-3 py-3 flex-row">
                <p className="flex-1 text-sm font-medium text-right">{selected.since}</p>
                <p className="text-xs w-16 text-right" style={{ color: "var(--text-secondary)" }}>בצוות מאז</p>
                <Calendar size={16} style={{ color: "var(--text-secondary)" }} />
              </div>
            </div>

            {isManager && (
              <div className="bg-white rounded-xl p-3 mb-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2.5 flex-row justify-end">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>תפקיד</p>
                  <Briefcase size={14} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div className="flex flex-row gap-2 flex-wrap justify-end">
                  {jobRoles.map(r => (
                    <button key={r} onClick={() => changeRole(selected, r)} disabled={changingRole}
                      className="text-xs px-3 py-1.5 rounded-full"
                      style={selected.role === r
                        ? { background: "var(--navy)", color: "#fff" }
                        : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      {r}
                    </button>
                  ))}
                </div>
                {roleChangeError && (
                  <p className="text-xs mt-2 text-right" style={{ color: "var(--red)" }}>{roleChangeError}</p>
                )}
              </div>
            )}

            {isManager && (
              <div className="bg-white rounded-xl p-3 mb-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2.5 flex-row justify-end">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>שכר שעתי</p>
                  <Wallet size={14} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div className="flex items-center gap-2 flex-row">
                  <button onClick={() => saveWage(selected)} disabled={savingWage}
                    className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0 flex items-center gap-1 flex-row"
                    style={{ background: wageSaved ? "var(--green)" : "var(--navy)", color: "#fff" }}>
                    {wageSaved ? <><Check size={12} /> נשמר</> : savingWage ? "שומר..." : "שמור"}
                  </button>
                  <input type="number" inputMode="decimal" value={wageInput} onChange={e => setWageInput(e.target.value)}
                    placeholder="לדוגמה: 35"
                    className="flex-1 text-sm text-center px-3 py-2 rounded-lg outline-none"
                    style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }} />
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>₪ / שעה</span>
                </div>
                {wageError && (
                  <p className="text-xs mt-2 text-right" style={{ color: "var(--red)" }}>{wageError}</p>
                )}
                {!wageError && isBelowMinimumWage(selected.hourlyWage) && (
                  <p className="text-xs mt-2 text-right flex items-center gap-1 justify-end" style={{ color: "var(--red)" }}>
                    <AlertTriangle size={12} /> השכר השמור מתחת לשכר המינימום הנוכחי (₪{MINIMUM_WAGE_HOURLY})
                  </p>
                )}
                <p className="text-[10px] mt-2 text-right" style={{ color: "var(--text-secondary)" }}>
                  שכר המינימום החוקי הנוכחי: ₪{MINIMUM_WAGE_HOURLY} לשעה
                </p>
              </div>
            )}

            <button className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-2"
              style={{ background: "var(--green-light)", color: "var(--green)" }}>
              <Phone size={14} /> חייג
            </button>
            {isManager && (
              <>
                <button onClick={() => openAttendance(selected)}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-3"
                  style={{ background: "var(--navy)", color: "#fff" }}>
                  <Clock size={14} /> דוח שעות נוכחות
                </button>

                {resetResult && "tempPassword" in resetResult ? (
                  <div className="rounded-xl px-3 py-3 mb-3 text-center" style={{ background: "var(--green-light)", border: "1px solid var(--green-border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                      {resetResult.emailSent ? "הסיסמה אופסה ונשלחה במייל" : "הסיסמה אופסה בהצלחה"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      סיסמה זמנית: <span className="font-bold" style={{ direction: "ltr", display: "inline-block" }}>{resetResult.tempPassword}</span>
                    </p>
                    {!resetResult.emailSent && (
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>שלח/י את הסיסמה הזו ל{selected.name} ידנית — בכניסה הראשונה תתבקש להחליף אותה.</p>
                    )}
                  </div>
                ) : (
                  <button onClick={() => resetPassword(selected)} disabled={resetting}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-3"
                    style={{ background: resetting ? "var(--border)" : "var(--amber-light)", color: resetting ? "#fff" : "var(--amber)", border: resetting ? "none" : "1px solid var(--amber-border)" }}>
                    <Lock size={14} /> {resetting ? "מאפס..." : "אפס סיסמה לעובד/ת"}
                  </button>
                )}
                {resetResult && "error" in resetResult && (
                  <p className="text-xs text-center mb-3" style={{ color: "var(--red)" }}>{resetResult.error}</p>
                )}

                <p className="text-xs flex items-center gap-1 justify-end mb-3" style={{ color: "var(--text-secondary)" }}>
                  <Lock size={11} /> שעות עבודה ונתונים נוספים גלויים למנהל בלבד
                </p>

                {deleteConfirm ? (
                  <div className="rounded-xl p-3 mb-2" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)" }}>
                    <p className="text-xs font-semibold text-right flex items-center gap-1.5 justify-end mb-1" style={{ color: "var(--red)" }}>
                      <AlertTriangle size={13} /> להסיר את {selected.name} לצמיתות?
                    </p>
                    <p className="text-[10px] text-right mb-2.5" style={{ color: "var(--text-secondary)" }}>
                      פעולה זו לא הפיכה — כל הסידורים, הנוכחות וההיסטוריה של העובד/ת יימחקו.
                    </p>
                    <div className="flex gap-2 flex-row">
                      <button onClick={() => deleteEmployee(selected)} disabled={deleting}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: deleting ? "var(--red-border)" : "var(--red)" }}>
                        {deleting ? "מסיר..." : "כן, הסר לצמיתות"}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)} disabled={deleting}
                        className="flex-1 py-2.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-2"
                    style={{ background: "var(--red-light)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                    <Trash2 size={14} /> הסר עובד/ת מהעסק
                  </button>
                )}
                {deleteError && (
                  <p className="text-xs text-center mb-2" style={{ color: "var(--red)" }}>{deleteError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance report — MONTHLY ───────────────────────── */}
      {attendanceEmp && currentMonth && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAttendanceEmp(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white"
            style={{ maxHeight: "92vh", overflowY: "auto", paddingBottom: 32 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "var(--border)" }} />

            {/* Header */}
            <div className="px-4 pt-3 pb-3 flex items-center gap-3 flex-row"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <button onClick={() => setAttendanceEmp(null)}>
                <X size={18} style={{ color: "var(--text-secondary)" }} />
              </button>
              <div className="flex-1 text-right">
                <p className="text-base font-semibold">{attendanceEmp.name}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>דוח נוכחות חודשי</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: attendanceEmp.color, color: attendanceEmp.textColor }}>
                {attendanceEmp.initials}
              </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-2.5 flex-row"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--gray-bg)" }}>
              <button onClick={() => { setMonthIdx(i => Math.min(i + 1, monthData.length - 1)); setExpandedWeek(0); }}
                disabled={monthIdx >= monthData.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: monthIdx >= monthData.length - 1 ? 0.35 : 1 }}>
                <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
              </button>
              <p className="text-sm font-semibold">{currentMonth.label}</p>
              <button onClick={() => { setMonthIdx(i => Math.max(i - 1, 0)); setExpandedWeek(0); }}
                disabled={monthIdx === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: monthIdx === 0 ? 0.35 : 1 }}>
                <ChevronLeft size={14} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Monthly summary cards */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--navy)" }}>
                <p className="text-lg font-bold text-white">{formatHours(totalMonthHours)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>שעות החודש</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--blue)" }}>{totalShifts}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>משמרות</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--green-light)", border: "1px solid var(--green-border)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--green)" }}>{formatHours(avgPerShift)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>ממוצע משמרת</p>
              </div>
            </div>

            {totalMonthPay != null && (
              <div className="mx-4 mb-3 rounded-xl px-4 py-3 flex items-center justify-between flex-row"
                style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
                <span className="text-lg font-bold" style={{ color: "var(--blue)" }}>{formatCurrency(totalMonthPay)}</span>
                <p className="text-xs font-semibold text-right" style={{ color: "var(--blue)" }}>
                  שכר משוער לחודש <span className="font-normal">
                    (לפי ₪{attendanceEmp?.hourlyWage}/שעה, {attendanceEmp && overtimeEnabledFor(attendanceEmp.role) ? "כולל 125% על שעות נוספות" : "ללא תוספת על שעות נוספות"})
                  </span>
                </p>
              </div>
            )}

            {/* Weekly accordion */}
            <div className="px-4 flex flex-col gap-2 mb-3">
              {currentMonth.weeks.map((week, wi) => {
                const weekHours    = week.shifts.reduce((s, sh) => s + calcHours(sh.timeIn, sh.timeOut), 0);
                const weekOvertime = week.shifts.reduce((s, sh) => s + calcOvertimeHours(sh.timeIn, sh.timeOut), 0);
                const isExpanded   = expandedWeek === wi;
                const isCurrentWeek = week.range === CURRENT_WEEK_RANGE && currentWeekAssignments.length > 0;
                const compared = isCurrentWeek ? compareWeekToSchedule(week.shifts, currentWeekAssignments) : null;
                const noShows  = isCurrentWeek ? findNoShows(currentWeekAssignments, week.shifts) : [];
                return (
                  <div key={wi} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {/* Week header — tap to expand */}
                    <button
                      onClick={() => setExpandedWeek(isExpanded ? null : wi)}
                      className="w-full flex items-center justify-between px-3 py-2.5 flex-row"
                      style={{ background: isExpanded ? "var(--navy)" : "var(--surface)" }}>
                      <div className="flex items-center gap-2 flex-row">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: isExpanded ? "rgba(255,255,255,0.2)" : "var(--blue-light)",
                            color: isExpanded ? "#fff" : "var(--blue)",
                          }}>
                          {formatHours(weekHours)} שעות
                        </span>
                        <span className="text-xs" style={{ color: isExpanded ? "rgba(255,255,255,0.7)" : "var(--text-secondary)" }}>
                          {week.shifts.length} משמרות
                        </span>
                        {weekOvertime > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: isExpanded ? "rgba(255,255,255,0.2)" : "var(--amber-light)", color: isExpanded ? "#fff" : "var(--amber)" }}>
                            {formatHours(weekOvertime)} נוספות
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-row">
                        <p className="text-sm font-semibold" style={{ color: isExpanded ? "#fff" : "var(--text-main)" }}>
                          {week.range}
                        </p>
                        <ChevronLeft size={14}
                          style={{
                            color: isExpanded ? "#fff" : "var(--text-secondary)",
                            transform: isExpanded ? "rotate(-90deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }} />
                      </div>
                    </button>

                    {/* Shifts rows */}
                    {isExpanded && (
                      <div>
                        {/* Table header */}
                        <div className="grid grid-cols-4 px-3 py-2"
                          style={{ background: "var(--gray-bg)", borderBottom: "1px solid var(--border)" }}>
                          <p className="text-[10px] font-semibold text-left"  style={{ color: "var(--text-secondary)" }}>סה"כ</p>
                          <p className="text-[10px] font-semibold text-center" style={{ color: "var(--text-secondary)" }}>יציאה</p>
                          <p className="text-[10px] font-semibold text-center" style={{ color: "var(--text-secondary)" }}>כניסה</p>
                          <p className="text-[10px] font-semibold text-right"  style={{ color: "var(--text-secondary)" }}>יום</p>
                        </div>
                        {week.shifts.map((shift, si) => {
                          const h      = calcHours(shift.timeIn, shift.timeOut);
                          const isLong = h > 9;
                          const status = compared?.[si]?.status;
                          const statusInfo = status ? STATUS_LABEL[status] : null;
                          return (
                            <div key={si} className="grid grid-cols-4 px-3 py-2.5 items-center"
                              style={{
                                borderBottom: si < week.shifts.length - 1 ? "1px solid var(--border)" : "none",
                                background: isLong ? "var(--amber-light)" : "var(--surface)",
                              }}>
                              <div className="text-left">
                                <span className="text-sm font-semibold" style={{ color: isLong ? "var(--amber)" : "var(--text-main)" }}>
                                  {formatHours(h)}
                                </span>
                                {isLong && <p className="text-[9px]" style={{ color: "var(--amber)" }}>שעות נוספות</p>}
                              </div>
                              <p className="text-sm text-center font-medium" style={{ direction: "ltr" }}>{shift.timeOut}</p>
                              <p className="text-sm text-center font-medium" style={{ direction: "ltr" }}>{shift.timeIn}</p>
                              <div className="text-right">
                                <p className="text-sm font-medium">{shift.day}</p>
                                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{shift.date}</p>
                                {shift.note && <p className="text-[9px] mt-0.5" style={{ color: "var(--blue)" }}>{shift.note}</p>}
                                {statusInfo && status !== "ok" && (
                                  <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                                    style={{ background: statusInfo.bg, color: statusInfo.color }}>
                                    {statusInfo.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {noShows.map((ns, ni) => (
                          <div key={`noshow-${ni}`} className="grid grid-cols-4 px-3 py-2.5 items-center"
                            style={{ borderBottom: "1px solid var(--border)", background: "var(--red-light)" }}>
                            <div className="text-left">
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--red)", color: "#fff" }}>לא הגיע/ה</span>
                            </div>
                            <p className="text-sm text-center font-medium" style={{ direction: "ltr", color: "var(--text-secondary)" }}>{ns.plannedOut}</p>
                            <p className="text-sm text-center font-medium" style={{ direction: "ltr", color: "var(--text-secondary)" }}>{ns.plannedIn}</p>
                            <div className="text-right">
                              <p className="text-sm font-medium">{ns.day}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>תוכנן ולא נדווח</p>
                            </div>
                          </div>
                        ))}
                        {/* Week total row */}
                        <div className="grid grid-cols-4 px-3 py-2 items-center"
                          style={{ borderTop: "1px solid var(--border)", background: "var(--gray-bg)" }}>
                          <span className="text-sm font-bold text-left" style={{ color: "var(--text-main)" }}>{formatHours(weekHours)}</span>
                          <div className="col-span-2" />
                          <p className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>סה"כ שבוע</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly total */}
            <div className="mx-4 rounded-xl px-4 py-3 mb-3 flex items-center justify-between flex-row"
              style={{ background: "var(--navy)" }}>
              <span className="text-lg font-bold text-white">{formatHours(totalMonthHours)}</span>
              <p className="text-sm font-semibold text-white">סה"כ חודשי — {currentMonth.label}</p>
            </div>

            {/* Export */}
            <div className="px-4 flex flex-col gap-2">
              <button onClick={() => exportMonthToExcel({ ...attendanceEmp, overtimeEnabled: overtimeEnabledFor(attendanceEmp.role) }, currentMonth, bizName)}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--green)", color: "#fff" }}>
                <FileSpreadsheet size={16} />
                ייצא לאקסל — {currentMonth.label}
              </button>
              <button onClick={() => monthData.forEach(m => exportMonthToExcel({ ...attendanceEmp, overtimeEnabled: overtimeEnabledFor(attendanceEmp.role) }, m, bizName))}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "var(--gray-bg)", color: "var(--text-main)", border: "1px solid var(--border)" }}>
                <Download size={15} />
                ייצא כל החודשים
              </button>
              <div className="flex items-center gap-1.5 justify-center py-1">
                <TrendingUp size={12} style={{ color: "var(--text-secondary)" }} />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  ממוצע חודשי: {formatHours(
                    monthData.reduce((s, m) =>
                      s + m.weeks.flatMap(w => w.shifts).reduce((ws, sh) => ws + calcHours(sh.timeIn, sh.timeOut), 0), 0
                    ) / Math.max(monthData.length, 1)
                  )} שעות
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {attendanceEmp && !currentMonth && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAttendanceEmp(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <p className="text-sm font-semibold mb-1">{attendanceEmp.name}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>אין עדיין נתוני נוכחות</p>
            <button onClick={() => setAttendanceEmp(null)}
              className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--navy)" }}>
              סגור
            </button>
          </div>
        </div>
      )}

      {/* ── Add employee sheet ─────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4" style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto", paddingBottom: 24 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center justify-between mb-4 flex-row">
              <button onClick={() => setAddOpen(false)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <p className="text-base font-semibold">הוספת עובד חדש</p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5 text-right" style={{ color: "var(--text-secondary)" }}>שם מלא</p>
                <div className="relative flex items-center">
                  <User size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
                  <input className="w-full pr-10 pl-3 py-3 rounded-xl text-sm text-right outline-none transition-shadow"
                    style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                    placeholder="לדוגמא: יוסי כהן" value={newName}
                    onChange={e => setNewName(e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-1.5 text-right" style={{ color: "var(--text-secondary)" }}>תעודת זהות</p>
                <div className="relative flex items-center">
                  <IdCard size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
                  <input className="w-full pr-10 pl-3 py-3 rounded-xl text-sm text-right outline-none transition-shadow"
                    style={{ border: "1.5px solid var(--border)", background: "var(--surface)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                    placeholder="9 ספרות" value={newId}
                    onChange={e => setNewId(e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-1.5 text-right" style={{ color: "var(--text-secondary)" }}>מספר טלפון</p>
                <div className="relative flex items-center">
                  <Phone size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
                  <input
                    type="tel" inputMode="numeric"
                    className="w-full pr-10 pl-3 py-3 rounded-xl text-sm text-right outline-none transition-shadow"
                    style={{ border: "1.5px solid var(--border)", background: "var(--surface)", direction: "ltr" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                    placeholder="052-XXXXXXX"
                    value={newPhone}
                    onChange={e => setNewPhone(formatPhone(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-1.5 text-right" style={{ color: "var(--text-secondary)" }}>אימייל</p>
                <div className="relative flex items-center">
                  <Mail size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
                  <input
                    type="email"
                    className="w-full pr-10 pl-3 py-3 rounded-xl text-sm text-right outline-none transition-shadow"
                    style={{ border: "1.5px solid var(--border)", background: "var(--surface)", direction: "ltr" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 text-right" style={{ color: "var(--text-secondary)" }}>תפקיד</p>
                <div className="flex flex-row gap-2 flex-wrap">
                  {jobRoles.map(r => (
                    <button key={r} onClick={() => setNewRole(r)}
                      className="text-xs px-3 py-1.5 rounded-full"
                      style={newRole === r
                        ? { background: "var(--navy)", color: "#fff" }
                        : { background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {sentResult && (
                <div className="rounded-xl p-3 text-right"
                  style={{
                    background: sentResult.success ? "var(--green-light)" : !sentResult.created ? "var(--red-light)" : "var(--amber-light)",
                    border: `1px solid ${sentResult.success ? "var(--green-border)" : !sentResult.created ? "var(--red-border)" : "var(--amber-border)"}`,
                  }}>
                  {sentResult.success ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                        פרטי הכניסה נשלחו במייל!
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        סיסמה זמנית: <span className="font-bold" style={{ direction: "ltr", display: "inline-block" }}>{sentResult.tempPassword}</span>
                      </p>
                    </>
                  ) : !sentResult.created ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--red)" }}>הוספת העובד נכשלה</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        {sentResult.error || "נסה/י שוב"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>העובד נוסף, אך המייל לא נשלח</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        סיסמה זמנית: <span className="font-bold">{sentResult.tempPassword}</span> — שלח/י לעובד/ת ידנית
                      </p>
                      {sentResult.error && <p className="text-xs mt-0.5 opacity-60">{sentResult.error}</p>}
                    </>
                  )}
                  <button onClick={() => { setSentResult(null); if (sentResult.created) setAddOpen(false); }}
                    className="mt-2 text-xs font-semibold" style={{ color: "var(--blue)" }}>
                    {sentResult.created ? "סגור" : "נסה שוב"}
                  </button>
                </div>
              )}

              {!sentResult && (
                <button onClick={confirmAdd} disabled={sending || !newName.trim() || !newPhone.trim() || !newEmail.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1 flex items-center justify-center gap-2"
                  style={{ background: sending || !newName.trim() || !newPhone.trim() || !newEmail.trim() ? "var(--border)" : "var(--navy)" }}>
                  {sending ? "שולח פרטי כניסה..." : "הוסף עובד ושלח פרטי כניסה"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
