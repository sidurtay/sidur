"use client";
import { X, StickyNote } from "lucide-react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { statusHasBucket, type ShiftBucketKey } from "@/lib/businessConfig";

type Day = { label: string; date: string; d: number };
type Employee = { id: string; name: string; role: string; initials: string; color: string; textColor: string };
type Entry = { availability: Record<number, string>; weekNote: string } | undefined;

// Centered "one employee's whole week" popup — shared by the manager's
// constraints page and the compact per-employee check from the schedule page
// (manual scheduling), so both read the exact same data the exact same way.
export default function EmployeeConstraintsModal({
  employee, entry, days, buckets, onClose,
}: {
  employee: Employee; entry: Entry; days: Day[]; buckets: ShiftBucketKey[]; onClose: () => void;
}) {
  const availability: Record<number, Set<ShiftBucketKey>> = {};
  if (entry) {
    days.forEach(d => {
      const set = new Set<ShiftBucketKey>();
      buckets.forEach(b => { if (statusHasBucket(entry.availability[d.d], b)) set.add(b); });
      availability[d.d] = set;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4" style={{ maxHeight: "80vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-row mb-3">
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-secondary)" }} /></button>
          <div className="flex items-center gap-2 flex-row">
            <div className="text-right">
              <p className="text-sm font-semibold">{employee.name}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{employee.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: employee.color, color: employee.textColor }}>{employee.initials}</div>
          </div>
        </div>

        {entry ? (
          <>
            <AvailabilityGrid days={days} buckets={buckets} value={availability} readOnly />
            {entry.weekNote && (
              <div className="flex items-start gap-2 px-3 py-2.5 mt-3 rounded-xl flex-row" style={{ background: "var(--blue-light)" }}>
                <StickyNote size={12} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs text-right" style={{ color: "var(--blue)" }}>{entry.weekNote}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
            לא שלח אילוצים לשבוע הזה — מניחים זמינות מלאה בכל המשמרות
          </p>
        )}
      </div>
    </div>
  );
}
