"use client";
import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/faq";

export default function FaqAccordion({ isManager }: { isManager: boolean }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const visibleFaqs = FAQ_ITEMS.filter(item => item.audience === "all" || isManager);

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
        <HelpCircle size={13} style={{ color: "var(--blue)" }} />
        <p className="text-sm font-semibold">שאלות נפוצות</p>
      </div>
      {visibleFaqs.map((item, i) => (
        <div key={item.q} style={{ borderBottom: i < visibleFaqs.length - 1 ? "1px solid var(--border)" : "none" }}>
          <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
            className="w-full flex items-center justify-between gap-2 px-3 py-3 flex-row">
            <ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
            <p className="flex-1 text-right text-sm font-medium">{item.q}</p>
          </button>
          {openFaq === i && (
            <p className="px-3 pb-3 text-xs text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
