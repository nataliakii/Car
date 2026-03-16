import {
  CARS_ROUTE_SEGMENT,
  DEFAULT_LOCALE,
  HUB_NAV_LOCATION_IDS,
  LOCATION_IDS,
  LOCATION_ROUTE_SEGMENT,
  REQUIRED_CONTENT_LOCALES,
  STATIC_PAGE_KEYS,
  SUPPORTED_LOCALES,
  type LocationId,
  type StaticPageKey,
  type SupportedLocale,
} from "./locationSeoKeys";

/** Query param on homepage for preselected pickup location (canonical slug). */
export const HOMEPAGE_PICKUP_PARAM = "pickup" as const;
import {
  LOCATION_PAGE_CONTENT,
  type LocationPageContentItem,
} from "./locationContentRepo";
import {
  localeSeoDictionary,
  locationContentByKey,
  locationSeoRepo,
} from "./locationSeoRepo";
import {
  getLocationHeroSubtitleSentence,
  getLocationBookingSentence,
  shouldApplyLocationBookingCopyToId,
} from "./locationBookingCopy";
import {
  getLocationPathSegments,
  resolveLocationIdByPath,
  getAllHierarchyPathSegments,
  HALKIDIKI_AREA_IDS,
} from "./locationHierarchy";
import {
  getLocationSeoSlug as getLocationSeoSlugFromSeoLocations,
  getLocationIdBySeoSlug,
} from "@domain/seoPages/seoPageRegistry";
import type {
  LocaleDetectionInput,
  LocationAlternateMap,
  LocationSeoRepoItem,
  LocationSeoResolved,
} from "./types";

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

const staticPagePathMap: Record<StaticPageKey, string> = {
  [STATIC_PAGE_KEYS.CONTACTS]: "/contacts",
  [STATIC_PAGE_KEYS.PRIVACY_POLICY]: "/privacy-policy",
  [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: "/terms-of-service",
  [STATIC_PAGE_KEYS.COOKIE_POLICY]: "/cookie-policy",
  [STATIC_PAGE_KEYS.RENTAL_TERMS]: "/rental-terms",
};

const locationById = new Map<LocationId, LocationSeoRepoItem>(
  locationSeoRepo.map((item) => [item.id, item])
);

// Primary SEO locations where URLs must always use localized SEO slugs
// instead of hierarchy IDs (e.g. /en/locations/car-rental-thessaloniki).
const PRIMARY_SEO_LOCATION_IDS = new Set<LocationId>([
  LOCATION_IDS.HALKIDIKI,
  LOCATION_IDS.THESSALONIKI,
  LOCATION_IDS.THESSALONIKI_AIRPORT,
  LOCATION_IDS.NEA_KALLIKRATIA,
]);

const DISTANCE_TO_THESSALONIKI_HIDDEN_LOCATION_IDS = new Set<LocationId>([
  LOCATION_IDS.THESSALONIKI,
  LOCATION_IDS.THESSALONIKI_AIRPORT,
]);

const LEGACY_SINGLE_SEGMENT_LOCATION_SLUGS: Partial<
  Record<SupportedLocale, Record<string, LocationId>>
> = {
  el: {
    "enoikiasi-autokinitou-aerodromio-thessaloniki":
      LOCATION_IDS.THESSALONIKI_AIRPORT,
    "enoikiasi-nea-kallikratia": LOCATION_IDS.NEA_KALLIKRATIA,
  },
};

const LEGACY_LOCATION_SLUGS: Partial<
  Record<LocationId, Partial<Record<SupportedLocale, string>>>
> = {
  [LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI]: {
    en: "car-rental-agios-nikolaos-halkidiki",
    ru: "arenda-avto-agios-nikolaos-halkidiki",
    uk: "orenda-avto-agios-nikolaos-halkidiki",
    el: "enoikiasi-agios-nikolaos-halkidiki",
    de: "mietwagen-agios-nikolaos-halkidiki",
    bg: "koli-pod-naem-agios-nikolaos-halkidiki",
    ro: "inchirieri-auto-agios-nikolaos-halkidiki",
    sr: "rent-a-car-agios-nikolaos-halkidiki",
  },
};

function normalizeLocaleCandidate(locale: string): SupportedLocale {
  const normalized = locale.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALE_SET.has(normalized)
    ? (normalized as SupportedLocale)
    : DEFAULT_LOCALE;
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template
  );
}

