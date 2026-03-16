import { notFound } from "next/navigation";
import JsonLdScript from "@app/components/seo/JsonLdScript";
import Feed from "@app/components/Feed";
import FilteredCarsDisplay from "@app/components/FilteredCarsDisplay";
import SingleCarDisplay from "@app/components/SingleCarDisplay";
import {
  SeoIntroBlock,
  SeoFaqBlock,
  SeoLinksBlock,
  SeoBreadcrumbNav,
  SeoSingleLinkBlock,
} from "@app/components/seo/SeoContentBlocks";
import {
  getAllLocationsForLocale,
  getCarPath,
  getLocationById,
  getLocationPathFromLocation,
  getLocationSeoSlug,
  getSupportedLocales,
  isSupportedLocale,
  normalizeLocale,
  getLocaleDictionary,
} from "@domain/locationSeo/locationSeoService";
import { COMPANY_ID } from "@config/company";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@lib/authOptions";
import { getCars, getCompany, getActiveOrders } from "@/domain/services";
import {
  buildAutoRentalJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
} from "@/services/seo/jsonLdBuilder";
import { getRobotsForPath } from "@/services/seo/indexingPolicy";
import { toAbsoluteUrl } from "@/services/seo/urlBuilder";
import { buildHreflangAlternates } from "@/services/seo/hreflangBuilder";
import {
  getAllSeoPageSlugs,
  getSeoPageBySlug,
  getProgrammaticPageBySlug,
  getCategoryById,
  getSeoLocationById,
  getResolvedCategoryContent,
  getResolvedBrandContent,
  getSeoPagePath,
  getSeoPageAlternates,
  filterCarsByCategory,
  filterCarsByBrand,
  resolveBrandFromSlug,
  buildAllBrandPageSlugs,
  buildBrandPageSlug,
  extractUniqueBrands,
  buildAllProgrammaticSlugs,
  SEO_LOCATIONS,
  CAR_CATEGORIES,
} from "@domain/seoPages/seoPageRegistry";

function getPublicCars(cars) {
  return (cars || []).filter(
    (car) =>
      car?.slug &&
      String(car.slug).trim() &&
      car?.isActive !== false &&
      car?.isHidden !== true &&
      !car?.deletedAt
  );
}

