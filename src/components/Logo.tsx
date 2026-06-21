export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidurLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB020" />
          <stop offset="100%" stopColor="#E2510A" />
        </linearGradient>
      </defs>
      <text
        x="50" y="74"
        textAnchor="middle"
        fontFamily="-apple-system, 'Segoe UI', Arial, sans-serif"
        fontWeight="800"
        fontSize="78"
        fill="url(#sidurLogoGrad)"
      >S</text>
    </svg>
  );
}
