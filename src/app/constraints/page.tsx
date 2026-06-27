"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, StickyNote, AlertTriangle, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { getEffectiveConfig } from "@/lib/businessConfig";

const allDays = [
  { label: "ראשון", date: "28.6", d: 0 },
  { label: "שני",   date: "29.6", d: 1 },
  { label: "שלישי", date: "30.6", d: 2 },
  { label: "רביעי", date: "1.7",  d: 3 },
  { label: "חמישי", date: "2.7",  d: 4 },
  { label: "שישי",  date: "3.7",  d: 5 },
  { label: "שבת",   date: "4.7",  d: 6 },
];

type DayStatus = "morning" | "evening" | "all" | "off";

const statusLabels: Record<DayStatus, string> = {
  all: "כל היום",
  morning: "בוקר בלבד",
  evening: "ערב בלבד",
  off: "לא זמין",
};

const statusColors: Record<DayStatus, { bg: string; border: string; text: string }> = {
  all: { bg: "var(--green-light)", border: "#A8D9BB", text: "var(--green)" },
  morning: { bg: "var(--blue-light)", border: "var(--blue-border)", text: "var(--blue)" },
  evening: { bg: "var(--gray-bg)", border: "var(--text-secondary)", text: "var(--text-main)" },
  off: { bg: "var(--red-light)", border: "#EFB3B3", text: "var(--red)" },
};

const shortLabels: Record<DayStatus, string> = { all: "כל היום", morning: "בוקר", evening: "ערב", off: "לא זמין" };

const WEEK_START = "2026-06-28"; // matches the "next week" the schedule + AI build for

export default function Constraints() {
  const [role, setRole] = useState<"manager" | "employee" | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setRole(s.role === "employee" ? "employee" : "manager");
    } catch { setRole("manager"); }
  }, []);

  if (role === null) return null;
  if (role === "manager") return <ManagerConstraints />;
  return <EmployeeConstraints />;
}