function getSlugCandidatesForLocale(
  repoItem: LocationSeoRepoItem,
  locale: SupportedLocale
): string[] {
  const candidates = [repoItem.slugByLocale[locale]];
  const legacySlug = LEGACY_LOCATION_SLUGS[repoItem.id]?.[locale];
  if (legacySlug && legacySlug !== repoItem.slugByLocale[locale]) {
    candidates.push(legacySlug);
  }
  return candidates.filter(Boolean);
}

function findLocationRepoItemByLocalizedSlug(
  locale: SupportedLocale,
  slugCandidate: string
): LocationSeoRepoItem | undefined {
  return locationSeoRepo.find((item) =>
    getSlugCandidatesForLocale(item, locale).includes(slugCandidate)
  );
}

function matchesAnyKnownLocationSlug(
  repoItem: LocationSeoRepoItem,
  slugCandidate: string
): boolean {
  if (repoItem.canonicalSlug === slugCandidate) {
    return true;
  }

  return SUPPORTED_LOCALES.some((locale) =>
    getSlugCandidatesForLocale(repoItem, locale).includes(slugCandidate)
  );
}

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((item) => {
      const [localePart, qPart] = item.trim().split(";");
      const qValue = qPart?.startsWith("q=") ? Number(qPart.replace("q=", "")) : 1;
      return {
        locale: localePart?.toLowerCase() || "",
        q: Number.isFinite(qValue) ? qValue : 1,
      };
    })
    .filter((item) => item.locale)
    .sort((a, b) => b.q - a.q)
    .map((item) => item.locale);
}

function buildLocationSeoRecord(
  locale: SupportedLocale,
  repoItem: LocationSeoRepoItem
): LocationSeoResolved {
  const content = locationContentByKey[repoItem.contentKey][locale];

  return {
    id: repoItem.id,
    slug: repoItem.slugByLocale[locale],
    locale,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    introText: content.introText,
    areaServed: content.areaServed,
    canonicalSlug: repoItem.canonicalSlug,
    locationType: repoItem.locationType,
    parentId: repoItem.parentId || null,
    childIds: repoItem.childIds || [],
    shortName: content.shortName,
    h1: content.h1,
    pickupLocation: content.pickupLocation,
    offerName: content.offerName,
    offerDescription: content.offerDescription,
    mainInfoText: content.mainInfoText,
    distanceToThessalonikiText: content.distanceToThessalonikiText,
    pickupGuidance: content.pickupGuidance,
    nearbyPlaces: content.nearbyPlaces,
    usefulTips: content.usefulTips,
    faq: content.faq,
  };
}

