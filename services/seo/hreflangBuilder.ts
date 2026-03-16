import { getDefaultLocale } from "@domain/locationSeo/locationSeoService";
import type { LocationAlternateMap } from "@domain/locationSeo/types";
import { toAbsoluteUrl } from "./urlBuilder";

/**
 * Builds hreflang alternates for all locale versions.
 * Includes ALL alternates (no filtering by indexability) so Google understands
 * language/region relationships and avoids "Duplicate, Google chose different canonical" errors.
 * Indexability is controlled by canonical + robots meta.
 */
export function buildHreflangAlternates(pathsByLocale: LocationAlternateMap): Record<string, string> {
  const localeEntries = Object.entries(pathsByLocale).filter(([, path]) => path);
  const alternates: Record<string, string> = {};

  if (localeEntries.length === 0) {
    return alternates;
  }

  for (const [locale, path] of localeEntries) {
    alternates[locale] = toAbsoluteUrl(path);
  }

  const defaultLocale = getDefaultLocale();
  const defaultPath =
    pathsByLocale[defaultLocale] || localeEntries[0]?.[1] || `/${defaultLocale}`;

  alternates["x-default"] = toAbsoluteUrl(defaultPath);

  return alternates;
}
