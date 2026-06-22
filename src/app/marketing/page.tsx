import Link from "next/link";

const posts = [
  { href: "/marketing/post1", label: "פוסט 1 — וואטסאפ", bg: "#14181F" },
  { href: "/marketing/post2", label: "פוסט 2 — עוזר AI", bg: "#F97316" },
  { href: "/marketing/post3", label: "פוסט 3 — טיפים", bg: "#FFFFFF" },
];

export default function MarketingGallery() {
  return (
    <div style={{ padding: 40, fontFamily: "-apple-system, sans-serif", direction: "rtl" }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>גלריית פוסטים — Sidur</h1>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {posts.map(p => (
          <Link key={p.href} href={p.href} style={{ textDecoration: "none" }}>
            <div style={{
              width: 270, height: 270, borderRadius: 12, overflow: "hidden",
              border: "1px solid #E5E7EB", position: "relative", background: p.bg,
            }}>
              <iframe src={p.href} style={{ width: 1080, height: 1080, border: "none", transform: "scale(0.25)", transformOrigin: "top right" }} />
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: "#1F2937", textAlign: "center" }}>{p.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