function assertRepositoryIsValid(): void {
  const canonicalSet = new Set<string>();
  const slugSetByLocale = new Map<SupportedLocale, Set<string>>();

  for (const locale of SUPPORTED_LOCALES) {
    slugSetByLocale.set(locale, new Set<string>());
  }

  for (const item of locationSeoRepo) {
    if (canonicalSet.has(item.canonicalSlug)) {
      throw new Error(
        `[locationSeoService] Duplicate canonical slug: ${item.canonicalSlug}`
      );
    }
    canonicalSet.add(item.canonicalSlug);

    if (!locationContentByKey[item.contentKey]) {
      throw new Error(
        `[locationSeoService] Missing content key mapping: ${item.contentKey}`
      );
    }

    for (const locale of SUPPORTED_LOCALES) {
      const slug = item.slugByLocale[locale];
      if (!slug) {
        throw new Error(
          `[locationSeoService] Missing slug for location=${item.id}, locale=${locale}`
        );
      }

      const perLocaleSlugSet = slugSetByLocale.get(locale)!;
      if (perLocaleSlugSet.has(slug)) {
        throw new Error(
          `[locationSeoService] Duplicate localized slug '${slug}' for locale=${locale}`
        );
      }
      perLocaleSlugSet.add(slug);
    }

    for (const requiredLocale of REQUIRED_CONTENT_LOCALES) {
      const localizedContent = locationContentByKey[item.contentKey][requiredLocale];
      if (!localizedContent?.seoTitle || !localizedContent?.seoDescription) {
        throw new Error(
          `[locationSeoService] Required locale content missing for location=${item.id}, locale=${requiredLocale}`
        );
      }
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    const descriptionSet = new Set<string>();
    for (const item of locationSeoRepo) {
      const location = buildLocationSeoRecord(locale, item);
      const normalizedDescription = location.seoDescription.trim().toLowerCase();
      if (descriptionSet.has(normalizedDescription)) {
        throw new Error(
          `[locationSeoService] Duplicate description detected for locale=${locale}`
        );
      }
      descriptionSet.add(normalizedDescription);
    }
  }
}

assertRepositoryIsValid();

export function isSupportedLocale(localeCandidate: string | undefined | null): boolean {
  if (!localeCandidate) return false;
  return SUPPORTED_LOCALE_SET.has(localeCandidate.toLowerCase().split("-")[0]);
}

export function normalizeLocale(localeCandidate: string | undefined | null): SupportedLocale {
  if (!localeCandidate) return DEFAULT_LOCALE;
  return normalizeLocaleCandidate(localeCandidate);
}

export function getSupportedLocales(): SupportedLocale[] {
  return [...SUPPORTED_LOCALES];
}

export function getDefaultLocale(): SupportedLocale {
  return DEFAULT_LOCALE;
}

export function detectBestLocale(input: LocaleDetectionInput = {}): SupportedLocale {
  const cookieLocale = input.cookieLocale ? normalizeLocale(input.cookieLocale) : null;
  if (cookieLocale && isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  if (input.acceptLanguageHeader) {
    const accepted = parseAcceptLanguage(input.acceptLanguageHeader);
    for (const item of accepted) {
      const normalized = normalizeLocale(item);
      if (isSupportedLocale(normalized)) {
        return normalized;
      }
    }
  }

  return DEFAULT_LOCALE;
}

export function getLocaleDictionary(localeCandidate: string | undefined | null) {
  const locale = normalizeLocale(localeCandidate);
  return localeSeoDictionary[locale];
}

export function getHubSeo(localeCandidate: string | undefined | null) {
  const locale = normalizeLocale(localeCandidate);
  return {
    locale,
    ...localeSeoDictionary[locale].hub,
  };
}

export function getStaticPageSeo(
  localeCandidate: string | undefined | null,
  staticPageKey: StaticPageKey
) {
  const locale = normalizeLocale(localeCandidate);
  const pageSeo = localeSeoDictionary[locale].staticPages[staticPageKey];
  if (!pageSeo) {
    throw new Error(`[locationSeoService] Missing static page seo: ${staticPageKey}`);
  }
  return {
    locale,
    ...pageSeo,
  };
}

export function getAllLocationsForLocale(
  localeCandidate: string | undefined | null
): LocationSeoResolved[] {
  const locale = normalizeLocale(localeCandidate);
  return locationSeoRepo.map((item) => buildLocationSeoRecord(locale, item));
}

// ---------------------------------------------------------------------------
// Centralized SEO slug + path helpers
// ---------------------------------------------------------------------------

/** Localized SEO slug for a location id and locale. Single source: SEO_LOCATIONS; fallback to repo for non-SEO locations. */
export function getLocationSeoSlug(
  locationId: LocationId,
  locale: SupportedLocale
): string {
  const slug = getLocationSeoSlugFromSeoLocations(locationId, locale);
  if (slug) return slug;
  const repoItem = locationById.get(locationId);
  return (repoItem?.slugByLocale[locale] ||
    repoItem?.slugByLocale[DEFAULT_LOCALE] ||
    repoItem?.canonicalSlug ||
    "") as string;
}

/** Canonical SEO path: /{locale}/locations/{localizedSeoSlug}. Uses SEO_LOCATIONS. */
export function getLocationSeoPath(
  locationId: LocationId,
  locale: SupportedLocale
): string | null {
  const slug = getLocationSeoSlugFromSeoLocations(locationId, locale);
  if (!slug) return null;
  return getLocationPath(locale, slug);
}

/** Reverse lookup: locale + SEO slug → location. Single source: SEO_LOCATIONS; fallback to en slug. */
export function getLocationBySeoSlug(
  localeCandidate: string | undefined | null,
  slug: string
): LocationSeoResolved | null {
  if (!slug || typeof slug !== "string") return null;
  const locale = normalizeLocale(localeCandidate);
  const locationId = getLocationIdBySeoSlug(locale, slug);
  if (!locationId) return null;
  return getLocationById(locale, locationId);
}

/**
 * Resolve a flat single-segment slug for /{locale}/locations/{slug}.
 * Supports canonical primary slugs, localized repo slugs for hierarchy locations,
 * and known legacy aliases that should redirect to the canonical path.
 */
export function resolveLocationFromSingleSegmentSlug(
  localeCandidate: string | undefined | null,
  slugCandidate: string | undefined | null
): LocationSeoResolved | null {
  if (!slugCandidate || typeof slugCandidate !== "string") return null;

  const locale = normalizeLocale(localeCandidate);
  const primaryLocation = getLocationBySeoSlug(locale, slugCandidate);
  if (primaryLocation) return primaryLocation;

  const localizedLocation = getLocationByLocaleAndSlug(locale, slugCandidate);
  if (localizedLocation) return localizedLocation;

  const legacyLocationId = LEGACY_SINGLE_SEGMENT_LOCATION_SLUGS[locale]?.[slugCandidate];
  if (!legacyLocationId) return null;

  return getLocationById(locale, legacyLocationId);
}

/** Hreflang/canonical alternates for a location id. Built from getLocationPathFromLocation (SEO_LOCATIONS). */
export function getLocationAlternates(locationId: LocationId): LocationAlternateMap {
  const alternates: LocationAlternateMap = {};
  for (const locale of SUPPORTED_LOCALES) {
    const location = getLocationById(locale as SupportedLocale, locationId);
    if (location) {
      alternates[locale as SupportedLocale] = getLocationPathFromLocation(locale, location);
    }
  }
  return alternates;
}

/** Hub locations for the navbar Locations dropdown (flat list, legacy). */
export function getHubLocationsForNav(
  localeCandidate: string | undefined | null
): LocationSeoResolved[] {
  const locale = normalizeLocale(localeCandidate);
  return HUB_NAV_LOCATION_IDS.map((id) => getLocationById(locale, id)).filter(
    (loc): loc is LocationSeoResolved => loc != null
  );
}

/** Single nav link: href + label. */
export type NavLocationLink = { href: string; label: string };

/** Region for nav: top-level link and optional child city links (e.g. Halkidiki → cities). */
export type NavLocationGroup = {
  href: string;
  label: string;
  children?: NavLocationLink[];
};

/**
 * Hub location groups for compact Locations UI: main regions first; Halkidiki expands to cities.
 * Use in navbar/drawer to show only main regions, with cities in an expandable panel.
 */
export function getHubLocationGroupsForNav(
  localeCandidate: string | undefined | null
): NavLocationGroup[] {
  const locale = normalizeLocale(localeCandidate);
  return HUB_NAV_LOCATION_IDS.map((id) => {
    const loc = getLocationById(locale, id);
    if (!loc) return null;
    const href = getLocationPathFromLocation(locale, loc);
    const label = loc.shortName;
    return { href, label };
  }).filter((g): g is NavLocationGroup => g != null);
}

export function getLocationById(
  localeCandidate: string | undefined | null,
  locationId: LocationId
): LocationSeoResolved | null {
  const locale = normalizeLocale(localeCandidate);
  const repoItem = locationById.get(locationId);
  if (!repoItem) return null;
  return buildLocationSeoRecord(locale, repoItem);
}

export function getLocationByLocaleAndSlug(
  localeCandidate: string | undefined | null,
  slugCandidate: string | undefined | null
): LocationSeoResolved | null {
  if (!slugCandidate) return null;
  const locale = normalizeLocale(localeCandidate);
  const repoItem = findLocationRepoItemByLocalizedSlug(locale, slugCandidate);
  if (!repoItem) return null;
  return buildLocationSeoRecord(locale, repoItem);
}

/**
 * Find a location by canonical slug (language-independent).
 * Returns the resolved record for the requested locale, or null.
 */
export function getLocationByCanonicalSlug(
  localeCandidate: string | undefined | null,
  canonicalSlugCandidate: string | undefined | null
): LocationSeoResolved | null {
  if (!canonicalSlugCandidate) return null;
  const locale = normalizeLocale(localeCandidate);
  const repoItem = locationSeoRepo.find((item) => item.canonicalSlug === canonicalSlugCandidate);
  if (!repoItem) return null;
  return buildLocationSeoRecord(locale, repoItem);
}

/**
 * Try to find a location by any locale's slug (cross-locale fallback).
 * Returns the resolved record for the requested locale, or null.
 */
export function getLocationByAnySlug(
  localeCandidate: string | undefined | null,
  slugCandidate: string | undefined | null
): LocationSeoResolved | null {
  if (!slugCandidate) return null;
  const locale = normalizeLocale(localeCandidate);
  const repoItem = locationSeoRepo.find((item) =>
    matchesAnyKnownLocationSlug(item, slugCandidate)
  );
  if (!repoItem) return null;
  return buildLocationSeoRecord(locale, repoItem);
}

export function getLocationAlternatesById(locationId: LocationId): LocationAlternateMap {
  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    const loc = getLocationById(locale, locationId);
    if (loc) acc[locale] = getLocationPathFromLocation(locale, loc);
    return acc;
  }, {} as LocationAlternateMap);
}

