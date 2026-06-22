import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
