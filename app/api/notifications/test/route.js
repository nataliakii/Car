/**
 * Diagnostic endpoint: test email and Telegram locally.
 * GET /api/notifications/test — uses direct send (no internal fetch).
 * Use only in development.
 */
import { NextResponse } from "next/server";
import { sendEmailDirect } from "@/lib/email/sendDirect";
import { sendTelegramDirect } from "@/lib/telegram/sendDirect";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SMTP_HOST: process.env.SMTP_HOST ? "SET" : "NOT SET",
      SMTP_USER: process.env.SMTP_USER ? "SET" : "NOT SET",
      SMTP_PASS: process.env.SMTP_PASS ? "SET" : "NOT SET",
      TELEGRAM_BOT_URL: process.env.TELEGRAM_BOT_URL ? "SET" : "NOT SET",
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? "NOT SET",
    },
    email: null,
    telegram: null,
  };

  // Test email (direct, no fetch)
  try {
    await sendEmailDirect({
      title: "[TEST] Notification diagnostic",
      message: "Test email from /api/notifications/test",
      to: ["cars@bbqr.site"],
      cc: [],
    });
    results.email = { ok: true };
  } catch (err) {
    results.email = { ok: false, error: err.message };
  }

  // Test Telegram (direct, no fetch)
  try {
    const sent = await sendTelegramDirect("[TEST] Notification diagnostic from local");
    results.telegram = { ok: sent };
    if (!sent) results.telegram.error = "sendTelegramDirect returned false";
  } catch (err) {
    results.telegram = { ok: false, error: err.message };
  }

  return NextResponse.json(results);
}
