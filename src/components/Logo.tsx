export default function LogoMark({ size = 28, color = "var(--navy)" }: { size?: number; color?: string }) {
  return (
    <span style={{
      fontWeight: 800, fontSize: size * 0.62, color,
      letterSpacing: "-0.01em", lineHeight: 1, direction: "ltr",
    }}>
      Sidur
    </span>
  );
}

export function LogoWithName({ size = 28 }: { size?: number }) {
  return <LogoMark size={size} />;
}
