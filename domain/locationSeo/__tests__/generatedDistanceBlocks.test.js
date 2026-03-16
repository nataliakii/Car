import { getLocationDistanceText } from "@domain/locationSeo/locationHeroImages";
import {
  LOCATION_IDS,
  SUPPORTED_LOCALES,
} from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationPageContent,
  shouldHideDistanceToThessalonikiBlock,
} from "@domain/locationSeo/locationSeoService";

function resolveDistanceText(locationId, locale) {
  const location = getLocationById(locale, locationId);
  const pageContent = getLocationPageContent(locationId, locale);

  return (
    pageContent.distanceToThessaloniki ||
    location?.distanceToThessalonikiText ||
    getLocationDistanceText(locationId, locale, location?.shortName || "") ||
    ""
  );
}

describe("location distance blocks", () => {
  test.each(SUPPORTED_LOCALES)(
    "%s locale has a distance block for every location page",
    (locale) => {
      for (const locationId of Object.values(LOCATION_IDS)) {
        const text = resolveDistanceText(locationId, locale);

        expect(text).toBeTruthy();

        if (locale !== "en") {
          const englishText = resolveDistanceText(locationId, "en");
          expect(text).not.toBe(englishText);
        }
      }
    }
  );

  test.each([
    LOCATION_IDS.THESSALONIKI,
    LOCATION_IDS.THESSALONIKI_AIRPORT,
  ])("%s hides the entire distance block", (locationId) => {
    expect(shouldHideDistanceToThessalonikiBlock(locationId)).toBe(true);
  });

  test.each(
    Object.values(LOCATION_IDS).filter(
      (locationId) =>
        ![LOCATION_IDS.THESSALONIKI, LOCATION_IDS.THESSALONIKI_AIRPORT].includes(locationId)
    )
  )("%s keeps the distance block visible", (locationId) => {
    expect(shouldHideDistanceToThessalonikiBlock(locationId)).toBe(false);
  });
});
