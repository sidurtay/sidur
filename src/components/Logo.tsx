export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
        fontWeight: 800,
        fontSize: size * 0.62,
        color: "var(--blue)",
        letterSpacing: "-0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      Sidur
    </span>
  );
}
