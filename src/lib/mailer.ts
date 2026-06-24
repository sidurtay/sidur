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
