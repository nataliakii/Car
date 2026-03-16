import { LOCATION_IDS, SUPPORTED_LOCALES } from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationHeroSubtitle,
} from "@domain/locationSeo/locationSeoService";

describe("location hero subtitle", () => {
  test.each(SUPPORTED_LOCALES)(
    "%s locale returns a localized hero subtitle for Petralona",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.PETRALONA);
      const heroSubtitle = getLocationHeroSubtitle(locale, location);

      expect(location).toBeTruthy();
      expect(heroSubtitle).toBeTruthy();
      expect(heroSubtitle).toContain(location.shortName);
    }
  );

  test.each([LOCATION_IDS.HALKIDIKI, LOCATION_IDS.NEA_KALLIKRATIA])(
    "%s returns a localized hero subtitle for all supported locales",
    (locationId) => {
      for (const locale of SUPPORTED_LOCALES) {
        const location = getLocationById(locale, locationId);
        const heroSubtitle = getLocationHeroSubtitle(locale, location);

        expect(heroSubtitle).toBeTruthy();
        expect(heroSubtitle).toContain(location.shortName);
      }
    }
  );

  test("ru hero subtitle matches the requested copy", () => {
    const location = getLocationById("ru", LOCATION_IDS.PETRALONA);

    expect(getLocationHeroSubtitle("ru", location)).toBe(
      "Бронируйте онлайн авто в Петралона без депозита с выдачей у места проживания или в городе с поддержкой 24/7."
    );
  });

  test.each([LOCATION_IDS.HALKIDIKI, LOCATION_IDS.NEA_KALLIKRATIA])(
    "%s receives the generic hero subtitle",
    (locationId) => {
      const location = getLocationById("ru", locationId);

      expect(getLocationHeroSubtitle("ru", location)).toBe(
        `Бронируйте онлайн авто в ${location.shortName} без депозита с выдачей у места проживания или в городе с поддержкой 24/7.`
      );
    }
  );

  test.each([LOCATION_IDS.THESSALONIKI_AIRPORT])(
    "%s does not receive the generic hero subtitle",
    (locationId) => {
    const location = getLocationById("ru", locationId);

      expect(getLocationHeroSubtitle("ru", location)).toBeNull();
    }
  );
});
