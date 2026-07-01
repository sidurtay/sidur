"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body>
        <div style={{ padding: 24, textAlign: "center", fontFamily: "sans-serif" }}>
          <p>משהו השתבש. אנא רענן את הדף.</p>
        </div>
      </body>
    </html>
  );
}
