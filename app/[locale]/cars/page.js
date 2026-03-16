import { notFound } from "next/navigation";
import Feed from "@app/components/Feed";
import CarGrid from "@app/components/CarGrid";
import {
  getCarPath,
  getLocaleDictionary,
  getSupportedLocales,
  isSupportedLocale,
  normalizeLocale,
} from "@domain/locationSeo/locationSeoService";
import { COMPANY_ID } from "@config/company";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@lib/authOptions";
import { getCars, getCompany, getActiveOrders } from "@/domain/services";
import { SeoLinksBlock, SeoIntroBlock } from "@app/components/seo/SeoContentBlocks";
import { buildHreflangAlternates } from "@/services/seo/hreflangBuilder";
import { getRobotsForPath } from "@/services/seo/indexingPolicy";
import { toAbsoluteUrl } from "@/services/seo/urlBuilder";

function getPublicCars(cars) {
  return (cars || []).filter(
    (c) =>
      c?.slug &&
      String(c.slug).trim() &&
      c?.isActive !== false &&
      c?.isHidden !== true &&
      !c?.deletedAt
  );
}

const CARS_INDEX_ALTERNATES = Object.fromEntries(
  getSupportedLocales().map((l) => [l, `/${l}/cars`])
);

export async function generateMetadata({ params }) {
  const locale = normalizeLocale(params.locale);
  const dictionary = getLocaleDictionary(locale);
  const title = `${dictionary.links.carsListTitle} | Natali Cars`;
  const description = "Browse all rental cars available in Halkidiki and Thessaloniki. Compare models, prices and book online with Natali Cars.";
  const path = `/${locale}/cars`;
  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(path),
      languages: buildHreflangAlternates(CARS_INDEX_ALTERNATES),
    },
    openGraph: { title, description },
    robots: getRobotsForPath(path),
  };
}

export default async function CarsIndexPage({ params }) {
  const locale = normalizeLocale(params.locale);
  if (!isSupportedLocale(locale)) notFound();
  const session = await getServerSession(authOptions);
  const [allCarsData, ordersData, companyData] = await Promise.all([
    getCars({ session }).catch(() => []),
    getActiveOrders({ session }).catch(() => []),
    getCompany(COMPANY_ID).catch(() => null),
  ]);

  const publicCars = getPublicCars(allCarsData);
  const dictionary = getLocaleDictionary(locale);

  const carLinks = publicCars.map((c) => ({
    href: getCarPath(locale, c.slug),
    label: c.model || c.slug,
  }));

  const introText = "Browse our full fleet of rental cars available in Halkidiki, Thessaloniki Airport and Nea Kallikratia. Each vehicle can be picked up at your chosen location. Book online to secure the best rate.";

  return (
    <Feed
      cars={allCarsData}
      orders={ordersData}
      company={companyData}
      locale={locale}
      isMain={false}
    >
      <SeoIntroBlock
        title={dictionary.links.carsListTitle}
        introText={introText}
      />
      {carLinks.length > 0 && (
        <SeoLinksBlock
          title="All car models"
          links={carLinks}
        />
      )}
      <CarGrid />
    </Feed>
  );
}
