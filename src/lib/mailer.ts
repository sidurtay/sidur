import nodemailer from "nodemailer";

// Free Gmail SMTP instead of a paid transactional-email provider — sends as the
// support inbox itself via an App Password (https://myaccount.google.com/apppasswords),
// not the regular account password. Comfortably covers this app's email volume
// (Gmail's free SMTP limit is ~500 messages/day).
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// Shared branded email shell — a dark navy header with the Sidur wordmark, a
// clean white card for the content, and a muted footer. Uses inline styles and
// table-free divs (email clients are picky) and matches the app's palette:
// navy #1A1F29 background accent, orange #F97316 as the brand color. Every
// customer-facing email goes through this so they all look like one product,
// not a pile of raw <p> tags.
export function emailLayout(opts: {
  heading: string;        // big title inside the card
  intro: string;          // greeting line, e.g. "שלום דנה,"
  bodyHtml: string;       // the main content block (already HTML)
  footnote?: string;      // small reassurance line, e.g. "לא ביקשת? התעלם/י"
}): string {
  const { heading, intro, bodyHtml, footnote } = opts;
  return `
  <div dir="rtl" style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
      <div style="text-align:center;padding:8px 0 20px;">
        <span style="font-size:26px;font-weight:800;color:#1A1F29;letter-spacing:-0.5px;">Sidur</span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F97316;margin-inline-start:3px;vertical-align:middle;"></span>
      </div>
      <div style="background:#ffffff;border-radius:18px;padding:28px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);text-align:right;">
        <h1 style="margin:0 0 6px;font-size:19px;font-weight:800;color:#1A1F29;">${heading}</h1>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">${intro}</p>
        ${bodyHtml}
      </div>
      ${footnoteHtml(footnote)}
      <p style="text-align:center;font-size:11px;color:#9CA3AF;margin:16px 0 0;">
        נשלח אוטומטית מ-Sidur · מערכת ניהול המשמרות של העסק שלך
      </p>
    </div>
  </div>`;
}

// small helper so an undefined footnote renders nothing (kept tiny/inline)
function footnoteHtml(text?: string): string {
  return text ? `<p style="text-align:center;font-size:12px;color:#6B7280;margin:14px 0 0;">${text}</p>` : "";
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({ from: `Sidur <${process.env.GMAIL_USER}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("Gmail send error:", err);
    return false;
  }
}
