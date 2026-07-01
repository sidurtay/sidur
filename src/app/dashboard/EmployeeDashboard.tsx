"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, ChevronLeft, CheckCheck, X, AlertTriangle, ArrowLeftRight, Coins } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import ClockInOutCard from "@/components/ClockInOutCard";
import { calcHours, formatHours, buildRealAttendance, buildUpcomingShifts, type AttendanceMonth } from "@/lib/shiftData";

const TODAY_LABEL = "שלישי, 23.6";
const TODAY_WEEK_START = "2026-06-21";
const TODAY_DAY_OF_WEEK = 2;

type Announcement = { id: number | string; title: string; text: string; createdAt: string; confirmed: boolean };

export default function EmployeeDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bizName, setBizName] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [myShift, setMyShift] = useState<{ id: string; role: string; timeIn: string; timeOut: string } | null>(null);
  const [realMonthData, setRealMonthData] = useState<AttendanceMonth[] | null>(null);
  const [coworkers, setCoworkers] = useState<{ id: string; name: string; initials: string; role: string; color: string; textColor: string }[]>([]);
  const [mySwapRequest, setMySwapRequest] = useState<{ id: string; status: string; proposerName?: string } | null>(null);
  const [swapPicker, setSwapPicker] = useState(false);
  const [upcomingShifts, setUpcomingShifts] = useState<ReturnType<typeof buildUpcomingShifts>>([]);
  const [tipsToday, setTipsToday] = useState<{ published: boolean; worked?: boolean; myShare?: number; shiftLabel?: string } | null>(null);

  useEffect(() => {
    let biz = "", person = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setName(s.name || "");
      setBizName(s.businessName || "");
      biz = s.businessId || ""; person = s.personId || "";
    } catch {}

    setBusinessId(biz); setPersonId(person);
    if (!biz) { router.replace("/login"); return; }

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
      fetch(`/api/clock-requests?businessId=${biz}&personId=${person}`)
        .then(r => r.json())
        .then(res => { if (res.success) setRealMonthData(buildRealAttendance(res.requests)); })
        .catch(() => {});
      fetch(`/api/tips/mine?businessId=${biz}&personId=${person}`)
        .then(r => r.json())
        .then(res => { if (res.success) setTipsToday(res); })
        .catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myShiftToday = myShift ? { ...myShift } : null;

  async function requestSwap(proposedPersonId?: string) {
    if (!businessId || !myShift) return;
    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, assignmentId: myShift.id, requestedBy: personId, proposedPerson: proposedPersonId, callerId: personId }),
      }).then(r => r.json());
      if (res.success) setMySwapRequest({ id: res.request.id, status: res.request.status, proposerName: res.request.proposerName });
    } catch {}
    setSwapPicker(false);
  }

  const monthData = realMonthData || [];
  const currentMonth = monthData[0];
  const allShifts = currentMonth ? currentMonth.weeks.flatMap(w => w.shifts) : [];
  const monthHours = allShifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);

  const pendingAnnouncements = announcements.filter(a => !a.confirmed).length;

  function confirmAnnouncement(id: number | string) {
    fetch("/api/announcements/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId: id, personId, callerId: personId }),
    }).catch(() => {});
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, confirmed: true } : a));
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div style={{ background: "var(--navy)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between flex-row">
          <div className="text-right">
            <p className="text-white text-base font-semibold">שלום, {name.split(" ")[0]}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{bizName}</p>
          </div>
          <div className="flex items-center gap-3 flex-row">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              {TODAY_LABEL}
            </span>
            <Logo size={22} color="#fff" />
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

        {/* Clock in/out — central fingerprint tap button */}
        {myShiftToday && businessId && personId && (
          <ClockInOutCard businessId={businessId} personId={personId} />
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

        {/* Today's tips — only shown once there's a real, published number to show */}
        {tipsToday?.published && tipsToday.worked && (
          <div className="bg-white rounded-xl p-4 flex items-center justify-between flex-row" style={{ border: "1px solid var(--border)" }}>
            <div className="rounded-xl px-3 py-2 text-center" style={{ background: "var(--green-light)" }}>
              <p className="text-base font-bold" style={{ color: "var(--green)" }}>₪{tipsToday.myShare}</p>
              <p className="text-[9px]" style={{ color: "var(--green)" }}>טיפים</p>
            </div>
            <div className="text-right flex-1 mx-3">
              <p className="text-sm font-semibold">הטיפים שלי היום</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>ממשמרת ה{tipsToday.shiftLabel}</p>
            </div>
            <Coins size={16} style={{ color: "var(--text-secondary)" }} />
          </div>
        )}

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
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{a.createdAt}</p>
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

      {/* Swap picker sheet */}
      {swapPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSwapPicker(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white" style={{ maxHeight: "75vh", overflowY: "auto", paddingBottom: 24 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: "var(--border)" }} />
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
