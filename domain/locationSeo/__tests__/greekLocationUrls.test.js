import { LOCATION_IDS } from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationPathFromLocation,
  resolveLocationFromSingleSegmentSlug,
} from "@domain/locationSeo/locationSeoService";

describe("Greek location URLs", () => {
  it("uses canonical Greek slugs for primary location pages", () => {
    const airport = getLocationById("el", LOCATION_IDS.THESSALONIKI_AIRPORT);
    const neaKallikratia = getLocationById("el", LOCATION_IDS.NEA_KALLIKRATIA);

    expect(airport?.slug).toBe("enoikiasi-autokinitou-aerodromio-thessalonikis");
    expect(getLocationPathFromLocation("el", airport)).toBe(
      "/el/locations/enoikiasi-autokinitou-aerodromio-thessalonikis"
    );

    expect(neaKallikratia?.slug).toBe("enoikiasi-autokinitou-nea-kallikratia");
    expect(getLocationPathFromLocation("el", neaKallikratia)).toBe(
      "/el/locations/enoikiasi-autokinitou-nea-kallikratia"
    );
  });

  it("resolves legacy Greek single-segment slugs to their canonical locations", () => {
    const legacyAirport = resolveLocationFromSingleSegmentSlug(
      "el",
      "enoikiasi-autokinitou-aerodromio-thessaloniki"
    );
    const legacyNeaKallikratia = resolveLocationFromSingleSegmentSlug(
      "el",
      "enoikiasi-nea-kallikratia"
    );
    const legacyNikiti = resolveLocationFromSingleSegmentSlug("el", "enoikiasi-nikiti");

    expect(legacyAirport?.id).toBe(LOCATION_IDS.THESSALONIKI_AIRPORT);
    expect(legacyNeaKallikratia?.id).toBe(LOCATION_IDS.NEA_KALLIKRATIA);
    expect(legacyNikiti?.id).toBe(LOCATION_IDS.NIKITI);
    expect(getLocationPathFromLocation("el", legacyNikiti)).toBe(
      "/el/locations/halkidiki/sithonia/enoikiasi-nikiti"
    );
  });
});
