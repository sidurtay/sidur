"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Clock, Users, Plus, X, AlertTriangle, Check, Receipt, ShieldCheck, Mail, Send, Lock, Fingerprint, ChevronLeft, Sparkles, Layers, Crown, Sun, Moon, Monitor } from "lucide-react";
import InstagramIcon from "@/components/InstagramIcon";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import PasskeyCard from "@/components/PasskeyCard";
import PushNotificationCard from "@/components/PushNotificationCard";
import FaqAccordion from "@/components/FaqAccordion";
import EmployeeSettings from "./EmployeeSettings";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  getStoredConfig, savePermanent, saveWeekOverride,
  configChanged, DEFAULT_CONFIG,
  type BusinessConfig, type DayConfig, type ShiftSplit,
} from "@/lib/businessConfig";
import { requiresClockOutApproval, setRequiresClockOutApproval } from "@/lib/clockRequests";
import { getStoredTheme, setTheme as applyThemeChoice, watchSystemTheme, type ThemeMode } from "@/lib/theme";

type SaveScope = "permanent" | "week";
type TipsMode  = "daily" | "per-shift";

const PERMISSIONS = [
  { key: "editSchedule",        label: "עריכת סידור עבודה"     },
  { key: "approveSwaps",        label: "אישור החלפות משמרת"    },
  { key: "publishTips",         label: "פרסום טיפים"           },
  { key: "addEmployee",         label: "הוספת עובד חדש"        },
  { key: "manageAnnouncements", label: "ניהול הודעות לצוות"    },
];

// A separate, inverted flag: ON means the 125% overtime bonus is *disabled*
// for that role — kept apart from PERMISSIONS since it's a pay rule, not an
// app capability, and defaults to "bonus applies normally" when unset.
const DISABLE_OVERTIME_KEY = "disableOvertimeBonus";

type PermMap = Record<string, boolean>;
const DEFAULT_PERMS: Record<string, PermMap> = {
  "אחמ\"ש": { editSchedule: true,  approveSwaps: true,  publishTips: true,  addEmployee: false, manageAnnouncements: false },
  "מלצר":   { editSchedule: false, approveSwaps: false, publishTips: false, addEmployee: false, manageAnnouncements: false },
  "מטבח":   { editSchedule: false, approveSwaps: false, publishTips: false, addEmployee: false, manageAnnouncements: false },
  "בר":     { editSchedule: false, approveSwaps: false, publishTips: false, addEmployee: false, manageAnnouncements: false },
  "שטיפה":  { editSchedule: false, approveSwaps: false, publishTips: false, addEmployee: false, manageAnnouncements: false },
};

