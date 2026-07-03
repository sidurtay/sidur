"use client";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";

// Wraps a dashboard card so it can be reordered in edit mode. Outside edit
// mode it renders the card untouched (zero visual overhead). In edit mode it
// adds a small control bar (label + up/down arrows) and disables interaction
// with the card itself so taps go to the reorder controls, not the card.
export default function EditableSection({
  editing, label, isFirst, isLast, onUp, onDown, children,
}: {
  editing: boolean; label: string; isFirst: boolean; isLast: boolean;
  onUp: () => void; onDown: () => void; children: React.ReactNode;
}) {
  if (!editing) return <>{children}</>;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ outline: "2px dashed var(--blue-border)", outlineOffset: 2 }}>
      <div className="flex items-center justify-between px-2.5 py-1.5 flex-row" style={{ background: "var(--blue-light)" }}>
        <div className="flex items-center gap-1 flex-row">
          <button onClick={onUp} disabled={isFirst}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: isFirst ? "transparent" : "#fff", opacity: isFirst ? 0.3 : 1 }}>
            <ChevronUp size={15} style={{ color: "var(--blue)" }} />
          </button>
          <button onClick={onDown} disabled={isLast}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: isLast ? "transparent" : "#fff", opacity: isLast ? 0.3 : 1 }}>
            <ChevronDown size={15} style={{ color: "var(--blue)" }} />
          </button>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold flex-row" style={{ color: "var(--blue)" }}>
          {label} <GripVertical size={12} />
        </span>
      </div>
      <div style={{ pointerEvents: "none" }}>{children}</div>
    </div>
  );
}
