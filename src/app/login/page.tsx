"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Phone, Lock, Fingerprint, Check } from "lucide-react";
import Card from "@/components/ui/Card";

type LoginSuccessData = {
  businessId: string; personId: string; phone: string; name: string;
  businessName: string; role: string; mustChangePassword?: boolean;
  businessConfig?: unknown;
};

// Digits only, dash-formatted after the area code — must match the exact
// format register/employees store phone numbers in, or the lookup at login
// silently fails to match (a manually-typed "0541234567" won't equal a
// stored "054-1234567").
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  return digits.slice(0, 3) + "-" + digits.slice(3);
}

export default function Login() {
  const router = useRouter();
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [passkeyPhone, setPasskeyPhone] = useState("");
  const [passkeyBusy,  setPasskeyBusy]  = useState(false);
  const [forgotBusy,   setForgotBusy]   = useState(false);
  const [forgotSent,   setForgotSent]   = useState(false);
  const [remember,     setRemember]     = useState(true);

  useEffect(() => {
    const savedPhone = localStorage.getItem("shiftpro_webauthn_phone");
    if (savedPhone) {
      import("@simplewebauthn/browser").then(({ browserSupportsWebAuthn }) => {
        if (browserSupportsWebAuthn()) setPasskeyPhone(savedPhone);
      });
    }
    const rememberedPhone = localStorage.getItem("shiftpro_remembered_phone");
    if (rememberedPhone) setPhone(rememberedPhone);
    else setRemember(false);
  }, []);

  function storeSessionAndRedirect(data: LoginSuccessData) {
    const session = {
      businessId: data.businessId, personId: data.personId,
      phone: data.phone, name: data.name, businessName: data.businessName,
      role: data.role, loginAt: Date.now(),
    };
    localStorage.setItem("shiftpro_session", JSON.stringify(session));
    if (data.businessConfig) {
      localStorage.setItem("shiftpro_business_config", JSON.stringify({ permanent: data.businessConfig }));
    }
    if (remember) localStorage.setItem("shiftpro_remembered_phone", data.phone);
    else localStorage.removeItem("shiftpro_remembered_phone");
    router.replace(data.mustChangePassword ? "/change-password" : "/dashboard");
  }

  async function handleFingerprintLogin() {
    setError("");
    setPasskeyBusy(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/login-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: passkeyPhone }),
      }).then(r => r.json());
      if (!optionsRes.success) throw new Error(optionsRes.error || "שגיאה בכניסה בטביעת אצבע");

      const assertion = await startAuthentication({ optionsJSON: optionsRes.options });

      const verifyRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      }).then(r => r.json());
      if (!verifyRes.success) throw new Error(verifyRes.error || "האימות נכשל");

      storeSessionAndRedirect(verifyRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "כניסה בטביעת אצבע נכשלה, נסה עם סיסמה");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!phone.trim()) { setError("הזן/י מספר טלפון כדי לאפס סיסמה"); return; }
    setForgotBusy(true);
    setError("");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch {}
    setForgotBusy(false);
    setForgotSent(true);
  }

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
        storeSessionAndRedirect(data);
        return;
      }
    } catch {
      setError("שגיאת רשת — נסה שוב");
      setLoading(false);
      return;
    }

    setError("טלפון או סיסמה שגויים");
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>

      {/* Hero */}
      <div className="flex flex-col items-center pt-12 pb-12 px-6 text-center relative overflow-hidden"
        style={{ background: "var(--navy)" }}>
        <button onClick={() => router.back()}
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowRight size={18} color="white" />
        </button>

        <p className="animate-fade-slide-up text-white text-3xl font-extrabold tracking-tight" style={{ animationDelay: "0.05s" }}>
          Sidur
        </p>
        <p className="animate-fade-slide-up text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)", animationDelay: "0.2s" }}>
          © 2026 Sidur · כל הזכויות שמורות
        </p>

        <p className="animate-fade-slide-up text-sm mt-5" style={{ color: "rgba(255,255,255,0.55)", animationDelay: "0.35s" }}>
          כניסה לחשבון העסק שלך
        </p>

        {/* Trust row — businesses using the product */}
        <div className="animate-fade-slide-up flex flex-row flex-wrap items-center justify-center gap-1.5 mt-5"
          style={{ animationDelay: "0.5s" }}>
          {["קפה לוסיל", "מטבח האחים", "בר רוסו", "פיצה דה רוקו"].map(name => (
            <span key={name} className="text-[10px] px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {name}
            </span>
          ))}
        </div>
        <p className="animate-fade-slide-up text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.3)", animationDelay: "0.55s" }}>
          מצטרפים לעשרות עסקים שמנהלים את הסידור שלהם עם Sidur
        </p>
      </div>

      {/* Form — floating card */}
      <div className="animate-fade-slide-up px-5 flex flex-col gap-4" style={{ marginTop: -20, animationDelay: "0.65s" }}>
        <Card className="rounded-[28px] p-6 flex flex-col gap-4"
          style={{ boxShadow: "0 12px 32px -8px rgba(20,24,31,0.16)", border: "1px solid var(--border)" }}>

          {passkeyPhone && (
            <button onClick={handleFingerprintLogin} disabled={passkeyBusy}
              className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
              <Fingerprint size={16} />
              {passkeyBusy ? "מאמת..." : "כניסה בטביעת אצבע"}
            </button>
          )}
          {passkeyPhone && (
            <div className="flex items-center gap-2 flex-row">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>או עם סיסמה</p>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>
              מספר טלפון
            </label>
            <div className="relative flex items-center">
              <Phone size={15} className="absolute right-3.5" style={{ color: "var(--text-secondary)" }} />
              <input
                type="tel" inputMode="numeric" placeholder="05X-XXXXXXX" maxLength={11}
                value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
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

          <div className="flex items-center justify-between flex-row">
            {forgotSent ? (
              <p className="text-xs" style={{ color: "var(--green)" }}>סיסמה זמנית נשלחה</p>
            ) : (
              <button onClick={handleForgotPassword} disabled={forgotBusy}
                className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {forgotBusy ? "שולח..." : "שכחתי סיסמה"}
              </button>
            )}
            <button onClick={() => setRemember(v => !v)} type="button"
              className="flex items-center gap-1.5 flex-row">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>זכור אותי</span>
              <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  background: remember ? "var(--blue)" : "transparent",
                  border: `1.5px solid ${remember ? "var(--blue)" : "var(--border)"}`,
                }}>
                {remember && <Check size={11} color="white" strokeWidth={3} />}
              </span>
            </button>
          </div>

          {error && (
            <p className="text-xs text-center font-medium" style={{ color: "var(--red)" }}>{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mt-1 transition-opacity"
            style={{
              background: loading ? "var(--border)" : "var(--navy)",
              boxShadow: loading ? "none" : "0 8px 20px -6px rgba(20,24,31,0.4)",
            }}>
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </Card>

        <button onClick={() => router.push("/register")}
          className="text-sm text-center py-2">
          <span style={{ color: "var(--text-secondary)" }}>אין לך חשבון? </span>
          <span className="font-semibold" style={{ color: "var(--blue)" }}>צור עסק חדש</span>
        </button>
      </div>
    </div>
  );
}