function EmployeeConstraints() {
  const router = useRouter();
  const [days, setDays] = useState(allDays.slice(0, 6)); // default: skip Saturday
  const [availability, setAvailability] = useState<Record<number, DayStatus>>({
    0: "all", 1: "all", 2: "all", 3: "all", 4: "all", 5: "morning",
  });
  const [bizHours, setBizHours] = useState<Record<number, { from: string; to: string }>>({});
  const [weekNote, setWeekNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");

  useEffect(() => {
    const cfg = getEffectiveConfig();
    // Only show days the business is open
    const openDays = allDays.filter((_, i) => cfg.days[i]?.open);
    setDays(openDays);
    // Store hours for display
    const hours: Record<number, { from: string; to: string }> = {};
    cfg.days.forEach((d, i) => { if (d.open) hours[i] = { from: d.from, to: d.to }; });
    setBizHours(hours);

    try {
      const session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      if (!session.businessId || !session.personId) { router.replace("/login"); return; }
      setBusinessId(session.businessId);
      setPersonId(session.personId);
      // Pre-fill with whatever was already submitted for this week, if anything
      fetch(`/api/constraints?businessId=${session.businessId}&personId=${session.personId}&weekStart=${WEEK_START}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && Object.keys(data.availability).length > 0) {
            setAvailability(data.availability);
            setWeekNote(data.weekNote || "");
          }
        })
        .catch(() => {});
    } catch { router.replace("/login"); }
  }, []);

  const options: DayStatus[] = ["all", "morning", "evening", "off"];

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, weekStart: WEEK_START, availability, weekNote, callerId: personId }),
      });
    } catch {}
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => router.back(), 1800);
  }

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4" style={{ background: "var(--gray-bg)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--green-light)", border: "2px solid var(--green)" }}>
          <Check size={28} style={{ color: "var(--green)" }} />
        </div>
        <p className="text-base font-semibold">האילוצים נשלחו!</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>המנהל יראה את ההעדפות שלך לשבוע הבא</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 flex-row"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()}>
          <ArrowRight size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 text-right">
          <p className="text-base font-semibold">אילוצי זמינות</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>שבוע 28.6–4.7</p>
        </div>
        <Logo size={22} />
      </div>

      <div className="px-4 py-4 flex flex-col gap-3 pb-28">
        <p className="text-sm text-right" style={{ color: "var(--text-secondary)" }}>
          סמן את הזמינות שלך לכל יום. המנהל יראה ויבנה סידור בהתאם.
        </p>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* Table header */}
          <div className="grid items-center" style={{ gridTemplateColumns: "1fr 46px 46px 46px 46px", background: "var(--gray-bg)" }}>
            <span className="text-[10px] font-semibold text-right pr-3 py-2" style={{ color: "var(--text-secondary)" }}>יום</span>
            {options.map(opt => (
              <span key={opt} className="text-[9px] font-semibold text-center" style={{ color: "var(--text-secondary)" }}>
                {shortLabels[opt]}
              </span>
            ))}
            <span />
          </div>

          {days.map((day, di) => {
            const status = availability[day.d] ?? "all";
            return (
              <div key={day.d} className="grid items-center"
                style={{
                  gridTemplateColumns: "1fr 46px 46px 46px 46px",
                  borderTop: "1px solid var(--border)",
                  background: di % 2 === 1 ? "var(--gray-bg)" : "transparent",
                }}>
                <div className="text-right pr-3 py-2.5">
                  <p className="text-xs font-semibold">{day.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    {day.date}
                    {bizHours[day.d] && (
                      <span style={{ direction: "ltr", display: "inline-block", marginRight: 3 }}>
                        {" "}{bizHours[day.d].from}–{bizHours[day.d].to}
                      </span>
                    )}
                  </p>
                </div>
                {options.map(opt => {
                  const c = statusColors[opt];
                  const isActive = status === opt;
                  return (
                    <button key={opt} onClick={() => setAvailability(prev => ({ ...prev, [day.d]: opt }))}
                      className="flex items-center justify-center py-2.5">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{
                          background: isActive ? c.bg : "transparent",
                          border: `1.5px solid ${isActive ? c.border : "var(--border)"}`,
                        }}>
                        {isActive && <Check size={12} style={{ color: c.text }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* General weekly note */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
            <StickyNote size={13} style={{ color: "var(--blue)" }} />
            <p className="text-sm font-semibold">הערות כלליות לשבוע</p>
          </div>
          <textarea
            value={weekNote}
            onChange={e => setWeekNote(e.target.value)}
            placeholder="לדוגמא: בשבוע הזה אני יכול רק עד 20:00, יש לי אירוע ביום שלישי..."
            rows={3}
            className="w-full text-sm text-right px-3 py-3 outline-none resize-none"
            style={{ background: "var(--surface)" }}
          />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl px-4 py-3" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold text-right mb-2">סיכום</p>
          <div className="flex flex-col gap-1">
            {days.map(d => {
              const s = availability[d.d] ?? "all";
              const c = statusColors[s];
              return (
                <div key={d.d} className="flex items-center justify-between flex-row">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: c.bg, color: c.text }}>{statusLabels[s]}</span>
                  <span className="text-xs font-medium">{d.label} {d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: submitting ? "#ADA89D" : "var(--navy)" }}>
          {submitting ? "שולח..." : "שלח אילוצים למנהל"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

type EmployeeRow = { id: string; name: string; initials: string; role: string; color: string; textColor: string };
type ConstraintEntry = { personId: string; name: string; availability: Record<number, DayStatus>; weekNote: string };

function ManagerConstraints() {
  const router = useRouter();
  const [days, setDays] = useState(allDays.slice(0, 6));
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [constraintsByPerson, setConstraintsByPerson] = useState<Record<string, ConstraintEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cfg = getEffectiveConfig();
    setDays(allDays.filter((_, i) => cfg.days[i]?.open));

    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
    } catch {}
    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [empRes, consRes] = await Promise.all([
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/constraints?businessId=${biz}&weekStart=${WEEK_START}`).then(r => r.json()),
        ]);
        if (empRes.success) setEmployees(empRes.employees);
        if (consRes.success) {
          const map: Record<string, ConstraintEntry> = {};
          consRes.people.forEach((p: ConstraintEntry) => { map[p.personId] = p; });
          setConstraintsByPerson(map);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const options: DayStatus[] = ["all", "morning", "evening", "off"];
  const submittedCount = employees.filter(e => constraintsByPerson[e.id]).length;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 flex-row"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()}>
          <ArrowRight size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 text-right">
          <p className="text-base font-semibold">אילוצי העובדים</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>שבוע 28.6–4.7</p>
        </div>
        <Logo size={22} />
      </div>

      <div className="px-4 py-4 flex flex-col gap-3 pb-28">
        {!loading && employees.length > 0 && (
          <div className="flex items-center justify-between flex-row">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: submittedCount === employees.length ? "var(--green-light)" : "var(--amber-light)", color: submittedCount === employees.length ? "var(--green)" : "var(--amber)" }}>
              {submittedCount}/{employees.length} הגישו
            </span>
            <div className="flex items-center gap-2 flex-row">
              <Users size={13} style={{ color: "var(--blue)" }} />
              <p className="text-sm font-semibold">סיכום אילוצים</p>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>טוען אילוצים...</p>
        )}

        {!loading && employees.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>אין עדיין עובדים בעסק</p>
        )}

        {employees.map(emp => {
          const entry = constraintsByPerson[emp.id];
          return (
            <div key={emp.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 px-3 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-semibold">{emp.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{emp.role}</p>
                </div>
                {!entry && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                    <AlertTriangle size={11} /> לא הוגש
                  </span>
                )}
              </div>

              {entry ? (
                <>
                  <div className="flex flex-row flex-wrap gap-1.5 px-3 py-2.5">
                    {days.map(d => {
                      const status = entry.availability[d.d] ?? "all";
                      const c = statusColors[status];
                      return (
                        <span key={d.d} className="text-[10px] px-2 py-1 rounded-full font-medium"
                          style={{ background: c.bg, color: c.text }}>
                          {d.label} · {shortLabels[status]}
                        </span>
                      );
                    })}
                  </div>
                  {entry.weekNote && (
                    <div className="flex items-start gap-2 px-3 py-2 flex-row" style={{ borderTop: "1px solid var(--border)", background: "var(--blue-light)" }}>
                      <StickyNote size={12} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
                      <p className="text-xs text-right" style={{ color: "var(--blue)" }}>{entry.weekNote}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs px-3 py-2.5 text-right" style={{ color: "var(--text-secondary)" }}>
                  לא שלח אילוצים — מניחים זמינות מלאה בכל המשמרות
                </p>
              )}
            </div>
          );
        })}

        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2 flex-row" style={{ border: "1px solid var(--border)" }}>
          <div className="flex-1 flex flex-row flex-wrap gap-1.5 justify-end">
            {options.map(opt => {
              const c = statusColors[opt];
              return (
                <span key={opt} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
                  {shortLabels[opt]}
                </span>
              );
            })}
          </div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>מקרא</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