// ---------------------------------------------------------------------------
// generateStaticParams — produces all valid seoSlug values per locale
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const locales = getSupportedLocales();

  const categoryParams = locales.flatMap((locale) =>
    getAllSeoPageSlugs(locale).map((entry) => ({ locale, seoSlug: entry.seoSlug }))
  );

  let programmaticParams = [];
  let brandParams = [];
  try {
    const cars = await getCars().catch(() => []);
    const publicCars = getPublicCars(cars);

    const carSlugs = publicCars.map((c) => String(c.slug).trim());
    programmaticParams = locales.flatMap((locale) =>
      buildAllProgrammaticSlugs(carSlugs, locale).map((entry) => ({ locale, seoSlug: entry.seoSlug }))
    );

    brandParams = locales.flatMap((locale) =>
      buildAllBrandPageSlugs(publicCars, locale).map((entry) => ({ locale, seoSlug: entry.seoSlug }))
    );
  } catch {
    // Cars unavailable at build time — pages generated at runtime
  }

  return [...categoryParams, ...brandParams, ...programmaticParams];
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const locale = normalizeLocale(params.locale);
  const slug = params.seoSlug;
  const session = await getServerSession(authOptions);

  // Category × location page
  const catPage = getSeoPageBySlug(locale, slug);
  if (catPage) {
    const location = getSeoLocationById(catPage.locationId);
    const locationName = location
      ? location.nameByLocale[locale]
      : "Halkidiki";

    const resolved = getResolvedCategoryContent(catPage.categoryId, locale, locationName);
    if (!resolved) return { robots: { index: false, follow: false } };

    const alternates = buildHreflangAlternates(getSeoPageAlternates(locale, slug));
    const pagePath = getSeoPagePath(locale, slug);

    return {
      title: resolved.seoTitle,
      description: resolved.seoDescription,
      alternates: {
        canonical: toAbsoluteUrl(pagePath),
        languages: alternates,
      },
      openGraph: {
        title: resolved.seoTitle,
        description: resolved.seoDescription,
        url: toAbsoluteUrl(pagePath),
        type: "website",
        siteName: "Natali Cars",
      },
      twitter: {
        card: "summary_large_image",
        title: resolved.seoTitle,
        description: resolved.seoDescription,
      },
      robots: getRobotsForPath(pagePath),
    };
  }

  // Brand × location page
  const brandPage = await resolveBrandPage(slug, session, locale);
  if (brandPage) {
    const locationName = brandPage.locationDef.nameByLocale[locale];
    const resolved = getResolvedBrandContent(brandPage.brand, locale, locationName);
    const pagePath = getSeoPagePath(locale, slug);
    const alternates = buildHreflangAlternates(getSeoPageAlternates(locale, slug));

    return {
      title: resolved.seoTitle,
      description: resolved.seoDescription,
      alternates: { canonical: toAbsoluteUrl(pagePath), languages: alternates },
      openGraph: { title: resolved.seoTitle, description: resolved.seoDescription, url: toAbsoluteUrl(pagePath), type: "website", siteName: "Natali Cars" },
      twitter: { card: "summary_large_image", title: resolved.seoTitle, description: resolved.seoDescription },
      robots: getRobotsForPath(pagePath),
    };
  }

  // Programmatic page — try to resolve
  const progPage = await resolveProgrammaticPage(locale, slug, session);
  if (progPage) {
    const { car, locationDef } = progPage;
    const locationName = locationDef.nameByLocale[locale];
    const carModel = car.model || car.slug;

    const title = `Rent ${carModel} in ${locationName} | Natali Cars`;
    const description = `Rent ${carModel} with pickup in ${locationName}. ${capitalize(car.transmission)} transmission, ${car.seats || 5} seats. Book online with Natali Cars.`;
    const pagePath = getSeoPagePath(locale, slug);
    const alternates = buildHreflangAlternates(getSeoPageAlternates(locale, slug));

    return {
      title,
      description,
      alternates: {
        canonical: toAbsoluteUrl(pagePath),
        languages: alternates,
      },
      openGraph: { title, description, url: toAbsoluteUrl(pagePath), type: "website", siteName: "Natali Cars" },
      twitter: { card: "summary_large_image", title, description },
      robots: getRobotsForPath(pagePath),
    };
  }

  return { robots: { index: false, follow: false } };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function SeoLandingPage({ params }) {
  const locale = normalizeLocale(params.locale);
  if (!isSupportedLocale(locale)) notFound();

  const slug = params.seoSlug;
  const session = await getServerSession(authOptions);

  // ── Try category × location page first ──
  const catPage = getSeoPageBySlug(locale, slug);
  if (catPage) {
    return renderCategoryPage(locale, catPage, session);
  }

  // ── Try brand × location page ──
  const brandPage = await resolveBrandPage(slug, session, locale);
  if (brandPage) {
    return renderBrandPage(locale, slug, brandPage, session);
  }

  // ── Try programmatic rent-{car}-{location} page ──
  const progPage = await resolveProgrammaticPage(locale, slug, session);
  if (progPage) {
    return renderProgrammaticPage(locale, slug, progPage, session);
  }

  notFound();
}

// ---------------------------------------------------------------------------
// Category × Location page
// ---------------------------------------------------------------------------

