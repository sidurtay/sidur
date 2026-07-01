"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pin, Users, ChefHat, GlassWater, UtensilsCrossed, X, Send, Trash2, MoreVertical, Pencil, ArrowRight, Plus, Check, Camera } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

type Message = { id: string | number; from: string; text: string; time: string; isMine: boolean; senderId?: string; initials?: string; color?: string; textColor?: string };
type Channel = {
  id: string;
  name: string;
  iconName: string;
  last: string;
  time: string;
  unread: number;
  pinned: boolean;
  color: string;
  iconColor: string;
  emoji?: string;
  memberIds?: string[];
};

const PALETTE = [
  { bg: "#FDF0E4", icon: "#C2540C" },
  { bg: "#E1F5EE", icon: "#085041" },
  { bg: "#EEEDFE", icon: "#3C3489" },
  { bg: "#FAECE7", icon: "#712B13" },
  { bg: "#FFF3CC", icon: "#7A5800" },
  { bg: "#F1EFE8", icon: "#444441" },
  { bg: "#FFE4F0", icon: "#8B1A4A" },
  { bg: "#F2E4D8", icon: "#6B4226" },
];

const EMOJIS = ["👥","🍽️","🍺","🫧","🧹","⭐","🔥","💬","🎯","🎉","📢","🍕"];

const iconMap: Record<string, React.ComponentType<{ size: number }>> = {
  Users, UtensilsCrossed, ChefHat, GlassWater,
};

type WizardStep = "name" | "emoji" | "color" | "members";

