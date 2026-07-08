import { Clock, Coins, Users, CalendarOff, Phone, UserCheck, CalendarDays, ArrowLeftRight, Bell, Check, Info, PartyPopper } from "lucide-react";
import type { AnyCard } from "@/lib/ai/cards";

const STATUS_LABEL: Record<string, string> = { all: "כל היום", morning: "בוקר", evening: "ערב" };
const LIST_ICON = { shifts: CalendarDays, swap: ArrowLeftRight, pending: Bell };

const PALETTE = ["#F97316", "#FBBF24", "#34D399", "#60A5FA", "#F472B6", "#A78BFA"];
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function ChatCard({ card }: { card: AnyCard }) {
  if (card.type === "roster") {
    return (
      <div className="w-full max-w-[85%] rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--blue-border)" }}>
        <div className="flex items-center gap-1.5 px-3.5 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
          <Users size={13} style={{ color: "#F97316" }} />
          <p className="text-xs font-bold" style={{ color: "var(--navy)" }}>{card.label}</p>
        </div>
        {card.people.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>אף אחד לא משובץ</p>
        ) : (
          <div className="flex flex-col">
            {card.people.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 flex-row"
                style={{ borderBottom: i < card.people.length - 1 ? "1px solid var(--border)" : "none" }}>
                <p className="text-[11px] flex-shrink-0" style={{ color: "var(--text-secondary)", direction: "ltr" }}>{p.timeIn}–{p.timeOut}</p>
                <div className="flex-1 text-right">
                  <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{p.role}</p>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: colorFor(p.name), color: "#1A1F29" }}>
                  {p.initials}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (card.type === "hours") {
    return (
      <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))", border: "1px solid var(--blue-border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue-light)" }}>
          <Clock size={16} style={{ color: "#F97316" }} />
        </div>
        <div className="flex-1 text-right">
          <p className="text-lg font-bold" style={{ color: "var(--navy)" }}>{card.totalHours} שעות</p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{card.shiftsCount} משמרות · {card.periodLabel}</p>
        </div>
      </div>
    );
  }

  if (card.type === "tips") {
    return (
      <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
        style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.02))", border: "1px solid var(--green-border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--green-light)" }}>
          <Coins size={16} style={{ color: "#34D399" }} />
        </div>
        <div className="flex-1 text-right">
          <p className="text-lg font-bold" style={{ color: "var(--navy)" }}>₪{card.amount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{card.label}</p>
        </div>
      </div>
    );
  }

  if (card.type === "holiday") {
    return (
      <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
        style={{ background: "linear-gradient(135deg, rgba(244,114,182,0.12), rgba(244,114,182,0.02))", border: "1px solid rgba(244,114,182,0.35)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,114,182,0.16)" }}>
          <PartyPopper size={16} style={{ color: "#F472B6" }} />
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{card.holidayName} בעוד {card.daysAway} ימים ({card.dateLabel})</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            מתוכננות רק {card.scheduledCount} משמרות ל-{card.dateLabel}, פחות מהרגיל (~{card.typicalCount}) — יום עמוס בדרך כלל, כדאי לתגבר
          </p>
        </div>
      </div>
    );
  }

  if (card.type === "availability") {
    return (
      <div className="w-full max-w-[85%] rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--blue-border)" }}>
        <div className="flex items-center gap-1.5 px-3.5 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
          <UserCheck size={13} style={{ color: "#F97316" }} />
          <p className="text-xs font-bold" style={{ color: "var(--navy)" }}>זמינים ל-{card.dateLabel}</p>
        </div>
        {card.people.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>אף אחד לא סימן זמינות</p>
        ) : (
          <div className="flex flex-col">
            {card.people.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 flex-row"
                style={{ borderBottom: i < card.people.length - 1 ? "1px solid var(--border)" : "none" }}>
                <a href={`tel:${p.phone}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--green-light)" }}>
                  <Phone size={13} style={{ color: "#34D399" }} />
                </a>
                <div className="flex-1 text-right">
                  <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>פנוי/ה · {STATUS_LABEL[p.status] || p.status}</p>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: colorFor(p.name), color: "#1A1F29" }}>
                  {p.initials}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (card.type === "list") {
    const ListIcon = LIST_ICON[card.icon];
    return (
      <div className="w-full max-w-[85%] rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--blue-border)" }}>
        <div className="flex items-center gap-1.5 px-3.5 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
          <ListIcon size={13} style={{ color: "#F97316" }} />
          <p className="text-xs font-bold" style={{ color: "var(--navy)" }}>{card.title}</p>
        </div>
        <div className="flex flex-col">
          {card.items.map((it, i) => (
            <div key={i} className="px-3.5 py-2.5 text-right"
              style={{ borderBottom: i < card.items.length - 1 ? "1px solid var(--border)" : "none" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{it.primary}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{it.secondary}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === "confirm") {
    const success = card.tone === "success";
    return (
      <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
        style={{
          background: success ? "linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.02))" : "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))",
          border: `1px solid ${success ? "var(--green-border)" : "var(--blue-border)"}`,
        }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: success ? "var(--green-light)" : "var(--blue-light)" }}>
          {success ? <Check size={16} style={{ color: "#34D399" }} /> : <Info size={16} style={{ color: "#F97316" }} />}
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{card.title}</p>
          {card.subtitle && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{card.subtitle}</p>}
        </div>
      </div>
    );
  }

  // shift card
  if (!("role" in card)) {
    return (
      <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))", border: "1px solid var(--blue-border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue-light)" }}>
          <CalendarOff size={16} style={{ color: "var(--blue)" }} />
        </div>
        <p className="text-xs flex-1 text-right" style={{ color: "var(--text-secondary)" }}>אין לך משמרת היום</p>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[85%] rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-row"
      style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))", border: "1px solid var(--blue-border)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue-light)" }}>
        <Clock size={16} style={{ color: "#F97316" }} />
      </div>
      <div className="flex-1 text-right">
        <p className="text-sm font-bold" style={{ color: "var(--navy)", direction: "ltr" }}>{card.timeIn}–{card.timeOut}</p>
        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>המשמרת שלך היום · {card.role}</p>
      </div>
    </div>
  );
}
