export default function Post3() {
  return (
    <div style={{
      width: 1080, height: 1080, background: "#FFFFFF",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
      direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 48, right: 56 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "#F97316" }}>Sidur</span>
      </div>

      <div style={{ marginTop: 130, padding: "0 90px", textAlign: "center" }}>
        <p style={{ fontSize: 56, fontWeight: 800, color: "#1F2937", lineHeight: 1.35, margin: 0 }}>
          נגמר הזמן שמחשבים<br />טיפים על דף
        </p>
        <p style={{ fontSize: 26, color: "#6B7280", marginTop: 22 }}>
          חלוקה אוטומטית לפי שעות — בוקר וערב בנפרד
        </p>
      </div>

      <div style={{
        marginTop: 56, width: 420, height: 560, background: "#fff",
        borderRadius: 36, border: "10px solid #14181F", boxShadow: "0 30px 70px rgba(0,0,0,0.18)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{ background: "#F97316", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>עד 16:00</span>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>משמרת בוקר</span>
        </div>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#1F2937" }}>₪920</span>
          <span style={{ marginRight: "auto", background: "#F3F4F6", color: "#1F2937", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>3 עובדים · 24 ש׳</span>
        </div>
        {[
          ["שירה כהן", "08:00–16:00 · 8.0 ש׳", "₪307", "47%", "#E6F1FB", "#0C447C"],
          ["דניאל לוי", "09:00–17:00 · 8.0 ש׳", "₪307", "33%", "#E1F5EE", "#085041"],
          ["מיכל שרון", "12:00–16:00 · 4.0 ש׳", "₪153", "20%", "#F1EFE8", "#444441"],
        ].map(([name, time, amount, pct, bg, fg]) => (
          <div key={name as string} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #E5E7EB" }}>
            <div style={{ minWidth: 56, textAlign: "left" }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#15803D", margin: 0 }}>{amount}</p>
              <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>{pct}</p>
            </div>
            <div style={{ flex: 1, textAlign: "right", marginRight: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#1F2937" }}>{name}</p>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  {(name as string).split(" ").map(w => w[0]).join("")}
                </div>
              </div>
              <p style={{ fontSize: 10, color: "#6B7280", margin: "2px 0 0", direction: "ltr" }}>{time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
