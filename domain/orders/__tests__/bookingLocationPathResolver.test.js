import { LOCATION_IDS } from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationPathFromLocation,
} from "@domain/locationSeo/locationSeoService";
import { resolveBookingLocationFromPathname } from "../bookingLocationPathResolver";

function getExpectedBookingLocation(locationId) {
  if (locationId === LOCATION_IDS.THESSALONIKI_AIRPORT) {
    return "Airport";
  }

  return getLocationById("en", locationId)?.shortName ?? null;
}

describe("resolveBookingLocationFromPathname", () => {
  test.each(Object.values(LOCATION_IDS))(
    "resolves canonical English location path for %s",
    (locationId) => {
      const location = getLocationById("en", locationId);
      const pathname = getLocationPathFromLocation("en", location);

      expect(resolveBookingLocationFromPathname(pathname)).toBe(
        getExpectedBookingLocation(locationId)
      );
    }
  );

  test.each([
    ["de", LOCATION_IDS.NIKITI],
    ["de", LOCATION_IDS.AFITOS],
    ["el", LOCATION_IDS.THESSALONIKI_AIRPORT],
    ["ru", LOCATION_IDS.NEA_MOUDANIA],
  ])(
    "resolves localized canonical path for %s %s",
    (locale, locationId) => {
      const location = getLocationById(locale, locationId);
      const pathname = getLocationPathFromLocation(locale, location);

      expect(resolveBookingLocationFromPathname(pathname)).toBe(
        getExpectedBookingLocation(locationId)
      );
    }
  );

  test("returns null for non-location paths", () => {
    expect(resolveBookingLocationFromPathname("/en/cars")).toBeNull();
    expect(resolveBookingLocationFromPathname("/en")).toBeNull();
  });
});
