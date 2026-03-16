import {
  LOCATION_IDS,
  SUPPORTED_LOCALES,
} from "@domain/locationSeo/locationSeoKeys";
import {
  getLocationById,
  getLocationPageContent,
} from "@domain/locationSeo/locationSeoService";

describe("localized location content fallbacks", () => {
  const expectedNeaKallikratiaPeakSeasonTipByLocale = {
    en: "Book in advance during peak season (July–August) for best availability.",
    ru: "Бронируйте заранее в высокий сезон (июль–август), чтобы получить лучший выбор автомобилей.",
    uk: "Бронюйте заздалегідь у високий сезон (липень–серпень), щоб мати кращий вибір автомобілів.",
    el: "Κάντε κράτηση νωρίς στην υψηλή περίοδο (Ιούλιος–Αύγουστος) για καλύτερη διαθεσιμότητα αυτοκινήτων.",
    de: "Buchen Sie in der Hochsaison (Juli–August) fruehzeitig, um die beste Auswahl zu erhalten.",
    bg: "Резервирайте предварително през активния сезон (юли–август), за да имате по-добър избор на автомобили.",
    ro: "Rezervati din timp in sezonul de varf (iulie–august) pentru cea mai buna disponibilitate.",
    sr: "Rezervisite unapred u glavnoj sezoni (jul–avgust) za bolji izbor automobila.",
  };

  test("uk petralona page uses a localized location name in seo text", () => {
    const location = getLocationById("uk", LOCATION_IDS.PETRALONA);

    expect(location?.shortName).toBe("Петралона");
    expect(location?.h1).toContain("Петралона");
    expect(location?.h1).not.toContain("Petralona");
  });

  test("ru nearby places and useful tips are localized", () => {
    const saniContent = getLocationPageContent(LOCATION_IDS.SANI, "ru");
    const neaKallikratiaContent = getLocationPageContent(
      LOCATION_IDS.NEA_KALLIKRATIA,
      "ru"
    );

    expect(saniContent.nearbyPlaces).toContain("Салоники (поездка на день)");
    expect(neaKallikratiaContent.usefulTips).toContain(
      "Мы предлагаем бесплатную подачу к отелям и апартаментам в Неа Калликратии."
    );
  });

  test.each(SUPPORTED_LOCALES)(
    "%s Nea Kallikratia peak-season useful tip is localized",
    (locale) => {
      const pageContent = getLocationPageContent(
        LOCATION_IDS.NEA_KALLIKRATIA,
        locale
      );

      expect(pageContent.usefulTips).toContain(
        expectedNeaKallikratiaPeakSeasonTipByLocale[locale]
      );
    }
  );

  test("uk petralona nearby places are localized", () => {
    const petralonaContent = getLocationPageContent(LOCATION_IDS.PETRALONA, "uk");

    expect(petralonaContent.nearbyPlaces).toContain("Неа Муданія");
    expect(petralonaContent.nearbyPlaces).toContain("Олімпіада");
    expect(petralonaContent.nearbyPlaces).toContain("Салоніки");
  });

  test.each(SUPPORTED_LOCALES)(
    "%s Thessaloniki page exposes a localized FAQ",
    (locale) => {
      const englishPageContent = getLocationPageContent(
        LOCATION_IDS.THESSALONIKI,
        "en"
      );
      const localizedPageContent = getLocationPageContent(
        LOCATION_IDS.THESSALONIKI,
        locale
      );

      expect(localizedPageContent.faq).toHaveLength(3);
      expect(localizedPageContent.faq[0]?.question).toBeTruthy();

      if (locale !== "en") {
        expect(localizedPageContent.faq[0]?.question).not.toBe(
          englishPageContent.faq[0]?.question
        );
      }
    }
  );

  test.each(SUPPORTED_LOCALES)(
    "%s Halkidiki page exposes a localized FAQ",
    (locale) => {
      const englishPageContent = getLocationPageContent(
        LOCATION_IDS.HALKIDIKI,
        "en"
      );
      const localizedPageContent = getLocationPageContent(
        LOCATION_IDS.HALKIDIKI,
        locale
      );

      expect(localizedPageContent.faq).toHaveLength(3);
      expect(localizedPageContent.faq[0]?.question).toBeTruthy();

      if (locale !== "en") {
        expect(localizedPageContent.faq[0]?.question).not.toBe(
          englishPageContent.faq[0]?.question
        );
      }
    }
  );

  test.each(SUPPORTED_LOCALES.filter((locale) => locale !== "en"))(
    "%s petralona fallback text is localized across visible page fields",
    (locale) => {
      const englishLocation = getLocationById("en", LOCATION_IDS.PETRALONA);
      const localizedLocation = getLocationById(locale, LOCATION_IDS.PETRALONA);
      const englishPageContent = getLocationPageContent(LOCATION_IDS.PETRALONA, "en");
      const localizedPageContent = getLocationPageContent(
        LOCATION_IDS.PETRALONA,
        locale
      );

      expect(englishLocation).toBeTruthy();
      expect(localizedLocation).toBeTruthy();

      expect(localizedLocation?.h1).not.toBe(englishLocation?.h1);
      expect(localizedLocation?.seoTitle).not.toBe(englishLocation?.seoTitle);
      expect(localizedLocation?.seoDescription).not.toBe(
        englishLocation?.seoDescription
      );
      expect(localizedLocation?.introText).not.toBe(englishLocation?.introText);
      expect(localizedLocation?.pickupLocation).not.toBe(
        englishLocation?.pickupLocation
      );
      expect(localizedLocation?.offerDescription).not.toBe(
        englishLocation?.offerDescription
      );

      expect(localizedPageContent.intro).not.toBe(englishPageContent.intro);
      expect(localizedPageContent.pickupGuidance).not.toBe(
        englishPageContent.pickupGuidance
      );
      expect(localizedPageContent.faq[0]?.question).not.toBe(
        englishPageContent.faq[0]?.question
      );
    }
  );
});
