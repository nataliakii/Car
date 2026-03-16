import {
  LOCATION_IDS,
  type LocationId,
  type SupportedLocale,
} from "./locationSeoKeys";

/**
 * Hero image configuration for location pages.
 * Keys must match location ids (LOCATION_IDS from locationSeoKeys).
 *
 * To add an image for a new location, add an entry to LOCATION_HERO_IMAGES
 * with the location id as key (e.g. "nikiti", "sithonia") and defaultSrc + portraitPhoneSrc.
 */

const DEFAULT_HERO = {
  defaultSrc: "/car-rental-neakallikratia.png",
  portraitPhoneSrc: "/car-rental-neakallikratia-portrait.png",
} as const;

export const LOCATION_HERO_IMAGES: Record<
  string,
  { defaultSrc: string; portraitPhoneSrc: string }
> = {
  "nea-kallikratia": {
    defaultSrc: "/car-rental-neakallikratia.png",
    portraitPhoneSrc: "/car-rental-neakallikratia-portrait.png",
  },
  halkidiki: {
    defaultSrc: "/car-rental-halkidiki.png",
    portraitPhoneSrc: "/car-rental-halkidiki-portrait.png",
  },
  "thessaloniki-airport": {
    defaultSrc: "/car-rental-thessaloniki-airport.png",
    portraitPhoneSrc: "/car-rental-thessaloniki-airport-portrait.png",
  },
  thessaloniki: {
    defaultSrc: "/car-rental-thessaloniki.png",
    portraitPhoneSrc: "/car-rental-thessaloniki-portrait.png",
  },
};

const LOCATION_DISTANCE_KM: Record<
  LocationId,
  { toThessalonikiKm?: number; toAirportKm?: number }
> = {
  [LOCATION_IDS.THESSALONIKI]: { toAirportKm: 17 },
  [LOCATION_IDS.THESSALONIKI_AIRPORT]: { toThessalonikiKm: 17 },
  [LOCATION_IDS.HALKIDIKI]: { toThessalonikiKm: 110, toAirportKm: 90 },
  [LOCATION_IDS.SITHONIA]: { toThessalonikiKm: 120, toAirportKm: 100 },
  [LOCATION_IDS.KASSANDRA]: { toThessalonikiKm: 95, toAirportKm: 75 },
  [LOCATION_IDS.NEA_KALLIKRATIA]: { toThessalonikiKm: 35, toAirportKm: 25 },
  [LOCATION_IDS.NEA_MOUDANIA]: { toThessalonikiKm: 60, toAirportKm: 45 },
  [LOCATION_IDS.NIKITI]: { toThessalonikiKm: 105, toAirportKm: 90 },
  [LOCATION_IDS.NEOS_MARMARAS]: { toThessalonikiKm: 120, toAirportKm: 105 },
  [LOCATION_IDS.SARTI]: { toThessalonikiKm: 140, toAirportKm: 125 },
  [LOCATION_IDS.KALLITHEA]: { toThessalonikiKm: 85, toAirportKm: 70 },
  [LOCATION_IDS.PEFKOHORI]: { toThessalonikiKm: 105, toAirportKm: 90 },
  [LOCATION_IDS.HANIOTI]: { toThessalonikiKm: 100, toAirportKm: 85 },
  [LOCATION_IDS.POLICHRONO]: { toThessalonikiKm: 95, toAirportKm: 80 },
  [LOCATION_IDS.AFITOS]: { toThessalonikiKm: 80, toAirportKm: 65 },
  [LOCATION_IDS.KRIOPIGI]: { toThessalonikiKm: 90, toAirportKm: 75 },
  [LOCATION_IDS.SANI]: { toThessalonikiKm: 85, toAirportKm: 70 },
  [LOCATION_IDS.KASSANDRIA]: { toThessalonikiKm: 90, toAirportKm: 75 },
  [LOCATION_IDS.FOURKA]: { toThessalonikiKm: 100, toAirportKm: 85 },
  [LOCATION_IDS.METAMORFOSI]: { toThessalonikiKm: 90, toAirportKm: 75 },
  [LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI]: {
    toThessalonikiKm: 115,
    toAirportKm: 100,
  },
  [LOCATION_IDS.ORMILIA]: { toThessalonikiKm: 75, toAirportKm: 60 },
  [LOCATION_IDS.PETRALONA]: { toThessalonikiKm: 45, toAirportKm: 30 },
  [LOCATION_IDS.VRASNA]: { toThessalonikiKm: 80, toAirportKm: 95 },
  [LOCATION_IDS.OLYMPIADA]: { toThessalonikiKm: 95, toAirportKm: 110 },
};

