import {
  INDEXING_MODE,
  INDEXABLE_PATHS,
  getRobotsForPath,
  shouldIndexPath,
} from "../indexingPolicy";

describe("indexingPolicy", () => {
  test("always keeps the explicit allowlist indexable", () => {
    expect(shouldIndexPath("/en/locations/car-rental-halkidiki")).toBe(true);
    expect(shouldIndexPath("/de/locations/mietwagen-thessaloniki")).toBe(true);
  });

  test("applies the current indexing mode to non-allowlisted pages", () => {
    const blockedPath = "/en/cars";

    if (INDEXING_MODE === "allowlist") {
      expect(shouldIndexPath(blockedPath)).toBe(false);
      expect(getRobotsForPath(blockedPath)).toEqual({
        index: false,
        follow: true,
      });
      // PRIMARY_LOCATION_IDS (4) × SUPPORTED_LOCALES (8) = 32
      expect(INDEXABLE_PATHS.size).toBe(32);
      return;
    }

    expect(shouldIndexPath(blockedPath)).toBe(true);
    expect(getRobotsForPath(blockedPath)).toEqual({
      index: true,
      follow: true,
    });
  });
});
