import React, { Suspense } from "react";
import Feed from "@app/components/Feed";
import Script from "next/script";
import { fetchAllCars, reFetchActiveOrders, fetchCompany } from "@utils/action";
import CarGrid from "./components/CarGrid";
import { COMPANY_ID } from "@config/company";
import { getSeoConfig } from "@config/seo";

// Metadata is generated dynamically in the component using DB data
// SEO: Multilingual descriptions for better indexing
export async function generateMetadata() {
  const companyData = await fetchCompany(COMPANY_ID).catch(() => null);
  const seoConfig = getSeoConfig(companyData);

  // Multilingual SEO description with keywords in multiple languages
  const multilingualDescription = 
    "Rent a car in Halkidiki, Greece with Natali Cars. " +
    "Аренда авто в Халкидики, Греция — прокат машин без депозита. " +
    "Mietwagen Chalkidiki Griechenland — günstige Autovermietung. " +
    "Rent a car Halkidiki — iznajmljivanje auta Grčka. " +
    "Închirieri auto Halkidiki Grecia — rent a car ieftin. " +
    "Рент а кар Халкидики Гърция — евтин наем на коли. " +
    "Affordable car hire Nea Kallikratia, Kassandra, Sithonia.";

  return {
    title: "Car Rental in Halkidiki, Greece | Affordable Car Hire | Natali Cars",
    description: multilingualDescription,
    alternates: {
      canonical: seoConfig.baseUrl,
      languages: {
        "en": seoConfig.baseUrl,
        "ru": seoConfig.baseUrl,
        "de": seoConfig.baseUrl,
        "sr": seoConfig.baseUrl,
        "ro": seoConfig.baseUrl,
        "bg": seoConfig.baseUrl,
        "el": seoConfig.baseUrl,
      },
    },
    openGraph: {
      title: "Car Rental Halkidiki Greece | Аренда авто Халкидики | Mietwagen Chalkidiki | Închirieri auto | Рент а кар",
      description: multilingualDescription,
      url: seoConfig.baseUrl,
      locale: "en_US",
      alternateLocale: ["ru_RU", "de_DE", "sr_RS", "ro_RO", "bg_BG", "el_GR"],
    },
  };
}

export default async function Home() {
  // Загружаем данные параллельно для ускорения загрузки
  const [carsData, ordersData, companyData] = await Promise.all([
    fetchAllCars(),
    reFetchActiveOrders(),
    fetchCompany(COMPANY_ID),
  ]);

  const company = companyData;
  // Get SEO config with DB company data
  const seoConfig = getSeoConfig(companyData);

  // Structured data (JSON-LD) for LocalBusiness / AutoRental
  // SEO: Enhanced with multilingual support and additional schema properties
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: seoConfig.siteName,
    // Multilingual alternative names for better indexing
    alternateName: [
      "Natali Cars Halkidiki",
      "Натали Карс Халкидики", // Russian
      "Natali Cars Chalkidiki", // German spelling
      "Natali Cars Halkidiki Grecia", // Romanian
      "Натали Карс Халкидики Гърция", // Bulgarian
    ],
    url: seoConfig.baseUrl,
    logo: `${seoConfig.baseUrl}/favicon.png`,
    image: `${seoConfig.baseUrl}/favicon.png`,
    // Multilingual description
    description: "Car rental in Halkidiki, Greece. Аренда авто в Халкидики, Греция. Mietwagen Chalkidiki Griechenland. Rent a car Halkidiki - iznajmljivanje auta Grčka. Închirieri auto Halkidiki Grecia. Рент а кар Халкидики Гърция.",
    address: {
      "@type": "PostalAddress",
      streetAddress: seoConfig.contact.address.split(",")[0] || seoConfig.contact.address,
      addressLocality: "Nea Kallikratia",
      addressRegion: "Halkidiki",
      addressCountry: "GR",
      postalCode: "630 80",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: parseFloat(seoConfig.coordinates.lat),
      longitude: parseFloat(seoConfig.coordinates.lon),
    },
    // Multiple areas served for better local SEO
    areaServed: [
      { "@type": "City", name: "Halkidiki", addressCountry: "GR" },
      { "@type": "City", name: "Nea Kallikratia", addressCountry: "GR" },
      { "@type": "City", name: "Kassandra", addressCountry: "GR" },
      { "@type": "City", name: "Sithonia", addressCountry: "GR" },
      { "@type": "City", name: "Thessaloniki", addressCountry: "GR" },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: seoConfig.contact.phone,
      email: seoConfig.contact.email,
      contactType: "Customer Service",
      areaServed: "GR",
      // Extended language support for international tourists
      availableLanguage: [
        { "@type": "Language", name: "English", alternateName: "en" },
        { "@type": "Language", name: "Greek", alternateName: "el" },
        { "@type": "Language", name: "Russian", alternateName: "ru" },
        { "@type": "Language", name: "German", alternateName: "de" },
        { "@type": "Language", name: "Serbian", alternateName: "sr" },
        { "@type": "Language", name: "Romanian", alternateName: "ro" },
        { "@type": "Language", name: "Bulgarian", alternateName: "bg" },
      ],
    },
    sameAs: [
      seoConfig.social.facebook,
      seoConfig.social.instagram,
      seoConfig.social.linkedin,
    ].filter(Boolean),
    priceRange: "€€",
    openingHours: "Mo-Su 08:00-20:00",
    // Additional SEO properties
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Credit Card",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Car Rental Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Economy Car Rental",
            description: "Affordable economy cars for budget-conscious travelers",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Family Car Rental",
            description: "Spacious family cars with child seat options",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Airport Pickup",
            description: "Convenient pickup from Thessaloniki Airport",
          },
        },
      ],
    },
  };

  return (
    <Suspense>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* <CarGrid carsData={carsData} ordersData={ordersData} /> */}
      <Feed cars={carsData} orders={ordersData} isMain={true} company={company}>
        <CarGrid />
      </Feed>
    </Suspense>
  );
}
