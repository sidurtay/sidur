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
      <body className="min-h-full flex flex-col">
        {children}
        <AIAssistant />
        <CapacitorInit />
      </body>
    </html>
  );
}
