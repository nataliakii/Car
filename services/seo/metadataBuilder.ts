import type { Metadata } from "next";
import { getSeoConfig } from "@config/seo";
import {
  buildCarSeoText,
  getCarAlternates,
  getHubAlternates,
  getHubSeo,
  getLocationAlternatesById,
  getLocationPathFromLocation,
  getLocaleRootPath,
  getSupportedLocales,
  getStaticPagePath,
  getStaticPageSeo,
  normalizeLocale,
} from "@domain/locationSeo/locationSeoService";
import {
  STATIC_PAGE_KEYS,
  type StaticPageKey,
} from "@domain/locationSeo/locationSeoKeys";
import type { LocationSeoResolved } from "@domain/locationSeo/types";
import { getAirportPrioritySeo, isPriorityAirportLocation } from "./airportPrioritySeo";
import { buildHreflangAlternates } from "./hreflangBuilder";
import { getRobotsForPath } from "./indexingPolicy";
import { toAbsoluteUrl } from "./urlBuilder";

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  uk: "uk_UA",
  el: "el_GR",
  de: "de_DE",
  bg: "bg_BG",
  ro: "ro_RO",
  sr: "sr_RS",
};

function getOpenGraphLocale(locale: string): string {
  return OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.en;
}

function buildBaseMetadata(input: {
  title: string;
  description: string;
  canonicalPath: string;
  alternatePathsByLocale: Record<string, string>;
  locale: string;
  /** When true, set robots to noindex,follow (for legal/technical pages). */
  noindex?: boolean;
}): Metadata {
  const seoConfig = getSeoConfig();
  const hreflangAlternates = buildHreflangAlternates(input.alternatePathsByLocale);
  const canonicalUrl = toAbsoluteUrl(input.canonicalPath);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangAlternates,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonicalUrl,
      locale: getOpenGraphLocale(input.locale),
      type: "website",
      siteName: seoConfig.siteName,
      images: [
        {
          url: `${seoConfig.baseUrl}/favicon.png`,
          width: 1200,
          height: 630,
          alt: seoConfig.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [`${seoConfig.baseUrl}/favicon.png`],
    },
    robots: getRobotsForPath(input.canonicalPath, Boolean(input.noindex)),
  };
}

export function buildHubMetadata(localeCandidate: string | undefined | null): Metadata {
  const locale = normalizeLocale(localeCandidate);
  const hubSeo = getHubSeo(locale);
  const canonicalPath = getLocaleRootPath(locale);

  return buildBaseMetadata({
    title: hubSeo.seoTitle,
    description: hubSeo.seoDescription,
    canonicalPath,
    alternatePathsByLocale: getHubAlternates(),
    locale,
  });
}

export function buildLocationsIndexMetadata(
  localeCandidate: string | undefined | null
): Metadata {
  const locale = normalizeLocale(localeCandidate);
  const hubSeo = getHubSeo(locale);
  const canonicalPath = `/${locale}/locations`;
  const alternatePathsByLocale = Object.fromEntries(
    getSupportedLocales().map((supportedLocale) => [
      supportedLocale,
      `/${supportedLocale}/locations`,
    ])
  );

  return buildBaseMetadata({
    title: hubSeo.seoTitle,
    description: hubSeo.seoDescription,
    canonicalPath,
    alternatePathsByLocale,
    locale,
  });
}

export function buildLocationMetadata(location: LocationSeoResolved): Metadata {
  const canonicalPath = getLocationPathFromLocation(location.locale, location);
  const prioritySeo = isPriorityAirportLocation(location)
    ? getAirportPrioritySeo(location.locale)
    : null;
  const title = prioritySeo?.seoTitle || location.seoTitle;
  const description = prioritySeo?.seoDescription || location.seoDescription;

  return buildBaseMetadata({
    title,
    description,
    canonicalPath,
    alternatePathsByLocale: getLocationAlternatesById(location.id),
    locale: location.locale,
  });
}

export function buildCarMetadata(input: {
  localeCandidate: string | undefined | null;
  carSlug: string;
  carModel: string;
  locationName: string;
  transmission?: string;
  fuelType?: string;
  seats?: string;
}): Metadata {
  const locale = normalizeLocale(input.localeCandidate);
  const canonicalPath = `/${locale}/cars/${encodeURIComponent(input.carSlug)}`;
  const carSeo = buildCarSeoText(locale, {
    carModel: input.carModel,
    locationName: input.locationName,
    transmission: input.transmission,
    fuelType: input.fuelType,
    seats: input.seats,
  });

  return buildBaseMetadata({
    title: carSeo.seoTitle,
    description: carSeo.seoDescription,
    canonicalPath,
    alternatePathsByLocale: getCarAlternates(input.carSlug),
    locale,
  });
}

/** Static pages that must not be indexed (legal/technical). Canonical and hreflang still set for consistency. */
const NOINDEX_STATIC_PAGES: Set<StaticPageKey> = new Set([
  STATIC_PAGE_KEYS.COOKIE_POLICY,
  STATIC_PAGE_KEYS.PRIVACY_POLICY,
  STATIC_PAGE_KEYS.TERMS_OF_SERVICE,
  STATIC_PAGE_KEYS.RENTAL_TERMS,
]);

export function buildStaticPageMetadata(
  localeCandidate: string | undefined | null,
  pageKey: StaticPageKey
): Metadata {
  const locale = normalizeLocale(localeCandidate);
  const pageSeo = getStaticPageSeo(locale, pageKey);

  const alternatesByLocale = Object.fromEntries(
    Object.keys(getHubAlternates()).map((supportedLocale) => [
      supportedLocale,
      getStaticPagePath(supportedLocale, pageKey),
    ])
  );

  return buildBaseMetadata({
    title: pageSeo.seoTitle,
    description: pageSeo.seoDescription,
    canonicalPath: getStaticPagePath(locale, pageKey),
    alternatePathsByLocale: alternatesByLocale,
    locale,
    noindex: NOINDEX_STATIC_PAGES.has(pageKey),
  });
}
