/**
 * Sitemap & noindex — единый источник настроек.
 *
 * Удобное добавление noindex:
 * - NOINDEX_SLUGS: slug страницы — подхватит все локали
 * - NOINDEX_LOCATION_IDS: ID локаций — все страницы этой локации (все локали) не индексируются
 * - NOINDEX_PATTERNS: полные пути или RegExp для особых случаев
 */

import {
  STATIC_PAGE_KEYS,
} from "@domain/locationSeo/locationSeoKeys";

// ── NOINDEX (исключить из sitemap + robots: noindex,follow) ─────────────────

/**
 * ID локаций для noindex. Добавьте сюда locationId (например "sithonia", "kassandra") —
 * все страницы этой локации (во всех языках) не будут индексироваться.
 */
export const NOINDEX_LOCATION_IDS = [
  // "sithonia",
  // "kassandra",
];

/** Проверяет, должна ли локация быть noindex. */
export function isNoindexLocation(locationId) {
  return NOINDEX_LOCATION_IDS.includes(locationId);
}

/**
 * Slug страниц для noindex. Один slug = все локали автоматически.
 * Добавьте сюда slug новой страницы — она не будет индексироваться.
 */
export const NOINDEX_SLUGS = [
  "cookie-policy",
  "privacy-policy",
  "terms-of-service",
  "rental-terms",
];

/**
 * Дополнительные паттерны: полные пути или RegExp.
 * Используйте, когда нужна точная настройка (например /admin, /preview).
 */
export const NOINDEX_PATTERNS = [
  "/admin",
  // /\/preview\//,
];

/** Проверяет, должен ли путь быть noindex. */
export function isNoindexPath(path) {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (NOINDEX_SLUGS.some((slug) => normalized.endsWith("/" + slug))) {
    return true;
  }
  return NOINDEX_PATTERNS.some((entry) => {
    if (typeof entry === "string") {
      return normalized === entry || normalized.endsWith(entry);
    }
    return entry.test(normalized);
  });
}

// ── SITEMAP: статические страницы ───────────────────────────────────────────

/** Статические страницы, которые включаются в sitemap. */
export const SITEMAP_STATIC_PAGES = [
  STATIC_PAGE_KEYS.CONTACTS,
];

/** Страницы с noindex (для metadataBuilder). Выводится из NOINDEX_SLUGS. */
export const NOINDEX_STATIC_PAGES = new Set(
  Object.values(STATIC_PAGE_KEYS).filter((slug) => NOINDEX_SLUGS.includes(slug))
);
