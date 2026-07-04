"use client";
import { useState, useEffect } from "react";
import { CalendarClock, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

const DAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// Optional weekly deadline for employees to submit their availability
// constraints — shown as a banner on their form once set. "ללא דדליין" turns
// it off entirely (null on the business), so this stays a nice-to-have, not
// something every business is forced to configure.
export default function ConstraintsDeadlineCard({ businessId, callerId }: { businessId: string; callerId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [day, setDay] = useState(4); // Thursday — the natural "before next week's roster" cutoff
  const [time, setTime] = useState("20:00");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/business?businessId=${businessId}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) return;
        const b = res.business;
        if (b.constraintsDeadlineDay != null && b.constraintsDeadlineTime) {
          setEnabled(true);
          setDay(b.constraintsDeadlineDay);
          setTime(b.constraintsDeadlineTime);
        }
      })
      .catch(() => {});
  }, [businessId]);

  async function save(nextEnabled: boolean, nextDay = day, nextTime = time) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/business", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, callerId,
          constraintsDeadlineDay: nextEnabled ? nextDay : null,
          constraintsDeadlineTime: nextEnabled ? nextTime : null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div>
      <SectionHeader icon={CalendarClock} title="דדליין להגשת אילוצים" />
      <Card padded={false}>
        <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-row">
          <button onClick={() => { const next = !enabled; setEnabled(next); save(next); }} className="relative flex-shrink-0"
            style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? "var(--navy)" : "var(--border)", transition: "background 0.2s" }}>
            <span className="absolute top-1 rounded-full bg-white transition-all"
              style={{ width: 14, height: 14, right: enabled ? 3 : 19, transition: "right 0.2s" }} />
          </button>
          <p className="text-sm font-semibold">הצג דדליין לעובדים</p>
        </div>

        {enabled && (
          <div className="flex items-center gap-2 px-3 pb-3 flex-row">
            <input
              type="time" value={time}
              onChange={e => { setTime(e.target.value); }}
              onBlur={() => save(true, day, time)}
              className="text-xs px-2 py-2 rounded-xl"
              style={{ border: "1px solid var(--border)", direction: "ltr", color: "var(--text-main)" }}
            />
            <select value={day}
              onChange={e => { const d = Number(e.target.value); setDay(d); save(true, d, time); }}
              className="flex-1 text-xs px-2 py-2 rounded-xl text-right"
              style={{ border: "1px solid var(--border)", color: "var(--text-main)", background: "#fff" }}>
              {DAY_LABELS.map((label, i) => <option key={i} value={i}>יום {label}</option>)}
            </select>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 flex-row" style={{ color: "var(--green)" }}>
                <Check size={13} /> נשמר
              </span>
            )}
          </div>
        )}

        <p className="text-[10px] px-3 pb-2.5 text-right" style={{ color: "var(--text-secondary)" }}>
          {saving ? "שומר..." : "העובדים יראו \"יש להגיש עד...\" בעמוד האילוצים שלהם. לא חוסם הגשה מאוחרת."}
        </p>
      </Card>
    </div>
  );
}