async function renderCategoryPage(locale, catPage, session) {
  const category = getCategoryById(catPage.categoryId);
  const locationDef = getSeoLocationById(catPage.locationId);
  if (!category || !locationDef) notFound();

  const locationName = locationDef.nameByLocale[locale];
  const resolved = getResolvedCategoryContent(catPage.categoryId, locale, locationName);
  if (!resolved) notFound();

  const dictionary = getLocaleDictionary(locale);

  const [allCarsData, ordersData, companyData] = await Promise.all([
    getCars({ session }).catch(() => []),
    getActiveOrders({ session }).catch(() => []),
    getCompany(COMPANY_ID).catch(() => null),
  ]);

  const publicCars = getPublicCars(allCarsData);
  const filteredCars = filterCarsByCategory(publicCars, category.filter);

  // Location for JSON-LD
  const locationResolved = getLocationById(locale, catPage.locationId);

  // Related category links (other categories for this location)
  const otherCategoryLinks = CAR_CATEGORIES
    .filter((c) => c.id !== catPage.categoryId)
    .map((c) => {
      const locSlug = getLocationSeoSlug(locationDef.locationId, locale);
      const otherSlug = `${c.id}-car-rental-${locSlug}`;
      const otherContent = getResolvedCategoryContent(c.id, locale, locationName);
      return {
        href: getSeoPagePath(locale, otherSlug),
        label: otherContent?.h1 || otherSlug,
      };
    });

  // Location links
  const locationLinks = getAllLocationsForLocale(locale)
    .slice(0, 8)
    .map((loc) => ({
      href: getLocationPathFromLocation(locale, loc),
      label: loc.shortName,
    }));

  // Car links from filtered results
  const carLinks = filteredCars.slice(0, 6).map((c) => ({
    href: getCarPath(locale, c.slug),
    label: c.model || c.slug,
  }));

  // Breadcrumbs
  const breadcrumbItems = [
    { href: `/${locale}`, label: dictionary.car.breadcrumbHome },
    { href: `/${locale}`, label: dictionary.car.breadcrumbCars },
    { href: getSeoPagePath(locale, catPage.seoSlug), label: resolved.h1 },
  ];

  const breadcrumbJsonLdItems = breadcrumbItems.map((item) => ({
    name: item.label,
    url: toAbsoluteUrl(item.href),
  }));

  // JSON-LD
  const pagePath = getSeoPagePath(locale, catPage.seoSlug);

  const autoRentalJsonLd = locationResolved
    ? buildAutoRentalJsonLd({
        localeCandidate: locale,
        pagePath,
        location: {
          seoDescription: resolved.seoDescription,
          areaServed: locationResolved.areaServed,
          pickupLocation: locationResolved.pickupLocation,
          offerName: locationResolved.offerName,
          offerDescription: locationResolved.offerDescription,
        },
        offerUrlPath: pagePath,
      })
    : null;

  const faqJsonLd = buildFaqJsonLd(resolved.faq);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbJsonLdItems);

  const itemListJsonLd = buildItemListJsonLd(
    filteredCars.slice(0, 20).map((c) => ({
      name: c.model || c.slug,
      url: toAbsoluteUrl(getCarPath(locale, c.slug)),
    }))
  );

  // Build filter props for client component
  const filterProps = buildFilterProps(category.filter);

  return (
    <>
      <JsonLdScript id={`seo-autorental-${catPage.seoSlug}-${locale}`} data={autoRentalJsonLd} />
      <JsonLdScript id={`seo-itemlist-${catPage.seoSlug}-${locale}`} data={itemListJsonLd} />
      <JsonLdScript id={`seo-faq-${catPage.seoSlug}-${locale}`} data={faqJsonLd} />
      <JsonLdScript id={`seo-breadcrumb-${catPage.seoSlug}-${locale}`} data={breadcrumbJsonLd} />

      <Feed cars={allCarsData} orders={ordersData} company={companyData} locale={locale}>
        <SeoBreadcrumbNav items={breadcrumbItems} />

        <SeoIntroBlock title={resolved.h1} introText={resolved.introText} />

        <FilteredCarsDisplay {...filterProps} />

        <SeoLinksBlock
          title={dictionary.car.pickupTitle}
          links={locationLinks}
        />

        {carLinks.length > 0 && (
          <SeoLinksBlock
            title={dictionary.links.otherCarsTitle}
            links={carLinks}
          />
        )}

        {otherCategoryLinks.length > 0 && (
          <SeoLinksBlock
            title="See also"
            links={otherCategoryLinks}
          />
        )}

        <SeoFaqBlock title={dictionary.car.faqTitle} faq={resolved.faq} />

        <SeoSingleLinkBlock
          title={dictionary.links.mainHubLabel}
          href={`/${locale}`}
          label={dictionary.links.carsToHubLabel}
        />
      </Feed>
    </>
  );
}

// ---------------------------------------------------------------------------
// Brand × Location page
// ---------------------------------------------------------------------------