export function getHubAlternates(): LocationAlternateMap {
  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    acc[locale] = getLocaleRootPath(locale);
    return acc;
  }, {} as LocationAlternateMap);
}

export function getCarAlternates(carSlug: string): LocationAlternateMap {
  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    acc[locale] = getCarPath(locale, carSlug);
    return acc;
  }, {} as LocationAlternateMap);
}

export function getLocaleRootPath(localeCandidate: string | undefined | null): string {
  const locale = normalizeLocale(localeCandidate);
  return `/${locale}`;
}

/**
 * Homepage search URL with preselected pickup location (for city page CTA).
 * Uses canonical slug so the app can resolve it regardless of locale.
 */
export function getHomepageSearchUrl(
  localeCandidate: string | undefined | null,
  locationCanonicalSlug: string
): string {
  const locale = normalizeLocale(localeCandidate);
  const base = `/${locale}`;
  const param = `${HOMEPAGE_PICKUP_PARAM}=${encodeURIComponent(locationCanonicalSlug)}`;
  return `${base}?${param}`;
}

/** Build path for locations route (flat: one segment). */
export function getLocationPath(
  localeCandidate: string | undefined | null,
  locationSlug: string
): string {
  const locale = normalizeLocale(localeCandidate);
  return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${locationSlug}`;
}

/**
 * Always returns /{locale}/locations/{seoSlug}. Single source: SEO_LOCATIONS.seoSlugByLocale.
 * For hierarchy locations: first segments stay as IDs; last segment (city level) uses slugByLocale[locale].
 */
export function getLocationPathFromLocation(
  localeCandidate: string | undefined | null,
  location: LocationSeoResolved
): string {
  const locale = normalizeLocale(localeCandidate);
  const seoSlug = getLocationSeoSlugFromSeoLocations(location.id, locale);
  if (seoSlug) {
    return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${seoSlug}`;
  }
  const segments = getLocationPathSegments(location.id);
  if (segments && segments.length > 0) {
    const repoItem = locationById.get(location.id);
    // City level (3 segments): use slugByLocale for last segment; region/area stay as IDs
    if (segments.length === 3) {
      const lastSlug = repoItem?.slugByLocale[locale] ?? segments[2];
      const path = [segments[0], segments[1], lastSlug].join("/");
      return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${path}`;
    }
    // Two segments: area (halkidiki/sithonia, halkidiki/kassandra) = IDs; direct city (halkidiki/nea-moudania) = slug for last
    if (segments.length === 2) {
      const isArea = HALKIDIKI_AREA_IDS.includes(segments[1] as LocationId);
      if (!isArea && repoItem?.slugByLocale[locale]) {
        const path = [segments[0], repoItem.slugByLocale[locale]].join("/");
        return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${path}`;
      }
    }
    return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${segments.join("/")}`;
  }
  return `/${locale}/${LOCATION_ROUTE_SEGMENT}/${location.slug}`;
}

/**
 * Resolves URL path segments to a location.
 * Path segments: region/area use IDs; city (3-segment) last segment can be ID or slugByLocale[locale].
 * Returns null if path is invalid.
 */
export function getLocationByPath(
  localeCandidate: string | undefined | null,
  pathSegments: string[]
): LocationSeoResolved | null {
  const locale = normalizeLocale(localeCandidate);
  // First try: all segments as IDs (backward compat: nikiti, afitos, etc.)
  const locationId = resolveLocationIdByPath(pathSegments);
  if (locationId) return getLocationById(locale, locationId);
  // Second try: 3-segment path with last segment = slugByLocale (e.g. car-rental-nikiti)
  if (pathSegments.length === 3) {
    const [region, area, lastSegment] = pathSegments;
    const repoItem = findLocationRepoItemByLocalizedSlug(locale, lastSegment);
    if (repoItem) {
      const segs = getLocationPathSegments(repoItem.id);
      if (segs && segs[0] === region && segs[1] === area) {
        return buildLocationSeoRecord(locale, repoItem);
      }
    }
  }
  // Third try: 2-segment path with last segment = slug (e.g. halkidiki/car-rental-nea-moudania)
  if (pathSegments.length === 2) {
    const [region, lastSegment] = pathSegments;
    const repoItem = findLocationRepoItemByLocalizedSlug(locale, lastSegment);
    if (repoItem) {
      const segs = getLocationPathSegments(repoItem.id);
      if (segs && segs.length === 2 && segs[0] === region) {
        return buildLocationSeoRecord(locale, repoItem);
      }
    }
  }
  return null;
}

export function getCarPath(localeCandidate: string | undefined | null, carSlug: string): string {
  const locale = normalizeLocale(localeCandidate);
  return `/${locale}/${CARS_ROUTE_SEGMENT}/${encodeURIComponent(carSlug)}`;
}

export function getStaticPagePath(
  localeCandidate: string | undefined | null,
  staticPageKey: StaticPageKey
): string {
  const locale = normalizeLocale(localeCandidate);
  const pathSuffix = staticPagePathMap[staticPageKey];
  return `/${locale}${pathSuffix}`;
}

export function getParentLocation(
  location: LocationSeoResolved
): LocationSeoResolved | null {
  if (!location.parentId) return null;
  return getLocationById(location.locale, location.parentId);
}

export function getChildLocations(location: LocationSeoResolved): LocationSeoResolved[] {
  if (!location.childIds?.length) return [];
  return location.childIds
    .map((childId) => getLocationById(location.locale, childId))
    .filter(Boolean) as LocationSeoResolved[];
}

export function getSiblingLocations(location: LocationSeoResolved): LocationSeoResolved[] {
  if (!location.parentId) return [];
  const parent = getLocationById(location.locale, location.parentId);
  if (!parent) return [];
  return parent.childIds
    .filter((childId) => childId !== location.id)
    .map((childId) => getLocationById(location.locale, childId))
    .filter(Boolean) as LocationSeoResolved[];
}

export function getLocationRouteParams(): Array<{ locale: SupportedLocale; slug: string }> {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    getAllLocationsForLocale(locale).map((location) => ({ locale, slug: location.slug }))
  );
}

/** Params for hierarchical locations route [[...path]]: { locale, path: string[] }. Includes empty path for index. */
export function getLocationHierarchyRouteParams(): Array<{
  locale: SupportedLocale;
  path: string[];
}> {
  const segments = getAllHierarchyPathSegments();
  const withSegments = SUPPORTED_LOCALES.flatMap((locale) =>
    segments.map((path) => {
      // City level (3 segments): use slugByLocale for last segment
      if (path.length === 3) {
        const repoItem = locationById.get(path[2]);
        const slug = repoItem?.slugByLocale[locale];
        return {
          locale,
          path: slug ? [path[0], path[1], slug] : path,
        };
      }
      // Two segments: direct city under Halkidiki (e.g. nea-moudania) → use slug for last segment
      if (path.length === 2 && !HALKIDIKI_AREA_IDS.includes(path[1] as LocationId)) {
        const repoItem = locationById.get(path[1]);
        const slug = repoItem?.slugByLocale[locale];
        return {
          locale,
          path: slug ? [path[0], slug] : path,
        };
      }
      return { locale, path };
    })
  );
  const indexParams = SUPPORTED_LOCALES.map((locale) => ({ locale, path: [] }));
  return [...indexParams, ...withSegments];
}

export function getLocaleRouteParams(): Array<{ locale: SupportedLocale }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export function getPathWithoutLocalePrefix(pathname: string): string {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/") return "/";

  const segments = normalizedPath.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (!first || !isSupportedLocale(first)) {
    return normalizedPath;
  }

  const stripped = `/${rest.join("/")}`;
  return stripped === "/" ? "/" : normalizePath(stripped);
}

export function withLocalePrefix(
  localeCandidate: string | undefined | null,
  pathname: string
): string {
  const locale = normalizeLocale(localeCandidate);
  const strippedPath = getPathWithoutLocalePrefix(pathname);
  if (strippedPath === "/") {
    return `/${locale}`;
  }
  return normalizePath(`/${locale}${strippedPath}`);
}

export function switchPathLocale(
  pathname: string,
  nextLocaleCandidate: string | undefined | null
): string {
  const nextLocale = normalizeLocale(nextLocaleCandidate);
  const stripped = getPathWithoutLocalePrefix(pathname);
  const segments = stripped.split("/").filter(Boolean);

  // /{locale}/locations/{slug} → single-segment, resolve slug to next locale
  if (segments.length === 2 && segments[0] === LOCATION_ROUTE_SEGMENT) {
    const currentSlug = segments[1];
    const repoItem = locationSeoRepo.find((item) =>
      matchesAnyKnownLocationSlug(item, currentSlug)
    );
    if (repoItem) {
      const nextSlug = repoItem.slugByLocale[nextLocale];
      return `/${nextLocale}/${LOCATION_ROUTE_SEGMENT}/${nextSlug}`;
    }
  }

  // /{locale}/locations/{region}/{area}/{citySlug} → 3-level hierarchy (e.g. halkidiki/sithonia/nikiti)
  if (segments.length === 4 && segments[0] === LOCATION_ROUTE_SEGMENT) {
    const [, region, area, lastSegment] = segments;
    const repoItem = locationSeoRepo.find((item) =>
      matchesAnyKnownLocationSlug(item, lastSegment)
    );
    if (repoItem) {
      const segs = getLocationPathSegments(repoItem.id);
      if (segs && segs[0] === region && segs[1] === area) {
        const nextSlug = repoItem.slugByLocale[nextLocale];
        return `/${nextLocale}/${LOCATION_ROUTE_SEGMENT}/${region}/${area}/${nextSlug}`;
      }
    }
  }

  // /{locale}/locations/{region}/{citySlug} → 2-level hierarchy (e.g. halkidiki/car-rental-nea-moudania)
  if (segments.length === 3 && segments[0] === LOCATION_ROUTE_SEGMENT) {
    const [, region, lastSegment] = segments;
    const repoItem = locationSeoRepo.find((item) =>
      matchesAnyKnownLocationSlug(item, lastSegment)
    );
    if (repoItem) {
      const segs = getLocationPathSegments(repoItem.id);
      if (segs && segs.length === 2 && segs[0] === region) {
        const nextSlug = repoItem.slugByLocale[nextLocale];
        return `/${nextLocale}/${LOCATION_ROUTE_SEGMENT}/${region}/${nextSlug}`;
      }
    }
  }

  return withLocalePrefix(nextLocaleCandidate, pathname);
}

export function buildCarSeoText(
  localeCandidate: string | undefined | null,
  input: {
    carModel: string;
    locationName: string;
    transmission?: string;
    fuelType?: string;
    seats?: string;
  }
) {
  const locale = normalizeLocale(localeCandidate);
  const dictionary = localeSeoDictionary[locale];

  const templateValues: Record<string, string> = {
    carModel: input.carModel,
    locationName: input.locationName,
    transmission: input.transmission || "",
    fuelType: input.fuelType || "",
    seats: input.seats || "",
  };

  return {
    seoTitle: fillTemplate(dictionary.car.seoTitleTemplate, templateValues),
    seoDescription: fillTemplate(dictionary.car.seoDescriptionTemplate, templateValues),
    introText: fillTemplate(dictionary.car.introTemplate, templateValues),
    h1Text: fillTemplate(dictionary.car.carH1Template, templateValues),
    introLongText: fillTemplate(dictionary.car.introLongTemplate, templateValues),
    quickSpecsTitle: dictionary.car.quickSpecsTitle,
    featuresTitle: fillTemplate(dictionary.car.featuresTitle, templateValues),
    whyRentTitle: fillTemplate(dictionary.car.whyRentTitle, templateValues),
    whyRentBullets: dictionary.car.whyRentBullets || [],
    pillarLinksTitle: dictionary.car.pillarLinksTitle,
    breadcrumbCarRentalLocation: fillTemplate(dictionary.car.breadcrumbCarRentalLocation, templateValues),
  };
}

export function buildHubAndLocationLinks(
  localeCandidate: string | undefined | null,
  location: LocationSeoResolved
) {
  const locale = normalizeLocale(localeCandidate);
  const dictionary = localeSeoDictionary[locale].links;
  const parent = getParentLocation(location);
  const children = getChildLocations(location);
  const siblings = getSiblingLocations(location);

  return {
    labels: dictionary,
    hubPath: getLocaleRootPath(locale),
    parent: parent
      ? {
          path: getLocationPathFromLocation(locale, parent),
          label: parent.shortName,
        }
      : null,
    children: children.map((child) => ({
      path: getLocationPathFromLocation(locale, child),
      label: child.shortName,
    })),
    siblings: siblings.map((sibling) => ({
      path: getLocationPathFromLocation(locale, sibling),
      label: sibling.shortName,
    })),
  };
}

/**
 * Breadcrumb chain for a location (from hierarchy): e.g. Home > Halkidiki > Kassandra > Afytos.
 * Uses hierarchical paths when available.
 */
export function getLocationBreadcrumbChain(
  localeCandidate: string | undefined | null,
  location: LocationSeoResolved
): Array<{ href: string; label: string }> {
  const locale = normalizeLocale(localeCandidate);
  const segments = getLocationPathSegments(location.id);
  if (!segments || segments.length === 0) {
    return [
      { href: getLocaleRootPath(locale), label: localeSeoDictionary[locale].car.breadcrumbHome },
      { href: getLocationPathFromLocation(locale, location), label: location.shortName },
    ];
  }
  const items: Array<{ href: string; label: string }> = [
    { href: getLocaleRootPath(locale), label: localeSeoDictionary[locale].car.breadcrumbHome },
  ];
  for (let i = 0; i < segments.length; i++) {
    const loc = getLocationById(locale, segments[i]);
    if (loc) {
      const href =
        i === segments.length - 1
          ? getLocationPathFromLocation(locale, loc)
          : getLocationPathFromLocation(locale, loc);
      items.push({ href, label: loc.shortName });
    }
  }
  return items;
}

/** CTA label for city pages: "Search cars in {locationName}" with shortName filled. */
export function getLocationSearchCtaLabel(
  localeCandidate: string | undefined | null,
  locationShortName: string
): string {
  const locale = normalizeLocale(localeCandidate);
  const template = localeSeoDictionary[locale].links.locationSearchCtaLabel;
  return fillTemplate(template, { locationName: locationShortName });
}

export function getLocationHeroSubtitle(
  localeCandidate: string | undefined | null,
  location: Pick<LocationSeoResolved, "id" | "shortName">
): string | null {
  const locale = normalizeLocale(localeCandidate);

  if (!shouldApplyLocationBookingCopyToId(location.id)) {
    return null;
  }

  return getLocationHeroSubtitleSentence(locale, location.shortName);
}

export function shouldHideDistanceToThessalonikiBlock(
  locationId: string | null | undefined
): boolean {
  return locationId
    ? DISTANCE_TO_THESSALONIKI_HIDDEN_LOCATION_IDS.has(locationId as LocationId)
    : false;
}

export function isLocalePrefixedPath(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/") return false;

  const firstSegment = normalizedPath.split("/").filter(Boolean)[0];
  return isSupportedLocale(firstSegment || null);
}

export function getStaticPagePathMap(): Record<StaticPageKey, string> {
  return { ...staticPagePathMap };
}

const EMPTY_PAGE_CONTENT: LocationPageContentItem = {
  intro: "",
  mainInfo: "",
  distanceToThessaloniki: "",
  pickupGuidance: "",
  usefulTips: [],
  faq: [],
  nearbyPlaces: [],
};

/**
 * Returns page body content for a location and locale.
 * Use for rendering intro, mainInfo, distanceToThessaloniki, pickupGuidance, usefulTips, faq.
 * Falls back to English if the requested locale is missing.
 */
export function getLocationPageContent(
  locationId: string,
  localeCandidate: string | undefined | null
): LocationPageContentItem {
  const locale = normalizeLocale(localeCandidate);
  const byLocale = LOCATION_PAGE_CONTENT[locationId];
  if (!byLocale) return EMPTY_PAGE_CONTENT;
  const content = byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
  return content ?? EMPTY_PAGE_CONTENT;
}
