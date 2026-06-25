"use client";

// Small orange figure that paces back and forth across the width of its
// container — used as the "thinking" indicator at the bottom of the AI chat,
// in place of a generic typing animation.
export default function AiWalker() {
  return (
    <div className="ai-walker-track">
      <div className="ai-walker-figure" />
      <style jsx>{`
        .ai-walker-track {
          position: relative;
          width: 100%;
          height: 26px;
          overflow: hidden;
        }
        .ai-walker-figure {
          position: absolute;
          top: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50% 50% 50% 0;
          background: #F97316;
          box-shadow: 0 2px 6px rgba(249,115,22,0.4);
          animation: ai-walk-across 1.8s ease-in-out infinite, ai-walk-bob 0.3s ease-in-out infinite;
        }
        @keyframes ai-walk-across {
          0% { right: 0%; transform: rotate(0deg); }
          48% { right: calc(100% - 16px); transform: rotate(0deg); }
          50% { right: calc(100% - 16px); transform: rotate(180deg); }
          98% { right: 0%; transform: rotate(180deg); }
          100% { right: 0%; transform: rotate(0deg); }
        }
        @keyframes ai-walk-bob {
          0%, 100% { top: 4px; }
          50% { top: 1px; }
        }
      `}</style>
    </div>
  );
}
