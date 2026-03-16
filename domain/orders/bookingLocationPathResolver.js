import {
  getLocationByAnySlug,
  getLocationById,
  getLocationByLocaleAndSlug,
  getLocationByPath,
  isSupportedLocale,
  normalizeLocale,
  resolveLocationFromSingleSegmentSlug,
} from "@domain/locationSeo/locationSeoService";
import {
  LOCATION_IDS,
  LOCATION_ROUTE_SEGMENT,
} from "@domain/locationSeo/locationSeoKeys";
import { ORDERED_LOCATION_OPTIONS } from "./locationOptions";

function mapLocationToBookingOption(location) {
  if (!location) return null;

  if (location.id === LOCATION_IDS.THESSALONIKI_AIRPORT) {
    return "Airport";
  }

  const englishLocation = getLocationById("en", location.id);
  const englishShortName = englishLocation?.shortName || "";

  return (
    ORDERED_LOCATION_OPTIONS.find(
      (option) => option.toLowerCase() === englishShortName.toLowerCase()
    ) || null
  );
}

export function resolveBookingLocationFromPathname(pathname) {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  const [localeSegment, routeSegment, ...locationPathSegments] = segments;

  if (
    !isSupportedLocale(localeSegment) ||
    routeSegment !== LOCATION_ROUTE_SEGMENT ||
    locationPathSegments.length === 0
  ) {
    return null;
  }

  const locale = normalizeLocale(localeSegment);
  let location = null;

  if (locationPathSegments.length === 1) {
    const [slug] = locationPathSegments;
    location =
      resolveLocationFromSingleSegmentSlug(locale, slug) ||
      getLocationByLocaleAndSlug(locale, slug) ||
      getLocationByAnySlug(locale, slug) ||
      getLocationByPath(locale, locationPathSegments);
  } else {
    location =
      getLocationByPath(locale, locationPathSegments) ||
      getLocationByLocaleAndSlug(
        locale,
        locationPathSegments[locationPathSegments.length - 1]
      ) ||
      getLocationByAnySlug(
        locale,
        locationPathSegments[locationPathSegments.length - 1]
      );
  }

  return mapLocationToBookingOption(location);
}

