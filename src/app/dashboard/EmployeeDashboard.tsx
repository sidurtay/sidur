"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Clock, ChevronLeft, CheckCheck, X, AlertTriangle, ArrowLeftRight, Fingerprint, LogIn, LogOut, Hourglass } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { ALL_EMPLOYEES, TODAYS_ASSIGNMENTS, UPCOMING_SHIFTS, mockAttendance, calcHours, formatHours, buildRealAttendance, buildUpcomingShifts, type AttendanceMonth } from "@/lib/shiftData";
import { getClockState, requestClock, requiresClockOutApproval, type ClockState } from "@/lib/clockRequests";

const TODAY_LABEL = "שלישי, 23.6";
const TODAY_WEEK_START = "2026-06-21";
const TODAY_DAY_OF_WEEK = 2;

type Announcement = { id: number | string; title: string; text: string; createdAt: string; confirmed: boolean };

const initialAnnouncements: Announcement[] = [
  { id: 1, title: "מנת סלמון חדשה בתפריט", text: "החל מ-1.7 מוסיפים פילה סלמון צרוב — חשוב לדעת לתאר ללקוחות את המנה ואת הרטבים", createdAt: "לפני 3 שעות", confirmed: false },
  { id: 2, title: "אסור להיכנס עם נעליים פתוחות למטבח", text: "תזכורת — נוהל בטיחות. נעלי עבודה בלבד בכל שטח המטבח ואזור הכנת המזון", createdAt: "אתמול", confirmed: true },
];

type ApiClockRequest = { id: string; personId: string; type: "in" | "out"; status: "pending" | "approved" | "denied"; requestedAt: number };

function deriveClockState(requests: ApiClockRequest[]): ClockState {
  const lastIn = [...requests].reverse().find(r => r.type === "in");
  const lastOut = [...requests].reverse().find(r => r.type === "out");
  const label = (ts: number) => new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return {
    in: lastIn ? (lastIn.status === "denied" ? "none" : lastIn.status) : "none",
    out: lastOut ? (lastOut.status === "denied" ? "none" : lastOut.status) : "none",
    inTime: lastIn?.status === "approved" ? label(lastIn.requestedAt) : undefined,
    outTime: lastOut?.status === "approved" ? label(lastOut.requestedAt) : undefined,
  };
}

type Notif = { id: string | number; title: string; text: string; time: string; type: string; unread: boolean };
const notifStyle: Record<string, { bg: string; color: string }> = {
  warn:    { bg: "#FDF3E3", color: "#854F0B" },
  info:    { bg: "var(--blue-light)", color: "var(--blue)" },
  success: { bg: "#EAF3E0", color: "#3B6D11" },
};

