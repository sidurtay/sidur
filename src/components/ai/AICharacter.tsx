"use client";
import Image from "next/image";

// The little floating mascot that opens the AI assistant. Self-contained —
// purely visual, no app logic. Pulses softly to draw the eye without being
// annoying. Styled in the app's own navy/orange brand instead of a generic
// dark/blue palette.
export default function AICharacter({ onClick, hasUnread }: { onClick: () => void; hasUnread?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="פתח עוזר AI"
      className="ai-character-btn"
      style={{
        position: "fixed",
        bottom: 92,
        right: 16,
        zIndex: 60,
        width: 48,
        height: 48,
        borderRadius: "50%",
        overflow: "hidden",
        border: "1.5px solid rgba(249,115,22,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 26px rgba(20,24,31,0.4), 0 0 0 1px rgba(249,115,22,0.08)",
        cursor: "pointer",
      }}
    >
      <span className="ai-character-pulse" />
      <span className="ai-character-sparkle">✦</span>
      <Image src="/ai-character.png" alt="" width={48} height={48} style={{ objectFit: "cover", width: "100%", height: "100%" }} priority />
      {hasUnread && (
        <span style={{
          position: "absolute", top: 1, right: 1, width: 11, height: 11,
          borderRadius: "50%", background: "#F97316", border: "2px solid #14181F",
        }} />
      )}

      <style jsx>{`
        .ai-character-btn { animation: ai-breathe 3.2s ease-in-out infinite; }
        .ai-character-pulse {
          position: absolute; inset: -5px; border-radius: 50%;
          border: 1.5px solid rgba(249,115,22,0.4);
          animation: ai-ring 2.6s ease-out infinite;
        }
        .ai-character-sparkle {
          position: absolute; top: -2px; left: -2px;
          font-size: 11px; color: #F97316;
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
