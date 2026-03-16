import { LOCATION_IDS, SUPPORTED_LOCALES } from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationByPath,
  getLocationPathFromLocation,
} from "@domain/locationSeo/locationSeoService";

const HALKIDIKI_DIRECT_URL_IDS = [
  LOCATION_IDS.METAMORFOSI,
  LOCATION_IDS.ORMILIA,
  LOCATION_IDS.PETRALONA,
  LOCATION_IDS.VRASNA,
  LOCATION_IDS.OLYMPIADA,
];

describe("location URL changes", () => {
  test.each(SUPPORTED_LOCALES)(
    "moved direct Halkidiki cities use canonical two-segment URLs in %s",
    (locale) => {
      for (const locationId of HALKIDIKI_DIRECT_URL_IDS) {
        const location = getLocationById(locale, locationId);

        expect(location).toBeTruthy();
        expect(getLocationPathFromLocation(locale, location)).toBe(
          `/${locale}/locations/halkidiki/${location.slug}`
        );
        expect(getLocationByPath(locale, ["halkidiki", location.slug])?.id).toBe(
          locationId
        );
        expect(
          getLocationByPath(locale, ["halkidiki", "sithonia", location.slug])
        ).toBeNull();
      }
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "agios nikolaos keeps Sithonia path but uses shortened slug in %s",
    (locale) => {
      const location = getLocationById(
        locale,
        LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI
      );

      expect(location).toBeTruthy();
      const legacySlug = `${location.slug}-halkidiki`;
      expect(location.slug.endsWith("-halkidiki")).toBe(false);
      expect(getLocationPathFromLocation(locale, location)).toBe(
        `/${locale}/locations/halkidiki/sithonia/${location.slug}`
      );
      expect(
        getLocationByPath(locale, ["halkidiki", "sithonia", legacySlug])?.id
      ).toBe(LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI);
    }
  );
});
