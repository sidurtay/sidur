"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import PasskeyCard from "@/components/PasskeyCard";
import FaqAccordion from "@/components/FaqAccordion";

export default function EmployeeSettings() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setName(s.name || "");
      setPhone(s.phone || "");
      setBusinessId(s.businessId || "");
      setPersonId(s.personId || "");
    } catch {}
  }, []);

  function logout() {
    localStorage.removeItem("shiftpro_session");
    router.push("/login");
  }

  return (
    <div className="flex flex-col min-h-screen pb-16" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <p className="text-base font-semibold text-right">הגדרות</p>
      </div>

      <div className="px-3 py-3 flex flex-col gap-4">
        <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between flex-row" style={{ border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)", direction: "ltr" }}>{phone}</p>
          <p className="text-sm font-semibold">{name}</p>
        </div>

        {businessId && personId && <PasskeyCard businessId={businessId} personId={personId} />}

        <FaqAccordion isManager={false} />

        <button onClick={logout}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "var(--red-light)", color: "var(--red)" }}>
          <LogOut size={15} /> התנתקות
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
