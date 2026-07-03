"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Download, FileSpreadsheet, TrendingUp, ArrowRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { calcHours, calcPay, formatHours, formatCurrency, exportMonthToExcel, buildRealAttendance, type AttendanceMonth } from "@/lib/shiftData";

type RealEmp = { name: string; role: string; initials: string; color: string; textColor: string; hourlyWage?: number };

export default function MyHours() {
  const router = useRouter();
  const [monthIdx, setMonthIdx] = useState(0);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [realMonthData, setRealMonthData] = useState<AttendanceMonth[]>([]);
  const [realEmp, setRealEmp] = useState<RealEmp | null>(null);
  const [bizName, setBizName] = useState("Sidur");

  useEffect(() => {
    let biz = "", person = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || ""; person = s.personId || "";
      if (s.businessName) setBizName(s.businessName);
    } catch {}
    if (!biz || !person) { router.replace("/login"); return; }

    fetch(`/api/clock-requests?businessId=${biz}&personId=${person}`)
      .then(r => r.json())
      .then(res => { if (res.success) setRealMonthData(buildRealAttendance(res.requests)); })
      .catch(() => {});
    fetch(`/api/employees?businessId=${biz}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const mine = res.employees.find((e: { id: string }) => e.id === person);
          if (mine) setRealEmp(mine);
        }
      })
      .catch(() => {});
  }, []);

  const emp = realEmp;
  const monthData = realMonthData;
  const currentMonth = monthData[monthIdx];

  const allShiftsInMonth = currentMonth ? currentMonth.weeks.flatMap(w => w.shifts) : [];
  const totalMonthHours  = allShiftsInMonth.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  const totalShifts      = allShiftsInMonth.length;
  const avgPerShift      = totalShifts > 0 ? totalMonthHours / totalShifts : 0;
  const totalMonthPay    = emp?.hourlyWage != null
    ? allShiftsInMonth.reduce((sum, s) => sum + calcPay(s.timeIn, s.timeOut, emp.hourlyWage!), 0)
    : null;

  if (!emp || !currentMonth) {
    return (
      <div className="flex flex-col min-h-screen pb-28 items-center justify-center px-8 text-center" style={{ background: "var(--gray-bg)" }}>
        <p className="text-3xl mb-2">🕓</p>
        <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>עוד אין שעות להצגה</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>ברגע שתדווח/י כניסה למשמרת הראשונה, השעות שלך יופיעו כאן.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 flex-row">
          <button onClick={() => router.push("/dashboard")}>
            <ArrowRight size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="flex-1 text-right">
            <p className="text-base font-semibold">השעות שלי</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{emp.name} · {emp.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: emp.color, color: emp.textColor }}>
            {emp.initials}
          </div>
          <Logo size={22} />
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-row"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={() => { setMonthIdx(i => Math.min(i + 1, monthData.length - 1)); setExpandedWeek(0); }}
          disabled={monthIdx >= monthData.length - 1}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", opacity: monthIdx >= monthData.length - 1 ? 0.35 : 1 }}>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
        <p className="text-sm font-semibold">{currentMonth.label}</p>
        <button onClick={() => { setMonthIdx(i => Math.max(i - 1, 0)); setExpandedWeek(0); }}
          disabled={monthIdx === 0}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", opacity: monthIdx === 0 ? 0.35 : 1 }}>
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
          <p className="text-xs font-semibold text-right" style={{ color: "var(--blue)" }}>שכר משוער לחודש</p>
        </div>
      )}

      {/* Weekly accordion */}
      <div className="px-4 flex flex-col gap-2 mb-3">
        {currentMonth.weeks.map((week, wi) => {
          const weekHours  = week.shifts.reduce((s, sh) => s + calcHours(sh.timeIn, sh.timeOut), 0);
          const isExpanded = expandedWeek === wi;
          return (
            <div key={wi} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
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

              {isExpanded && (
                <div>
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
        <button onClick={() => exportMonthToExcel(emp, currentMonth, bizName)}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "var(--green)", color: "#fff" }}>
          <FileSpreadsheet size={16} />
          ייצא לאקסל — {currentMonth.label}
        </button>
        <button onClick={() => monthData.forEach(m => exportMonthToExcel(emp, m, bizName))}
          className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border)" }}>
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

      <BottomNav />
    </div>
  );
}
