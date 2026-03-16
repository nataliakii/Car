import { buildLocalizedSitemap, validateSitemapEntries } from "../sitemapBuilder";
import { getSupportedLocales } from "@domain/locationSeo/locationSeoService";
import {
  INDEXING_MODE,
  INDEXABLE_PATHS,
  shouldIndexPath,
} from "@/services/seo/indexingPolicy";

describe("buildLocalizedSitemap", () => {
  it("builds locale-aware sitemap without duplicate urls", () => {
    const entries = buildLocalizedSitemap([
      {
        slug: "toyota-yaris",
        updatedAt: "2026-02-20T00:00:00.000Z",
      },
    ]);

    const validation = validateSitemapEntries(entries);

    expect(validation.duplicateUrls).toEqual([]);
    expect(validation.missingXDefault).toEqual([]);
  });

  it("includes car urls for every supported locale", () => {
    const locales = getSupportedLocales();
    const entries = buildLocalizedSitemap([
      {
        slug: "hyundai-i30",
      },
    ]);

    const carEntries = entries.filter((entry) => entry.url.includes("/cars/hyundai-i30"));
    if (INDEXING_MODE === "allowlist") {
      expect(carEntries).toHaveLength(0);
      return;
    }

    expect(carEntries).toHaveLength(locales.length);

    const paths = carEntries.map((entry) => new URL(entry.url).pathname);
    for (const locale of locales) {
      expect(paths).toContain(`/${locale}/cars/hyundai-i30`);
    }
  });

  it("adds hreflang alternates with required locales for location pages", () => {
    const entries = buildLocalizedSitemap([]);
    const locationEntries = entries.filter((entry) => entry.url.includes("/locations/"));

    expect(locationEntries.length).toBeGreaterThan(0);

    for (const entry of locationEntries) {
      const languages = entry.alternates?.languages || {};
      expect(languages.en).toBeDefined();
      expect(languages.ru).toBeDefined();
      expect(languages.el).toBeDefined();
      expect(languages.de).toBeDefined();
      expect(languages["x-default"]).toBeDefined();

      if (INDEXING_MODE === "all") {
        expect(languages.uk).toBeDefined();
      } else {
        expect(languages.uk).toBeUndefined();
      }
    }
  });

  it("keeps sitemap aligned with the indexing policy", () => {
    const entries = buildLocalizedSitemap([
      {
        slug: "toyota-yaris",
      },
    ]);
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths.every((path) => shouldIndexPath(path))).toBe(true);

    if (INDEXING_MODE === "allowlist") {
      expect(paths).toHaveLength(INDEXABLE_PATHS.size);
      for (const path of INDEXABLE_PATHS) {
        expect(paths).toContain(path);
      }
    }
  });
});
