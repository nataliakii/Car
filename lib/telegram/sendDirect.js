/**
 * Direct Telegram send — no HTTP fetch to internal API.
 * Use for server-side notifications to avoid "fetch failed" when server calls itself.
 */
const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const DEFAULT_ENDPOINT = "/button2607";

/**
 * Send message to Telegram directly (no internal fetch).
 * @param {string} message - Text to send
 * @param {string} [endpoint] - API endpoint (default /button2607)
 * @returns {Promise<boolean>} Success
 */
export async function sendTelegramDirect(message, endpoint = DEFAULT_ENDPOINT) {
  const chatId = TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error("[Telegram] TELEGRAM_CHAT_ID is not configured");
    return false;
  }
  const chatIdNumber = parseInt(chatId, 10);
  if (isNaN(chatIdNumber)) {
    console.error("[Telegram] TELEGRAM_CHAT_ID must be a valid number:", chatId);
    return false;
  }
  if (!TELEGRAM_BOT_URL) {
    console.error("[Telegram] TELEGRAM_BOT_URL is not configured");
    return false;
  }

  try {
    const url = `${TELEGRAM_BOT_URL.replace(/\/$/, "")}${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatIdNumber,
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Telegram] API error:", response.status, errorText);
      return false;
    }
    const result = await response.json();
    if (!result || (result.success === false && result.error)) {
      console.error("[Telegram] API returned failure:", result?.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to send:", error?.message || error);
    return false;
  }
}
