import {
  LOCATION_CONTENT_KEYS,
  LOCATION_IDS,
  type LocationContentKey,
  type LocationId,
  type SupportedLocale,
} from "./locationSeoKeys";

const LOCATION_BOOKING_COPY_EXCLUDED_IDS = new Set<LocationId>([
  LOCATION_IDS.THESSALONIKI_AIRPORT,
]);

const LOCATION_BOOKING_COPY_EXCLUDED_CONTENT_KEYS = new Set<LocationContentKey>(
  [
    LOCATION_CONTENT_KEYS.THESSALONIKI,
    LOCATION_CONTENT_KEYS.THESSALONIKI_AIRPORT,
  ]
);

const LOCATION_BOOKING_SENTENCE_TEMPLATES: Record<SupportedLocale, string> = {
  en: "Book your rental car online in {locationName} with no deposit, with pickup at your accommodation or in the city, and 24/7 support.",
  ru: "Бронируйте онлайн авто в {locationName} без депозита с выдачей у места проживания или в городе и поддержкой 24/7.",
  uk: "Бронюйте онлайн авто в {locationName} без депозиту з видачею біля місця проживання або в місті та з підтримкою 24/7.",
  el: "Κάντε online κράτηση αυτοκινήτου σε {locationName} χωρίς εγγύηση, με παραλαβή στο κατάλυμά σας ή στην πόλη και με υποστήριξη 24/7.",
  de: "Buchen Sie Ihren Mietwagen online in {locationName} ohne Kaution, mit Uebergabe an Ihrer Unterkunft oder in der Stadt und mit 24/7-Support.",
  bg: "Резервирайте онлайн кола в {locationName} без депозит с получаване при мястото ви за настаняване или в града и с поддръжка 24/7.",
  ro: "Rezervati online masina in {locationName} fara depozit, cu preluare la cazare sau in oras si cu asistenta 24/7.",
  sr: "Rezervisite online auto u {locationName} bez depozita, uz preuzimanje kod smestaja ili u gradu i uz podrsku 24/7.",
};

const LOCATION_HERO_SUBTITLE_TEMPLATES: Record<SupportedLocale, string> = {
  en: "Book your rental car online in {locationName} with no deposit, with pickup at your accommodation or in the city, with 24/7 support.",
  ru: "Бронируйте онлайн авто в {locationName} без депозита с выдачей у места проживания или в городе с поддержкой 24/7.",
  uk: "Бронюйте онлайн авто в {locationName} без депозиту з видачею біля місця проживання або в місті з підтримкою 24/7.",
  el: "Κάντε online κράτηση αυτοκινήτου σε {locationName} χωρίς εγγύηση, με παραλαβή στο κατάλυμά σας ή στην πόλη και με υποστήριξη 24/7.",
  de: "Buchen Sie Ihren Mietwagen online in {locationName} ohne Kaution, mit Uebergabe an Ihrer Unterkunft oder in der Stadt und mit 24/7-Support.",
  bg: "Резервирайте онлайн кола в {locationName} без депозит с получаване при мястото ви за настаняване или в града с поддръжка 24/7.",
  ro: "Rezervati online masina in {locationName} fara depozit, cu preluare la cazare sau in oras si cu asistenta 24/7.",
  sr: "Rezervisite online auto u {locationName} bez depozita, uz preuzimanje kod smestaja ili u gradu uz podrsku 24/7.",
};

function fillTemplate(template: string, locationName: string): string {
  return template.replaceAll("{locationName}", locationName);
}

export function shouldApplyLocationBookingCopyToId(
  locationId: LocationId
): boolean {
  return !LOCATION_BOOKING_COPY_EXCLUDED_IDS.has(locationId);
}

export function shouldApplyLocationBookingCopyToContentKey(
  contentKey: LocationContentKey
): boolean {
  return !LOCATION_BOOKING_COPY_EXCLUDED_CONTENT_KEYS.has(contentKey);
}

export function getLocationBookingSentence(
  locale: SupportedLocale,
  locationName: string
): string {
  return fillTemplate(
    LOCATION_BOOKING_SENTENCE_TEMPLATES[locale],
    locationName
  );
}

export function getLocationHeroSubtitleSentence(
  locale: SupportedLocale,
  locationName: string
): string {
  return fillTemplate(
    LOCATION_HERO_SUBTITLE_TEMPLATES[locale],
    locationName
  );
}

export function appendLocationBookingSentence(
  baseText: string,
  locale: SupportedLocale,
  locationName: string
): string {
  const trimmedBase = baseText.trim();
  const sentence = getLocationBookingSentence(locale, locationName);

  return trimmedBase ? `${trimmedBase} ${sentence}` : sentence;
}
