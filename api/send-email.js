import nodemailer from "nodemailer";
import { AUTOMATION_SENDER_EMAIL } from "../src/constants/emailSequence.js";

// Every email this route sends (buyer emails, account activation, password
// reset) goes out from the business Gmail, youwinestates@gmail.com, through
// Gmail's SMTP with an app password — the same account and setup as the
// seller follow-up sequence (api/send-scheduled-lead-emails.js).
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = process.env.GMAIL_USER || AUTOMATION_SENDER_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) {
    return res.status(500).json({
      error: `Email is not configured. Set GMAIL_APP_PASSWORD (an app password for ${user}).`,
    });
  }

  const { toEmail, subject, textContent, htmlContent, fromName } =
    req.body || {};
  if (!toEmail || !subject || !textContent) {
    return res.status(400).json({
      error: "toEmail, subject, and textContent are required.",
    });
  }

  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    const info = await transport.sendMail({
      from: `"${fromName || "You Win Estates"}" <${user}>`,
      to: toEmail,
      subject,
      text: textContent,
      ...(htmlContent ? { html: htmlContent } : {}),
    });
    return res
      .status(200)
      .json({ ok: true, provider: "gmail", messageId: info.messageId });
  } catch (err) {
    return res.status(502).json({
      error: `Gmail could not send the email: ${err.message}`,
    });
  }
}
