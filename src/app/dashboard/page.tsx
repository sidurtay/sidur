"use client";
import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Clock, ArrowLeftRight, X, CheckCheck, Plus, Pencil, Trash2, ChevronLeft, Users, Fingerprint, LogIn, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { ALL_EMPLOYEES, TODAYS_ASSIGNMENTS, UPCOMING_SHIFTS, buildUpcomingShifts, type Employee } from "@/lib/shiftData";
import EmployeeDashboard from "./EmployeeDashboard";
import { getClockRequests, respondToRequest, type ClockRequest } from "@/lib/clockRequests";

type Announcement = {
  id: number | string;
  title: string;
  text: string;
  createdAt: string;
  confirmedBy: string[];
};

const initialAnnouncements: Announcement[] = [
  {
    id: 1,
    title: "מנת סלמון חדשה בתפריט",
    text: "החל מ-1.7 מוסיפים פילה סלמון צרוב — חשוב לדעת לתאר ללקוחות את המנה ואת הרטבים",
    createdAt: "לפני 3 שעות",
    confirmedBy: ["שירה כהן", "דניאל לוי", "נועה ברק", "רותם אביב", "מיכל שרון", "עידו בן דוד"],
  },
  {
    id: 2,
    title: "אסור להיכנס עם נעליים פתוחות למטבח",
    text: "תזכורת — נוהל בטיחות. נעלי עבודה בלבד בכל שטח המטבח ואזור הכנת המזון",
    createdAt: "אתמול",
    confirmedBy: ["שירה כהן", "דניאל לוי"],
  },
];

const notifications = [
  { id: 1, title: "עידו בן דוד איחר למשמרת", text: "אמור להגיע ב-16:00, נכנס ב-16:45 — איחור של 45 דקות", time: "לפני 12 דקות", type: "warn",    unread: true },
  { id: 2, title: "בקשת החלפת משמרת",         text: "שירה מבקשת להחליף את משמרת שישי בוקר. רותם מציע לקחת.",        time: "לפני 35 דקות", type: "info",    unread: true },
  { id: 3, title: "חוסר עובד בסידור",          text: "לא משובץ אף עובד למשמרת בר ביום שלישי",                       time: "לפני שעה",    type: "warn",    unread: false },
  { id: 4, title: "הודעת מנה חדשה אושרה",      text: "6 מתוך 6 עובדים אישרו קריאה על מנת הסלמון החדשה",           time: "לפני 3 שעות", type: "success", unread: false },
];

const notifStyle: Record<string, { bg: string; color: string }> = {
  warn:    { bg: "#FDF3E3", color: "#854F0B" },
  info:    { bg: "var(--blue-light)", color: "var(--blue)" },
  success: { bg: "#EAF3E0", color: "#3B6D11" },
};
const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  active:  { label: "נוכח",       bg: "#EAF3DE", color: "#3B6D11" },
  late:    { label: "איחור",      bg: "#FCEBEB", color: "#A32D2D" },
  pending: { label: "טרם הגיע",   bg: "#FDF3E3", color: "#854F0B" },
};

const TODAY_LABEL = "שלישי, 23.6";
const TODAY_WEEK_START = "2026-06-21";
const TODAY_DAY_OF_WEEK = 2;

type Notif = { id: string|number; title: string; text: string; time: string; type: string; unread: boolean };
type TodayWorker = { id: string; name: string; initials: string; role: string; color: string; textColor: string; timeIn: string; timeOut: string; status: "active"|"late"|"pending"; checkin: string };
type SwapRequest = {
  id: string; status: string; assignmentId: string; dayOfWeek?: number; roleKey?: string; timeIn?: string; timeOut?: string;
  requesterName: string; requesterInitials: string; requesterColor: string; requesterTextColor: string;
  proposerName?: string; proposerInitials?: string; proposerColor?: string; proposerTextColor?: string;
};
const SWAP_DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function timeMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function buildTodayWorkers(assignments: { id: string; name: string; initials: string; color: string; textColor: string; role: string; timeIn: string; timeOut: string; actualIn?: { time: string } }[]): TodayWorker[] {
  return assignments.map(a => {
    const checkin = a.actualIn?.time || "--:--";
    let status: TodayWorker["status"] = "pending";
    if (a.actualIn) {
      status = timeMins(a.actualIn.time) > timeMins(a.timeIn) + 10 ? "late" : "active";
    }
    return { id: a.id, name: a.name, initials: a.initials, role: a.role, color: a.color, textColor: a.textColor, timeIn: a.timeIn, timeOut: a.timeOut, status, checkin };
  });
}

