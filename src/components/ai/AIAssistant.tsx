"use client";
import { useState, useEffect } from "react";
import AICharacter from "./AICharacter";
import AIChatDrawer from "./AIChatDrawer";
import AiProactiveBubble from "./AiProactiveBubble";

type Session = { businessId: string; personId: string; name: string; businessName: string; isManager: boolean };

// Mounted once, globally (see layout.tsx). Renders nothing if there's no
// logged-in business session — purely additive, doesn't touch any page.
export default function AIAssistant() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    function readSession() {
      try {
        const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
        if (s.businessId && s.personId) {
          setSession({
            businessId: s.businessId, personId: s.personId,
            name: s.name || "", businessName: s.businessName || "Sidur",
            isManager: s.role !== "employee",
          });
        } else {
          setSession(null);
        }
      } catch { setSession(null); }
    }
    readSession();
    window.addEventListener("storage", readSession);
    const interval = setInterval(readSession, 3000);
    return () => { window.removeEventListener("storage", readSession); clearInterval(interval); };
  }, []);

  if (!session) return null;

  return (
    <>
      <AICharacter onClick={() => setOpen(true)} />
      {!open && <AiProactiveBubble session={session} onOpenWithMessage={msg => { setPendingMessage(msg); setOpen(true); }} />}
      {open && (
        <AIChatDrawer
          session={session}
          initialMessage={pendingMessage}
          onConsumedInitialMessage={() => setPendingMessage(null)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
