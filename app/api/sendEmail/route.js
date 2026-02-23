// app/api/sendEmail/route.js
//
// SMTP Configuration (.env):
//   SMTP_HOST - SMTP server host
//   SMTP_PORT - SMTP port (default: 465)
//   SMTP_SECURE - "true" for SSL (default: false)
//   SMTP_USER - email address for sending
//   SMTP_PASS - email password
//
// Testing Mode (.env):
//   EMAIL_TESTING=true - enables testing mode (customer email is ignored)
//
// Note: All emails are ALWAYS sent to DEVELOPER_EMAIL (cars@bbqr.site) as the main recipient
//       Customer email is added as CC only in production mode
//
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { DEVELOPER_EMAIL } from "@config/email";
import { EMAIL_SIGNATURE_HTML, EMAIL_SIGNATURE_TEXT } from "@/app/ui/email/templates/signature";

/** Minimal HTML when only text is provided: wrap lines + signature. No theme, no branding. */
function wrapTextWithSignature(title, text) {
  const lines = (text || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<div style=\"height: 8px;\"></div>";
      return "<div style=\"margin: 8px 0; color: #1a1a1a; line-height: 1.6; font-family: sans-serif;\">" + trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;") + "</div>";
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

// SMTP transporter with lazy initialization
let transporter = null;
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;

function getTransporter() {
  if (!transporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
      process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error(
        "Missing SMTP configuration. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables."
      );
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 465),
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

function parseAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) {
    return [];
  }

  const attachments = [];
  for (const item of rawAttachments.slice(0, MAX_ATTACHMENTS)) {
    if (!item || typeof item !== "object") continue;

    const filename =
      typeof item.filename === "string" ? item.filename.trim() : "";
    const contentBase64 =
      typeof item.contentBase64 === "string" ? item.contentBase64.trim() : "";
    if (!filename || !contentBase64) continue;

    const content = Buffer.from(contentBase64, "base64");
    if (!content || content.length === 0 || content.length > MAX_ATTACHMENT_BYTES) {
      continue;
    }

    attachments.push({
      filename,
      content,
      contentType:
        typeof item.contentType === "string" && item.contentType.trim()
          ? item.contentType.trim()
          : undefined,
      disposition: "attachment",
    });
  }

  return attachments;
}

// Use centralized developer email from config
const COMPANY_EMAIL = DEVELOPER_EMAIL;

export async function POST(request) {
  try {
    // Check testing mode
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_TESTING } = process.env;
    const isTestingMode = EMAIL_TESTING === "true";

    console.log("SMTP Config check:", {
      hasHost: !!SMTP_HOST,
      hasUser: !!SMTP_USER,
      hasPass: !!SMTP_PASS,
      host: SMTP_HOST || "NOT SET",
      testingMode: isTestingMode,
      companyEmail: COMPANY_EMAIL,
    });

    // Get transporter (will throw if config is missing)
    const emailTransporter = getTransporter();

    const body = await request.json();
    const {
      title,
      text: bodyText,
      html: bodyHtml,
      to: bodyTo,
      cc: bodyCc,
      replyTo: bodyReplyTo,
      attachments: bodyAttachments,
      email,
      message,
    } = body;

    const text = bodyText != null ? bodyText : message;
    const useNotificationRecipients = Array.isArray(bodyTo) && bodyTo.length > 0;
    const actualCustomerEmail = isTestingMode ? null : email;
    const parsedAttachments = parseAttachments(bodyAttachments);

    console.log("Email request:", {
      companyEmail: COMPANY_EMAIL,
      customerEmail: isTestingMode ? "DISABLED (testing mode)" : email || "not provided",
      subject: title,
      hasText: !!text,
      hasHtml: !!bodyHtml,
      attachmentsCount: parsedAttachments.length,
      testingMode: isTestingMode,
      useNotificationRecipients: !!useNotificationRecipients,
    });

    if (!title || (!text && !bodyHtml)) {
      return NextResponse.json(
        { error: "Missing email content: title and (text or html) required." },
        { status: 400 }
      );
    }

    const hasReadyHtml = typeof bodyHtml === "string" && bodyHtml.trim().length > 0;
    const finalText = hasReadyHtml ? (text || "") : `${text || ""}\n\n${EMAIL_SIGNATURE_TEXT}`;
    const finalHtml = hasReadyHtml ? bodyHtml : wrapTextWithSignature(title, text || "");

    // Determine recipients: either from notification (to/cc) or legacy (company + customer)
    let toRecipients;
    let ccRecipients = [];
    if (useNotificationRecipients) {
      toRecipients = bodyTo.filter(Boolean);
      ccRecipients = Array.isArray(bodyCc) ? bodyCc.filter(Boolean) : [];
    } else {
      if (isTestingMode) {
        toRecipients = [COMPANY_EMAIL];
      } else {
        toRecipients =
          actualCustomerEmail && actualCustomerEmail.trim()
            ? [COMPANY_EMAIL, actualCustomerEmail.trim()]
            : [COMPANY_EMAIL];
      }
    }

    // In testing mode, prefix subject with [TEST]
    const emailSubject = isTestingMode ? `[TEST] ${title}` : title;

    const mailOptions = {
      from: `Natali Cars <${SMTP_USER}>`,
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      replyTo: bodyReplyTo || SMTP_USER,
      subject: emailSubject,
      text: finalText,
      html: finalHtml,
      attachments: parsedAttachments.length > 0 ? parsedAttachments : undefined,
    };

    console.log("Sending email with mailOptions:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await emailTransporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
    });

    return NextResponse.json(
      {
        status: "Email sent",
        messageId: info.messageId,
        accepted: info.accepted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error.message);
    console.error("Full error:", error);
    return NextResponse.json(
      {
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