export default function Dashboard() {
  const [showAll,     setShowAll]     = useState(false);
  const [notifsOpen,  setNotifsOpen]  = useState(false);
  const [notifRead,   setNotifRead]   = useState(false);
  const [swapApproved, setSwapApproved] = useState<"approved"|"rejected"|null>(null);
  const [dynamicNotifs, setDynamicNotifs] = useState<Notif[]>([]);
  const [role, setRole] = useState<"manager" | "employee" | null>(null);
  const [clockRequests, setClockRequests] = useState<ClockRequest[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [swapRequests, setSwapRequests] = useState<SwapRequest[] | null>(null);
  const [managerName, setManagerName] = useState("איתי");
  const [businessName, setBusinessName] = useState("קפה קפה נהריה");
  const [employees, setEmployees] = useState<(Employee & { id?: string })[]>(ALL_EMPLOYEES);
  const [todayWorkers, setTodayWorkers] = useState<TodayWorker[]>(TODAYS_ASSIGNMENTS);
  const [upcomingShifts, setUpcomingShifts] = useState(UPCOMING_SHIFTS);
  const [jobRoleKeys, setJobRoleKeys] = useState<string[]>(["מלצר", "מטבח", "בר", "שטיפה"]);
  const [myPersonId, setMyPersonId] = useState("");

  useEffect(() => {
    let biz = "";
    try {
      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setRole(session.role === "employee" ? "employee" : "manager");
      biz = session.businessId || "";
      if (session.name) setManagerName(session.name);
      if (session.businessName) setBusinessName(session.businessName);
      if (session.personId) setMyPersonId(session.personId);
    } catch { setRole("manager"); }
    try {
      const stored = JSON.parse(localStorage.getItem("shiftpro_tips_notifications") || "[]");
      if (stored.length > 0) {
        setDynamicNotifs(stored);
        setNotifRead(false);
      }
    } catch {}

    setBusinessId(biz);

    if (!biz) {
      setClockRequests(getClockRequests());
      const interval = setInterval(() => setClockRequests(getClockRequests()), 2000);
      return () => clearInterval(interval);
    }

    function refreshClockRequests() {
      fetch(`/api/clock-requests?businessId=${biz}`).then(r => r.json()).then(res => {
        if (res.success) setClockRequests(res.requests);
      }).catch(() => {});
    }
    refreshClockRequests();
    const interval = setInterval(refreshClockRequests, 2000);

    (async () => {
      try {
        const [empRes, roleRes, schedRes, annRes, swapRes] = await Promise.all([
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/roles?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/schedule?businessId=${biz}&weekStart=${TODAY_WEEK_START}`).then(r => r.json()),
          fetch(`/api/announcements?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/swap-requests?businessId=${biz}`).then(r => r.json()),
        ]);
        if (empRes.success) setEmployees(empRes.employees);
        if (roleRes.success) setJobRoleKeys(roleRes.roles.map((r: { key: string }) => r.key));
        if (schedRes.success) {
          setTodayWorkers(buildTodayWorkers(schedRes.assignments.filter((a: { dayOfWeek: number }) => a.dayOfWeek === TODAY_DAY_OF_WEEK)));
          setUpcomingShifts(buildUpcomingShifts(schedRes.assignments));
        }
        if (annRes.success) setAnnouncements(annRes.announcements);
        if (swapRes.success) setSwapRequests(swapRes.requests);
      } catch {}
    })();

    return () => clearInterval(interval);
  }, []);

  function respond(id: string, approve: boolean) {
    if (businessId) {
      fetch("/api/clock-requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approve }),
      }).then(r => r.json()).then(res => {
        if (res.success) setClockRequests(prev => prev.map(r => r.id === id ? res.request : r));
      }).catch(() => {});
      return;
    }
    respondToRequest(id, approve);
    setClockRequests(getClockRequests());
  }

  function respondSwap(id: string, approve: boolean) {
    fetch("/api/swap-requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approve }),
    }).then(r => r.json()).then(res => {
      if (res.success) setSwapRequests(prev => (prev || []).map(r => r.id === id ? { ...r, status: approve ? "approved" : "denied" } : r));
    }).catch(() => {});
  }

  // Announcements CRUD
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [announcementSheet, setAnnouncementSheet] = useState<"add" | "edit" | "viewers" | null>(null);
  const [editingAnn, setEditingAnn]   = useState<Announcement | null>(null);
  const [annTitle,   setAnnTitle]     = useState("");
  const [annText,    setAnnText]      = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);

  if (role === "employee") return <EmployeeDashboard />;
  if (role === null) return null;

  const pendingClockRequests = clockRequests.filter(r => r.status === "pending");

  const lateCount    = todayWorkers.filter(e => e.status === "late").length;
  const activeCount  = todayWorkers.filter(e => e.status === "active").length;
  const pendingCount = todayWorkers.filter(e => e.status === "pending").length;
  const visible      = showAll ? todayWorkers : todayWorkers.slice(0, 3);

  function openAdd() {
    setEditingAnn(null); setAnnTitle(""); setAnnText("");
    setAnnouncementSheet("add");
  }
  function openEdit(a: Announcement) {
    setEditingAnn(a); setAnnTitle(a.title); setAnnText(a.text);
    setAnnouncementSheet("edit");
  }
  async function saveAnnouncement() {
    if (!annTitle.trim()) return;
    if (announcementSheet === "add") {
      if (businessId) {
        try {
          const res = await fetch("/api/announcements", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessId, title: annTitle.trim(), body: annText.trim(), createdBy: myPersonId || null }),
          }).then(r => r.json());
          if (res.success) setAnnouncements(prev => [res.announcement, ...prev]);
        } catch {}
      } else {
        setAnnouncements(prev => [{
          id: Date.now(), title: annTitle.trim(), text: annText.trim(),
          createdAt: "עכשיו", confirmedBy: [],
        }, ...prev]);
      }
    } else if (editingAnn) {
      if (businessId) {
        fetch("/api/announcements", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingAnn.id, title: annTitle.trim(), body: annText.trim() }),
        }).catch(() => {});
      }
      setAnnouncements(prev => prev.map(a =>
        a.id === editingAnn.id ? { ...a, title: annTitle.trim(), text: annText.trim() } : a
      ));
    }
    setAnnouncementSheet(null);
  }
  function deleteAnnouncement(id: number | string) {
    if (businessId) {
      fetch(`/api/announcements?id=${id}`, { method: "DELETE" }).catch(() => {});
    }
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="flex flex-col min-h-screen pb-16" style={{ background: "var(--gray-bg)" }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ background: "var(--navy)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between flex-row">
          <div className="flex items-center gap-2 flex-row">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              {TODAY_LABEL}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-row">
            <div className="text-right">
              <p className="text-white text-base font-semibold">שלום, {managerName} 👋</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{businessName}</p>
            </div>
            <button className="relative p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}
              onClick={() => { setNotifsOpen(true); setNotifRead(true); }}>
              <Bell size={20} color="white" />
              {(!notifRead || dynamicNotifs.some(n => n.unread)) && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full" style={{ background: "#F87171" }} />
              )}
            </button>
            <Logo size={22} />
          </div>
        </div>

        {/* Quick stats bar inside header */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { val: todayWorkers.length, label: "בסידור היום", color: "#fff" },
            { val: activeCount,  label: "נוכחים",    color: "#86EFAC" },
            { val: lateCount,    label: "איחורים",   color: lateCount > 0 ? "#FCA5A5" : "#86EFAC" },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2 px-3 text-center"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">

        {/* ── Clock-in/out approval requests ──────────────────── */}
        {pendingClockRequests.length > 0 && (
          <div>
            <div className="flex items-center justify-between flex-row mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                {pendingClockRequests.length} ממתינות
              </span>
              <div className="flex items-center gap-1.5 flex-row">
                <Fingerprint size={13} style={{ color: "var(--blue)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>בקשות כניסה/יציאה</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {pendingClockRequests.map(r => {
                const emp = employees.find(e => e.name === r.employeeName);
                const timeLabel = new Date(r.requestedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={r.id} className="bg-white rounded-xl p-3 flex items-center gap-3 flex-row" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex gap-1.5 flex-row flex-shrink-0">
                      <button onClick={() => respond(r.id, false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        דחה
                      </button>
                      <button onClick={() => respond(r.id, true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ background: "var(--blue)" }}>
                        אשר
                      </button>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium">{r.employeeName}</p>
                      <p className="text-xs flex items-center gap-1 justify-end" style={{ color: "var(--text-secondary)" }}>
                        {r.type === "in" ? <LogIn size={11} /> : <LogOut size={11} />}
                        בקשת {r.type === "in" ? "כניסה" : "יציאה"} · {timeLabel}
                      </p>
                    </div>
                    {emp && (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: emp.color, color: emp.textColor }}>
                        {emp.initials}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Today's workers ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {todayWorkers.length} עובדים · {pendingCount} טרם הגיעו
            </span>
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>משמרת היום</p>
          </div>
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {visible.map((emp, i) => {
              const s = statusLabel[emp.status];
              return (
                <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 flex-row"
                  style={{ borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="flex flex-col items-start gap-0.5 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-secondary)", direction: "ltr" }}>
                      <Clock size={9} />{emp.timeIn}–{emp.timeOut}
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{emp.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: emp.color, color: emp.textColor }}>
                    {emp.initials}
                  </div>
                </div>
              );
            })}
            {todayWorkers.length > 3 && (
              <button onClick={() => setShowAll(v => !v)}
                className="w-full py-2.5 text-sm text-center font-medium"
                style={{ color: "var(--blue)", borderTop: "1px solid var(--border)" }}>
                {showAll ? "הצג פחות" : `הצג עוד ${todayWorkers.length - 3} עובדים`}
              </button>
            )}
          </div>
        </div>

        {/* ── Upcoming shifts ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            <a href="/schedule" className="text-xs font-medium" style={{ color: "var(--blue)" }}>כל הסידור ←</a>
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>משמרות קרובות</p>
          </div>
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {upcomingShifts.map((s, i) => (
              <div key={i} className="flex items-center px-3 py-3 flex-row"
                style={{ borderBottom: i < upcomingShifts.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Users size={11} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--blue)" }}>{s.count}</span>
                </div>
                <span className="text-xs font-medium mx-3" style={{ color: "var(--text-secondary)", direction: "ltr" }}>{s.time}</span>
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium">{s.role}</p>
                </div>
                <p className="text-xs flex-shrink-0 mr-2" style={{ color: "var(--text-secondary)" }}>{s.day} · {s.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Team summary from employees ───────────────────── */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            <a href="/employees" className="text-xs font-medium" style={{ color: "var(--blue)" }}>כל העובדים ←</a>
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>הצוות — {employees.length} עובדים</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-3" style={{ border: "1px solid var(--border)" }}>
            <div className="flex flex-row gap-2 flex-wrap">
              {jobRoleKeys.map(role => {
                const count = employees.filter(e => e.cat === role).length;
                const sample = employees.filter(e => e.cat === role)[0];
                return (
                  <div key={role} className="flex-1 rounded-xl py-2 px-3 text-center min-w-16"
                    style={{ background: sample?.color || "var(--gray-bg)", border: "1px solid var(--border)" }}>
                    <p className="text-xl font-bold" style={{ color: sample?.textColor }}>{count}</p>
                    <p className="text-[10px]" style={{ color: sample?.textColor, opacity: 0.8 }}>{role}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Swap requests ──────────────────────────────────── */}
        {businessId ? (
          (swapRequests || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 text-right" style={{ color: "var(--text-main)" }}>בקשות החלפת משמרת</p>
              <div className="flex flex-col gap-2">
                {(swapRequests || []).map(sr => (
                  <div key={sr.id} className="bg-white rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between flex-row mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={sr.status === "pending"
                          ? { background: "var(--blue-light)", color: "var(--blue)" }
                          : sr.status === "approved"
                          ? { background: "var(--green-light)", color: "var(--green)" }
                          : { background: "var(--gray-bg)", color: "var(--text-secondary)" }}>
                        {sr.status === "pending" ? "ממתין" : sr.status === "approved" ? "✓ אושר" : "✗ נדחה"}
                      </span>
                      <p className="text-sm font-semibold">
                        {sr.dayOfWeek !== undefined ? `יום ${SWAP_DAY_LABELS[sr.dayOfWeek]} · ${sr.roleKey}` : "בקשת החלפה"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-row">
                      <div className="flex items-center gap-1.5 flex-row-reverse flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: sr.requesterColor, color: sr.requesterTextColor }}>{sr.requesterInitials}</div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{sr.requesterName}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{sr.timeIn}–{sr.timeOut}</p>
                        </div>
                      </div>
                      <ArrowLeftRight size={14} style={{ color: "var(--blue)", flexShrink: 0 }} />
                      {sr.proposerName ? (
                        <div className="flex items-center gap-1.5 flex-row-reverse flex-1">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: sr.proposerColor, color: sr.proposerTextColor }}>{sr.proposerInitials}</div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{sr.proposerName}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>מבקש לקחת</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs flex-1 text-right" style={{ color: "var(--text-secondary)" }}>לא הוצע מחליף</p>
                      )}
                    </div>
                    {sr.status === "pending" && (
                      <div className="flex gap-2 flex-row">
                        <button onClick={() => respondSwap(sr.id, false)}
                          className="flex-1 py-2 rounded-lg text-sm font-medium"
                          style={{ background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          דחה
                        </button>
                        <button onClick={() => respondSwap(sr.id, true)} disabled={!sr.proposerName}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                          style={{ background: sr.proposerName ? "var(--blue)" : "var(--border)" }}>
                          אשר החלפה
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div>
            <p className="text-xs font-semibold mb-2 text-right" style={{ color: "var(--text-main)" }}>בקשת החלפת משמרת</p>
            {swapApproved === null ? (
              <div className="bg-white rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between flex-row mb-2">
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>לפני 35 דק׳</p>
                  <p className="text-sm font-semibold">בקשה ממתינה לאישור</p>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-row">
                  <div className="flex items-center gap-1.5 flex-row-reverse flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#E6F1FB", color: "#0C447C" }}>שי</div>
                    <div className="text-right">
                      <p className="text-sm font-medium">שירה כהן</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>שישי 26.6 · בוקר</p>
                    </div>
                  </div>
                  <ArrowLeftRight size={14} style={{ color: "var(--blue)", flexShrink: 0 }} />
                  <div className="flex items-center gap-1.5 flex-row-reverse flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#EEEDFE", color: "#3C3489" }}>רו</div>
                    <div className="text-right">
                      <p className="text-sm font-medium">רותם אביב</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>מבקש לקחת</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-row">
                  <button onClick={() => setSwapApproved("rejected")}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    דחה
                  </button>
                  <button onClick={() => setSwapApproved("approved")}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "var(--blue)" }}>
                    אשר החלפה
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 text-right"
                style={{
                  background: swapApproved === "approved" ? "var(--green-light)" : "var(--gray-bg)",
                  border: `1px solid ${swapApproved === "approved" ? "#C5E0A8" : "var(--border)"}`,
                }}>
                <p className="text-sm font-semibold" style={{ color: swapApproved === "approved" ? "var(--green)" : "var(--text-secondary)" }}>
                  {swapApproved === "approved" ? "✓ ההחלפה אושרה — הסידור עודכן" : "✗ הבקשה נדחתה"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Announcements (full CRUD) ──────────────────────── */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            <button onClick={openAdd}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "var(--navy)", color: "#fff" }}>
              <Plus size={11} /> הודעה חדשה
            </button>
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>הודעות לצוות</p>
          </div>

          {announcements.length === 0 && (
            <div className="bg-white rounded-xl p-6 text-center" style={{ border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>אין הודעות פעילות</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {announcements.map(a => {
              const pending = employees.length - a.confirmedBy.length;
              const pct     = Math.round((a.confirmedBy.length / employees.length) * 100);
              return (
                <div key={a.id} className="bg-white rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
                  {/* Title row */}
                  <div className="flex items-start justify-between flex-row gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-row flex-shrink-0">
                      {/* Delete */}
                      <button onClick={() => setDeleteConfirm(a.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "var(--red-light)" }}>
                        <Trash2 size={11} style={{ color: "var(--red)" }} />
                      </button>
                      {/* Edit */}
                      <button onClick={() => openEdit(a)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "var(--blue-light)" }}>
                        <Pencil size={11} style={{ color: "var(--blue)" }} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-right flex-1">{a.title}</p>
                  </div>

                  <p className="text-xs text-right mb-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.text}</p>

                  {/* Progress + viewers */}
                  <button onClick={() => { setEditingAnn(a); setAnnouncementSheet("viewers"); }}
                    className="w-full text-right"
                    style={{ cursor: "pointer" }}>
                    <div className="flex items-center justify-between mb-1 flex-row">
                      <div className="flex items-center gap-1 flex-row">
                        <ChevronLeft size={11} style={{ color: "var(--text-secondary)" }} />
                        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>פרטי אישורים</span>
                      </div>
                      <div className="flex items-center gap-1 flex-row">
                        <CheckCheck size={13} style={{ color: pending > 0 ? "var(--amber)" : "var(--green)" }} />
                        <span className="text-xs font-semibold"
                          style={{ color: pending > 0 ? "var(--amber)" : "var(--green)" }}>
                          {a.confirmedBy.length}/{employees.length} אישרו
                        </span>
                      </div>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "var(--gray-bg)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pending > 0 ? "var(--amber)" : "var(--green)" }} />
                    </div>
                    {pending > 0 && (
                      <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-secondary)" }}>
                        {pending} עובדים טרם אישרו קריאה
                      </p>
                    )}
                  </button>

                  <p className="text-[10px] mt-1.5 text-right" style={{ color: "#C4C2B8" }}>{a.createdAt}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Announcement add/edit sheet ────────────────────── */}
      {(announcementSheet === "add" || announcementSheet === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAnnouncementSheet(null)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4 pb-10 bg-white"
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between flex-row mb-4">
              <button onClick={() => setAnnouncementSheet(null)}>
                <X size={18} style={{ color: "var(--text-secondary)" }} />
              </button>
              <p className="text-base font-semibold">
                {announcementSheet === "add" ? "הודעה חדשה לצוות" : "עריכת הודעה"}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-right mb-1" style={{ color: "var(--text-secondary)" }}>כותרת</p>
                <input value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                  placeholder="לדוגמא: עדכון תפריט / שינוי נוהל..."
                  className="w-full text-sm text-right px-3 py-2.5 rounded-xl"
                  style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }}
                  autoFocus />
              </div>
              <div>
                <p className="text-xs text-right mb-1" style={{ color: "var(--text-secondary)" }}>תוכן ההודעה</p>
                <textarea value={annText} onChange={e => setAnnText(e.target.value)}
                  placeholder="פרט את ההודעה כאן..."
                  rows={4}
                  className="w-full text-sm text-right px-3 py-2.5 rounded-xl resize-none"
                  style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <CheckCheck size={13} style={{ color: "var(--blue)" }} />
                כל העובדים יקבלו התראה ויתבקשו לאשר קריאה
              </div>
              <button onClick={saveAnnouncement}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: annTitle.trim() ? "var(--navy)" : "#C4C2B8" }}>
                {announcementSheet === "add" ? "שלח הודעה לצוות" : "שמור שינויים"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Who confirmed sheet ────────────────────────────── */}
      {announcementSheet === "viewers" && editingAnn && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAnnouncementSheet(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white"
            style={{ maxHeight: "75vh", overflowY: "auto", paddingBottom: 24 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between px-4 mb-3 flex-row">
              <button onClick={() => setAnnouncementSheet(null)}>
                <X size={18} style={{ color: "var(--text-secondary)" }} />
              </button>
              <div className="text-right">
                <p className="text-base font-semibold">{editingAnn.title}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {editingAnn.confirmedBy.length} מתוך {employees.length} אישרו
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="px-4 mb-3">
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "var(--gray-bg)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.round(editingAnn.confirmedBy.length / employees.length * 100)}%`,
                    background: editingAnn.confirmedBy.length === employees.length ? "var(--green)" : "var(--amber)"
                  }} />
              </div>
            </div>

            {/* Employee list */}
            <div className="px-4 flex flex-col gap-1.5">
              {/* Confirmed */}
              {editingAnn.confirmedBy.length > 0 && (
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--green)", textAlign: "right" }}>✓ אישרו קריאה</p>
              )}
              {employees.filter(e => editingAnn.confirmedBy.includes(e.name)).map(emp => (
                <div key={emp.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl flex-row"
                  style={{ background: "var(--green-light)", border: "1px solid #C5E0A8" }}>
                  <CheckCheck size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{emp.role}</span>
                  <p className="flex-1 text-right text-sm font-medium">{emp.name}</p>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                </div>
              ))}

              {/* Pending */}
              {employees.filter(e => !editingAnn.confirmedBy.includes(e.name)).length > 0 && (
                <p className="text-xs font-semibold mt-2 mb-1" style={{ color: "var(--amber)", textAlign: "right" }}>⏳ טרם אישרו</p>
              )}
              {employees.filter(e => !editingAnn.confirmedBy.includes(e.name)).map(emp => (
                <div key={emp.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl flex-row"
                  style={{ background: "var(--amber-light)", border: "1px solid #F0D5A0" }}>
                  <button
                    onClick={() => {
                      if (businessId && emp.id) {
                        fetch("/api/announcements/confirm", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ announcementId: editingAnn.id, personId: emp.id }),
                        }).catch(() => {});
                      }
                      setAnnouncements(prev => prev.map(a =>
                        a.id === editingAnn.id
                          ? { ...a, confirmedBy: [...a.confirmedBy, emp.name] }
                          : a
                      ));
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--amber)", color: "#fff" }}>
                    אשר ידנית
                  </button>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{emp.role}</span>
                  <p className="flex-1 text-right text-sm font-medium">{emp.name}</p>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm dialog ─────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--red-light)" }}>
              <Trash2 size={20} style={{ color: "var(--red)" }} />
            </div>
            <p className="text-base font-semibold mb-1">מחק הודעה?</p>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              ״{announcements.find(a => a.id === deleteConfirm)?.title}״<br />לא ניתן לשחזר לאחר המחיקה
            </p>
            <div className="flex gap-2 flex-row">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>ביטול</button>
              <button onClick={() => deleteAnnouncement(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--red)" }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications sheet ───────────────────────────── */}
      {notifsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setNotifsOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl overflow-hidden"
            style={{ background: "var(--gray-bg)", maxHeight: "85vh", overflowY: "auto", paddingBottom: 80 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between px-4 mb-4 flex-row">
              <button onClick={() => setNotifsOpen(false)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <p className="text-base font-semibold">התראות</p>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-0">
              {[...dynamicNotifs, ...notifications].map((n, i, arr) => {
                const ns = notifStyle[n.type] || notifStyle["info"];
                return (
                  <div key={n.id} className="flex items-start gap-3 py-3 flex-row"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    {n.unread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--blue)" }} />}
                    {!n.unread && <div className="w-2 flex-shrink-0" />}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: ns.bg, color: ns.color }}>
                      {n.type === "warn"    && <AlertTriangle size={14} />}
                      {n.type === "info"    && <ArrowLeftRight size={14} />}
                      {n.type === "success" && <CheckCheck size={14} />}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{n.text}</p>
                      <p className="text-xs mt-1" style={{ color: "#9A9890" }}>{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
