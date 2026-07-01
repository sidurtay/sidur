"use client";
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Manager-only monthly payroll/accountant export — hours, wage, and tips per
// employee as a CSV, so this doesn't require anyone to manually add up hours
// from the schedule at month-end.
export default function PayrollExportCard({ businessId, callerId }: { businessId: string; callerId: string }) {
  const [month, setMonth] = useState(currentMonthValue());

  return (
    <div>
      <SectionHeader icon={FileSpreadsheet} title="דוח שכר חודשי" />
      <Card padded={false}>
        <div className="flex items-center gap-2 px-3 py-3 flex-row">
          <a
            href={`/api/payroll/export?businessId=${businessId}&month=${month}&callerId=${callerId}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white text-center"
            style={{ background: "var(--navy)" }}
          >
            הורד CSV
          </a>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-xl"
            style={{ border: "1px solid var(--border)", direction: "ltr", color: "var(--text-main)" }}
          />
        </div>
        <p className="text-[10px] px-3 pb-2.5 text-right" style={{ color: "var(--text-secondary)" }}>
          שעות עבודה, שכר וטיפים לכל עובד — מוכן לשליחה לרואה החשבון או פתיחה ב-Excel.
        </p>
      </Card>
    </div>
  );
}
