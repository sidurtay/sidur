"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Phone, Lock } from "lucide-react";
import Logo from "@/components/Logo";

export default function Login() {
  const router = useRouter();
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    setError("");
    if (!phone.trim() || !password.trim()) { setError("יש למלא טלפון וסיסמה"); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        const session = {
          businessId: data.businessId, personId: data.personId,
          phone: data.phone, name: data.name, businessName: data.businessName,
          role: data.role, loginAt: Date.now(),
        };
        localStorage.setItem("shiftpro_session", JSON.stringify(session));
        if (data.businessConfig) {
          localStorage.setItem("shiftpro_business_config", JSON.stringify({ permanent: data.businessConfig }));
        }
        router.replace(data.mustChangePassword ? "/change-password" : "/dashboard");
        return;
      }
    } catch {
      // fall through to legacy localStorage check below
    }

    // Legacy fallback — employees added before this device had Supabase wired up
    try {
      const creds = JSON.parse(localStorage.getItem("shiftpro_employee_creds") || "{}");
      const emp = creds[phone];
      if (emp && emp.tempPassword === password) {
        const session = { phone, name: emp.name, role: "employee", loginAt: Date.now() };
        localStorage.setItem("shiftpro_session", JSON.stringify(session));
        router.replace("/change-password");
        return;
      }
      if (emp && emp.password === password) {
        const session = { phone, name: emp.name, role: "employee", loginAt: Date.now() };
        localStorage.setItem("shiftpro_session", JSON.stringify(session));
        router.replace("/dashboard");
        return;
      }
    } catch {}

    setError("טלפון או סיסמה שגויים");
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* Top brand stripe */}
      <div className="h-[3px] w-full flex-shrink-0"
        style={{ background: "linear-gradient(90deg, transparent, #FFB020 20%, #E2510A 50%, #FFB020 80%, transparent)" }} />

      {/* Hero */}
      <div className="flex flex-col items-center pt-12 pb-16 px-6 text-center relative overflow-hidden"
        style={{ background: "var(--navy)" }}>
        <button onClick={() => router.back()}
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowRight size={18} color="white" />
        </button>

        <div className="relative flex items-center justify-center mb-5" style={{ width: 80, height: 80 }}>
          <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
            style={{ background: "radial-gradient(circle, #E2691A, transparent 70%)" }} />
          <div className="relative rounded-2xl flex items-center justify-center"
            style={{ width: 72, height: 72, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Logo size={38} />
          </div>
        </div>

        <p className="text-white text-2xl font-bold tracking-tight">Sidur</p>
        <div className="mt-3 mb-1" style={{ width: 36, height: 2, background: "linear-gradient(90deg, #FFB020, #E2510A)", borderRadius: 2 }} />
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>כניסה לחשבון העסק שלך</p>
      </div>

      {/* Form — floating card */}
      <div className="px-5 flex flex-col gap-4" style={{ marginTop: -28 }}>
        <div className="bg-white rounded-[28px] p-6 flex flex-col gap-4"
          style={{ boxShadow: "0 12px 32px -8px rgba(20,18,15,0.18)", border: "1px solid var(--border)" }}>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
              מספר טלפון
            </label>
            <div className="relative flex items-center">
              <Phone size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
              <input
                type="tel" inputMode="numeric" placeholder="05X-XXXXXXX"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full pr-10 pl-4 py-3.5 rounded-2xl text-sm text-right outline-none transition-shadow"
                style={{ background: "var(--gray-bg)", border: "1.5px solid var(--border)", direction: "ltr" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
              סיסמה
            </label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
              <button onClick={() => setShowPw(v => !v)}
                className="absolute left-3.5" type="button">
                {showPw
                  ? <EyeOff size={15} style={{ color: "var(--text-secondary)" }} />
                  : <Eye     size={15} style={{ color: "var(--text-secondary)" }} />}
              </button>
              <input
                type={showPw ? "text" : "password"} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full pr-10 pl-10 py-3.5 rounded-2xl text-sm text-right outline-none transition-shadow"
                style={{ background: "var(--gray-bg)", border: "1.5px solid var(--border)" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-center font-medium" style={{ color: "var(--red)" }}>{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mt-1 transition-opacity"
            style={{
              background: loading ? "#ADA89D" : "linear-gradient(135deg, #FFB020, #E2510A)",
              boxShadow: loading ? "none" : "0 8px 20px -6px rgba(226,81,10,0.45)",
            }}>
            {loading ? "מתחבר..." : "כניסה"}
          </button>

          <button className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            שכחתי סיסמה
          </button>
        </div>

        <button onClick={() => router.push("/register")}
          className="text-sm text-center py-2">
          <span style={{ color: "var(--text-secondary)" }}>אין לך חשבון? </span>
          <span className="font-semibold" style={{ color: "var(--blue)" }}>צור עסק חדש</span>
        </button>
      </div>
    </div>
  );
}
