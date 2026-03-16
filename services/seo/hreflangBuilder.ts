import { getDefaultLocale } from "@domain/locationSeo/locationSeoService";
import type { LocationAlternateMap } from "@domain/locationSeo/types";
import { shouldIndexPath } from "./indexingPolicy";
import { toAbsoluteUrl } from "./urlBuilder";

export function buildHreflangAlternates(pathsByLocale: LocationAlternateMap): Record<string, string> {
  const localeEntries = Object.entries(pathsByLocale).filter(([, path]) =>
    shouldIndexPath(path)
  );
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
