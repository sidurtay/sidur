import Image from "next/image";

// The icon mark is a solid-white-background crop (no alpha), so it always
// sits inside a white badge — that reads fine on both light surfaces and the
// dark navy hero sections instead of showing a stray white box around it.
export default function LogoMark({ size = 28 }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size * 0.24,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "#fff", overflow: "hidden", flexShrink: 0,
      }}
    >
      <Image src="/logo.png" alt="Sidur" width={size} height={size} style={{ objectFit: "contain" }} priority />
    </span>
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
