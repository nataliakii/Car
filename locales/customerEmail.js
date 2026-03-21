/**
 * Тексты писем клиенту и orderNotification (если подключают).
 * Локали: en, ru, el, uk, de, bg, ro, sr — ключи customerEmail / orderNotification в JSON.
 */

import enLocale from "./en.json";
import ruLocale from "./ru.json";
import elLocale from "./el.json";
import ukLocale from "./uk.json";
import deLocale from "./de.json";
import bgLocale from "./bg.json";
import roLocale from "./ro.json";
import srLocale from "./sr.json";

/** Языки, для которых в проекте есть блоки customerEmail */
const SUPPORTED = ["en", "ru", "el", "uk", "de", "bg", "ro", "sr"];
const DEFAULT_LOCALE = "en";

const customerEmailByLocale = {
  en: enLocale.customerEmail,
  ru: ruLocale.customerEmail,
  el: elLocale.customerEmail,
  uk: ukLocale.customerEmail,
  de: deLocale.customerEmail,
  bg: bgLocale.customerEmail,
  ro: roLocale.customerEmail,
  sr: srLocale.customerEmail,
};

const orderNotificationByLocale = {
  en: enLocale.orderNotification,
  ru: ruLocale.orderNotification,
  el: elLocale.orderNotification,
  uk: ukLocale.orderNotification,
  de: deLocale.orderNotification,
  bg: bgLocale.orderNotification,
  ro: roLocale.orderNotification,
  sr: srLocale.orderNotification,
};

/**
 * Нормализует код языка: "el-GR" → "el", неизвестный → "en".
 * @param {string} [locale]
 * @returns {string}
 */
export function normalizeEmailLocale(locale) {
  if (!locale || typeof locale !== "string") return DEFAULT_LOCALE;
  const base = locale.split(/[-_]/)[0].toLowerCase();
  return SUPPORTED.includes(base) ? base : DEFAULT_LOCALE;
}

/**
 * Локаль для писем клиенту: сначала язык бронирования (clientLang), затем locale заказа, затем fallback (например UI админки).
 * @param {{ clientLang?: string, locale?: string } | null | undefined} order
 * @param {string} [fallbackLocale]
 * @returns {string}
 */
export function pickCustomerEmailLocale(order, fallbackLocale) {
  const cl = order?.clientLang != null && String(order.clientLang).trim();
  if (cl) return normalizeEmailLocale(String(order.clientLang).trim());
  const ol = order?.locale != null && String(order.locale).trim();
  if (ol) return normalizeEmailLocale(String(order.locale).trim());
  return normalizeEmailLocale(fallbackLocale);
}

/**
 * @param {string} [locale]
 * @returns {typeof enLocale.customerEmail}
 */
export function getCustomerEmailStrings(locale) {
  const lang = normalizeEmailLocale(locale);
  return customerEmailByLocale[lang] || customerEmailByLocale[DEFAULT_LOCALE];
}

/**
 * @param {string} [locale]
 * @returns {typeof enLocale.orderNotification}
 */
export function getOrderNotificationStrings(locale) {
  const lang = normalizeEmailLocale(locale);
  return orderNotificationByLocale[lang] || orderNotificationByLocale[DEFAULT_LOCALE];
}

export { SUPPORTED as SUPPORTED_EMAIL_LOCALES, DEFAULT_LOCALE };
