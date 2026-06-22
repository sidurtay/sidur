export default function Post1() {
  return (
    <div style={{
      width: 1080, height: 1080, background: "#14181F",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
      direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 48, right: 56, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "#F97316" }}>Sidur</span>
      </div>

      <div style={{ marginTop: 130, padding: "0 90px", textAlign: "center" }}>
        <p style={{ fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.35, margin: 0 }}>
          עדיין מסדרים עבודה<br />בקבוצת וואטסאפ?
        </p>
        <p style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginTop: 22 }}>
          סידור, נוכחות וטיפים — הכל באפליקציה אחת
        </p>
      </div>

      <div style={{
        marginTop: 56, width: 420, height: 560, background: "#fff",
        borderRadius: 36, border: "10px solid #000", boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{ background: "#14181F", padding: "22px 22px 16px" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 10px", textAlign: "right" }}>שלישי, 23.6</p>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, textAlign: "right" }}>שלום, איתי 👋</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "2px 0 16px", textAlign: "right" }}>קפה קפה נהריה</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[["8", "בסידור היום"], ["6", "נוכחים"], ["0", "איחורים"]].map(([n, l]) => (
              <div key={l} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>{n}</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "18px 18px 0" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", margin: "0 0 10px", textAlign: "right" }}>משמרת היום</p>
          {[
            ["שירה כהן", "מלצרים", "08:00–16:00", "#E6F1FB", "#0C447C"],
            ["דניאל לוי", "מטבח", "09:00–17:00", "#E1F5EE", "#085041"],
            ["רותם אביב", "בר", "18:00–02:00", "#EEEDFE", "#3C3489"],
          ].map(([name, role, time, bg, fg]) => (
            <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #E5E7EB" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {(name as string).split(" ").map(w => w[0]).join("")}
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#1F2937" }}>{name}</p>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{role}</p>
              </div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0, direction: "ltr" }}>{time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