export default function Settings() {
  const router = useRouter();
  const [bizName, setBizName] = useState(DEFAULT_CONFIG.bizName);
  const [bizId,   setBizId]   = useState(DEFAULT_CONFIG.bizId);
  const [days,    setDays]    = useState<DayConfig[]>(DEFAULT_CONFIG.days);
  const [roles,   setRoles]   = useState<string[]>(DEFAULT_CONFIG.roles);
  const [newRole,    setNewRole]    = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [initialized,   setInitialized]   = useState(false);
  const [saveModal,     setSaveModal]     = useState(false);
  const [savedScope,    setSavedScope]    = useState<SaveScope | null>(null);
  const [flash,         setFlash]         = useState(false);
  const [tipsMode,      setTipsMode]      = useState<TipsMode>("per-shift");
  const [perms,         setPerms]         = useState<Record<string, PermMap>>(DEFAULT_PERMS);
  const [permPopupRole, setPermPopupRole] = useState<string | null>(null);

  // Customer support — manager or אחמ"ש only
  const [canContactSupport, setCanContactSupport] = useState(false);
  const [senderName,  setSenderName]  = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [bizNameForSupport, setBizNameForSupport] = useState("");
  const [supportOpen,    setSupportOpen]    = useState(false);
  const [ticketSubject,  setTicketSubject]  = useState("");
  const [ticketMessage,  setTicketMessage]  = useState("");
  const [sendingTicket,  setSendingTicket]  = useState(false);
  const [ticketResult,   setTicketResult]   = useState<{ success: boolean; error?: string } | null>(null);
  const [role, setRole] = useState<"manager" | "employee" | null>(null);
  const [clockOutApproval, setClockOutApproval] = useState(true);
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [shiftSplit, setShiftSplit] = useState<ShiftSplit>("none");
  const [theme, setThemeState] = useState<ThemeMode>("system");

  useEffect(() => {
    setThemeState(getStoredTheme());
    return watchSystemTheme(() => applyThemeChoice("system"));
  }, []);

  function chooseTheme(mode: ThemeMode) {
    setThemeState(mode);
    applyThemeChoice(mode);
  }

  useEffect(() => {
    const stored = getStoredConfig();
    const cfg    = stored.permanent;
    setBizName(cfg.bizName); setBizId(cfg.bizId);
    setDays(cfg.days); setRoles(cfg.roles); setInitialized(cfg.initialized);
    const tm = localStorage.getItem("shiftpro_tips_mode");
    if (tm === "daily" || tm === "per-shift") setTipsMode(tm as TipsMode);
    const rp = localStorage.getItem("shiftpro_role_perms");
    if (rp) try { setPerms(JSON.parse(rp)); } catch {}
    setClockOutApproval(requiresClockOutApproval());

    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
      setSenderName(s.name || s.businessName || "מנהל");
      setSenderPhone(s.phone || "");
      setBizNameForSupport(s.businessName || cfg.bizName);
      setCanContactSupport(s.role === "manager" || s.role === "אחמ\"ש");
      setRole(s.role === "employee" ? "employee" : "manager");
      setPersonId(s.personId || "");
    } catch { setRole("manager"); }

    setBusinessId(biz);
    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [bizRes, hoursRes, rolesRes, permsRes] = await Promise.all([
          fetch(`/api/business?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/business-hours?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/roles?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/role-permissions?businessId=${biz}`).then(r => r.json()),
        ]);
        if (bizRes.success) {
          setBizName(bizRes.business.name); setBizId(bizRes.business.businessIdNum);
          setTipsMode(bizRes.business.tipsMode); setClockOutApproval(bizRes.business.clockoutRequiresApproval);
          setPlan(bizRes.business.plan || "starter");
          setShiftSplit(bizRes.business.shiftSplit || "none");
        }
        if (hoursRes.success) setDays(hoursRes.days);
        if (rolesRes.success) setRoles(rolesRes.roles.map((r: { key: string }) => r.key));
        if (permsRes.success) setPerms(prev => ({ ...prev, ...permsRes.perms }));
        setInitialized(true);
      } catch {}
    })();
  }, []);

  function toggleClockOutApproval() {
    const next = !clockOutApproval;
    setClockOutApproval(next);
    setRequiresClockOutApproval(next);
    fetch("/api/business", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, clockoutRequiresApproval: next }),
    }).catch(() => {});
  }

  if (role === "employee") return <EmployeeSettings />;
  if (role === null) return null;

  async function sendSupportTicket() {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setSendingTicket(true);
    setTicketResult(null);
    try {
      const res = await fetch("/api/send-support-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          senderName, senderPhone,
          businessName: bizNameForSupport,
          businessId: businessId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketResult({ success: true });
        setTicketSubject(""); setTicketMessage("");
      } else {
        // Keep the ticket locally so nothing gets lost until support email is configured
        const queued = JSON.parse(localStorage.getItem("shiftpro_support_tickets") || "[]");
        queued.push({ subject: ticketSubject.trim(), message: ticketMessage.trim(), senderName, senderPhone, businessName: bizNameForSupport, createdAt: Date.now() });
        localStorage.setItem("shiftpro_support_tickets", JSON.stringify(queued));
        setTicketResult({ success: false, error: data.error });
      }
    } catch {
      setTicketResult({ success: false, error: "שגיאת רשת" });
    } finally {
      setSendingTicket(false);
    }
  }

  function currentConfig(): BusinessConfig { return { bizName, bizId, days, roles, initialized }; }

  function handleSaveClick() {
    if (!initialized) { commitSave("permanent"); return; }
    const stored = getStoredConfig().permanent;
    if (!configChanged(stored, currentConfig())) { flashSaved(); return; }
    setSaveModal(true);
  }

  function commitSave(scope: SaveScope) {
    const cfg = currentConfig();
    if (scope === "permanent") { savePermanent(cfg); setInitialized(true); }
    else { savePermanent({ ...cfg }); saveWeekOverride(days); }
    localStorage.setItem("shiftpro_tips_mode", tipsMode);
    localStorage.setItem("shiftpro_role_perms", JSON.stringify(perms));

    fetch("/api/business", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name: bizName, businessIdNum: bizId, tipsMode, clockoutRequiresApproval: clockOutApproval, shiftSplit: plan === "starter" ? "none" : shiftSplit }),
    }).catch(() => {});
    if (scope === "permanent") {
      fetch("/api/business-hours", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, days }),
      }).catch(() => {});
    }
    roles.forEach(r => {
      fetch("/api/role-permissions", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, roleKey: r, perms: perms[r] || {} }),
      }).catch(() => {});
    });

    setSaveModal(false); setSavedScope(scope); flashSaved();
  }

  function flashSaved() {
    setFlash(true);
    setTimeout(() => { setFlash(false); setSavedScope(null); }, 2500);
  }

  function toggleDay(i: number) {
    setDays(prev => prev.map((d, idx) =>
      idx === i ? { ...d, open: !d.open, from: !d.open ? "08:00" : d.from, to: !d.open ? "23:00" : d.to } : d
    ));
  }
  function updateTime(i: number, field: "from" | "to", val: string) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }
  function removeRole(r: string) {
    setRoles(prev => prev.filter(x => x !== r));
    fetch(`/api/roles?businessId=${businessId}&key=${encodeURIComponent(r)}`, { method: "DELETE" }).catch(() => {});
  }
  function addRoleFn() {
    if (!newRole.trim()) return;
    const r = newRole.trim();
    setRoles(prev => [...prev, r]);
    setPerms(prev => ({ ...prev, [r]: { editSchedule: false, approveSwaps: false, publishTips: false, addEmployee: false, manageAnnouncements: false } }));
    setNewRole(""); setAddingRole(false);
    fetch("/api/roles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name: r }),
    }).catch(() => {});
  }
  function togglePerm(role: string, perm: string) {
    setPerms(prev => ({ ...prev, [role]: { ...(prev[role] || {}), [perm]: !(prev[role]?.[perm]) } }));
  }

  const openCount  = days.filter(d => d.open).length;
  const popupPerms = permPopupRole ? (perms[permPopupRole] || {}) : {};
  const enabledCount = permPopupRole ? PERMISSIONS.filter(p => popupPerms[p.key]).length : 0;

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <p className="text-base font-bold text-right">הגדרות עסק</p>
      </div>

      <div className="px-3 py-3 flex flex-col gap-4">

        {/* Appearance — light / dark / follow device */}
        <div>
          <SectionHeader icon={theme === "dark" ? Moon : theme === "light" ? Sun : Monitor} title="מצב תצוגה" />
          <Card padded={false}>
            <div className="flex flex-row gap-2 p-3">
              {([
                ["light",  "בהיר",        Sun],
                ["dark",   "כהה",         Moon],
                ["system", "לפי המכשיר",  Monitor],
              ] as [ThemeMode, string, typeof Sun][]).map(([mode, label, Icon]) => (
                <button key={mode} onClick={() => chooseTheme(mode)}
                  className="flex-1 rounded-xl p-3 flex flex-col items-center gap-1.5"
                  style={theme === mode
                    ? { background: "var(--navy)", border: "2px solid var(--navy)" }
                    : { background: "var(--gray-bg)", border: "1.5px solid var(--border)" }}>
                  <Icon size={18} style={{ color: theme === mode ? "#fff" : "var(--text-secondary)" }} />
                  <p className="text-xs font-semibold" style={{ color: theme === mode ? "#fff" : "var(--text-main)" }}>{label}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Business details */}
        <div>
          <SectionHeader icon={Store} title="פרטי העסק" />
          <Card padded={false} className="overflow-hidden">
            {[
              { label: "שם העסק",          value: bizName, onChange: setBizName },
              { label: "ח.פ / עוסק מורשה", value: bizId,   onChange: setBizId   },
            ].map((f, i) => (
              <div key={f.label} className="px-3 py-2.5"
                style={{ borderBottom: i === 0 ? "1px solid var(--border)" : "none" }}>
                <p className="text-xs mb-1 text-right" style={{ color: "var(--text-secondary)" }}>{f.label}</p>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-right"
                  style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}
                  value={f.value} onChange={e => f.onChange(e.target.value)} />
              </div>
            ))}
          </Card>
        </div>

        {/* Hours & days */}
        <div>
          <SectionHeader icon={Clock} title="ימי פעילות ושעות פתיחה"
            action={
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                {openCount} ימים פתוחים
              </span>
            } />
          <Card padded={false} className="overflow-hidden">
          {days.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3 px-3 py-2.5 flex-row"
              style={{
                borderBottom: i < days.length - 1 ? "1px solid var(--border)" : "none",
                background: d.open ? "transparent" : "var(--gray-bg)",
                opacity: d.open ? 1 : 0.6,
              }}>
              <span className="text-sm font-medium flex-shrink-0 w-12 text-right"
                style={{ color: d.open ? "var(--text-main)" : "var(--text-secondary)" }}>
                {d.name}
              </span>
              <button onClick={() => toggleDay(i)} className="relative flex-shrink-0"
                style={{ width: 32, height: 18, borderRadius: 9, background: d.open ? "var(--navy)" : "#C4C2B8", transition: "background 0.2s" }}>
                <span className="absolute top-1 rounded-full bg-white transition-all"
                  style={{ width: 12, height: 12, right: d.open ? 3 : 17, transition: "right 0.2s" }} />
              </button>
              <div className="flex-1 flex items-center gap-1.5 flex-row">
                {d.open ? (
                  <div className="flex items-center gap-1 rounded-lg overflow-hidden flex-row"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }}>
                    <input type="time" value={d.from} onChange={e => updateTime(i, "from", e.target.value)}
                      className="text-xs py-1.5 font-medium bg-transparent border-0 outline-none text-center"
                      style={{ width: 72, color: "var(--text-main)", direction: "ltr" }} />
                    <span className="text-xs select-none" style={{ color: "#9A9890" }}>–</span>
                    <input type="time" value={d.to} onChange={e => updateTime(i, "to", e.target.value)}
                      className="text-xs py-1.5 font-medium bg-transparent border-0 outline-none text-center"
                      style={{ width: 72, color: "var(--text-main)", direction: "ltr" }} />
                  </div>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--gray-bg)", color: "#9A9890", border: "1px solid var(--border)" }}>סגור</span>
                )}
              </div>
            </div>
          ))}
          <div className="px-3 py-2 flex items-center gap-2 flex-row"
            style={{ borderTop: "1px solid var(--border)", background: "var(--blue-light)" }}>
            <p className="flex-1 text-xs text-right" style={{ color: "var(--blue)" }}>
              הגדרות אלו מחברות לסידור, לאילוצי העובדים וה-AI
            </p>
            <Check size={13} style={{ color: "var(--blue)" }} />
          </div>
          </Card>
        </div>

        {/* Shift split — gated by plan */}
        <div>
          <SectionHeader icon={Layers} title="חילוק משמרות בסידור"
            action={plan === "starter" ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 flex-row"
                style={{ background: "var(--navy)", color: "#fff" }}>
                <Crown size={10} /> Plus ומעלה
              </span>
            ) : undefined} />
          <Card padded={false} className="overflow-hidden">

          {plan === "starter" ? (
            <div className="px-3 py-4 flex flex-col items-center gap-2 text-center">
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                במסלול Starter הסידור מציג כל עובד בבלוק אחד ליום. שדרגו ל-Plus או Business כדי לחלק את הסידור לבוקר, ערב ואפילו לילה.
              </p>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-2">
              <p className="text-xs text-right mb-1" style={{ color: "var(--text-secondary)" }}>
                איך לחלק את הסידור היומי בכל תפקיד
              </p>
              <div className="flex flex-col gap-2">
                {([
                  ["none", "בלי חילוק", "כל העובדים ביחד, כמו היום"],
                  ["morning_evening", "בוקר וערב", "מחלק את כל תפקיד לשתי משמרות"],
                  ["morning_evening_night", "בוקר, ערב ולילה", "מתאים למקום שפתוח 24 שעות"],
                ] as [ShiftSplit, string, string][]).map(([mode, label, desc]) => (
                  <button key={mode} onClick={() => setShiftSplit(mode)}
                    className="rounded-xl p-3 text-right flex items-center justify-between flex-row"
                    style={shiftSplit === mode
                      ? { background: "var(--navy)", border: "2px solid var(--navy)" }
                      : { background: "var(--gray-bg)", border: "1.5px solid var(--border)" }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ border: `2px solid ${shiftSplit === mode ? "#fff" : "var(--border)"}` }}>
                      {shiftSplit === mode && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} />}
                    </div>
                    <div className="flex-1 mr-2">
                      <p className="text-xs font-bold" style={{ color: shiftSplit === mode ? "#fff" : "var(--text-main)" }}>{label}</p>
                      <p className="text-[10px]" style={{ color: shiftSplit === mode ? "rgba(255,255,255,0.65)" : "var(--text-secondary)" }}>{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          </Card>
        </div>

        {/* Tips mode */}
        <div>
          <SectionHeader icon={Receipt} title="חישוב טיפים" />
          <Card padded={false}>
          <div className="flex flex-row gap-2 p-3">
            {([
              ["per-shift", "פר משמרת", "בוקר וערב בנפרד"],
              ["daily",     "יומי",     "סכום אחד לכל היום"],
            ] as [TipsMode, string, string][]).map(([mode, label, desc]) => (
              <button key={mode} onClick={() => setTipsMode(mode)}
                className="flex-1 rounded-xl p-3 text-right flex flex-col gap-1"
                style={tipsMode === mode
                  ? { background: "var(--navy)", border: "2px solid var(--navy)" }
                  : { background: "var(--gray-bg)", border: "1.5px solid var(--border)" }}>
                <div className="flex items-center justify-between flex-row">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: tipsMode === mode ? "#fff" : "var(--border)" }}>
                    {tipsMode === mode && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: tipsMode === mode ? "#fff" : "var(--text-main)" }}>{label}</p>
                </div>
                <p className="text-[10px]" style={{ color: tipsMode === mode ? "rgba(255,255,255,0.65)" : "var(--text-secondary)" }}>{desc}</p>
              </button>
            ))}
          </div>
          </Card>
        </div>

        {/* Roles + permissions */}
        <div>
          <SectionHeader icon={Users} title="תפקידים והרשאות" />
          <Card padded={false}>
          <div className="px-3 pt-3 pb-2 flex flex-wrap gap-2 flex-row">
            {roles.map(r => {
              const rp    = perms[r] || {};
              const count = PERMISSIONS.filter(p => rp[p.key]).length;
              return (
                <button key={r} onClick={() => setPermPopupRole(r)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs flex-row"
                  style={{ background: "var(--gray-bg)", color: "var(--text-main)", border: "1px solid var(--border)" }}>
                  {count > 0 && (
                    <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--navy)", color: "#fff" }}>{count}</span>
                  )}
                  <ShieldCheck size={10} style={{ color: count > 0 ? "var(--blue)" : "var(--text-secondary)" }} />
                  {r}
                </button>
              );
            })}
            {!addingRole ? (
              <button onClick={() => setAddingRole(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs flex-row"
                style={{ border: "1px dashed #C4C2B8", color: "var(--blue)" }}>
                <Plus size={11} /> הוסף תפקיד
              </button>
            ) : (
              <div className="flex items-center gap-1 flex-row">
                <button onClick={addRoleFn} className="text-xs font-semibold" style={{ color: "var(--blue)" }}>הוסף</button>
                <input autoFocus value={newRole} onChange={e => setNewRole(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addRoleFn()}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ border: "1px solid var(--blue)", width: 90, textAlign: "right" }}
                  placeholder="שם תפקיד" />
              </div>
            )}
          </div>
          <p className="text-[10px] px-3 pb-2.5" style={{ color: "var(--text-secondary)" }}>
            לחץ על תפקיד לבחירת הרשאות גישה
          </p>
          </Card>
        </div>

        {/* Fingerprint / Face ID login for this device */}
        {businessId && personId && <PasskeyCard businessId={businessId} personId={personId} />}

        {/* Real push notifications outside the app */}
        {businessId && personId && <PushNotificationCard businessId={businessId} personId={personId} />}

        {/* Clock in/out via app */}
        <div>
          <SectionHeader icon={Fingerprint} title="דיווח נוכחות באפליקציה" />
          <Card padded={false}>
          <p className="text-xs px-3 pt-2.5 pb-2 text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            עובדים מדווחים כניסה ויציאה מהאפליקציה, ואתה מאשר בלחיצה. כניסה דורשת אישור תמיד.
          </p>
          <div className="w-full flex items-center justify-between px-3 py-3 flex-row">
            <button onClick={toggleClockOutApproval} className="relative flex-shrink-0"
              style={{ width: 36, height: 20, borderRadius: 10, background: clockOutApproval ? "var(--navy)" : "#C4C2B8", transition: "background 0.2s" }}>
              <span className="absolute top-1 rounded-full bg-white transition-all"
                style={{ width: 14, height: 14, right: clockOutApproval ? 3 : 19, transition: "right 0.2s" }} />
            </button>
            <p className="text-sm">דרוש אישור מנהל גם ביציאה ממשמרת</p>
          </div>
          </Card>
        </div>

        {/* Plan upgrades */}
        <div>
          <SectionHeader icon={Sparkles} title="שדרוגי מסלול" />
          <Card padded={false} className="overflow-hidden">
          <a href="/biometric-device"
            className="flex items-center justify-between px-3 py-3 flex-row"
            style={{ background: "var(--blue-light)" }}>
            <ChevronLeft size={14} style={{ color: "var(--blue)" }} />
            <div className="flex-1 text-right mx-2">
              <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>Sidur Touch — שעון נוכחות ביומטרי</p>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>לעסקים גדולים — בקרוב</p>
            </div>
            <Fingerprint size={18} style={{ color: "var(--blue)" }} />
          </a>
          </Card>
        </div>

        {/* FAQ — visible to everyone; manager-only questions filtered by role */}
        <FaqAccordion isManager={role === "manager"} />

        {/* Customer support — manager / אחמ"ש only */}
        {canContactSupport && (
          <div>
            <SectionHeader icon={Mail} title="שירות לקוחות — Sidur"
              action={
                <button onClick={() => { setSupportOpen(true); setTicketResult(null); }}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--navy)", color: "#fff" }}>
                  <Plus size={11} /> פנייה חדשה
                </button>
              } />
            <Card padded={false}>
            <p className="text-xs px-3 py-2.5 text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              תקלה או שאלה באפליקציה? שלח הודעה ישירה לצוות Sidur — נקבל התראה ונחזור אליך מהר.
            </p>
            <div className="flex items-center justify-end gap-1.5 px-3 pb-2 flex-row">
              <a href="mailto:sidur.support@gmail.com" className="text-xs font-medium" style={{ color: "var(--blue)", direction: "ltr" }}>
                sidur.support@gmail.com
              </a>
              <p className="text-[10px]" style={{ color: "#9A9890" }}>לפניות עסקיות / שיתופי פעולה:</p>
            </div>
            <div className="flex items-center justify-end gap-1.5 px-3 pb-2.5 flex-row">
              <a href="https://instagram.com/sidur.app" target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1 flex-row" style={{ color: "var(--blue)", direction: "ltr" }}>
                <InstagramIcon size={12} /> sidur.app
              </a>
              <p className="text-[10px]" style={{ color: "#9A9890" }}>עקבו אחרינו:</p>
            </div>
            </Card>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSaveClick}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: flash ? "var(--green)" : "var(--navy)", transition: "background 0.3s" }}>
          {flash ? (
            <><Check size={15} />{savedScope === "week" ? "נשמר לשבוע הבא בלבד" : "הגדרות נשמרו"}</>
          ) : (
            initialized ? "שמור שינויים" : "שמור הגדרות ראשוניות"
          )}
        </button>
      </div>

      {/* ── Permissions popup ───────────────────────────────── */}
      {permPopupRole && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPermPopupRole(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between px-4 mb-4 flex-row">
              <button onClick={() => setPermPopupRole(null)}>
                <X size={18} style={{ color: "var(--text-secondary)" }} />
              </button>
              <div className="text-right">
                <p className="text-base font-semibold">הרשאות — {permPopupRole}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {enabledCount > 0 ? `${enabledCount} הרשאות פעילות` : "אין הרשאות מיוחדות"}
                </p>
              </div>
            </div>
            <div className="mx-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {PERMISSIONS.map((perm, i) => {
                const enabled = !!(perms[permPopupRole]?.[perm.key]);
                return (
                  <button key={perm.key} onClick={() => togglePerm(permPopupRole, perm.key)}
                    className="w-full flex items-center justify-between px-4 py-3.5 flex-row"
                    style={{
                      borderBottom: i < PERMISSIONS.length - 1 ? "1px solid var(--border)" : "none",
                      background: enabled ? "var(--blue-light)" : "var(--surface)",
                    }}>
                    <div className="w-10 h-5 rounded-full relative flex-shrink-0"
                      style={{ background: enabled ? "var(--navy)" : "#C4C2B8", transition: "background 0.2s" }}>
                      <span className="absolute top-0.5 rounded-full bg-white"
                        style={{ width: 16, height: 16, right: enabled ? 2 : 20, transition: "right 0.2s", position: "absolute" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: enabled ? "var(--blue)" : "var(--text-main)" }}>
                      {perm.label}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className="text-xs px-4 mt-4 mb-2 text-right" style={{ color: "var(--text-secondary)" }}>כלל שכר</p>
            <div className="mx-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(() => {
                const disabled = !!(perms[permPopupRole]?.[DISABLE_OVERTIME_KEY]);
                return (
                  <button onClick={() => togglePerm(permPopupRole, DISABLE_OVERTIME_KEY)}
                    className="w-full flex items-center justify-between px-4 py-3.5 flex-row"
                    style={{ background: disabled ? "var(--amber-light)" : "var(--surface)" }}>
                    <div className="w-10 h-5 rounded-full relative flex-shrink-0"
                      style={{ background: disabled ? "var(--amber)" : "#C4C2B8", transition: "background 0.2s" }}>
                      <span className="absolute top-0.5 rounded-full bg-white"
                        style={{ width: 16, height: 16, right: disabled ? 2 : 20, transition: "right 0.2s", position: "absolute" }} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: disabled ? "var(--amber)" : "var(--text-main)" }}>
                        ביטול 125% על שעות נוספות
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {disabled ? "השכר המשוער יחושב לפי 100% גם על שעות נוספות" : "התעריף הרגיל — 125% על שעות נוספות"}
                      </p>
                    </div>
                  </button>
                );
              })()}
            </div>

            <div className="px-4 mt-3">
              <button onClick={() => setPermPopupRole(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--navy)" }}>
                סיום
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save scope modal ─────────────────────────────────── */}
      {saveModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setSaveModal(false)}>
          <div className="w-full max-w-lg rounded-t-2xl pb-8 bg-white" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "#C4C2B8" }} />
            <div className="flex flex-col items-center gap-2 px-4 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "var(--amber-light)" }}>
                <AlertTriangle size={22} style={{ color: "var(--amber)" }} />
              </div>
              <p className="text-base font-semibold">שינית הגדרות פעילות</p>
              <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                שינויים בימים / שעות ישפיעו על הסידור, האילוצים וה-AI.<br />
                לאן להחיל את השינויים?
              </p>
            </div>
            <div className="px-4 flex flex-col gap-2.5">
              <button onClick={() => commitSave("week")}
                className="w-full rounded-2xl px-4 py-4 text-right flex flex-col gap-0.5"
                style={{ background: "var(--blue-light)", border: "1.5px solid var(--blue-border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>שבוע הבא בלבד</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  הסידור ל-28.6–4.7 יתבסס על ההגדרות החדשות. השבוע שאחרי יחזור להגדרות הרגילות.
                </p>
              </button>
              <button onClick={() => commitSave("permanent")}
                className="w-full rounded-2xl px-4 py-4 text-right flex flex-col gap-0.5"
                style={{ background: "var(--navy)", border: "1.5px solid var(--navy)" }}>
                <p className="text-sm font-semibold text-white">לתמיד</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  כל הסידורים מעכשיו יתבססו על ההגדרות החדשות.
                </p>
              </button>
              <button onClick={() => setSaveModal(false)}
                className="w-full py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                ביטול — חזור לעריכה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer support sheet ─────────────────────────── */}
      {supportOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[60px]" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSupportOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-4 pb-6 bg-white"
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: "#C4C2B8" }} />
            <div className="flex items-center justify-between flex-row mb-4">
              <button onClick={() => setSupportOpen(false)}>
                <X size={18} style={{ color: "var(--text-secondary)" }} />
              </button>
              <p className="text-base font-semibold">פנייה לשירות לקוחות</p>
            </div>

            {ticketResult?.success ? (
              <div className="rounded-xl px-4 py-4 text-center" style={{ background: "var(--green-light)", border: "1px solid #A8D9BB" }}>
                <Check size={20} style={{ color: "var(--green)" }} className="mx-auto mb-1" />
                <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>הפנייה נשלחה!</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>נחזור אליך בהקדם במייל או בטלפון</p>
                <button onClick={() => setSupportOpen(false)}
                  className="mt-3 text-xs font-semibold" style={{ color: "var(--blue)" }}>סגור</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {ticketResult && !ticketResult.success && (
                  <div className="rounded-xl px-3 py-2.5 text-xs text-right" style={{ background: "var(--amber-light)", border: "1px solid #EBC395", color: "var(--amber)" }}>
                    הפנייה נשמרה במכשיר ותישלח אוטומטית כשתתחבר כתובת המייל של התמיכה. בינתיים אפשר גם לפנות ישירות.
                  </div>
                )}
                <div>
                  <p className="text-xs text-right mb-1" style={{ color: "var(--text-secondary)" }}>נושא</p>
                  <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)}
                    placeholder="לדוגמא: תקלה בשליחת WhatsApp"
                    className="w-full text-sm text-right px-3 py-2.5 rounded-xl"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }}
                    autoFocus />
                </div>
                <div>
                  <p className="text-xs text-right mb-1" style={{ color: "var(--text-secondary)" }}>תוכן הפנייה</p>
                  <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)}
                    placeholder="פרט כאן את הבעיה או השאלה..."
                    rows={5}
                    className="w-full text-sm text-right px-3 py-2.5 rounded-xl resize-none"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
                </div>
                <div className="flex items-center gap-1.5 text-xs justify-end" style={{ color: "var(--text-secondary)" }}>
                  <Lock size={11} />
                  <span>זמין רק למנהל ולאחמ&quot;ש</span>
                </div>
                <button onClick={sendSupportTicket} disabled={sendingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: sendingTicket ? "#ADA89D" : (ticketSubject.trim() && ticketMessage.trim() ? "var(--navy)" : "#C4C2B8") }}>
                  <Send size={14} />
                  {sendingTicket ? "שולח..." : "שלח פנייה"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
