"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, StickyNote, AlertTriangle, Users, ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import EmployeeConstraintsModal from "@/components/EmployeeConstraintsModal";
import { getEffectiveConfig, bucketsForSplit, parseAvailabilityStatus, encodeAvailability, type ShiftSplit, type ShiftBucketKey } from "@/lib/businessConfig";

const allDays = [
  { label: "ראשון", date: "28.6", d: 0 },
  { label: "שני",   date: "29.6", d: 1 },
  { label: "שלישי", date: "30.6", d: 2 },
  { label: "רביעי", date: "1.7",  d: 3 },
  { label: "חמישי", date: "2.7",  d: 4 },
  { label: "שישי",  date: "3.7",  d: 5 },
  { label: "שבת",   date: "4.7",  d: 6 },
];

const WEEK_START = "2026-06-28"; // matches the "next week" the schedule + AI build for
const DAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

type BusinessMeta = { shiftSplit: ShiftSplit; deadlineDay: number | null; deadlineTime: string | null };

async function fetchBusinessMeta(businessId: string): Promise<BusinessMeta> {
  try {
    const res = await fetch(`/api/business?businessId=${businessId}`).then(r => r.json());
    return {
      shiftSplit: (res.business?.shiftSplit || "none") as ShiftSplit,
      deadlineDay: res.business?.constraintsDeadlineDay ?? null,
      deadlineTime: res.business?.constraintsDeadlineTime ?? null,
    };
  } catch {
    return { shiftSplit: "none", deadlineDay: null, deadlineTime: null };
  }
}

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
  const [buckets, setBuckets] = useState<ShiftBucketKey[]>(["morning"]);
  const [availability, setAvailability] = useState<Record<number, Set<ShiftBucketKey>>>({});
  const [bizHours, setBizHours] = useState<Record<number, { from: string; to: string }>>({});
  const [weekNote, setWeekNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [deadline, setDeadline] = useState<{ day: number; time: string } | null>(null);

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

      (async () => {
        const meta = await fetchBusinessMeta(session.businessId);
        const bucketList = bucketsForSplit(meta.shiftSplit);
        setBuckets(bucketList);
        if (meta.deadlineDay != null && meta.deadlineTime) setDeadline({ day: meta.deadlineDay, time: meta.deadlineTime });

        // Default: fully available (within the buckets this business actually has)
        // on every open day, until real data loads (or the user edits it) — using
        // only the valid buckets here matters, otherwise unchecking the sole
        // visible column on a single-shift business wouldn't actually clear the
        // day, since a bucket outside bucketsForSplit would silently stay set.
        const defaultAvailability: Record<number, Set<ShiftBucketKey>> = {};
        openDays.forEach(d => { defaultAvailability[d.d] = new Set(bucketList); });
        setAvailability(defaultAvailability);

        // Pre-fill with whatever was already submitted for this week, if anything
        try {
          const data = await fetch(`/api/constraints?businessId=${session.businessId}&personId=${session.personId}&weekStart=${WEEK_START}`).then(r => r.json());
          if (data.success && Object.keys(data.availability).length > 0) {
            const parsed: Record<number, Set<ShiftBucketKey>> = {};
            openDays.forEach(d => { parsed[d.d] = parseAvailabilityStatus(data.availability[d.d], meta.shiftSplit); });
            setAvailability(parsed);
            setWeekNote(data.weekNote || "");
          }
        } catch {}
        setLoaded(true);
      })();
    } catch { router.replace("/login"); }
  }, []);

  function toggle(day: number, bucket: ShiftBucketKey) {
    setAvailability(prev => {
      const next = new Set(prev[day] || []);
      if (next.has(bucket)) next.delete(bucket); else next.add(bucket);
      return { ...prev, [day]: next };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const encoded: Record<number, string> = {};
      Object.entries(availability).forEach(([day, set]) => { encoded[Number(day)] = encodeAvailability(set); });
      await fetch("/api/constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, personId, weekStart: WEEK_START, availability: encoded, weekNote, callerId: personId }),
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
          סמן/י את המשמרות שבהן את/ה זמין/ה בכל יום. המנהל יראה ויבנה סידור בהתאם.
        </p>

        {deadline && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl flex-row" style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
            <AlertTriangle size={14} style={{ color: "var(--amber)", flexShrink: 0 }} />
            <p className="flex-1 text-xs text-right" style={{ color: "var(--amber)" }}>
              יש להגיש עד יום {DAY_LABELS[deadline.day]}, {deadline.time}
            </p>
          </div>
        )}

        {loaded && (
          <AvailabilityGrid
            days={days.map(d => ({ ...d, date: bizHours[d.d] ? `${d.date} · ${bizHours[d.d].from}–${bizHours[d.d].to}` : d.date }))}
            buckets={buckets}
            value={availability}
            onToggle={toggle}
          />
        )}

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

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: submitting ? "var(--border)" : "var(--navy)" }}>
          {submitting ? "שולח..." : "שלח אילוצים למנהל"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

type EmployeeRow = { id: string; name: string; initials: string; role: string; color: string; textColor: string };
type ConstraintEntry = { personId: string; name: string; availability: Record<number, string>; weekNote: string };

function ManagerConstraints() {
  const router = useRouter();
  const [days, setDays] = useState(allDays.slice(0, 6));
  const [buckets, setBuckets] = useState<ShiftBucketKey[]>(["morning"]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [constraintsByPerson, setConstraintsByPerson] = useState<Record<string, ConstraintEntry>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeRow | null>(null);

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
        const [empRes, consRes, meta] = await Promise.all([
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/constraints?businessId=${biz}&weekStart=${WEEK_START}`).then(r => r.json()),
          fetchBusinessMeta(biz),
        ]);
        if (empRes.success) setEmployees(empRes.employees);
        if (consRes.success) {
          const map: Record<string, ConstraintEntry> = {};
          consRes.people.forEach((p: ConstraintEntry) => { map[p.personId] = p; });
          setConstraintsByPerson(map);
        }
        setBuckets(bucketsForSplit(meta.shiftSplit));
      } catch {}
      setLoading(false);
    })();
  }, []);

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
              <p className="text-sm font-semibold">אילוצי הצוות</p>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>טוען אילוצים...</p>
        )}

        {!loading && employees.length === 0 && (
          <div className="text-center py-10 px-8">
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>קודם מוסיפים צוות 👥</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>אחרי שתוסיף עובדים בעמוד &quot;עובדים&quot;, תוכל לנהל כאן את האילוצים שלהם.</p>
          </div>
        )}

        {/* Compact employee list — tap a row to see their full week */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {employees.map((emp, i) => {
            const entry = constraintsByPerson[emp.id];
            return (
              <button key={emp.id} onClick={() => setSelected(emp)}
                className="w-full flex items-center gap-3 px-3 py-3 flex-row"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <ChevronLeft size={15} style={{ color: "var(--text-secondary)" }} />
                <div className="flex-1 text-right">
                  <p className="text-sm font-semibold">{emp.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{emp.role}</p>
                </div>
                {entry ? (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: "var(--green-light)", color: "var(--green)" }}>
                    <Check size={11} /> הוגש
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: "var(--amber-light)", color: "var(--amber)" }}>
                    <AlertTriangle size={11} /> לא הוגש
                  </span>
                )}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ background: emp.color, color: emp.textColor }}>{emp.initials}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail popup — one employee's full week, compact grid of squares, centered */}
      {selected && (
        <EmployeeConstraintsModal
          employee={selected}
          entry={constraintsByPerson[selected.id]}
          days={days}
          buckets={buckets}
          onClose={() => setSelected(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
