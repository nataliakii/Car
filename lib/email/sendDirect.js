/**
 * Direct email send — no HTTP fetch. Use for server-side notifications
 * to avoid "fetch failed" when server calls itself.
 */
import nodemailer from "nodemailer";
import { DEVELOPER_EMAIL } from "@config/email";
import { EMAIL_SIGNATURE_HTML, EMAIL_SIGNATURE_TEXT } from "@/app/ui/email/templates/signature";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error("Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS)");
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 465),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function wrapTextWithSignature(title, text) {
  const lines = (text || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height: 8px;"></div>';
      return `<div style="margin: 8px 0; color: #1a1a1a; line-height: 1.6; font-family: sans-serif;">${trimmed
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/&/g, "&amp;")}</div>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${(title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title></head>
<body style="margin: 0; padding: 24px; font-family: sans-serif;">
  ${lines}
  ${EMAIL_SIGNATURE_HTML}
</body>
</html>`;
}

/**
 * Send email directly (no HTTP). Same contract as /api/sendEmail expects.
 * @param {{ title: string, message: string, html?: string, to: string[], cc?: string[] }}
 */
export async function sendEmailDirect({ title, message, html, to, cc = [] }) {
  const { SMTP_USER } = process.env;
  const hasReadyHtml = typeof html === "string" && html.trim().length > 0;
  const finalText = hasReadyHtml ? message || "" : `${message || ""}\n\n${EMAIL_SIGNATURE_TEXT}`;
  const finalHtml = hasReadyHtml ? html : wrapTextWithSignature(title, message || "");

  const toList = Array.isArray(to) ? to.filter(Boolean) : [];
  if (toList.length === 0) toList.push(DEVELOPER_EMAIL);

  const info = await getTransporter().sendMail({
    from: `Natali Cars <${SMTP_USER}>`,
    to: toList,
    cc: Array.isArray(cc) && cc.length > 0 ? cc.filter(Boolean) : undefined,
    replyTo: SMTP_USER,
    subject: title,
    text: finalText,
    html: finalHtml,
  });
  return { messageId: info.messageId, accepted: info.accepted };
}
