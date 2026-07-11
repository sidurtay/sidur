"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const SIDE_KEY = "shiftpro_ai_character_side";
const DRAG_THRESHOLD = 60; // px of horizontal drag before it counts as "move me"
const CLICK_THRESHOLD = 6; // px — below this, a pointer-up counts as a tap, not a drag
const EDGE = 16; // matches the `right: 16` / `left: 16` gutter
const SIZE = 44;

// The little floating mascot that opens the AI assistant. Self-contained —
// purely visual, no app logic. Pulses softly to draw the eye without being
// annoying. Styled in the app's own navy/orange brand instead of a generic
// dark/blue palette. Can be dragged to the left edge if it's blocking
// something on screen — the side sticks across visits (localStorage).
//
// Always anchored at `right: 16` and moved purely via `transform: translateX`
// — switching between `left`/`right` CSS properties on drop caused a visible
// jump-then-slide glitch, since the box's base position teleported to the
// opposite edge at the same instant the drag offset reset to 0. A single
// transform-driven slide reads as one continuous, smooth motion instead.
export default function AICharacter({ onClick, hasUnread, onSideChange }: { onClick: () => void; hasUnread?: boolean; onSideChange?: (side: "left" | "right") => void }) {
  const [side, setSideState] = useState<"left" | "right">("right");
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [viewportW, setViewportW] = useState(0);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  const setSide = useCallback((s: "left" | "right") => {
    setSideState(s);
    onSideChange?.(s);
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

  // Tracked on `window` rather than the button itself — relying on the
  // button to keep receiving pointermove/pointerup (even via
  // setPointerCapture) turned out to be unreliable for a fast real-world
  // drag gesture. Window-level listeners always fire regardless of what's
  // under the pointer, which is the standard robust pattern for a custom
  // drag interaction like this.
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
      if (!movedRef.current) onClick();
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

  return (
    <button
      onPointerDown={handlePointerDown}
      aria-label="פתח עוזר AI"
      style={{
        position: "fixed",
        bottom: 92,
        right: EDGE,
        zIndex: 60,
        width: SIZE,
        height: SIZE,
        cursor: "pointer",
        touchAction: "none",
        // Positional transform lives on this outer button only — the
        // breathing animation below is on an inner wrapper instead, since a
        // running CSS animation on `transform` fights with (and wins over)
        // this inline transform every frame, which silently broke the drag.
        transform: `translateX(${dockTX + dragX}px)`,
        transition: dragging ? "none" : "transform 0.42s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div className="ai-character-inner" style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        transform: (dragging || pressed) ? `scale(${dragging ? 0.9 : 0.82})` : undefined,
        animationPlayState: (dragging || pressed) ? "paused" : "running",
        transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <span className="ai-character-pulse" />
        <span className="ai-character-sparkle">✦</span>
        <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "#fff", boxShadow: "0 8px 16px rgba(20,24,31,0.45)" }} />
        <Image src="/ai-character-v2.png" alt="" width={SIZE} height={SIZE} draggable={false} priority
          style={{ position: "relative", objectFit: "contain", width: "100%", height: "100%", pointerEvents: "none", WebkitUserDrag: "none" } as React.CSSProperties} />
        {hasUnread && (
          <span style={{
            position: "absolute", top: 4, right: 4, width: 10, height: 10,
            borderRadius: "50%", background: "#F97316", border: "2px solid #14181F",
          }} />
        )}
      </div>

      <style jsx>{`
        .ai-character-inner { animation: ai-breathe 3.2s ease-in-out infinite; }
        .ai-character-pulse {
          position: absolute; inset: -5px; border-radius: 50%;
          border: 1.5px solid rgba(249,115,22,0.4);
          animation: ai-ring 2.6s ease-out infinite;
        }
        .ai-character-sparkle {
          position: absolute; top: -2px; left: -2px;
          font-size: 10px; color: #F97316;
          animation: ai-twinkle 3.2s ease-in-out infinite;
        }
        @keyframes ai-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes ai-ring {
          0% { opacity: 0.55; transform: scale(0.9); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes ai-twinkle {
          0%, 80%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
          90% { opacity: 1; transform: scale(1.1) rotate(15deg); }
        }
      `}</style>
    </button>
  );
}
