export default function Post2() {
  return (
    <div style={{
      width: 1080, height: 1080, background: "#F97316",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif",
      direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 48, right: 56 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "#14181F" }}>Sidur</span>
      </div>

      <div style={{ marginTop: 130, padding: "0 90px", textAlign: "center" }}>
        <p style={{ fontSize: 54, fontWeight: 800, color: "#14181F", lineHeight: 1.35, margin: 0 }}>
          עוזר AI שעונה לעובדים<br />שלך — בלי שתזיז אצבע
        </p>
        <p style={{ fontSize: 26, color: "rgba(20,24,31,0.7)", marginTop: 22 }}>
          שעות עבודה, החלפת משמרת, בקשת חופש — הכל בצ׳אט
        </p>
      </div>

      <div style={{
        marginTop: 50, width: 420, height: 580, background: "#14181F",
        borderRadius: 36, border: "10px solid #000", boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
        overflow: "hidden", padding: 22, display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 10, borderBottom: "1px solid rgba(232,240,255,0.12)" }}>
          <span style={{ color: "#e8f0ff", fontSize: 15, fontWeight: 700 }}>AI · Sidur עוזר</span>
        </div>
        <div style={{ alignSelf: "flex-end", background: "#e8f0ff", color: "#14181F", borderRadius: 16, padding: "12px 16px", fontSize: 14, maxWidth: "85%" }}>
          שלום! איך אפשר לעזור? אפשר לשאול אותי על שעות עבודה, משמרות קרובות, או לבקש החלפה / היעדרות.
        </div>
        <div style={{ alignSelf: "flex-start", background: "rgba(232,240,255,0.1)", color: "#e8f0ff", borderRadius: 16, padding: "12px 16px", fontSize: 14 }}>
          אני רוצה לבקש חופש ב-1.7 כי יש לי חתונה
        </div>
        <div style={{ alignSelf: "flex-end", background: "#e8f0ff", color: "#14181F", borderRadius: 16, padding: "12px 16px", fontSize: 14, maxWidth: "85%" }}>
          שלחתי למנהל בקשת היעדרות לתאריך 1.7 (יש לי חתונה). תקבל/י עדכון כשהיא תיענה. ✓
        </div>
      </div>
    </div>
  );
}
