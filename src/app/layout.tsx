import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import ThemeListener from "@/components/ThemeListener";

export const metadata: Metadata = {
  title: "Sidur",
  description: "ניהול עובדים למסעדות ובתי קפה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeListener />
        {children}
      </body>
    </html>
  );
}
