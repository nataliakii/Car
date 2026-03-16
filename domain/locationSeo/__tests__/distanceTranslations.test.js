import { LOCATION_CONTENT_KEYS, SUPPORTED_LOCALES } from "@domain/locationSeo/locationSeoKeys";
import { locationContentByKey } from "@domain/locationSeo/locationSeoRepo";

const DISTANCE_CONTENT_KEYS = [
  LOCATION_CONTENT_KEYS.THESSALONIKI,
  LOCATION_CONTENT_KEYS.THESSALONIKI_AIRPORT,
  LOCATION_CONTENT_KEYS.HALKIDIKI,
  LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA,
];

describe("location distance translations", () => {
  test.each(DISTANCE_CONTENT_KEYS)(
    "%s has localized distance text for all non-English locales",
    (contentKey) => {
      const englishText = locationContentByKey[contentKey].en.distanceToThessalonikiText;

      expect(englishText).toBeTruthy();

      for (const locale of SUPPORTED_LOCALES) {
        const localizedText =
          locationContentByKey[contentKey][locale].distanceToThessalonikiText;

        expect(localizedText).toBeTruthy();

        if (locale !== "en") {
          expect(localizedText).not.toBe(englishText);
        }
      }
    }
  );
});
