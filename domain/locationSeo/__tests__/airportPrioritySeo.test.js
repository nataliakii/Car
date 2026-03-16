import { SUPPORTED_LOCALES } from "@domain/locationSeo/locationSeoKeys";
import { getAirportPrioritySeo } from "@/services/seo/airportPrioritySeo";

const EXPECTED_AIRPORT_INTRO_BY_LOCALE = {
  en: "Thessaloniki Airport (SKG) is the main international airport serving Thessaloniki and the wider region of Greece. Book your rental car online with pickup at the Thessaloniki Airport (SKG) terminal, with no deposit and 24/7 support.",
  ru: "Аэропорт Салоники (SKG) — главный международный аэропорт, обслуживающий Салоники и весь регион Греции. Бронируйте онлайн авто с получением в терминале аэропорта Салоники (SKG) без депозита и с поддержкой 24/7.",
  uk: "Аеропорт Салоніки (SKG) — головний міжнародний аеропорт, що обслуговує Салоніки та весь регіон Греції. Бронюйте авто онлайн з видачею в терміналі аеропорту Салоніки (SKG) без депозиту та з підтримкою 24/7.",
  el: "Το Αεροδρόμιο Θεσσαλονίκης (SKG) είναι το κύριο διεθνές αεροδρόμιο που εξυπηρετεί τη Θεσσαλονίκη και ολόκληρη την περιοχή της Ελλάδας. Κάντε online κράτηση αυτοκινήτου με παραλαβή στον τερματικό σταθμό του Αεροδρομίου Θεσσαλονίκης (SKG), χωρίς εγγύηση και με υποστήριξη 24/7.",
  de: "Der Flughafen Thessaloniki (SKG) ist der wichtigste internationale Flughafen für Thessaloniki und die gesamte Region Griechenlands. Buchen Sie Ihren Mietwagen online mit Übergabe am Terminal des Flughafens Thessaloniki (SKG) ohne Kaution und mit 24/7-Support.",
  bg: "Летище Солун (SKG) е главното международно летище, което обслужва Солун и целия регион на Гърция. Резервирайте онлайн кола под наем с получаване на терминала на летище Солун (SKG) без депозит и с поддръжка 24/7.",
  ro: "Aeroportul Salonic (SKG) este principalul aeroport internațional care deservește Salonicul și întreaga regiune a Greciei. Rezervați online mașina cu preluare la terminalul Aeroportului Salonic (SKG), fără depozit și cu asistență 24/7.",
  sr: "Aerodrom Solun (SKG) je glavni međunarodni aerodrom koji opslužuje Solun i ceo region Grčke. Rezervišite auto online sa preuzimanjem na terminalu aerodroma Solun (SKG) bez depozita i uz podršku 24/7.",
};

describe("airport priority SEO", () => {
  test.each(SUPPORTED_LOCALES)(
    "%s locale uses the requested airport intro text",
    (locale) => {
      expect(getAirportPrioritySeo(locale).introText).toBe(
        EXPECTED_AIRPORT_INTRO_BY_LOCALE[locale]
      );
    }
  );
});
