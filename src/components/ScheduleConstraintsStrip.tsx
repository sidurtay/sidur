"use client";
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import EmployeeConstraintsModal from "@/components/EmployeeConstraintsModal";
import { bucketsForSplit, type ShiftSplit, type ShiftBucketKey } from "@/lib/businessConfig";

type Day = { label: string; date: string; d: number };
type Employee = { id: string; name: string; role: string; initials: string; color: string; textColor: string };
type ConstraintEntry = { availability: Record<number, string>; weekNote: string };

// A tiny, always-visible row of employee avatars above the manual schedule —
// for managers who build the week by hand instead of using the AI builder.
// Each avatar carries a small "!" (not submitted) or "✓" (submitted) badge;
// tapping one opens that person's whole week read-only, so you can check
// constraints one employee at a time without leaving the schedule screen.
// Deliberately tiny — a single scrollable row, no labels, nothing that
// competes with the schedule grid itself.
export default function ScheduleConstraintsStrip({
  businessId, weekStart, employees, shiftSplit,
}: {
  businessId: string; weekStart: string; employees: Employee[]; shiftSplit: ShiftSplit;
}) {
  const [days, setDays] = useState<Day[]>([]);
  const [constraintsByPerson, setConstraintsByPerson] = useState<Record<string, ConstraintEntry>>({});
  const [selected, setSelected] = useState<Employee | null>(null);

  useEffect(() => {
    if (!businessId) return;
    // Days shown in the popup mirror the week currently open in the schedule —
    // reconstructed from weekStart the same way the constraints page does.
    const start = new Date(`${weekStart}T00:00:00Z`);
    const dayLetters = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    setDays(dayLetters.map((label, d) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + d);
      return { label, date: `${date.getUTCDate()}.${date.getUTCMonth() + 1}`, d };
    }));

    fetch(`/api/constraints?businessId=${businessId}&weekStart=${weekStart}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) return;
        const map: Record<string, ConstraintEntry> = {};
        res.people.forEach((p: { personId: string; availability: Record<number, string>; weekNote: string }) => {
          map[p.personId] = { availability: p.availability, weekNote: p.weekNote };
        });
        setConstraintsByPerson(map);
      })
      .catch(() => {});
  }, [businessId, weekStart]);

  if (employees.length === 0) return null;
  const buckets = bucketsForSplit(shiftSplit);

  return (
    <>
      <div className="flex flex-row gap-2 overflow-x-auto px-1 py-1.5 constraints-strip-scroll">
        {employees.map(emp => {
          const submitted = !!constraintsByPerson[emp.id];
          return (
            <button key={emp.id} onClick={() => setSelected(emp)} className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ background: emp.color, color: emp.textColor }}>
                {emp.initials}
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: submitted ? "var(--green)" : "var(--amber)", border: "1.5px solid var(--gray-bg)" }}>
                {submitted ? (
                  <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, lineHeight: 1 }}>✓</span>
                ) : (
                  <AlertCircle size={8} color="#fff" strokeWidth={3} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <EmployeeConstraintsModal
          employee={selected}
          entry={constraintsByPerson[selected.id]}
          days={days}
          buckets={buckets}
          onClose={() => setSelected(null)}
        />
      )}

      <style jsx>{`
        .constraints-strip-scroll { scrollbar-width: none; }
        .constraints-strip-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