const DISTANCE_TEXT_BY_LOCALE: Record<
  SupportedLocale,
  {
    general: (locationName: string, toThessalonikiKm: number, toAirportKm: number) => string;
    thessaloniki: (toAirportKm: number) => string;
    airport: (toThessalonikiKm: number) => string;
  }
> = {
  en: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `From ${locationName} to Thessaloniki it is about ${toThessalonikiKm} km, and to Thessaloniki Airport (SKG) about ${toAirportKm} km.`,
    thessaloniki: (toAirportKm) =>
      `From central Thessaloniki to Thessaloniki Airport (SKG) it is about ${toAirportKm} km. The city is the main transport hub of Northern Greece.`,
    airport: (toThessalonikiKm) =>
      `From Thessaloniki Airport (SKG) to Thessaloniki city center it is about ${toThessalonikiKm} km. The airport is the main air gateway for trips to Halkidiki.`,
  },
  ru: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `От ${locationName} до Салоник примерно ${toThessalonikiKm} км, а до аэропорта Салоники (SKG) — примерно ${toAirportKm} км.`,
    thessaloniki: (toAirportKm) =>
      `От центра Салоник до аэропорта Салоники (SKG) примерно ${toAirportKm} км. Город является главным транспортным узлом Северной Греции.`,
    airport: (toThessalonikiKm) =>
      `От аэропорта Салоники (SKG) до центра Салоник примерно ${toThessalonikiKm} км. Это главный воздушный узел для поездок в Халкидики.`,
  },
  uk: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `Від ${locationName} до Салонік приблизно ${toThessalonikiKm} км, а до аеропорту Салоніки (SKG) — приблизно ${toAirportKm} км.`,
    thessaloniki: (toAirportKm) =>
      `Від центру Салонік до аеропорту Салоніки (SKG) приблизно ${toAirportKm} км. Місто є головним транспортним вузлом Північної Греції.`,
    airport: (toThessalonikiKm) =>
      `Від аеропорту Салоніки (SKG) до центру Салонік приблизно ${toThessalonikiKm} км. Це головні повітряні ворота для поїздок до Халкідікі.`,
  },
  el: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `Από ${locationName} έως τη Θεσσαλονίκη είναι περίπου ${toThessalonikiKm} χλμ. και έως το αεροδρόμιο Θεσσαλονίκης (SKG) περίπου ${toAirportKm} χλμ.`,
    thessaloniki: (toAirportKm) =>
      `Από το κέντρο της Θεσσαλονίκης έως το αεροδρόμιο Θεσσαλονίκης (SKG) είναι περίπου ${toAirportKm} χλμ. Η πόλη αποτελεί τον κύριο συγκοινωνιακό κόμβο της Βόρειας Ελλάδας.`,
    airport: (toThessalonikiKm) =>
      `Από το αεροδρόμιο Θεσσαλονίκης (SKG) έως το κέντρο της Θεσσαλονίκης είναι περίπου ${toThessalonikiKm} χλμ. Είναι η βασική αεροπορική πύλη για ταξίδια προς τη Χαλκιδική.`,
  },
  de: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `Von ${locationName} nach Thessaloniki sind es etwa ${toThessalonikiKm} km und zum Flughafen Thessaloniki (SKG) etwa ${toAirportKm} km.`,
    thessaloniki: (toAirportKm) =>
      `Vom Zentrum Thessalonikis bis zum Flughafen Thessaloniki (SKG) sind es etwa ${toAirportKm} km. Die Stadt ist der wichtigste Verkehrsknotenpunkt Nordgriechenlands.`,
    airport: (toThessalonikiKm) =>
      `Vom Flughafen Thessaloniki (SKG) bis ins Stadtzentrum von Thessaloniki sind es etwa ${toThessalonikiKm} km. Der Flughafen ist das wichtigste Lufttor fuer Reisen nach Chalkidiki.`,
  },
  bg: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `От ${locationName} до Солун са около ${toThessalonikiKm} км, а до летище Солун (SKG) — около ${toAirportKm} км.`,
    thessaloniki: (toAirportKm) =>
      `От центъра на Солун до летище Солун (SKG) са около ${toAirportKm} км. Градът е основният транспортен център на Северна Гърция.`,
    airport: (toThessalonikiKm) =>
      `От летище Солун (SKG) до центъра на Солун са около ${toThessalonikiKm} км. Това е основната въздушна врата за пътувания до Халкидики.`,
  },
  ro: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `Din ${locationName} pana la Salonic sunt aproximativ ${toThessalonikiKm} km, iar pana la Aeroportul Salonic (SKG) aproximativ ${toAirportKm} km.`,
    thessaloniki: (toAirportKm) =>
      `Din centrul Salonicului pana la Aeroportul Salonic (SKG) sunt aproximativ ${toAirportKm} km. Orasul este principalul nod de transport din nordul Greciei.`,
    airport: (toThessalonikiKm) =>
      `De la Aeroportul Salonic (SKG) pana in centrul orasului Salonic sunt aproximativ ${toThessalonikiKm} km. Aeroportul este principala poarta aeriana pentru calatoriile spre Halkidiki.`,
  },
  sr: {
    general: (locationName, toThessalonikiKm, toAirportKm) =>
      `Od ${locationName} do Soluna ima oko ${toThessalonikiKm} km, a do aerodroma Solun (SKG) oko ${toAirportKm} km.`,
    thessaloniki: (toAirportKm) =>
      `Od centra Soluna do aerodroma Solun (SKG) ima oko ${toAirportKm} km. Grad je glavno saobracajno cvoriste severne Grcke.`,
    airport: (toThessalonikiKm) =>
      `Od aerodroma Solun (SKG) do centra Soluna ima oko ${toThessalonikiKm} km. Aerodrom je glavna vazdusna kapija za putovanja ka Halkidikiju.`,
  },
};

