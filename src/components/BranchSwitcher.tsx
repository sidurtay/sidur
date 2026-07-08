"use client";
import { useState, useEffect } from "react";
import { Building2, Plus, Check, ChevronDown, X, ArrowLeft, Store } from "lucide-react";

type Branch = {
  businessId: string;
  personId: string;
  name: string;
  city: string;
  businessType: string;
  plan: string;
  isOwner: boolean;
};

type Session = {
  businessId: string;
  personId: string;
  businessName: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  password_hash?: string;
  plan?: string;
  role: string;
  loginAt: number;
};

const BUSINESS_EMOJIS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", icecream: "🍦", bar: "🍺",
  bakery: "🥐", barbershop: "✂️", beauty: "💅", gym: "🏋️",
  clothing: "👗", grocery: "🛒", cleaning: "🧹", hotel: "🏨", other: "🏢",
};

export default function BranchSwitcher({ session }: { session: Session }) {
  const [open, setOpen]           = useState(false);
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [adding, setAdding]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Add branch form
  const [bizName, setBizName] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizType, setBizType] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch(`/api/business/branches?phone=${encodeURIComponent(session.phone)}`)
      .then(r => r.json())
      .then(res => { if (res.success) setBranches(res.branches); });
  }, [open, session.phone]);

  async function switchBranch(b: Branch) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/switch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: b.businessId, personId: b.personId }),
      }).then(r => r.json());
      if (!res.success) { setError(res.error || "שגיאה במעבר סניף"); return; }

      const updated: Session = {
        ...session,
        businessId: b.businessId,
        personId: b.personId,
        businessName: b.name,
        plan: b.plan,
      };
      localStorage.setItem("shiftpro_session", JSON.stringify(updated));
      localStorage.setItem("shiftpro_business_config", JSON.stringify({
        permanent: { bizName: b.name, initialized: true },
      }));
      window.location.href = "/dashboard";
    } catch { setError("שגיאת רשת"); }
    finally { setLoading(false); }
  }

  async function addBranch() {
    if (!bizName.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/business/add-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerPhone: session.phone,
          managerName: session.name,
          passwordHash: session.password_hash || "",
          bizName: bizName.trim(),
          bizCity: bizCity.trim(),
          bizType: bizType || "other",
          plan: session.plan || "starter",
        }),
      }).then(r => r.json());

      if (!res.success) { setError(res.error || "שגיאה"); return; }

      // Switch to the new branch immediately
      switchBranch({
        businessId: res.businessId,
        personId: res.personId,
        name: bizName.trim(),
        city: bizCity.trim(),
        businessType: bizType || "other",
        plan: session.plan || "starter",
        isOwner: true,
      });
    } catch { setError("שגיאת רשת"); }
    finally { setLoading(false); }
  }

  const BUSINESS_TYPES = [
    { key: "cafe", label: "בית קפה", emoji: "☕" },
    { key: "restaurant", label: "מסעדה", emoji: "🍽️" },
    { key: "icecream", label: "גלידריה", emoji: "🍦" },
    { key: "bar", label: "בר / פאב", emoji: "🍺" },
    { key: "barbershop", label: "ספרות", emoji: "✂️" },
    { key: "beauty", label: "סלון יופי", emoji: "💅" },
    { key: "gym", label: "חדר כושר", emoji: "🏋️" },
    { key: "clothing", label: "חנות בגדים", emoji: "👗" },
    { key: "grocery", label: "מכולת / סופר", emoji: "🛒" },
    { key: "cleaning", label: "שירותי ניקיון", emoji: "🧹" },
    { key: "hotel", label: "מלון / צימר", emoji: "🏨" },
    { key: "other", label: "אחר", emoji: "🏢" },
  ];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 flex-row px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
        <span className="text-xs font-semibold text-white max-w-[120px] truncate">{session.businessName}</span>
        <Building2 size={13} style={{ color: "rgba(255,255,255,0.6)" }} />
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => { setOpen(false); setAdding(false); }}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl flex flex-col"
            style={{ background: "var(--surface)", maxHeight: "85vh" }}>

            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: "var(--border)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-row"
              style={{ borderBottom: "1px solid var(--border)" }}>
              {adding
                ? <button onClick={() => setAdding(false)} className="p-1">
                    <ArrowLeft size={18} style={{ color: "var(--text-secondary)" }} />
                  </button>
                : <button onClick={() => { setOpen(false); setAdding(false); }} className="p-1">
                    <X size={18} style={{ color: "var(--text-secondary)" }} />
                  </button>
              }
              <p className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                {adding ? "הוספת סניף חדש" : "הסניפים שלי"}
              </p>
              <Store size={16} style={{ color: "var(--blue)" }} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* Branch list */}
              {!adding && (
                <>
                  {branches.map(b => {
                    const isCurrent = b.businessId === session.businessId;
                    return (
                      <button key={b.businessId}
                        onClick={() => !isCurrent && switchBranch(b)}
                        className="flex items-center gap-3 flex-row w-full px-4 py-3.5 rounded-2xl text-right transition-all"
                        style={{
                          background: isCurrent ? "rgba(249,115,22,0.08)" : "var(--gray-bg)",
                          border: `1.5px solid ${isCurrent ? "rgba(249,115,22,0.35)" : "var(--border)"}`,
                        }}>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>{b.name}</p>
                          {b.city && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{b.city}</p>}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xl">{BUSINESS_EMOJIS[b.businessType] || "🏢"}</span>
                        </div>
                        {isCurrent
                          ? <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "#F97316" }}>
                              <Check size={10} color="white" strokeWidth={3} />
                            </div>
                          : <div className="w-5 h-5 rounded-full flex-shrink-0"
                              style={{ border: "1.5px solid var(--border)" }} />
                        }
                      </button>
                    );
                  })}

                  {/* Add branch button */}
                  <button
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-2 flex-row w-full px-4 py-3.5 rounded-2xl"
                    style={{ border: "1.5px dashed var(--border)", color: "#F97316" }}>
                    <span className="flex-1 text-sm font-semibold text-right">הוסף סניף חדש</span>
                    <Plus size={16} />
                  </button>
                </>
              )}

              {/* Add branch form */}
              {adding && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>שם הסניף</label>
                    <input value={bizName} onChange={e => setBizName(e.target.value)}
                      placeholder='למשל "סניף תל-אביב"'
                      className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                      style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>עיר</label>
                    <input value={bizCity} onChange={e => setBizCity(e.target.value)}
                      placeholder="תל-אביב, חיפה..."
                      className="w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                      style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", color: "var(--text-main)" }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>סוג עסק</label>
                    <div className="grid grid-cols-3 gap-2">
                      {BUSINESS_TYPES.map(t => (
                        <button key={t.key} onClick={() => setBizType(t.key)}
                          className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                          style={{
                            background: bizType === t.key ? "rgba(249,115,22,0.1)" : "var(--gray-bg)",
                            border: `1.5px solid ${bizType === t.key ? "#F97316" : "var(--border)"}`,
                          }}>
                          <span className="text-xl">{t.emoji}</span>
                          <span className="text-[9px] font-semibold text-center"
                            style={{ color: bizType === t.key ? "#F97316" : "var(--text-secondary)" }}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-center" style={{ color: "#EF4444" }}>{error}</p>}

                  <button onClick={addBranch} disabled={loading || !bizName.trim()}
                    className="w-full py-4 rounded-2xl text-sm font-bold text-white"
                    style={{
                      background: loading || !bizName.trim() ? "var(--border)" : "#F97316",
                      boxShadow: !loading && bizName.trim() ? "0 4px 16px rgba(249,115,22,0.3)" : "none",
                    }}>
                    {loading ? "יוצר סניף..." : "צור סניף והיכנס"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
