/**
 * SEO Configuration
 * Centralized SEO constants to avoid duplication
 * Can accept companyData from DB or fallback to config
 * 
 * Supports multilingual SEO for target markets:
 * - EN: International tourists
 * - RU: Russian-speaking tourists (Russia, Ukraine, Belarus, Kazakhstan)
 * - DE: German-speaking tourists (Germany, Austria, Switzerland)
 * - SR: Serbian-speaking tourists (Serbia, Montenegro, Bosnia)
 * - RO: Romanian-speaking tourists (Romania, Moldova)
 * - BG: Bulgarian-speaking tourists (Bulgaria)
 * - EL: Greek local market
 */

// Hardcoded fallback values for SSG/SSR when DB is unavailable
const fallbackCompanyData = {
  name: "NATALI CARS",
  tel: "+30 6970 034 707",
  email: "natali2015makarova@gmail.com",
  address: "Antonioy Kelesi 12, Nea Kallikratia 630 80",
  coords: { lat: "40.311273589340836", lon: "23.06426516796098" },
};

/** Single source of truth for production base URL. */
export const PRODUCTION_BASE_URL = "https://natali-cars.com";

// Base URL: always canonical production — no Vercel/preview hosts (sitemap, canonical, hreflang)
const getBaseUrl = () => PRODUCTION_BASE_URL;

/**
 * Multilingual descriptions for SEO
 * Used in meta tags and structured data
 */
export const multilingualDescriptions = {
  en: "Rent a car in Halkidiki, Greece with Natali Cars. Affordable car hire with flexible pickup and return options. Best car rental service in Halkidiki, Nea Kallikratia, Kassandra, Sithonia.",
  ru: "Аренда авто в Халкидики, Греция — Натали Карс. Прокат машин без депозита. Гибкие условия получения и возврата. Лучший прокат авто в Халкидики, Неа Каликратия, Кассандра, Ситония.",
  uk: "Оренда авто в Халкідіках, Греція — Natali Cars. Прозорі умови, гнучка видача та повернення, підтримка для маршрутів Халкідіки, Ситонії та Кассандри.",
  de: "Mietwagen in Chalkidiki, Griechenland bei Natali Cars. Günstige Autovermietung mit flexiblen Abhol- und Rückgabeoptionen. Bester Mietwagenservice in Chalkidiki, Nea Kallikratia, Kassandra, Sithonia.",
  sr: "Rent a car u Halkidikiju, Grčka — Natali Cars. Povoljno iznajmljivanje auta bez depozita. Fleksibilni uslovi preuzimanja i vraćanja. Najbolji rent a car u Halkidikiju, Nea Kalikratija, Kasandra, Sitonija.",
  ro: "Închirieri auto în Halkidiki, Grecia — Natali Cars. Rent a car ieftin fără depozit. Condiții flexibile de preluare și returnare. Cel mai bun serviciu de închiriere auto în Halkidiki, Nea Kallikratia, Kassandra, Sithonia.",
  bg: "Рент а кар в Халкидики, Гърция — Натали Карс. Евтин наем на коли без депозит. Гъвкави условия за получаване и връщане. Най-добър рент а кар в Халкидики, Неа Каликратия, Касандра, Ситония.",
  el: "Ενοικίαση αυτοκινήτου στη Χαλκιδική, Ελλάδα με την Natali Cars. Οικονομική ενοικίαση με ευέλικτες επιλογές παραλαβής και επιστροφής. Καλύτερη υπηρεσία ενοικίασης στη Χαλκιδική.",
};

/**
 * Multilingual titles for SEO
 */
export const multilingualTitles = {
  en: "Natali Cars - Car Rental in Halkidiki, Greece",
  ru: "Натали Карс - Аренда авто в Халкидики, Греция",
  uk: "Natali Cars - Оренда авто в Халкідіках, Греція",
  de: "Natali Cars - Mietwagen in Chalkidiki, Griechenland",
  sr: "Natali Cars - Rent a car Halkidiki, Grčka",
  ro: "Natali Cars - Închirieri auto Halkidiki, Grecia",
  bg: "Натали Карс - Рент а кар Халкидики, Гърция",
  el: "Natali Cars - Ενοικίαση αυτοκινήτου Χαλκιδική",
};

/**
 * Get SEO configuration
 * @param {Object} [dbCompanyData] - Company data from database (optional)
 * @returns {Object} SEO configuration object
 */
export function getSeoConfig(dbCompanyData = null) {
  // Use DB data if available, otherwise fallback to config
  const companyData = dbCompanyData || fallbackCompanyData;

  return {
    siteName: companyData?.name || fallbackCompanyData.name || "Natali Cars",
    baseUrl: getBaseUrl(),
    defaultLocale: "en",
    supportedLocales: ["en", "ru", "uk", "de", "sr", "ro", "bg", "el"],
    primaryLocation: "Halkidiki, Greece",
    titleTemplate: "%s | Natali Cars - Car Rental in Halkidiki",
    defaultTitle: "Natali Cars - Car Rental in Halkidiki, Greece",
    defaultDescription: multilingualDescriptions.en,
    // All multilingual content
    descriptions: multilingualDescriptions,
    titles: multilingualTitles,
    // Social links from Footer
    social: {
      facebook: "https://www.facebook.com/people/Natali-carscom/100053110548109/?sk=about",
      instagram: "https://www.facebook.com/people/Natali-carscom/100053110548109/?sk=about",
      linkedin: "https://www.linkedin.com/in/natalia-kirejeva/",
    },
    // Contact info - prefer DB data
    contact: {
      email: companyData?.email || fallbackCompanyData.email || "cars-support@bbqr.site",
      phone: companyData?.tel || fallbackCompanyData.tel || "+30 6970 034 707",
      address: companyData?.address || fallbackCompanyData.address || "Antonioy Kelesi 12, Nea Kallikratia 630 80",
    },
    // Business location coordinates - prefer DB data
    coordinates: {
      lat: companyData?.coords?.lat || fallbackCompanyData.coords?.lat || "40.311273589340836",
      lon: companyData?.coords?.lon || fallbackCompanyData.coords?.lon || "23.06426516796098",
    },
    // Optional hero image for homepage SEO block (URL; leave null to hide image)
    heroImageUrl: process.env.NEXT_PUBLIC_HERO_IMAGE_URL || null,
    /**
     * Hero carousel images: array of image URLs.
     * Set NEXT_PUBLIC_HERO_IMAGES to a JSON array string, e.g. '["/hero1.jpg","/hero2.jpg"]'.
     * Invalid or non-string entries are filtered out. Returns [] if unset or invalid.
     */
    heroImages: getHeroImages(),
  };
}

function getHeroImages() {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_HERO_IMAGES) || "";
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

// Export default config for backward compatibility (uses fallback data)
export const seoConfig = getSeoConfig();