export default function Chat() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [isManager, setIsManager] = useState(true);
  const [coworkers, setCoworkers] = useState<{ id: string; name: string; initials: string; role: string; color: string; textColor: string }[]>([]);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);

  const [openChannelId, setOpenChannelId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const [longPressId, setLongPressId] = useState<string | number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingEmoji, setEditingEmoji] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // New group wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("name");
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("💬");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [newMembers, setNewMembers] = useState<string[]>([]);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openChannel = channels.find(c => c.id === openChannelId) || null;
  const openMessages = liveMessages;

  useEffect(() => {
    let biz = "", person = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || ""; person = s.personId || "";
      setIsManager(s.role !== "employee");
    } catch {}
    setBusinessId(biz); setPersonId(person);
    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [chRes, empRes] = await Promise.all([
          fetch(`/api/chat/channels?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
        ]);
        if (chRes.success) {
          setChannels(chRes.channels.map((c: { id: string; name: string; emoji?: string; color: string; iconColor: string; pinned: boolean; last: string; time: string; memberIds: string[] }) => ({
            id: c.id, name: c.name, iconName: "Users", emoji: c.emoji, color: c.color || "#FDF0E4", iconColor: c.iconColor || "#C2540C",
            pinned: c.pinned, last: c.last, time: c.time, unread: 0, memberIds: c.memberIds,
          })));
        }
        if (empRes.success) setCoworkers(empRes.employees);
      } catch {}
    })();
  }, []);

  async function openCh(ch: Channel) {
    setOpenChannelId(ch.id);
    setLiveMessages([]);
    try {
      const res = await fetch(`/api/chat/messages?channelId=${ch.id}`).then(r => r.json());
      if (res.success) {
        setLiveMessages(res.messages.map((m: { id: string; from: string; text: string; time: string; senderId: string; initials?: string; color?: string; textColor?: string }) => ({
          id: m.id, from: m.from, text: m.text, time: m.time, isMine: m.senderId === personId,
          senderId: m.senderId, initials: m.initials, color: m.color, textColor: m.textColor,
        })));
      }
    } catch {}
  }

  async function sendMsg() {
    if (!msgInput.trim() || !openChannel) return;
    const text = msgInput.trim();
    setMsgInput("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: openChannel.id, senderId: personId, body: text, callerId: personId }),
      }).then(r => r.json());
      if (res.success) {
        setLiveMessages(prev => [...prev, { id: res.message.id, from: res.message.from, text: res.message.text, time: res.message.time, isMine: true, senderId: personId }]);
        setChannels(prev => prev.map(c => c.id === openChannel.id ? { ...c, last: `${res.message.from}: ${text}`, time: res.message.time } : c));
      }
    } catch {}
  }

  function deleteMsg(msgId: string | number) {
    if (!openChannel) return;
    fetch(`/api/chat/messages?id=${msgId}&callerId=${personId}`, { method: "DELETE" }).catch(() => {});
    setLiveMessages(prev => prev.filter(m => m.id !== msgId));
    setLongPressId(null);
  }

  function renameChannel() {
    if (!openChannel || !nameInput.trim()) return;
    fetch("/api/chat/channels", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: openChannel.id, name: nameInput.trim(), callerId: personId }),
    }).catch(() => {});
    setChannels(prev => prev.map(c => c.id === openChannel.id ? { ...c, name: nameInput.trim() } : c));
    setEditingName(false);
    setShowSettings(false);
  }

  function changeEmoji(emoji: string) {
    if (!openChannel) return;
    fetch("/api/chat/channels", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: openChannel.id, emoji, callerId: personId }),
    }).catch(() => {});
    setChannels(prev => prev.map(c => c.id === openChannel.id ? { ...c, emoji } : c));
    setEditingEmoji(false);
    setShowSettings(false);
  }

  function changeColor(p: { bg: string; icon: string }) {
    if (!openChannel) return;
    fetch("/api/chat/channels", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: openChannel.id, color: p.bg, iconColor: p.icon, callerId: personId }),
    }).catch(() => {});
    setChannels(prev => prev.map(c => c.id === openChannel.id ? { ...c, color: p.bg, iconColor: p.icon } : c));
  }

  function deleteChannel() {
    if (!openChannel) return;
    fetch(`/api/chat/channels?id=${openChannel.id}&callerId=${personId}`, { method: "DELETE" }).catch(() => {});
    setChannels(prev => prev.filter(c => c.id !== openChannel.id));
    setOpenChannelId(null);
    setDeleteConfirm(false);
    setShowSettings(false);
  }

  async function createGroup() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name: newName.trim(), emoji: newEmoji, color: newColor.bg, iconColor: newColor.icon, memberIds: newMembers, callerId: personId }),
      }).then(r => r.json());
      if (res.success) {
        setChannels(prev => [...prev, {
          id: res.channel.id, name: res.channel.name, iconName: "Users", emoji: res.channel.emoji,
          color: res.channel.color, iconColor: res.channel.iconColor, pinned: false, unread: 0,
          last: res.channel.last, time: res.channel.time, memberIds: res.channel.memberIds,
        }]);
      }
    } catch {}

    setShowWizard(false);
    setNewName(""); setNewEmoji("💬"); setNewColor(PALETTE[0]); setNewMembers([]);
    setWizardStep("name");
  }

  function handleLongPressStart(msgId: string | number) {
    pressTimer.current = setTimeout(() => setLongPressId(msgId), 500);
  }
  function handleLongPressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  // ── Channel view ────────────────────────────────────────────────────────────
  if (openChannel) {
    const Icon = iconMap[openChannel.iconName];
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
        {/* Header */}
        <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 flex-row"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setOpenChannelId(null); setShowSettings(false); setLongPressId(null); }}>
            <ArrowRight size={20} style={{ color: "var(--text-secondary)" }} />
          </button>
          {/* Group avatar */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: openChannel.color }}>
            {openChannel.emoji ?? (Icon && <Icon size={18} />)}
          </div>
          <div className="flex-1 text-right">
            <p className="text-base font-semibold">{openChannel.name}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{openMessages.length} הודעות</p>
          </div>
          {isManager && (
            <button onClick={() => setShowSettings(s => !s)}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--gray-bg)", border: "1px solid var(--border)" }}>
              <MoreVertical size={15} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>

        {/* Settings dropdown */}
        {showSettings && isManager && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
            <div className="absolute top-28 left-4 z-50 bg-white rounded-xl shadow-xl overflow-hidden"
              style={{ border: "1px solid var(--border)", minWidth: 196 }}>
              <button onClick={() => { setNameInput(openChannel.name); setEditingName(true); setShowSettings(false); }}
                className="flex items-center gap-3 px-4 py-3 w-full flex-row"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="flex-1 text-right text-sm">שנה שם קבוצה</span>
                <Pencil size={14} style={{ color: "var(--text-secondary)" }} />
              </button>
              <button onClick={() => { setEditingEmoji(true); setShowSettings(false); }}
                className="flex items-center gap-3 px-4 py-3 w-full flex-row"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="flex-1 text-right text-sm">שנה תמונת קבוצה</span>
                <Camera size={14} style={{ color: "var(--text-secondary)" }} />
              </button>
              <button onClick={() => { setDeleteConfirm(true); setShowSettings(false); }}
                className="flex items-center gap-3 px-4 py-3 w-full flex-row">
                <span className="flex-1 text-right text-sm" style={{ color: "var(--red)" }}>מחק קבוצה</span>
                <Trash2 size={14} style={{ color: "var(--red)" }} />
              </button>
            </div>
          </>
        )}

        {/* Rename modal */}
        {editingName && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setEditingName(false)}>
            <div className="bg-white rounded-2xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <p className="text-base font-semibold text-right mb-3">שנה שם קבוצה</p>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                className="w-full text-sm text-right px-3 py-2.5 rounded-xl mb-3"
                style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} autoFocus />
              <div className="flex gap-2 flex-row">
                <button onClick={() => setEditingName(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>ביטול</button>
                <button onClick={renameChannel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--navy)" }}>שמור</button>
              </div>
            </div>
          </div>
        )}

        {/* Emoji picker modal */}
        {editingEmoji && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setEditingEmoji(false)}>
            <div className="w-full max-w-lg rounded-t-2xl pb-8 bg-white" onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--border)" }} />
              <p className="text-base font-semibold text-right px-4 mb-4">בחר תמונת קבוצה</p>
              {/* Current big avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: openChannel.color, border: "3px solid var(--border)" }}>
                  {openChannel.emoji}
                </div>
              </div>
              {/* Emoji grid */}
              <div className="grid grid-cols-6 gap-3 px-4 mb-4">
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => changeEmoji(em)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform active:scale-90"
                    style={{
                      background: openChannel.emoji === em ? "var(--blue-light)" : "var(--gray-bg)",
                      border: openChannel.emoji === em ? "2px solid var(--blue)" : "1px solid var(--border)",
                    }}>
                    {em}
                  </button>
                ))}
              </div>
              {/* Color palette */}
              <p className="text-xs text-right px-4 mb-2" style={{ color: "var(--text-secondary)" }}>צבע רקע</p>
              <div className="flex flex-row gap-2 px-4 flex-wrap">
                {PALETTE.map((p, i) => (
                  <button key={i} onClick={() => changeColor(p)}
                    className="w-9 h-9 rounded-full relative flex items-center justify-center"
                    style={{ background: p.bg, border: openChannel.color === p.bg ? `2px solid ${p.icon}` : "2px solid transparent" }}>
                    {openChannel.color === p.bg && <Check size={14} style={{ color: p.icon }} />}
                  </button>
                ))}
              </div>
              <div className="px-4 mt-4">
                <button onClick={() => setEditingEmoji(false)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--navy)" }}>סיום</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setDeleteConfirm(false)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--red-light)" }}>
                <Trash2 size={22} style={{ color: "var(--red)" }} />
              </div>
              <p className="text-base font-semibold mb-1">מחק קבוצה?</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                כל ההודעות ב״{openChannel.name}״ יימחקו לצמיתות
              </p>
              <div className="flex gap-2 flex-row">
                <button onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>ביטול</button>
                <button onClick={deleteChannel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--red)" }}>מחק</button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto" style={{ paddingBottom: 100 }}>
          {openMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-4xl">{openChannel.emoji}</span>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>עדיין אין הודעות בקבוצה</p>
            </div>
          )}
          {openMessages.map(msg => (
            <div key={msg.id}
              className={`flex flex-col gap-1 ${msg.isMine ? "items-end" : "items-start"}`}
              onMouseDown={() => handleLongPressStart(msg.id)}
              onMouseUp={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(msg.id)}
              onTouchEnd={handleLongPressEnd}>
              {!msg.isMine && (() => {
                const initials = msg.initials;
                const color = msg.color;
                const textColor = msg.textColor;
                return (
                  <div className="flex items-center gap-1.5 flex-row px-1">
                    {initials && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: color, color: textColor }}>
                        {initials}
                      </div>
                    )}
                    <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>{msg.from}</p>
                  </div>
                );
              })()}
              <div className="flex items-end gap-2 flex-row">
                {longPressId === msg.id && (
                  <button onClick={() => deleteMsg(msg.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--red-light)", border: "1px solid var(--red-border)" }}>
                    <Trash2 size={13} style={{ color: "var(--red)" }} />
                  </button>
                )}
                <div className="px-3 py-2 rounded-2xl max-w-[80%] text-sm"
                  style={msg.isMine
                    ? { background: "var(--navy)", color: "#fff", borderBottomRightRadius: 6 }
                    : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)", borderBottomLeftRadius: 6 }
                  }>
                  {msg.text}
                </div>
              </div>
              <p className="text-[10px] px-1" style={{ color: "var(--text-secondary)" }}>{msg.time}</p>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="fixed bottom-16 right-0 left-0 bg-white px-4 py-2"
          style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-row">
            <button onClick={sendMsg}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--navy)" }}>
              <Send size={15} color="white" />
            </button>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMsg(); }}
              placeholder="כתוב הודעה..."
              className="flex-1 text-sm text-right px-3 py-2 rounded-xl"
              style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
          </div>
        </div>

        {longPressId && <div className="fixed inset-0 z-30" onClick={() => setLongPressId(null)} />}
        <BottomNav />
      </div>
    );
  }

  // ── Channel list ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--gray-bg)" }}>
      <div className="bg-white px-4 pt-12 pb-3 flex items-center justify-between flex-row relative"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        {isManager && (
          <button onClick={() => { setShowWizard(true); setWizardStep("name"); }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--navy)" }}>
            <Plus size={16} color="white" />
          </button>
        )}
        <p className="text-base font-semibold">צ׳אט פנימי</p>
      </div>

      <div className="px-3 py-3 flex flex-col gap-2">
        {channels.length === 0 && (
          <div className="bg-white rounded-xl p-6 text-center" style={{ border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>אין עדיין קבוצות צ׳אט</p>
          </div>
        )}
        {channels.map(ch => {
          const Icon = iconMap[ch.iconName];
          return (
            <div key={ch.id}>
              {ch.pinned && (
                <div className="flex items-center gap-1 mb-1 flex-row justify-end">
                  <span className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: "var(--amber-light)", color: "var(--amber)" }}>הודעה נעוצה</span>
                  <Pin size={10} style={{ color: "var(--amber)" }} />
                </div>
              )}
              <div className="bg-white rounded-xl px-3 py-3 flex items-center gap-3 flex-row cursor-pointer"
                style={{ border: "1px solid var(--border)" }}
                onClick={() => openCh(ch)}>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{ch.time}</span>
                  {ch.unread > 0 && (
                    <span className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--navy)", minWidth: 20, textAlign: "center" }}>
                      {ch.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-sm font-semibold">{ch.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{ch.last}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: ch.color, color: ch.iconColor }}>
                  {ch.emoji ?? (Icon && <Icon size={18} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New group wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowWizard(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white" style={{ maxHeight: "90vh", overflowY: "auto", paddingBottom: 88 }}
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: "var(--border)" }} />

            {/* Wizard step indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {(["name","emoji","color","members"] as WizardStep[]).map(s => (
                <div key={s} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: wizardStep === s ? "var(--navy)" : "var(--border)", width: wizardStep === s ? 20 : 8 }} />
              ))}
            </div>

            <div className="px-4">
              {/* Preview avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: newColor.bg, border: "3px solid var(--border)" }}>
                  {newEmoji}
                </div>
              </div>

              {wizardStep === "name" && (
                <>
                  <p className="text-base font-semibold text-right mb-3">שם הקבוצה</p>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="לדוגמא: ערב שישי, חגים..."
                    className="w-full text-sm text-right px-3 py-3 rounded-xl mb-4"
                    style={{ border: "1px solid var(--border)", background: "var(--gray-bg)", fontSize: 15 }}
                    autoFocus />
                  <div className="flex gap-2 flex-row">
                    <button onClick={() => setShowWizard(false)}
                      className="flex-1 py-3 rounded-xl text-sm"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>ביטול</button>
                    <button onClick={() => newName.trim() && setWizardStep("emoji")}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                      style={{ background: newName.trim() ? "var(--navy)" : "var(--border)" }}>
                      הבא →
                    </button>
                  </div>
                </>
              )}

              {wizardStep === "emoji" && (
                <>
                  <p className="text-base font-semibold text-right mb-3">בחר אמוג׳י לקבוצה</p>
                  <div className="grid grid-cols-6 gap-3 mb-4">
                    {EMOJIS.map(em => (
                      <button key={em} onClick={() => setNewEmoji(em)}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                        style={{
                          background: newEmoji === em ? "var(--blue-light)" : "var(--gray-bg)",
                          border: newEmoji === em ? "2px solid var(--blue)" : "1px solid var(--border)",
                        }}>
                        {em}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-row">
                    <button onClick={() => setWizardStep("name")}
                      className="flex-1 py-3 rounded-xl text-sm"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>← חזור</button>
                    <button onClick={() => setWizardStep("color")}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "var(--navy)" }}>הבא →</button>
                  </div>
                </>
              )}

              {wizardStep === "color" && (
                <>
                  <p className="text-base font-semibold text-right mb-3">צבע הקבוצה</p>
                  <div className="flex flex-row flex-wrap gap-3 mb-5">
                    {PALETTE.map((p, i) => (
                      <button key={i} onClick={() => setNewColor(p)}
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: p.bg, border: newColor.bg === p.bg ? `3px solid ${p.icon}` : "2px solid transparent" }}>
                        {newColor.bg === p.bg && <Check size={16} style={{ color: p.icon }} />}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-row">
                    <button onClick={() => setWizardStep("emoji")}
                      className="flex-1 py-3 rounded-xl text-sm"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>← חזור</button>
                    <button onClick={() => setWizardStep("members")}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "var(--navy)" }}>הבא →</button>
                  </div>
                </>
              )}

              {wizardStep === "members" && (
                <>
                  <p className="text-base font-semibold text-right mb-1">הוסף עובדים</p>
                  <p className="text-xs text-right mb-3" style={{ color: "var(--text-secondary)" }}>
                    {newMembers.length > 0 ? `${newMembers.length} נבחרו` : "בחר לפחות עובד אחד"}
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {coworkers.map(emp => {
                      const selected = newMembers.includes(emp.id);
                      return (
                        <button key={emp.id}
                          onClick={() => setNewMembers(prev => selected ? prev.filter(n => n !== emp.id) : [...prev, emp.id])}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl flex-row"
                          style={{
                            background: selected ? "var(--blue-light)" : "var(--surface)",
                            border: selected ? "1px solid var(--blue-border)" : "1px solid var(--border)",
                          }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: selected ? "var(--navy)" : "var(--gray-bg)", border: selected ? "none" : "1px solid var(--border)" }}>
                            {selected && <Check size={11} color="white" />}
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{emp.role}</span>
                          <p className="flex-1 text-right text-sm font-medium">{emp.name}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 flex-row">
                    <button onClick={() => setWizardStep("color")}
                      className="flex-1 py-3 rounded-xl text-sm"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>← חזור</button>
                    <button onClick={createGroup}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "var(--navy)" }}>צור קבוצה</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
