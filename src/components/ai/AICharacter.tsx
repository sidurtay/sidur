"use client";

// The little floating "face" that opens the AI assistant. Self-contained —
// purely visual, no app logic. Pulses softly and "winks" every ~8s to draw
// the eye without being annoying.
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
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#141414",
        border: "1px solid rgba(232,240,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        cursor: "pointer",
      }}
    >
      <span className="ai-character-pulse" />
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#e8f0ff" strokeWidth="1.6" />
        <circle className="ai-character-eye-l" cx="9" cy="11" r="1.4" fill="#e8f0ff" />
        <circle className="ai-character-eye-r" cx="15" cy="11" r="1.4" fill="#e8f0ff" />
        <path d="M9 15c1 1 5 1 6 0" stroke="#e8f0ff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {hasUnread && (
        <span style={{
          position: "absolute", top: 2, right: 2, width: 10, height: 10,
          borderRadius: "50%", background: "#F87171", border: "2px solid #141414",
        }} />
      )}

      <style jsx>{`
        .ai-character-btn { animation: ai-breathe 3.2s ease-in-out infinite; }
        .ai-character-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          border: 1.5px solid rgba(232,240,255,0.35);
          animation: ai-ring 2.6s ease-out infinite;
        }
        .ai-character-eye-l, .ai-character-eye-r {
          transform-origin: center;
          animation: ai-wink 8s ease-in-out infinite;
        }
        @keyframes ai-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes ai-ring {
          0% { opacity: 0.6; transform: scale(0.9); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes ai-wink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>
    </button>
  );
}
