"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, MessageSquare, Settings, Clock } from "lucide-react";

const managerTabs = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/schedule", label: "סידור", icon: CalendarDays },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/chat", label: "צ'אט", icon: MessageSquare },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

const employeeTabs = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/schedule", label: "סידור", icon: CalendarDays },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/my-hours", label: "השעות שלי", icon: Clock },
  { href: "/chat", label: "צ'אט", icon: MessageSquare },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [tabs, setTabs] = useState(managerTabs);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      setTabs(s.role === "employee" ? employeeTabs : managerTabs);
    } catch {}
  }, []);

  return (
    <nav
      className="fixed bottom-3 right-3 left-3 z-50 flex"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: 22,
        boxShadow: "0 8px 28px rgba(31,41,55,0.12), 0 1px 2px rgba(31,41,55,0.06)",
        padding: 6,
      }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
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
      })}
    </nav>
  );
}