async function renderBrandPage(locale, slug, brandPage, session) {
  const { brand, locationDef, brandSlug } = brandPage;
  const locationName = locationDef.nameByLocale[locale];
  const resolved = getResolvedBrandContent(brand, locale, locationName);
  const dictionary = getLocaleDictionary(locale);

  const [allCarsData, ordersData, companyData] = await Promise.all([
    getCars({ session }).catch(() => []),
    getActiveOrders({ session }).catch(() => []),
    getCompany(COMPANY_ID).catch(() => null),
  ]);

  const publicCars = getPublicCars(allCarsData);
  const brandCars = filterCarsByBrand(publicCars, brand);
  const locationResolved = getLocationById(locale, locationDef.locationId);

  // Car links for this brand
  const carLinks = brandCars.slice(0, 8).map((c) => ({
    href: getCarPath(locale, c.slug),
    label: c.model || c.slug,
  }));

  // Category links for this location
  const locSlugBrand = getLocationSeoSlug(locationDef.locationId, locale);
  const categoryLinks = CAR_CATEGORIES.map((c) => {
    const catSlug = `${c.id}-car-rental-${locSlugBrand}`;
    const content = getResolvedCategoryContent(c.id, locale, locationName);
    return {
      href: getSeoPagePath(locale, catSlug),
      label: content?.h1 || catSlug,
    };
  });

  // Other brand links for same location
  const allBrands = extractUniqueBrands(publicCars);
  const otherBrandLinks = allBrands
    .filter((b) => b.brandSlug !== brandSlug)
    .slice(0, 5)
    .map((b) => ({
      href: getSeoPagePath(locale, buildBrandPageSlug(b.brandSlug, locSlugBrand)),
      label: getResolvedBrandContent(b.brand, locale, locationName).h1,
    }));

  // Location links
  const locationLinks = getAllLocationsForLocale(locale)
    .slice(0, 8)
    .map((loc) => ({
      href: getLocationPathFromLocation(locale, loc),
      label: loc.shortName,
    }));

  // Breadcrumbs
  const pagePath = getSeoPagePath(locale, slug);
  const breadcrumbItems = [
    { href: `/${locale}`, label: dictionary.car.breadcrumbHome },
    { href: `/${locale}`, label: dictionary.car.breadcrumbCars },
    { href: pagePath, label: resolved.h1 },
  ];

  const breadcrumbJsonLdItems = breadcrumbItems.map((item) => ({
    name: item.label,
    url: toAbsoluteUrl(item.href),
  }));

  // JSON-LD
  const autoRentalJsonLd = locationResolved
    ? buildAutoRentalJsonLd({
        localeCandidate: locale,
        pagePath,
        location: {
          seoDescription: resolved.seoDescription,
          areaServed: locationResolved.areaServed,
          pickupLocation: locationResolved.pickupLocation,
          offerName: locationResolved.offerName,
          offerDescription: locationResolved.offerDescription,
        },
        offerUrlPath: pagePath,
      })
    : null;

  const itemListJsonLd = buildItemListJsonLd(
    brandCars.map((c) => ({
      name: c.model || c.slug,
      url: toAbsoluteUrl(getCarPath(locale, c.slug)),
    }))
  );

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbJsonLdItems);

  return (
    <>
      <JsonLdScript id={`brand-autorental-${slug}-${locale}`} data={autoRentalJsonLd} />
      <JsonLdScript id={`brand-itemlist-${slug}-${locale}`} data={itemListJsonLd} />
      <JsonLdScript id={`brand-breadcrumb-${slug}-${locale}`} data={breadcrumbJsonLd} />

      <Feed cars={allCarsData} orders={ordersData} company={companyData} locale={locale}>
        <SeoBreadcrumbNav items={breadcrumbItems} />

        <SeoIntroBlock title={resolved.h1} introText={resolved.introText} />

        <FilteredCarsDisplay filterType="brand" filterValue={brand} />

        <SeoLinksBlock title={dictionary.car.pickupTitle} links={locationLinks} />

        {carLinks.length > 0 && (
          <SeoLinksBlock title={dictionary.links.otherCarsTitle} links={carLinks} />
        )}

        {categoryLinks.length > 0 && (
          <SeoLinksBlock title="Browse by category" links={categoryLinks} />
        )}

        {otherBrandLinks.length > 0 && (
          <SeoLinksBlock title="Other brands" links={otherBrandLinks} />
        )}

        <SeoSingleLinkBlock
          title={dictionary.links.mainHubLabel}
          href={`/${locale}`}
          label={dictionary.links.carsToHubLabel}
        />
      </Feed>
    </>
  );
}

// ---------------------------------------------------------------------------
// Programmatic rent-{car}-{location} page
// ---------------------------------------------------------------------------

