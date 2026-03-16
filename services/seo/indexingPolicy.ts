import type { Metadata } from "next";
import { PRODUCTION_BASE_URL } from "@config/seo";
import {
  isNoindexPath,
  NOINDEX_LOCATION_IDS,
} from "@config/sitemapConfig";
import { SUPPORTED_LOCALES } from "@domain/locationSeo/locationSeoKeys";
import { getLocationSeoSlug } from "@domain/seoPages/seoPageRegistry";
import { LOCATION_IDS } from "@domain/locationSeo/locationSeoKeys";
import {
  getAllLocationsForLocale,
  getLocationPathFromLocation,
} from "@domain/locationSeo/locationSeoService";

export const INDEXING_MODE = "allowlist" as const;

/** Paths for locations in NOINDEX_LOCATION_IDS (all locales). */
function buildNoindexLocationPaths(): Set<string> {
  const set = new Set<string>();
  if (NOINDEX_LOCATION_IDS.length === 0) return set;
  for (const locale of SUPPORTED_LOCALES) {
    const locations = getAllLocationsForLocale(locale);
    for (const loc of locations) {
      if (NOINDEX_LOCATION_IDS.includes(loc.id)) {
        set.add(getLocationPathFromLocation(locale, loc).replace(/\/+$/, "") || "/");
      }
    }
  }
  return set;
}

const NOINDEX_LOCATION_PATHS = buildNoindexLocationPaths();

/** Primary SEO locations for indexing allowlist. */
const PRIMARY_LOCATION_IDS = [
  LOCATION_IDS.HALKIDIKI,
  LOCATION_IDS.THESSALONIKI_AIRPORT,
  LOCATION_IDS.NEA_KALLIKRATIA,
  LOCATION_IDS.THESSALONIKI,
] as const;

/** Generate allowlisted paths from domain: /{locale}/locations/{seoSlug}. */
function buildAllowlistedPaths(): string[] {
  const paths: string[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    for (const locationId of PRIMARY_LOCATION_IDS) {
      const slug = getLocationSeoSlug(locationId, locale);
      if (slug) {
        paths.push(`/${locale}/locations/${slug}`);
      }
    }
  }
  return paths;
}

const ALLOWLISTED_PATHS = buildAllowlistedPaths();

function normalizePath(path: string): string {
  if (!path) return "/";

  try {
    const url = path.startsWith("http")
      ? new URL(path)
      : new URL(path, PRODUCTION_BASE_URL);
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
    return withLeadingSlash.replace(/\/+$/, "") || "/";
  }
}

export const INDEXABLE_PATHS = new Set(
  ALLOWLISTED_PATHS.map((path) => normalizePath(path))
);

export function shouldIndexPath(path: string): boolean {
  const normalized = normalizePath(path);
  if (isNoindexPath(normalized) || NOINDEX_LOCATION_PATHS.has(normalized)) {
    return false;
  }
  if (INDEXING_MODE === "all") {
    return true;
  }
  return INDEXABLE_PATHS.has(normalized);
}

export function getRobotsForPath(
  path: string,
  forceNoindex = false
): Metadata["robots"] {
  if (forceNoindex || !shouldIndexPath(path)) {
    return { index: false, follow: true };
  }

  return { index: true, follow: true };
}

