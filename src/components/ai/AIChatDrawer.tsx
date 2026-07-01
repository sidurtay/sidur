"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Send, ArrowLeft, Clock, Coins, ArrowLeftRight, ShieldCheck, LucideIcon } from "lucide-react";
import { QUICK_ACTION_GROUPS } from "@/lib/ai/intentMatcher";
import AiWalker from "./AiWalker";
import ScheduleBuilderChat from "./ScheduleBuilderChat";
import { ChatCard } from "./ChatCards";
import type { AnyCard, ShiftCard, HoursCard, TipsCard } from "@/lib/ai/cards";

const GROUP_ICON: Record<string, LucideIcon> = {
  hours: Clock,
  tips: Coins,
  leave: ArrowLeftRight,
  manager: ShieldCheck,
};

type Action = { label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; action?: Action; card?: AnyCard };
type Snapshot = { shift: ShiftCard; hours: HoursCard | null; tips: TipsCard | null };

type Session = { businessId: string; personId: string; name: string; businessName: string; isManager: boolean };

export default function AIChatDrawer({ session, initialMessage, onConsumedInitialMessage, onClose }: {
  session: Session; initialMessage?: string | null; onConsumedInitialMessage?: () => void; onClose: () => void;
}) {
  const [wizardActive, setWizardActive] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  const sentInitialRef = useRef(false);

  const groups = QUICK_ACTION_GROUPS.filter(g => !g.managerOnly || session.isManager);
  // Flattened into one scrollable strip (with each prompt's category icon
  // attached) instead of a tabbed grid — a persistent carousel above the
  // composer that's always there to tap, not just before the first message.
  const carouselPrompts = groups.flatMap(g => g.prompts.map(p => ({ text: p, icon: GROUP_ICON[g.key] })));
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch(`/api/ai/snapshot?businessId=${session.businessId}&personId=${session.personId}`)
      .then(r => r.json())
      .then(res => { if (res.success) setSnapshot({ shift: res.shift, hours: res.hours, tips: res.tips }); })
      .catch(() => {});
  }, [session.businessId, session.personId]);

  useEffect(() => {
    // Guards against a race where the user sends a message (optimistically appended
    // to `messages`) before this history fetch resolves — without this check, the
    // late `.then` would clobber that in-flight message with the stale fetched history.
    fetch(`/api/ai/chat?businessId=${session.businessId}&personId=${session.personId}`)
      .then(r => r.json())
      .then(res => {
        if (sentRef.current) return;
        if (res.success && res.history.length > 0) {
          setMessages(res.history.map((h: { role: "user" | "assistant"; content: string }) => ({ role: h.role, content: h.content })));
        } else {
          setMessages([{ role: "assistant", content: `היי ${session.name.split(" ")[0]}! 👋 איך אפשר לעזור?` }]);
        }
      })
      .catch(() => {
        if (!sentRef.current) setMessages([{ role: "assistant", content: "היי! איך אפשר לעזור? 👋" }]);
      })
      .finally(() => setLoadingHistory(false));
  }, [session.businessId, session.personId, session.name]);

  useEffect(() => {
    if (!initialMessage || sentInitialRef.current) return;
    sentInitialRef.current = true;
    send(initialMessage);
    onConsumedInitialMessage?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    sentRef.current = true;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: session.businessId, personId: session.personId, message: text,
          isManager: session.isManager, employeeName: session.name, businessName: session.businessName,
        }),
      }).then(r => r.json());

      if (res.success) {
        setMessages(prev => [...prev, { role: "assistant", content: res.reply, action: res.action, card: res.card }]);
      } else {
        setError(res.error || "משהו נכשל, נסה שוב");
      }
    } catch {
      setError("שגיאת רשת — נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  // The snapshot only makes sense before a real conversation starts — once the
  // person has sent something, this becomes a normal chat thread.
  const showSnapshot = !loadingHistory && !loading && messages.length <= 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "rgba(20,24,31,0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg flex flex-col"
        style={{
          background: "#1A1F29",
          borderRadius: "22px 22px 0 0",
          height: "80vh",
          direction: "rtl",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "rgba(249,115,22,0.35)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-row"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(249,115,22,0.06), transparent)" }}>
          <button onClick={onClose} className="p-1">
            <X size={18} style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
          <div className="flex items-center gap-2 flex-row">
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: "#fff" }}>עוזר AI · Sidur</p>
              <p className="text-[10px] flex items-center gap-1 justify-end" style={{ color: "rgba(255,255,255,0.45)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
                מחובר ומוכן לעזור
              </p>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: "1.5px solid rgba(249,115,22,0.45)" }}>
              <Image src="/ai-character.png" alt="" width={32} height={32} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>

        {wizardActive && session.isManager ? (
          <ScheduleBuilderChat onDone={onClose} />
        ) : (
          <>
            {/* Messages */}
            <div className="ai-chat-scroll flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {loadingHistory ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="h-8 w-2/3 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-8 w-1/2 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-start" : "items-end"}`}>
                    {m.card ? (
                      <ChatCard card={m.card} />
                    ) : (
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap"
                        style={m.role === "user"
                          ? { background: "rgba(255,255,255,0.08)", color: "#fff" }
                          : { background: "linear-gradient(150deg, #FFF7ED, #FFFFFF)", color: "#1F2937" }}
                      >
                        {m.content}
                      </div>
                    )}
                    {m.action && session.isManager && (
                      <button
                        onClick={() => setWizardActive(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold flex-row"
                        style={{ background: "#F97316", color: "#fff" }}
                      >
                        <ArrowLeft size={13} />
                        {m.action.label}
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Proactive snapshot — today's shift, hours this week, tips today,
                  shown as cards immediately with zero typing. This is what makes
                  opening the assistant feel like a mini dashboard, not a blank
                  chat prompt waiting for a question. */}
              {showSnapshot && snapshot && (
                <div className="flex flex-col items-end gap-2 mt-1">
                  <ChatCard card={snapshot.shift} />
                  {snapshot.hours && <ChatCard card={snapshot.hours} />}
                  {snapshot.tips && <ChatCard card={snapshot.tips} />}
                </div>
              )}

              {loading && <AiWalker />}
              {error && (
                <p className="text-xs text-center" style={{ color: "#F87171" }}>{error}</p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Question carousel — a persistent horizontally-scrollable strip of
                things the assistant can answer, always available above the
                composer (not just before the first message) so it stays useful
                mid-conversation instead of disappearing after one question. */}
            <div className="ai-chat-carousel flex flex-row gap-2 px-4 pt-2.5 pb-1 overflow-x-auto"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {carouselPrompts.map(({ text, icon: Icon }) => (
                <button key={text} onClick={() => send(text)} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-row flex-shrink-0"
                  style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#FDBA74", opacity: loading ? 0.5 : 1 }}>
                  {Icon && <Icon size={11} />}
                  {text}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 flex-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#F97316", opacity: loading || !input.trim() ? 0.4 : 1 }}
              >
                <Send size={15} color="#fff" />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") send(); }}
                placeholder="שאל אותי משהו..."
                disabled={loading}
                className="flex-1 text-sm text-right px-3.5 py-2.5 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
              />
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .ai-chat-scroll {
          scrollbar-color: #f97316 rgba(255, 255, 255, 0.06);
          scrollbar-width: thin;
        }
        .ai-chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .ai-chat-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
        }
        .ai-chat-scroll::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 6px;
        }
        .ai-chat-carousel {
          scrollbar-width: none;
        }
        .ai-chat-carousel::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