export default function EmployeeDashboard() {
  const [name, setName] = useState("");
  const [bizName, setBizName] = useState("");
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(true);
  const [dynamicNotifs, setDynamicNotifs] = useState<Notif[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [clockState, setClockState] = useState<ClockState>({ in: "none", out: "none" });
  const [outNeedsApproval, setOutNeedsApproval] = useState(true);
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [myShift, setMyShift] = useState<{ id: string; role: string; timeIn: string; timeOut: string } | null>(null);
  const [realMonthData, setRealMonthData] = useState<AttendanceMonth[] | null>(null);
  const [coworkers, setCoworkers] = useState<{ id: string; name: string; initials: string; role: string; color: string; textColor: string }[]>([]);
  const [mySwapRequest, setMySwapRequest] = useState<{ id: string; status: string; proposerName?: string } | null>(null);
  const [swapPicker, setSwapPicker] = useState(false);
  const [upcomingShifts, setUpcomingShifts] = useState(UPCOMING_SHIFTS);

  async function refreshClockState(biz: string, person: string) {
    try {
      const res = await fetch(`/api/clock-requests?businessId=${biz}&personId=${person}`).then(r => r.json());
      if (res.success) setClockState(deriveClockState(res.requests));
    } catch {}
  }

  useEffect(() => {
    let biz = "", person = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setName(s.name || "");
      setBizName(s.businessName || "");
      biz = s.businessId || ""; person = s.personId || "";
      const stored = JSON.parse(localStorage.getItem("shiftpro_tips_notifications") || "[]");
      const mine = stored.filter((n: { workers?: string[] }) => !n.workers || n.workers.includes(s.name));
      if (mine.length > 0) { setDynamicNotifs(mine); setNotifRead(false); }
      setOutNeedsApproval(requiresClockOutApproval());
      if (!biz && s.name) setClockState(getClockState(s.name));
    } catch {}

    setBusinessId(biz); setPersonId(person);
    if (!biz) return;

    (async () => {
      try {
        const [schedRes, annRes, empRes, swapRes] = await Promise.all([
          fetch(`/api/schedule?businessId=${biz}&weekStart=${TODAY_WEEK_START}`).then(r => r.json()),
          fetch(`/api/announcements?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/swap-requests?businessId=${biz}`).then(r => r.json()),
        ]);
        if (schedRes.success) {
          setUpcomingShifts(buildUpcomingShifts(schedRes.assignments));
          const mine = schedRes.assignments.find((a: { dayOfWeek: number; personId: string }) => a.dayOfWeek === TODAY_DAY_OF_WEEK && a.personId === person);
          if (mine) setMyShift({ id: mine.id, role: mine.role, timeIn: mine.timeIn, timeOut: mine.timeOut });
          if (swapRes.success && mine) {
            const sr = swapRes.requests.find((r: { assignmentId: string }) => r.assignmentId === mine.id);
            if (sr) setMySwapRequest({ id: sr.id, status: sr.status, proposerName: sr.proposerName });
          }
        }
        if (empRes.success) setCoworkers(empRes.employees.filter((e: { id: string }) => e.id !== person));
        if (annRes.success) {
          setAnnouncements(annRes.announcements.map((a: { id: string; title: string; text: string; createdAt: string; confirmedBy: string[] }) => ({
            id: a.id, title: a.title, text: a.text, createdAt: a.createdAt, confirmed: a.confirmedBy.includes(name),
          })));
        }
      } catch {}
      refreshClockState(biz, person);
      fetch(`/api/clock-requests?businessId=${biz}&personId=${person}`)
        .then(r => r.json())
        .then(res => { if (res.success) setRealMonthData(buildRealAttendance(res.requests)); })
        .catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emp = ALL_EMPLOYEES.find(e => e.name === name) || ALL_EMPLOYEES[0];
  const myShiftToday = businessId ? (myShift ? { ...myShift } : null) : TODAYS_ASSIGNMENTS.find(a => a.name === emp.name);

  // Poll while a request is pending so an approval from the manager's side shows up live
  useEffect(() => {
    if (clockState.in !== "pending" && clockState.out !== "pending") return;
    const interval = setInterval(() => {
      if (businessId) refreshClockState(businessId, personId);
      else setClockState(getClockState(emp.name));
    }, 2000);
    return () => clearInterval(interval);
  }, [clockState.in, clockState.out, emp.name, businessId, personId]);

  async function handleClockIn() {
    if (businessId) {
      await fetch("/api/clock-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, type: "in" }),
      }).catch(() => {});
      refreshClockState(businessId, personId);
    } else {
      requestClock(emp.name, "in");
      setClockState(getClockState(emp.name));
    }
  }
  async function handleClockOut() {
    if (businessId) {
      await fetch("/api/clock-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, type: "out", autoApprove: !outNeedsApproval }),
      }).catch(() => {});
      refreshClockState(businessId, personId);
      return;
    }
    if (!outNeedsApproval) {
      // No approval required — record immediately as if approved
      requestClock(emp.name, "out");
      const list = JSON.parse(localStorage.getItem("shiftpro_clock_requests") || "[]");
      const updated = list.map((r: { employeeName: string; type: string; status: string }, i: number) =>
        i === list.length - 1 && r.employeeName === emp.name && r.type === "out" ? { ...r, status: "approved" } : r
      );
      localStorage.setItem("shiftpro_clock_requests", JSON.stringify(updated));
    } else {
      requestClock(emp.name, "out");
    }
    setClockState(getClockState(emp.name));
  }

  async function requestSwap(proposedPersonId?: string) {
    if (!businessId || !myShift) return;
    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, assignmentId: myShift.id, requestedBy: personId, proposedPerson: proposedPersonId }),
      }).then(r => r.json());
      if (res.success) setMySwapRequest({ id: res.request.id, status: res.request.status, proposerName: res.request.proposerName });
    } catch {}
    setSwapPicker(false);
  }

  const monthData = realMonthData !== null ? realMonthData : (mockAttendance[emp.name] || []);
  const currentMonth = monthData[0];
  const allShifts = currentMonth ? currentMonth.weeks.flatMap(w => w.shifts) : [];
  const monthHours = allShifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);

  const pendingAnnouncements = announcements.filter(a => !a.confirmed).length;

  function confirmAnnouncement(id: number | string) {
    if (businessId && personId) {
      fetch("/api/announcements/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: id, personId }),
      }).catch(() => {});
    }
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, confirmed: true } : a));
  }

  return (
    <div className="flex flex-col min-h-screen pb-16" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div style={{ background: "var(--navy)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between flex-row">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            {TODAY_LABEL}
          </span>
          <div className="flex items-center gap-3 flex-row">
            <div className="text-right">
              <p className="text-white text-base font-semibold">שלום, {(name || emp.name).split(" ")[0]} 👋</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{bizName}</p>
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

        {/* Today's shift summary inside header */}
        <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.1)" }}>
          {myShiftToday ? (
            <div className="flex items-center justify-between flex-row">
              <div className="flex items-center gap-1.5 flex-row" style={{ direction: "ltr" }}>
                <Clock size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
                <span className="text-sm font-semibold text-white">{myShiftToday.timeIn}–{myShiftToday.timeOut}</span>
              </div>
              <p className="text-sm text-white font-medium">המשמרת שלי היום</p>
            </div>
          ) : (
            <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.75)" }}>אין לך משמרת היום</p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">

        {/* Clock in/out */}
        {myShiftToday && (
          <div className="bg-white rounded-xl p-4 flex flex-col gap-3" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between flex-row">
              <Fingerprint size={16} style={{ color: "var(--blue)" }} />
              <p className="text-sm font-semibold">דיווח נוכחות</p>
            </div>

            {clockState.out === "approved" ? (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "var(--green-light)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>✓ סיימת את המשמרת היום</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>כניסה {clockState.inTime} · יציאה {clockState.outTime}</p>
              </div>
            ) : clockState.in === "none" ? (
              <button onClick={handleClockIn}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "var(--navy)" }}>
                <LogIn size={15} /> כניסה למשמרת
              </button>
            ) : clockState.in === "pending" ? (
              <div className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                <Hourglass size={15} /> ממתין לאישור המנהל...
              </div>
            ) : clockState.out === "none" ? (
              <>
                <div className="rounded-xl px-3 py-2 text-center" style={{ background: "var(--green-light)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>✓ נכנסת למשמרת ב-{clockState.inTime}</p>
                </div>
                <button onClick={handleClockOut}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--navy)" }}>
                  <LogOut size={15} /> סיום משמרת
                </button>
              </>
            ) : (
              <div className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                <Hourglass size={15} /> ממתין לאישור סיום משמרת...
              </div>
            )}
          </div>
        )}

        {/* Swap request */}
        {businessId && myShift && (
          <div className="bg-white rounded-xl p-4 flex flex-col gap-3" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between flex-row">
              <ArrowLeftRight size={16} style={{ color: "var(--blue)" }} />
              <p className="text-sm font-semibold">החלפת משמרת</p>
            </div>
            {!mySwapRequest ? (
              <button onClick={() => setSwapPicker(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--gray-bg)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
                בקש החלפה למשמרת היום
              </button>
            ) : (
              <div className="rounded-xl px-4 py-3 text-center"
                style={{
                  background: mySwapRequest.status === "approved" ? "var(--green-light)" : mySwapRequest.status === "denied" ? "var(--gray-bg)" : "var(--blue-light)",
                }}>
                <p className="text-sm font-semibold"
                  style={{ color: mySwapRequest.status === "approved" ? "var(--green)" : mySwapRequest.status === "denied" ? "var(--text-secondary)" : "var(--blue)" }}>
                  {mySwapRequest.status === "approved" ? "✓ ההחלפה אושרה" : mySwapRequest.status === "denied" ? "✗ הבקשה נדחתה" : "ממתין לאישור המנהל..."}
                </p>
                {mySwapRequest.proposerName && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{mySwapRequest.proposerName} מבקש/ת לקחת</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* My hours card */}
        <Link href="/my-hours"
          className="bg-white rounded-xl p-4 flex items-center justify-between flex-row"
          style={{ border: "1px solid var(--border)" }}>
          <ChevronLeft size={16} style={{ color: "var(--text-secondary)" }} />
          <div className="text-right flex-1 mx-3">
            <p className="text-sm font-semibold">השעות שלי — {currentMonth?.label || "החודש"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{allShifts.length} משמרות הוחל</p>
          </div>
          <div className="rounded-xl px-3 py-2 text-center" style={{ background: "var(--navy)" }}>
            <p className="text-base font-bold text-white">{formatHours(monthHours)}</p>
            <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.65)" }}>שעות</p>
          </div>
        </Link>

        {/* Upcoming shifts */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            <a href="/schedule" className="text-xs font-medium" style={{ color: "var(--blue)" }}>כל הסידור ←</a>
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>משמרות קרובות בעסק</p>
          </div>
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {upcomingShifts.map((s, i) => (
              <div key={i} className="flex items-center px-3 py-3 flex-row"
                style={{ borderBottom: i < upcomingShifts.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span className="text-xs font-medium mx-3" style={{ color: "var(--text-secondary)", direction: "ltr" }}>{s.time}</span>
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium">{s.role}</p>
                </div>
                <p className="text-xs flex-shrink-0 mr-2" style={{ color: "var(--text-secondary)" }}>{s.day} · {s.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements — read & confirm */}
        <div>
          <div className="flex items-center justify-between flex-row mb-2">
            {pendingAnnouncements > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                {pendingAnnouncements} לאישור
              </span>
            )}
            <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>הודעות מהמנהל</p>
          </div>
          <div className="flex flex-col gap-2">
            {announcements.map(a => (
              <div key={a.id} className="bg-white rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-right mb-1">{a.title}</p>
                <p className="text-xs text-right mb-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.text}</p>
                <div className="flex items-center justify-between flex-row">
                  <p className="text-[10px]" style={{ color: "#C4C2B8" }}>{a.createdAt}</p>
                  {a.confirmed ? (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--green)" }}>
                      <CheckCheck size={13} /> אישרת קריאה
                    </span>
                  ) : (
                    <button onClick={() => confirmAnnouncement(a.id)}
                      className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                      style={{ background: "var(--navy)" }}>
                      אשר קריאה
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications sheet */}
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
              {dynamicNotifs.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>אין התראות חדשות</p>
              ) : dynamicNotifs.map((n, i, arr) => {
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

      {/* Swap picker sheet */}
      {swapPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSwapPicker(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white" style={{ maxHeight: "75vh", overflowY: "auto", paddingBottom: 24 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between px-4 mb-3 flex-row">
              <button onClick={() => setSwapPicker(false)}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
              <p className="text-base font-semibold">בקש החלפה — מי יקח את המשמרת?</p>
            </div>
            <div className="px-4 flex flex-col gap-2">
              <button onClick={() => requestSwap(undefined)}
                className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ border: "1px dashed var(--border)", color: "var(--text-secondary)" }}>
                שלח בקשה בלי להציע עובד מחליף
              </button>
              {coworkers.map(c => (
                <button key={c.id} onClick={() => requestSwap(c.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl flex-row"
                  style={{ border: "1px solid var(--border)" }}>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{c.role}</span>
                  <p className="flex-1 text-right text-sm font-medium">{c.name}</p>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: c.color, color: c.textColor }}>{c.initials}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