/**
 * Returns hero image config for a location id. Falls back to default if not in config.
 */
export function getLocationHeroImage(locationId: string): {
  defaultSrc: string;
  portraitPhoneSrc: string;
} {
  return (
    LOCATION_HERO_IMAGES[locationId] || {
      ...DEFAULT_HERO,
    }
  );
}

export function getLocationDistanceText(
  locationId: string,
  locale: SupportedLocale = "en",
  locationName = ""
): string | undefined {
  const templates = DISTANCE_TEXT_BY_LOCALE[locale] || DISTANCE_TEXT_BY_LOCALE.en;
  const distanceInfo = LOCATION_DISTANCE_KM[locationId as LocationId];

  if (!distanceInfo) return undefined;

  if (locationId === LOCATION_IDS.THESSALONIKI) {
    return distanceInfo.toAirportKm
      ? templates.thessaloniki(distanceInfo.toAirportKm)
      : undefined;
  }

  if (locationId === LOCATION_IDS.THESSALONIKI_AIRPORT) {
    return distanceInfo.toThessalonikiKm
      ? templates.airport(distanceInfo.toThessalonikiKm)
      : undefined;
  }

  if (!locationName || distanceInfo.toThessalonikiKm == null || distanceInfo.toAirportKm == null) {
    return undefined;
  }

  return templates.general(
    locationName,
    distanceInfo.toThessalonikiKm,
    distanceInfo.toAirportKm
  );
}
