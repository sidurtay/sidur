"use client";
import { Check } from "lucide-react";
import { SHIFT_BUCKET_LABEL, type ShiftBucketKey } from "@/lib/businessConfig";

type Day = { label: string; date: string; d: number };

// Compact days × shift-buckets grid of checkbox squares — the buckets shown
// (1, 2, or 3 columns) come from the business's shift-split setting, so a
// simple single-shift business sees one column while a bar with night shifts
// sees three. Used both as an editable form (employee submitting their own
// availability) and as a read-only summary (manager viewing an employee's).
export default function AvailabilityGrid({
  days, buckets, value, onToggle, readOnly = false,
}: {
  days: Day[];
  buckets: ShiftBucketKey[];
  value: Record<number, Set<ShiftBucketKey>>;
  onToggle?: (day: number, bucket: ShiftBucketKey) => void;
  readOnly?: boolean;
}) {
  const colWidth = buckets.length === 1 ? 60 : buckets.length === 2 ? 48 : 40;
  const gridTemplate = `1fr repeat(${buckets.length}, ${colWidth}px)`;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="grid items-center" style={{ gridTemplateColumns: gridTemplate, background: "var(--gray-bg)" }}>
        <span className="text-[10px] font-semibold text-right pr-3 py-2" style={{ color: "var(--text-secondary)" }}>יום</span>
        {buckets.map(b => (
          <span key={b} className="text-[9px] font-semibold text-center" style={{ color: "var(--text-secondary)" }}>
            {SHIFT_BUCKET_LABEL[b]}
          </span>
        ))}
      </div>
      {days.map((day, di) => {
        const selected = value[day.d] || new Set<ShiftBucketKey>();
        return (
          <div key={day.d} className="grid items-center"
            style={{ gridTemplateColumns: gridTemplate, borderTop: "1px solid var(--border)", background: di % 2 === 1 ? "var(--gray-bg)" : "transparent" }}>
            <div className="text-right pr-3 py-2">
              <p className="text-xs font-semibold">{day.label}</p>
              <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{day.date}</p>
            </div>
            {buckets.map(b => {
              const isActive = selected.has(b);
              return (
                <button key={b} type="button" disabled={readOnly}
                  onClick={() => onToggle?.(day.d, b)}
                  className="flex items-center justify-center py-2"
                  style={{ cursor: readOnly ? "default" : "pointer" }}>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                    style={{
                      background: isActive ? "var(--green-light)" : "transparent",
                      border: `1.5px solid ${isActive ? "var(--green-border)" : "var(--border)"}`,
                    }}>
                    {isActive && <Check size={11} style={{ color: "var(--green)" }} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
