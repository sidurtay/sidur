"use client";

// The little floating "face" that opens the AI assistant. Self-contained —
// purely visual, no app logic. Pulses softly and "winks" every ~8s to draw
// the eye without being annoying. Styled in the app's own navy/orange brand
// instead of a generic dark/blue palette.
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
        width: 58,
        height: 58,
        borderRadius: "50%",
        background: "linear-gradient(145deg, #1F2937, #14181F)",
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
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#F97316" strokeWidth="1.5" opacity="0.9" />
        <circle className="ai-character-eye-l" cx="9" cy="11" r="1.5" fill="#FDBA74" />
        <circle className="ai-character-eye-r" cx="15" cy="11" r="1.5" fill="#FDBA74" />
        <path d="M9 15c1 1 5 1 6 0" stroke="#FDBA74" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
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
        .ai-character-eye-l, .ai-character-eye-r {
          transform-origin: center;
          animation: ai-wink 8s ease-in-out infinite;
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
        @keyframes ai-wink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>
    </button>
  );
}
