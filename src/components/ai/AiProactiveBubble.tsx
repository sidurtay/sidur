"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

type Session = { businessId: string; personId: string; name: string; businessName: string; isManager: boolean };
type Bubble = { key: string; text: string; askMessage: string };

const EMPLOYEE_GENERIC: { key: string; text: string; askMessage: string }[] = [
  { key: "generic-hours", text: "רוצה לדעת כמה שעות עשית החודש? 🕐", askMessage: "כמה שעות עבדתי החודש?" },
  { key: "generic-shifts", text: "יש לך משמרות קרובות — רוצה לראות מתי? 📅", askMessage: "מה המשמרות הקרובות שלי?" },
];
const MANAGER_GENERIC: { key: string; text: string; askMessage: string }[] = [
  { key: "generic-mgr-schedule", text: "רוצה שאבדוק מי עובד היום? 👀", askMessage: "מי עובד היום?" },
  { key: "generic-mgr-pending", text: "רוצה לראות אם יש בקשות ממתינות? 🔔", askMessage: "יש בקשות ממתינות?" },
];

const POLL_MS = 75_000;
const FIRST_DELAY_MS = 7_000;
const VISIBLE_MS = 10_000;
// Roughly how often a generic (non-real) prompt is allowed to show, so the
// little popup doesn't feel like it's nagging when there's nothing real to say.
const GENERIC_CHANCE = 0.4;

export default function AiProactiveBubble({ session, onOpenWithMessage }: { session: Session; onOpenWithMessage: (msg: string) => void }) {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const shown = useRef<Set<string>>(new Set());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function checkForSomethingToSay() {
    const candidates: Bubble[] = [];

    try {
      if (session.isManager) {
        const swapRes = await fetch(`/api/swap-requests?businessId=${session.businessId}`).then(r => r.json());
        if (swapRes.success) {
          const pending = swapRes.requests.filter((r: { status: string }) => r.status === "pending");
          if (pending.length > 0) {
            candidates.push({
              key: `mgr-pending-${pending.length}`,
              text: pending.length === 1 ? "יש בקשת החלפה אחת שממתינה לאישור שלך 🔔" : `יש ${pending.length} בקשות החלפה שממתינות לאישור שלך 🔔`,
              askMessage: "בקשות ממתינות",
            });
          }
        }
      } else {
        const [swapRes, annRes] = await Promise.all([
          fetch(`/api/swap-requests?businessId=${session.businessId}`).then(r => r.json()),
          fetch(`/api/announcements?businessId=${session.businessId}`).then(r => r.json()),
        ]);
        if (swapRes.success) {
          const askedOfMe = swapRes.requests.find((r: { status: string; proposedPerson?: string }) =>
            r.status === "pending" && r.proposedPerson === session.personId
          );
          if (askedOfMe) {
            candidates.push({
              key: `swap-${askedOfMe.id}`,
              text: "ביקשו ממך להחליף משמרת — רוצה לאשר או לדחות? 🔄",
              askMessage: "ביקשו ממני להחליף משמרת",
            });
          }
        }
        if (annRes.success) {
          const firstName = session.name.split(" ")[0];
          const unconfirmed = annRes.announcements.find((a: { confirmedBy: string[] }) =>
            !a.confirmedBy.includes(session.name) && !a.confirmedBy.includes(firstName)
          );
          if (unconfirmed) {
            candidates.push({
              key: `ann-${unconfirmed.id}`,
              text: "יש הודעה חדשה מהמנהל — רוצה לראות? 📢",
              askMessage: "יש הודעות חדשות?",
            });
          }
        }
        try {
          const stored = JSON.parse(localStorage.getItem("shiftpro_tips_notifications") || "[]");
          const mine = stored.find((n: { workers?: string[]; id: string | number }) => !n.workers || n.workers.includes(session.name));
          if (mine) {
            candidates.push({
              key: `tips-${mine.id}`,
              text: "הטיפים של היום פורסמו — רוצה לדעת כמה עשית? 💰",
              askMessage: "כמה טיפים עשיתי היום?",
            });
          }
        } catch {}
      }
    } catch {}

    const next = candidates.find(c => !shown.current.has(c.key));
    if (next) return next;

    if (Math.random() < GENERIC_CHANCE) {
      const pool = session.isManager ? MANAGER_GENERIC : EMPLOYEE_GENERIC;
      const fresh = pool.filter(g => !shown.current.has(g.key));
      if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)];
      // Everything's been shown this session — recycle occasionally rather than going silent forever.
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return null;
  }

  function showBubble(b: Bubble) {
    shown.current.add(b.key);
    setBubble(b);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBubble(null), VISIBLE_MS);
  }

  useEffect(() => {
    let cancelled = false;
    const firstTimer = setTimeout(async () => {
      const b = await checkForSomethingToSay();
      if (!cancelled && b) showBubble(b);
    }, FIRST_DELAY_MS);

    const interval = setInterval(async () => {
      const b = await checkForSomethingToSay();
      if (!cancelled && b) showBubble(b);
    }, POLL_MS);

    return () => { cancelled = true; clearTimeout(firstTimer); clearInterval(interval); if (hideTimer.current) clearTimeout(hideTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.businessId, session.personId]);

  if (!bubble) return null;

  return (
    <div
      role="button"
      onClick={() => { onOpenWithMessage(bubble.askMessage); setBubble(null); }}
      className="ai-proactive-bubble"
      style={{
        position: "fixed",
        bottom: 156,
        right: 16,
        zIndex: 61,
        maxWidth: 230,
        background: "#fff",
        borderRadius: 16,
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(20,24,31,0.22)",
        border: "1px solid rgba(249,115,22,0.25)",
        direction: "rtl",
        cursor: "pointer",
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); setBubble(null); }}
        style={{ position: "absolute", top: -6, left: -6, width: 18, height: 18, borderRadius: "50%", background: "#1A1F29", display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="סגור"
      >
        <X size={10} color="#fff" />
      </button>
      <p className="text-xs font-semibold text-right leading-relaxed" style={{ color: "#1F2937" }}>{bubble.text}</p>

      <style jsx>{`
        .ai-proactive-bubble {
          animation: ai-bubble-in 0.25s ease-out;
        }
        .ai-proactive-bubble::after {
          content: "";
          position: absolute;
          bottom: -6px;
          right: 22px;
          width: 12px;
          height: 12px;
          background: #fff;
          border-left: 1px solid rgba(249,115,22,0.25);
          border-bottom: 1px solid rgba(249,115,22,0.25);
          transform: rotate(-45deg);
        }
        @keyframes ai-bubble-in {
          0% { opacity: 0; transform: translateY(6px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
