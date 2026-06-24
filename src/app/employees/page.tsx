"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Phone, Calendar, Lock, Download, ChevronRight, ChevronLeft, Clock, TrendingUp, FileSpreadsheet, Mail, User, IdCard, Briefcase } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { calcHours, formatHours, exportMonthToCSV, buildRealAttendance, type AttendanceMonth } from "@/lib/shiftData";

type Employee = { id?: string; name: string; initials: string; role: string; phone: string; email?: string; since: string; cat: string; color: string; textColor: string };

const DEFAULT_JOB_ROLES = ["מלצרים", "מטבח", "בר", "שטיפה"];

export default function Employees() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [jobRoles, setJobRoles] = useState<string[]>(DEFAULT_JOB_ROLES);
  const [activeCat, setActiveCat] = useState("הכל");
  const [selected,  setSelected]  = useState<Employee | null>(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newId,      setNewId]      = useState("");
  const [newPhone,   setNewPhone]   = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [newRole,    setNewRole]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [sentResult, setSentResult] = useState<{ tempPassword: string; success: boolean; emailSent?: boolean; error?: string } | null>(null);
  const [bizName,    setBizName]    = useState("Sidur");
  const [businessId, setBusinessId] = useState("");
  const [isManager,  setIsManager]  = useState(true);
  const [resetting,  setResetting]  = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; emailSent?: boolean } | { error: string } | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState("");

  const cats = ["הכל", ...jobRoles];

  useEffect(() => {
    let bizId = "";
    try {
      const s = localStorage.getItem("shiftpro_session");
      if (s) {
        const p = JSON.parse(s);
        setBizName(p.businessName || "Sidur");
        setIsManager(p.role !== "employee");
        bizId = p.businessId || "";
        setBusinessId(bizId);
      }
    } catch {}

    if (!bizId) { router.replace("/login"); return; }

    (async () => {
      try {
        const [rolesRes, empRes] = await Promise.all([
          fetch(`/api/roles?businessId=${bizId}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${bizId}`).then(r => r.json()),
        ]);
        if (rolesRes.success) {
          const labels: string[] = rolesRes.roles.map((r: { label: string }) => r.label);
          setJobRoles(labels.length > 0 ? labels : DEFAULT_JOB_ROLES);
          setNewRole(labels[0] || DEFAULT_JOB_ROLES[0]);
        }
        if (empRes.success) setEmployees(empRes.employees);
      } catch {
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

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
        body: JSON.stringify({ id: emp.id, businessId, action: "reset_password", businessName: bizName }),
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
        body: JSON.stringify({ id: emp.id, businessId, action: "update_role", roleKey }),
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

  function openAttendance(emp: Employee) {
    setAttendanceEmp(emp);
    setAttendanceData([]);
    setMonthIdx(0);
    setExpandedWeek(0);
    setSelected(null);
    if (businessId && emp.id) {
      fetch(`/api/clock-requests?businessId=${businessId}&personId=${emp.id}`)
        .then(r => r.json())
        .then(res => { if (res.success) setAttendanceData(buildRealAttendance(res.requests)); })
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
        body: JSON.stringify({ businessId, name: newName.trim(), phone: newPhone, email: newEmail.trim() || undefined, roleKey: newRole, businessName: bizName }),
      });
      const data = await res.json();
      if (!data.success) {
        setSentResult({ tempPassword: "", success: false, error: data.error || "הוספת העובד נכשלה" });
        setSending(false);
        return;
      }
      tempPassword = data.tempPassword;
      setEmployees(prev => [...prev, data.employee]);

      // Email (free, sent server-side during creation) takes priority over SMS
      if (data.emailSent) {
        setSentResult({ tempPassword, success: true, emailSent: true });
        setSending(false);
        setNewName(""); setNewId(""); setNewPhone(""); setNewEmail(""); setNewRole(jobRoles[0] || "");
        return;
      }
    } catch {
      setSentResult({ tempPassword: "", success: false, error: "שגיאת רשת — נסה שוב" });
      setSending(false);
      return;
    }

    // Fall back to SMS if no email was provided / email sending failed
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: newPhone, employeeName: newName.trim(), tempPassword, businessName: bizName }),
      });
      const data = await res.json();
      setSentResult({ tempPassword, success: !!data.success, error: data.error });
    } catch {
      setSentResult({ tempPassword, success: false, error: "שגיאת רשת" });
    } finally {
      setSending(false);
      setNewName(""); setNewId(""); setNewPhone(""); setNewEmail(""); setNewRole(jobRoles[0] || "");
    }
  }

  const monthData    = attendanceData;
  const currentMonth = monthData[monthIdx];

  const allShiftsInMonth = currentMonth ? currentMonth.weeks.flatMap(w => w.shifts) : [];
  const totalMonthHours  = allShiftsInMonth.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  const totalShifts      = allShiftsInMonth.length;
  const avgPerShift      = totalShifts > 0 ? totalMonthHours / totalShifts : 0;

  return (
    <div className="flex flex-col min-h-screen pb-16" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <div className="flex items-center justify-between flex-row">
          {isManager ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "var(--blue-light)", color: "var(--blue)" }}
              onClick={() => setAddOpen(true)}>
              <Plus size={16} />
            </div>
          ) : <div className="w-8 h-8" />}
          <p className="text-base font-semibold">עובדים</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-row gap-2 px-3 pt-3 pb-1 overflow-x-auto">
        {cats.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap"
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
          <div key={emp.id || emp.name} className="bg-white rounded-xl px-3 py-3 flex items-center gap-2 flex-row cursor-pointer"
            style={{ border: "1px solid var(--border)" }}
            onClick={() => { setSelected(emp); setResetResult(null); setRoleChangeError(""); }}>
            <span className="text-xs px-2 py-0.5 rounded-md flex-shrink-0"
              style={{ background: "var(--gray-bg)", color: "var(--text-secondary)" }}>{emp.role}</span>
            <span className="flex-1 text-center text-sm font-medium">{emp.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-md flex-shrink-0"
              style={{ background: "var(--gray-bg)", color: "var(--text-secondary)" }}>{emp.phone}</span>
          </div>
        ))}
      </div>

      {/* ── Employee detail sheet ──────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4 pb-10" style={{ background: "var(--gray-bg)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
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
                  <div className="rounded-xl px-3 py-3 mb-3 text-center" style={{ background: "var(--green-light)", border: "1px solid #A8D9BB" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                      {resetResult.emailSent ? "הסיסמה אופסה ונשלחה במייל ✓" : "הסיסמה אופסה בהצלחה ✓"}
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
                    style={{ background: resetting ? "#9CA3AF" : "var(--amber-light)", color: resetting ? "#fff" : "var(--amber)", border: resetting ? "none" : "1px solid #EBC395" }}>
                    <Lock size={14} /> {resetting ? "מאפס..." : "אפס סיסמה לעובד/ת"}
                  </button>
                )}
                {resetResult && "error" in resetResult && (
                  <p className="text-xs text-center mb-3" style={{ color: "var(--red)" }}>{resetResult.error}</p>
                )}

                <p className="text-xs flex items-center gap-1 justify-end" style={{ color: "#9A9890" }}>
                  <Lock size={11} /> שעות עבודה ונתונים נוספים גלויים למנהל בלבד
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance report — MONTHLY ───────────────────────── */}
      {attendanceEmp && currentMonth && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAttendanceEmp(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white"
            style={{ maxHeight: "92vh", overflowY: "auto", paddingBottom: 32 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "#C4C2B8" }} />

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
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--green-light)", border: "1px solid #A8D9BB" }}>
                <p className="text-lg font-bold" style={{ color: "var(--green)" }}>{formatHours(avgPerShift)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>ממוצע משמרת</p>
              </div>
            </div>

            {/* Weekly accordion */}
            <div className="px-4 flex flex-col gap-2 mb-3">
              {currentMonth.weeks.map((week, wi) => {
                const weekHours  = week.shifts.reduce((s, sh) => s + calcHours(sh.timeIn, sh.timeOut), 0);
                const isExpanded = expandedWeek === wi;
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
                              </div>
                            </div>
                          );
                        })}
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
              <button onClick={() => exportMonthToCSV(attendanceEmp, currentMonth)}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--green)", color: "#fff" }}>
                <FileSpreadsheet size={16} />
                ייצא לאקסל — {currentMonth.label}
              </button>
              <button onClick={() => monthData.forEach(m => exportMonthToCSV(attendanceEmp, m))}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAttendanceEmp(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
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
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4" style={{ background: "var(--gray-bg)", maxHeight: "80vh", overflowY: "auto", paddingBottom: 24 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
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
                    background: sentResult.success ? "var(--green-light)" : "var(--amber-light)",
                    border: `1px solid ${sentResult.success ? "#A8D9BB" : "#EBC395"}`,
                  }}>
                  {sentResult.success ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                        {sentResult.emailSent ? "✓ פרטי הכניסה נשלחו במייל!" : "✓ הודעת SMS נשלחה!"}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        סיסמה זמנית: <span className="font-bold" style={{ direction: "ltr", display: "inline-block" }}>{sentResult.tempPassword}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>לא ניתן לשלוח את פרטי הכניסה</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        סיסמה זמנית: <span className="font-bold">{sentResult.tempPassword}</span> — שלח ידנית
                      </p>
                      {sentResult.error && <p className="text-xs mt-0.5 opacity-60">{sentResult.error}</p>}
                    </>
                  )}
                  <button onClick={() => { setSentResult(null); setAddOpen(false); }}
                    className="mt-2 text-xs font-semibold" style={{ color: "var(--blue)" }}>
                    סגור
                  </button>
                </div>
              )}

              {!sentResult && (
                <button onClick={confirmAdd} disabled={sending || !newName.trim() || !newPhone.trim() || !newEmail.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1 flex items-center justify-center gap-2"
                  style={{ background: sending || !newName.trim() || !newPhone.trim() || !newEmail.trim() ? "#ADA89D" : "var(--navy)" }}>
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
