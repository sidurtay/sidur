"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import PasskeyCard from "@/components/PasskeyCard";
import PushNotificationCard from "@/components/PushNotificationCard";
import ProfileCard from "@/components/ProfileCard";
import FaqAccordion from "@/components/FaqAccordion";

type Profile = { name: string; email: string; phone: string; initials: string; color: string; textColor: string; avatarUrl?: string };

export default function EmployeeSettings() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setBusinessId(s.businessId || "");
      setPersonId(s.personId || "");
      if (s.businessId && s.personId) {
        fetch(`/api/people/me?businessId=${s.businessId}&personId=${s.personId}`)
          .then(r => r.json())
          .then(res => { if (res.success) setProfile(res); })
          .catch(() => {});
      }
    } catch {}
  }, []);

  function handleProfileSaved(update: { name: string; email: string }) {
    setProfile(prev => prev ? { ...prev, ...update } : prev);
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      localStorage.setItem("shiftpro_session", JSON.stringify({ ...s, name: update.name }));
    } catch {}
  }

  function logout() {
    localStorage.removeItem("shiftpro_session");
    router.push("/login");
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <p className="text-base font-semibold text-right">הגדרות</p>
      </div>

      <div className="px-3 py-3 flex flex-col gap-4">
        {businessId && personId && profile && (
          <ProfileCard businessId={businessId} personId={personId} profile={profile} onSaved={handleProfileSaved} />
        )}

        {businessId && personId && <PasskeyCard businessId={businessId} personId={personId} />}
        {businessId && personId && <PushNotificationCard businessId={businessId} personId={personId} />}

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
