import type { LucideIcon } from "lucide-react";

// Every dashboard-style section used its own ad-hoc row of label + link/badge.
// One consistent header — icon in a tinted circle, title, optional trailing
// action — instead of each section inventing its own micro-layout.
export default function SectionHeader({ icon: Icon, title, action, tint = "var(--blue)", tintBg = "var(--blue-light)" }: {
  icon: LucideIcon; title: string; action?: React.ReactNode; tint?: string; tintBg?: string;
}) {
  return (
    <div className="flex items-center justify-between flex-row mb-2.5">
      {action}
      <div className="flex items-center gap-2 flex-row">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>{title}</p>
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: tintBg }}>
          <Icon size={12} style={{ color: tint }} />
        </div>
      </div>
    </div>
  );
}
