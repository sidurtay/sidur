"use client";
import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Search, Fingerprint, Clock, Bot, Users, CalendarCog, LucideIcon } from "lucide-react";
import { FAQ_ITEMS, FAQ_CATEGORY_LABEL, type FaqCategory } from "@/lib/faq";

const CATEGORY_ICON: Record<FaqCategory, LucideIcon> = {
  attendance: Clock,
  account: Fingerprint,
  "ai-assistant": Bot,
  team: Users,
  "ai-scheduler": CalendarCog,
};

export default function FaqAccordion({ isManager }: { isManager: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const visible = FAQ_ITEMS.filter(item => item.audience === "all" || isManager);
    const term = search.trim();
    const filtered = term ? visible.filter(item => item.q.includes(term) || item.a.includes(term)) : visible;

    const order: FaqCategory[] = ["attendance", "account", "ai-assistant", "team", "ai-scheduler"];
    return order
      .map(cat => ({ cat, items: filtered.filter(item => item.category === cat) }))
      .filter(g => g.items.length > 0);
  }, [isManager, search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1 flex-row">
        <HelpCircle size={15} style={{ color: "var(--blue)" }} />
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>שאלות נפוצות</p>
      </div>

      <div className="relative flex items-center">
        <Search size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש/י שאלה..."
          className="w-full pr-10 pl-3 py-2.5 rounded-xl text-sm text-right outline-none transition-shadow"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
        />
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
          לא נמצאו שאלות תואמות ל-&quot;{search}&quot;
        </p>
      )}

      {groups.map(({ cat, items }) => {
        const Icon = CATEGORY_ICON[cat];
        return (
          <div key={cat} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 px-3.5 py-2.5 flex-row" style={{ background: "var(--gray-bg)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.12)" }}>
                <Icon size={12} style={{ color: "var(--blue)" }} />
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>{FAQ_CATEGORY_LABEL[cat]}</p>
            </div>
            {items.map((item, i) => {
              const key = `${cat}-${i}`;
              const open = openKey === key;
              return (
                <div key={key} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <button onClick={() => setOpenKey(open ? null : key)}
                    className="w-full flex items-center justify-between gap-2.5 px-3.5 py-3.5 flex-row">
                    <ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                    <p className="flex-1 text-right text-sm font-medium leading-snug" style={{ color: "var(--text-main)" }}>{item.q}</p>
                  </button>
                  {open && (
                    <p className="px-3.5 pb-4 text-xs text-right leading-relaxed animate-fade-slide-up" style={{ color: "var(--text-secondary)" }}>
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
