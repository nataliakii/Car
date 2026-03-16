import { getLocationBookingSentence } from "@domain/locationSeo/locationBookingCopy";
import {
  LOCATION_IDS,
  SUPPORTED_LOCALES,
} from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationPageContent,
} from "@domain/locationSeo/locationSeoService";

describe("location intro text", () => {
  const includedLocationIds = Object.values(LOCATION_IDS).filter(
    (locationId) =>
      ![
        LOCATION_IDS.THESSALONIKI,
        LOCATION_IDS.THESSALONIKI_AIRPORT,
        LOCATION_IDS.HALKIDIKI,
      ].includes(locationId)
  );

  const expectedThessalonikiIntroByLocale = {
    en: "Thessaloniki is the second-largest city in Greece and the main center of Northern Greece. Natali Cars helps you quickly arrange car pickup for city trips, business visits, and transfers to Halkidiki. Book your rental car online in Thessaloniki with no deposit, with pickup at your accommodation or in the city, and 24/7 support.",
    ru: "Салоники — второй по величине город Греции и главный центр Северной Греции. Natali Cars поможет вам быстро организовать выдачу автомобиля для поездок по городу, деловых визитов и трансферов в Халкидики. Бронируйте онлайн авто в Салониках без депозита с выдачей у места проживания или в городе и поддержкой 24/7.",
    uk: "Салоніки — друге за величиною місто Греції та головний центр Північної Греції. Natali Cars допоможе вам швидко організувати видачу автомобіля для поїздок містом, ділових візитів і трансферів до Халкідікі. Бронюйте онлайн авто в Салоніках без депозиту з видачею біля місця проживання або в місті та з підтримкою 24/7.",
    el: "Η Θεσσαλονίκη είναι η δεύτερη μεγαλύτερη πόλη της Ελλάδας και το κύριο κέντρο της Βόρειας Ελλάδας. Η Natali Cars σας βοηθά να οργανώσετε γρήγορα την παραλαβή αυτοκινήτου για μετακινήσεις στην πόλη, επαγγελματικά ταξίδια και μεταφορές προς τη Χαλκιδική. Κάντε online κράτηση αυτοκινήτου στη Θεσσαλονίκη χωρίς εγγύηση, με παραλαβή στο κατάλυμά σας ή στην πόλη και με υποστήριξη 24/7.",
    de: "Thessaloniki ist die zweitgroesste Stadt Griechenlands und das wichtigste Zentrum Nordgriechenlands. Natali Cars hilft Ihnen, die Fahrzeuguebergabe fuer Stadtfahrten, Geschaeftsreisen und Transfers nach Chalkidiki schnell zu organisieren. Buchen Sie Ihren Mietwagen online in Thessaloniki ohne Kaution, mit Uebergabe an Ihrer Unterkunft oder in der Stadt und mit 24/7-Support.",
    bg: "Солун е вторият по големина град в Гърция и основният център на Северна Гърция. Natali Cars ще ви помогне бързо да организирате получаването на автомобил за пътувания в града, бизнес посещения и трансфери до Халкидики. Резервирайте онлайн кола в Солун без депозит с получаване при мястото ви за настаняване или в града и с поддръжка 24/7.",
    ro: "Salonic este al doilea oraș ca mărime din Grecia și principalul centru al Greciei de Nord. Natali Cars vă ajută să organizați rapid preluarea mașinii pentru deplasări în oraș, vizite de afaceri și transferuri spre Halkidiki. Rezervați online mașina în Salonic fără depozit, cu preluare la cazare sau în oraș și cu asistență 24/7.",
    sr: "Solun je drugi najveći grad u Grčkoj i glavni centar severne Grčke. Natali Cars vam pomaže da brzo organizujete preuzimanje automobila za vožnju po gradu, poslovne posete i transfere ka Halkidikiju. Rezervišite online auto u Solunu bez depozita, uz preuzimanje kod smeštaja ili u gradu i uz podršku 24/7.",
  };

  const expectedHalkidikiIntroPrefixByLocale = {
    en: "Halkidiki is one of Greece's most popular resort regions, where car rental is especially convenient for trips between beaches, villages, and the Kassandra and Sithonia peninsulas. Natali Cars helps you quickly arrange car rental in Halkidiki for a comfortable holiday and convenient travel around the region.",
    ru: "Халкидики — один из самых популярных курортных регионов Греции, где аренда авто особенно удобна для поездок между пляжами, поселками и полуостровами Кассандра и Ситония. Natali Cars поможет быстро организовать прокат авто в Халкидиках для комфортного отдыха и удобного передвижения по региону.",
    uk: "Халкідіки — один із найпопулярніших курортних регіонів Греції, де оренда авто особливо зручна для поїздок між пляжами, селищами та півостровами Кассандра і Ситонія. Natali Cars допоможе швидко організувати прокат авто в Халкідіках для комфортного відпочинку та зручного пересування регіоном.",
    el: "Η Χαλκιδική είναι μία από τις πιο δημοφιλείς τουριστικές περιοχές της Ελλάδας, όπου η ενοικίαση αυτοκινήτου είναι ιδιαίτερα βολική για διαδρομές ανάμεσα σε παραλίες, οικισμούς και τις χερσονήσους Κασσάνδρα και Σιθωνία. Η Natali Cars σας βοηθά να οργανώσετε γρήγορα ενοικίαση αυτοκινήτου στη Χαλκιδική για άνετες διακοπές και εύκολες μετακινήσεις σε όλη την περιοχή.",
    de: "Die Chalkidiki ist eine der beliebtesten Ferienregionen Griechenlands, in der ein Mietwagen besonders praktisch fuer Fahrten zwischen Straenden, Orten und den Halbinseln Kassandra und Sithonia ist. Natali Cars hilft Ihnen, die Autovermietung in Chalkidiki schnell fuer einen komfortablen Urlaub und bequeme Fahrten in der Region zu organisieren.",
    bg: "Халкидики е един от най-популярните курортни региони в Гърция, където кола под наем е особено удобна за пътувания между плажове, селища и полуостровите Касандра и Ситония. Natali Cars ще ви помогне бързо да организирате наем на кола в Халкидики за комфортна почивка и удобно придвижване из региона.",
    ro: "Halkidiki este una dintre cele mai populare regiuni de vacanta din Grecia, unde inchirierea unei masini este deosebit de convenabila pentru drumuri intre plaje, localitati si peninsulele Kassandra si Sithonia. Natali Cars va ajuta sa organizati rapid inchiriere auto in Halkidiki pentru un sejur confortabil si deplasari usoare prin regiune.",
    sr: "Халкидики је један од најпопуларнијих летовалишних региона у Грчкој, где је изнајмљивање аута посебно практично за вожњу између плажа, места и полуострва Касандра и Ситонија. Natali Cars вам помаже да брзо организујете изнајмљивање аута у Халкидикију за удобан одмор и лако кретање по региону.",
  };

  const removedKallitheaSnippetsByLocale = {
    en: "fits your stay",
    ru: "подходящей под ваш отдых",
    uk: "що підходить під ваш відпочинок",
    el: "ταιριάζει στη διαμονή σας",
    de: "die zu Ihrem Aufenthalt passt",
    bg: "подхожда на престоя ви",
    ro: "se potriveste sejurului dvs",
    sr: "odgovara vasem boravku",
  };

  const removedAfitosSnippetsByLocale = {
    en: "fits your stay",
    ru: "подходящей под ваш отдых",
    uk: "що підходить під ваш відпочинок",
    el: "ταιριάζει στη διαμονή σας",
    de: "die zu Ihrem Aufenthalt passt",
    bg: "подхожда на престоя ви",
    ro: "potrivita pentru sejurul dvs",
    sr: "odgovara vasem boravku",
  };

  const removedKassandriaSnippetsByLocale = {
    en: "in town or at your stay",
    ru: "в городе или у места проживания",
    uk: "в місті або біля місця проживання",
    el: "στην πόλη ή στο κατάλυμά σας",
    de: "in der Stadt oder an Ihrer Unterkunft",
    bg: "в града или при мястото ви за настаняване",
    ro: "in oras sau la cazare",
    sr: "u mestu ili kod smestaja",
  };

  test.each(SUPPORTED_LOCALES)(
    "%s locale appends the localized booking sentence to Petralona intro",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.PETRALONA);
      const pageContent = getLocationPageContent(LOCATION_IDS.PETRALONA, locale);

      expect(pageContent.intro).toContain(location.shortName);
      expect(pageContent.intro).toContain(
        getLocationBookingSentence(locale, location.shortName)
      );
    }
  );

  test("ru Petralona intro matches the translated English intro plus the booking sentence", () => {
    const pageContent = getLocationPageContent(LOCATION_IDS.PETRALONA, "ru");

    expect(pageContent.intro).toBe(
      "Петралона известна пещерой Петралона и расположена в глубине материка недалеко от побережья. Бронируйте онлайн авто в Петралона без депозита с выдачей у места проживания или в городе и поддержкой 24/7."
    );
  });

  test.each(SUPPORTED_LOCALES)(
    "%s Thessaloniki intro uses the custom localized text",
    (locale) => {
      const pageContent = getLocationPageContent(LOCATION_IDS.THESSALONIKI, locale);

      expect(pageContent.intro).toBe(expectedThessalonikiIntroByLocale[locale]);
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "%s Halkidiki intro uses the custom localized text plus the booking sentence",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.HALKIDIKI);
      const pageContent = getLocationPageContent(LOCATION_IDS.HALKIDIKI, locale);

      expect(pageContent.intro).toBe(
        `${expectedHalkidikiIntroPrefixByLocale[locale]} ${getLocationBookingSentence(locale, location.shortName)}`
      );
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "%s locale removes the old Kallithea stay-fitting sentence",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.KALLITHEA);
      const pageContent = getLocationPageContent(LOCATION_IDS.KALLITHEA, locale);

      expect(pageContent.intro).not.toContain(
        removedKallitheaSnippetsByLocale[locale]
      );
      expect(pageContent.intro).toContain(
        getLocationBookingSentence(locale, location.shortName)
      );
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "%s locale removes the old Afitos stay-fitting sentence",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.AFITOS);
      const pageContent = getLocationPageContent(LOCATION_IDS.AFITOS, locale);

      expect(pageContent.intro).not.toContain(
        removedAfitosSnippetsByLocale[locale]
      );
      expect(pageContent.intro).toContain(
        getLocationBookingSentence(locale, location.shortName)
      );
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "%s locale removes the old Kassandria in-town-or-accommodation sentence",
    (locale) => {
      const location = getLocationById(locale, LOCATION_IDS.KASSANDRIA);
      const pageContent = getLocationPageContent(LOCATION_IDS.KASSANDRIA, locale);

      expect(pageContent.intro).not.toContain(
        removedKassandriaSnippetsByLocale[locale]
      );
      expect(pageContent.intro).toContain(
        getLocationBookingSentence(locale, location.shortName)
      );
    }
  );

  test.each(includedLocationIds.flatMap((locationId) =>
    SUPPORTED_LOCALES.map((locale) => [locationId, locale])
  ))(
    "%s %s intro keeps only the first sentence before the booking sentence",
    (locationId, locale) => {
      const location = getLocationById(locale, locationId);
      const bookingSentence = getLocationBookingSentence(locale, location.shortName);
      const pageContent = getLocationPageContent(locationId, locale);
      const introWithoutBooking = pageContent.intro
        .replace(` ${bookingSentence}`, "")
        .trim();

      expect(pageContent.intro).toContain(bookingSentence);
      expect((introWithoutBooking.match(/[.!?]/g) || []).length).toBe(1);
    }
  );

  test.each([
    LOCATION_IDS.THESSALONIKI,
    LOCATION_IDS.THESSALONIKI_AIRPORT,
  ])("%s keeps its original intro without the generic booking sentence", (locationId) => {
    const location = getLocationById("ru", locationId);
    const pageContent = getLocationPageContent(locationId, "ru");

    expect(pageContent.intro).not.toContain(
      getLocationBookingSentence("ru", location.shortName)
    );
  });
});
