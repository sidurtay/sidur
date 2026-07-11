"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Send, Mail } from "lucide-react";
import { LANDING_FAQ, matchLandingFaq } from "@/lib/landingFaq";

const ORANGE = "#F97316";
const NAVY = "#0B1E3D";
const BORDER = "#E7EAF0";
const MUTED = "#5B6472";

const SIDE_KEY = "shiftpro_landing_bot_side";
const DRAG_THRESHOLD = 60; // px of horizontal drag before it counts as "move me"
const CLICK_THRESHOLD = 6; // px — below this, a pointer-up counts as a tap, not a drag
const EDGE = 16; // matches the `right: 16` / `left: 16` gutter
const SIZE = 44;

type Msg = { from: "bot" | "user"; text: string };

const GREETING = "היי! אני סיד — בוט תשובות מהיר, לא ה-AI המלא של האפליקציה 🙂 תשאל/י אותי משהו על המחיר, איך זה עובד, אבטחה או כל דבר אחר.";

// Public-facing landing-page widget only — intentionally NOT the paid AI
// assistant used inside the app. It only ever matches against a fixed local
// Q&A list (see lib/landingFaq.ts), so an anonymous visitor can never spend
// AI credits by poking at it, no matter what they type.
export default function LandingSidBot({ onSideChange }: { onSideChange?: (side: "left" | "right") => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Drag-to-side — mirrors AICharacter.tsx's proven pattern: window-level
  // pointer listeners (more reliable than setPointerCapture for a fast real
  // drag) and a single transform-driven slide so switching edges never jumps.
  const [side, setSideState] = useState<"left" | "right">("right");
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [viewportW, setViewportW] = useState(0);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  const setSide = useCallback((s: "left" | "right") => {
    setSideState(s);
    setTimeout(() => onSideChange?.(s), 0);
  }, [onSideChange]);

  useEffect(() => {
    setViewportW(window.innerWidth);
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    const saved = localStorage.getItem(SIDE_KEY) === "left" ? "left" : "right";
    setSide(saved);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dockTX = side === "left" ? -(viewportW - EDGE * 2 - SIZE) : 0;

  function handlePointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    movedRef.current = false;
    setDragging(true);
    setPressed(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e: PointerEvent) {
      const dx = e.clientX - startXRef.current;
      if (Math.abs(dx) > CLICK_THRESHOLD) movedRef.current = true;
      setDragX(dx);
    }

    function handleUp() {
      setDragging(false);
      setPressed(false);
      setDragX(currentDragX => {
        if (side === "right" && currentDragX < -DRAG_THRESHOLD) {
          setSide("left");
          localStorage.setItem(SIDE_KEY, "left");
        } else if (side === "left" && currentDragX > DRAG_THRESHOLD) {
          setSide("right");
          localStorage.setItem(SIDE_KEY, "right");
        }
        return 0;
      });
      if (!movedRef.current) setOpen(v => !v);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, side]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function ask(text: string) {
    if (!text.trim()) return;
    const match = matchLandingFaq(text);
    const reply = match ? match.a : "לא מצאתי תשובה מדויקת לזה — הכי בטוח לשאול את הצוות ישירות: sidur.support@gmail.com";
    setMessages(m => [...m, { from: "user", text }, { from: "bot", text: reply }]);
    setInput("");
  }

  return (
    <>
      <button
        onPointerDown={handlePointerDown}
        aria-label="שאלות נפוצות"
        className="fixed flex items-center justify-center rounded-full"
        style={{
          bottom: 16, right: EDGE, zIndex: 90, width: SIZE, height: SIZE,
          cursor: "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          background: open ? ORANGE : "transparent",
          boxShadow: open ? "0 10px 24px -6px rgba(249,115,22,0.5)" : "none",
          border: open ? "3px solid #fff" : "none",
          transform: `translateX(${dockTX + dragX}px) scale(${dragging ? 0.9 : pressed ? 0.82 : 1})`,
          transition: dragging ? "none" : "transform 0.42s cubic-bezier(0.22,1,0.36,1)",
        }}>
        {open ? <X size={20} color="#fff" /> : (
          <>
            <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "#fff", boxShadow: "0 8px 16px rgba(20,24,31,0.35)" }} />
            <Image src="/ai-character-v2.png" alt="סיד" width={44} height={44} draggable={false}
              style={{ position: "relative", objectFit: "contain", width: "100%", height: "100%", pointerEvents: "none", WebkitUserDrag: "none" } as React.CSSProperties} />
          </>
        )}
      </button>

      {open && (
        <div className="fixed flex flex-col overflow-hidden rounded-2xl"
          style={{
            bottom: 78, [side === "left" ? "left" : "right"]: 16, zIndex: 89, width: 320, maxWidth: "calc(100vw - 32px)", height: 440,
            background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 24px 60px -20px rgba(11,30,61,0.4)",
            direction: "rtl",
          }}>
          <div className="flex items-center justify-between px-4 py-3 flex-row"
            style={{ borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(180deg, rgba(249,115,22,0.06), transparent)" }}>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: NAVY }}>סיד · שאלות נפוצות</p>
              <p className="text-[10px]" style={{ color: MUTED }}>בוט תשובות מהיר — לא ה-AI המלא</p>
            </div>
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
              <Image src="/ai-character-v2.png" alt="" width={32} height={32} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5" style={{ background: "#FAFBFC" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "bot" ? "justify-start" : "justify-end"}`}>
                <p className="text-xs leading-relaxed rounded-2xl px-3 py-2 max-w-[85%] text-right"
                  style={m.from === "bot"
                    ? { background: "#fff", border: `1px solid ${BORDER}`, color: NAVY }
                    : { background: ORANGE, color: "#fff" }}>
                  {m.text}
                </p>
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {LANDING_FAQ.slice(0, 4).map(f => (
                  <button key={f.q} onClick={() => ask(f.q)}
                    className="text-[11px] font-medium px-3 py-2 rounded-xl text-right"
                    style={{ background: "#fff", border: `1px solid ${BORDER}`, color: NAVY }}>
                    {f.q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-row px-3 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button onClick={() => ask(input)} aria-label="שלח"
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: ORANGE }}>
              <Send size={13} color="#fff" />
            </button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") ask(input); }}
              placeholder="שאל אותי משהו..."
              className="flex-1 text-xs px-3 py-2 rounded-full outline-none text-right"
              style={{ background: "#FAFBFC", border: `1px solid ${BORDER}`, color: NAVY }} />
          </div>
          <a href="mailto:sidur.support@gmail.com"
            className="flex items-center justify-center gap-1.5 flex-row text-[10px] font-medium py-2"
            style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}>
            <Mail size={11} /> יש שאלה שלא כאן? כתבו לתמיכה
          </a>
        </div>
      )}
    </>
  );
}
