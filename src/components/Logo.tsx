// The Sidur mark — an orange rounded square, a bold white "S", and a small
// sparkle accent that ties the brand to its AI feature instead of bolting AI
// on as an unrelated icon elsewhere in the product.
export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="24" fill="#F97316" />
      <path
        d="M64 38c-2-6-8-10-16-10-10 0-17 5-17 13 0 7 5 10 14 12l4 1c10 2 16 6 16 14 0 9-8 15-19 15-9 0-16-4-19-11"
        stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" fill="none"
      />
      <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round">
        <line x1="78" y1="20" x2="78" y2="32" />
        <line x1="90" y1="32" x2="80" y2="38" />
        <line x1="92" y1="48" x2="81" y2="45" />
      </g>
    </svg>
  );
}

export function LogoWithName({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ direction: "ltr" }}>
      <LogoMark size={size} />
      <span style={{
        fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
        fontWeight: 800, fontSize: size * 0.62, color: "var(--navy)",
        letterSpacing: "-0.01em", lineHeight: 1,
      }}>
        Sidur
      </span>
    </span>
  );
}
