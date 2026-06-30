import type { Metadata } from "next";
import "./globals.css";
import AIAssistant from "@/components/ai/AIAssistant";
import CapacitorInit from "@/components/CapacitorInit";

export const metadata: Metadata = {
  title: "Sidur",
  description: "ניהול עובדים למסעדות ובתי קפה",
  other: {
    // Tells iOS/Android WebView to extend into the notch/Dynamic Island area
    // so we fill the full screen like a real native app
    "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full" suppressHydrationWarning>
      <head>
        {/* Applies the theme before first paint — avoids a flash of the
            wrong theme that a useEffect (runs after render) couldn't prevent. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("shiftpro_theme")||"system";var d=m==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;document.documentElement.setAttribute("data-theme",d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <AIAssistant />
        <CapacitorInit />
      </body>
    </html>
  );
}
