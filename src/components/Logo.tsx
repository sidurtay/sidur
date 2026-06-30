import Image from "next/image";

export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Sidur"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.24, objectFit: "cover" }}
      priority
    />
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
