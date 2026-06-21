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
      style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      className="fixed bottom-0 right-0 left-0 z-50 flex"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-[11px] transition-colors"
            style={{ color: active ? "var(--blue)" : "var(--text-secondary)" }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
            <span style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
