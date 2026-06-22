"use client";
import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

type Session = { businessId: string; personId: string; name: string; businessName: string; isManager: boolean };

export default function AIChatDrawer({ session, onClose }: { session: Session; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);

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
          setMessages([{ role: "assistant", content: `שלום ${session.name.split(" ")[0]}! איך אפשר לעזור? אפשר לשאול אותי על שעות עבודה, משמרות קרובות, או לבקש החלפה / היעדרות.` }]);
        }
      })
      .catch(() => {
        if (!sentRef.current) setMessages([{ role: "assistant", content: "שלום! איך אפשר לעזור?" }]);
      })
      .finally(() => setLoadingHistory(false));
  }, [session.businessId, session.personId, session.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
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
        setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
      } else {
        setError(res.error || "משהו נכשל, נסה שוב");
      }
    } catch {
      setError("שגיאת רשת — נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg flex flex-col"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          height: "78vh",
          direction: "rtl",
        }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ background: "rgba(232,240,255,0.25)" }} />

        <div className="flex items-center justify-between px-4 py-3 flex-row" style={{ borderBottom: "1px solid rgba(232,240,255,0.1)" }}>
          <button onClick={onClose}>
            <X size={18} style={{ color: "#e8f0ff" }} />
          </button>
          <p className="text-sm font-semibold" style={{ color: "#e8f0ff" }}>עוזר AI · Sidur</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {loadingHistory ? (
            <p className="text-sm text-center py-6" style={{ color: "rgba(232,240,255,0.5)" }}>טוען...</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-start" : "items-end"}`}>
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap"
                  style={m.role === "user"
                    ? { background: "rgba(232,240,255,0.1)", color: "#e8f0ff" }
                    : { background: "#e8f0ff", color: "#141414" }}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex flex-col items-end">
              <div className="px-3.5 py-2.5 rounded-2xl text-sm" style={{ background: "#e8f0ff", color: "#141414" }}>
                <span style={{ opacity: 0.6 }}>חושב...</span>
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-center" style={{ color: "#F87171" }}>{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 px-4 py-3 flex-row" style={{ borderTop: "1px solid rgba(232,240,255,0.1)" }}>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#e8f0ff", opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            <Send size={15} color="#141414" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="שאל אותי משהו..."
            disabled={loading}
            className="flex-1 text-sm text-right px-3.5 py-2.5 rounded-xl outline-none"
            style={{ background: "rgba(232,240,255,0.08)", color: "#e8f0ff" }}
          />
        </div>
      </div>
    </div>
  );
}