async function renderProgrammaticPage(locale, slug, progPage, session) {
  const { car, locationDef } = progPage;
  const locationName = locationDef.nameByLocale[locale];
  const carModel = car.model || car.slug;
  const dictionary = getLocaleDictionary(locale);

  const [allCarsData, ordersData, companyData] = await Promise.all([
    getCars({ session }).catch(() => []),
    getActiveOrders({ session }).catch(() => []),
    getCompany(COMPANY_ID).catch(() => null),
  ]);

  const locationResolved = getLocationById(locale, locationDef.locationId);

  const introText = `The ${carModel} is available for rent in ${locationName}. ${capitalize(car.transmission)} transmission, ${car.fueltype || "petrol"} fuel, ${car.seats || 5} seats — an excellent choice for your trip. Pick up at ${locationName} with free delivery. Comprehensive insurance included.`;

  // Location links
  const locationLinks = getAllLocationsForLocale(locale)
    .slice(0, 6)
    .map((loc) => ({
      href: getLocationPathFromLocation(locale, loc),
      label: loc.shortName,
    }));

  // Category links for this location
  const locSlugProg = getLocationSeoSlug(locationDef.locationId, locale);
  const categoryLinks = CAR_CATEGORIES.map((c) => {
    const catSlug = `${c.id}-car-rental-${locSlugProg}`;
    const content = getResolvedCategoryContent(c.id, locale, locationName);
    return {
      href: getSeoPagePath(locale, catSlug),
      label: content?.h1 || catSlug,
    };
  });

  // Related cars
  const publicCars = getPublicCars(allCarsData).filter((c) => c.slug !== car.slug);
  const relatedCars = publicCars.slice(0, 4).map((c) => ({
    href: getCarPath(locale, c.slug),
    label: c.model || c.slug,
  }));

  // Breadcrumbs
  const pagePath = getSeoPagePath(locale, slug);
  const breadcrumbItems = [
    { href: `/${locale}`, label: dictionary.car.breadcrumbHome },
    { href: `/${locale}`, label: dictionary.car.breadcrumbCars },
    { href: pagePath, label: `${carModel} — ${locationName}` },
  ];

  const breadcrumbJsonLdItems = breadcrumbItems.map((item) => ({
    name: item.label,
    url: toAbsoluteUrl(item.href),
  }));

  const autoRentalJsonLd = locationResolved
    ? buildAutoRentalJsonLd({
        localeCandidate: locale,
        pagePath,
        location: {
          seoDescription: `Rent ${carModel} in ${locationName}`,
          areaServed: locationResolved.areaServed,
          pickupLocation: locationResolved.pickupLocation,
          offerName: locationResolved.offerName,
          offerDescription: locationResolved.offerDescription,
        },
        offerUrlPath: pagePath,
      })
    : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbJsonLdItems);

  return (
    <>
      <JsonLdScript id={`prog-autorental-${slug}-${locale}`} data={autoRentalJsonLd} />
      <JsonLdScript id={`prog-breadcrumb-${slug}-${locale}`} data={breadcrumbJsonLd} />

      <Feed cars={allCarsData} orders={ordersData} company={companyData} locale={locale}>
        <SeoBreadcrumbNav items={breadcrumbItems} />

        <SeoIntroBlock
          title={`Rent ${carModel} in ${locationName}`}
          introText={introText}
        />

        <SingleCarDisplay carSlug={car.slug} />

        <SeoLinksBlock
          title={dictionary.car.pickupTitle}
          links={locationLinks}
        />

        {categoryLinks.length > 0 && (
          <SeoLinksBlock title="Browse by category" links={categoryLinks} />
        )}

        {relatedCars.length > 0 && (
          <SeoLinksBlock
            title={dictionary.links.otherCarsTitle}
            links={relatedCars}
          />
        )}

        <SeoSingleLinkBlock
          title={dictionary.links.mainHubLabel}
          href={`/${locale}`}
          label={dictionary.links.carsToHubLabel}
        />
      </Feed>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveBrandPage(slug, session, locale) {
  if (!slug.includes("-car-rental-")) return null;

  const cars = await getCars({ session }).catch(() => []);
  const publicCars = getPublicCars(cars);
  const brandEntry = resolveBrandFromSlug(slug, publicCars, locale);
  if (!brandEntry) return null;

  const locationDef = SEO_LOCATIONS.find((l) => l.locationId === brandEntry.locationId);
  if (!locationDef) return null;

  return { ...brandEntry, locationDef };
}

function buildItemListJsonLd(items) {
  if (!items || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

async function resolveProgrammaticPage(locale, slug, session) {
  const cars = await getCars({ session }).catch(() => []);
  const publicCars = getPublicCars(cars);

  const entry = getProgrammaticPageBySlug(locale, slug);
  if (entry) {
    const car = publicCars.find(
      (c) => c.slug && c.slug.toLowerCase() === entry.carSlug.toLowerCase()
    );
    if (car) {
      const locationDef = SEO_LOCATIONS.find((l) => l.locationId === entry.locationId);
      if (locationDef) return { car, locationDef };
    }
  }

  return null;
}

function buildFilterProps(filter) {
  switch (filter.type) {
    case "transmission":
      return { filterType: "transmission", filterValue: filter.value };
    case "classes":
      return { filterType: "classes", filterValue: filter.value };
    case "familySeats":
      return { filterType: "familySeats", minSeats: filter.minSeats || 5 };
    case "cheapest":
      return { filterType: "cheapest" };
    default:
      return { filterType: "all" };
  }
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
