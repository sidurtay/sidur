"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Settings, Clock, Fingerprint } from "lucide-react";
import ClockInSheet from "./ClockInSheet";

const managerTabs = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/schedule", label: "סידור", icon: CalendarDays },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

const employeeTabs = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/schedule", label: "סידור", icon: CalendarDays },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/my-hours", label: "השעות שלי", icon: Clock },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [tabs, setTabs] = useState(managerTabs);
  const [session, setSession] = useState<{ businessId: string; personId: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setTabs(s.role === "employee" ? employeeTabs : managerTabs);
      if (s.businessId && s.personId) setSession({ businessId: s.businessId, personId: s.personId });
    } catch {}
  }, []);

  const mid = Math.ceil(tabs.length / 2);
  const rightTabs = tabs.slice(0, mid); // first in DOM → rightmost in RTL
  const leftTabs = tabs.slice(mid);

  function renderTab({ href, label, icon: Icon }: (typeof tabs)[number]) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 text-[10.5px] transition-all"
        style={{ color: active ? "var(--blue)" : "var(--text-secondary)" }}
      >
        <span
          className="flex items-center justify-center transition-all"
          style={{
            width: 38, height: 26, borderRadius: 13,
            background: active ? "var(--blue-light)" : "transparent",
          }}
        >
          <Icon size={20} strokeWidth={active ? 2.3 : 1.6} />
        </span>
        <span style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav
        className="fixed bottom-3 right-3 left-3 z-50 flex items-center"
        style={{
          background: "var(--nav-glass-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--nav-glass-border)",
          borderRadius: 22,
          boxShadow: "0 8px 28px rgba(31,41,55,0.12), 0 1px 2px rgba(31,41,55,0.06)",
          padding: 6,
        }}
      >
        {rightTabs.map(renderTab)}

        {/* Central clock-in button — pops up above the bar, opens the
            fingerprint + live-location sheet from anywhere in the app. */}
        {session && (
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="שעון נוכחות"
            className="flex-shrink-0 rounded-full flex items-center justify-center mx-1"
            style={{
              width: 68, height: 68, marginTop: -30,
              background: "linear-gradient(135deg, var(--navy), var(--blue))",
              boxShadow: "0 10px 26px -4px rgba(249,115,22,0.6)",
              border: "3.5px solid var(--surface)",
            }}
          >
            <Fingerprint size={30} color="#fff" />
          </button>
        )}

        {leftTabs.map(renderTab)}
      </nav>

      {sheetOpen && session && (
        <ClockInSheet businessId={session.businessId} personId={session.personId} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}
