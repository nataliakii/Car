/**
 * SEO location hierarchy: defines path segments for hierarchical URLs.
 * Used for routes like /locations/halkidiki, /locations/halkidiki/kassandra,
 * /locations/halkidiki/kassandra/afitos.
 *
 * Path segments = location IDs (same across locales for consistent URLs).
 */

import { LOCATION_IDS, type LocationId } from "./locationSeoKeys";

/** Root regions (single segment: /locations/[region]). */
export const ROOT_REGION_IDS: readonly LocationId[] = [
  LOCATION_IDS.THESSALONIKI,
  LOCATION_IDS.THESSALONIKI_AIRPORT,
  LOCATION_IDS.NEA_KALLIKRATIA,
  LOCATION_IDS.HALKIDIKI,
] as const;

/** Areas under Halkidiki (two segments: /locations/halkidiki/[area]). */
export const HALKIDIKI_AREA_IDS: readonly LocationId[] = [
  LOCATION_IDS.KASSANDRA,
  LOCATION_IDS.SITHONIA,
] as const;

/** Cities under Kassandra (three segments: /locations/halkidiki/kassandra/[city]). */
export const KASSANDRA_CITY_IDS: readonly LocationId[] = [
  LOCATION_IDS.AFITOS,
  LOCATION_IDS.KALLITHEA,
  LOCATION_IDS.HANIOTI,
  LOCATION_IDS.FOURKA,
  LOCATION_IDS.KASSANDRIA,
  LOCATION_IDS.KRIOPIGI,
  LOCATION_IDS.SANI,
  LOCATION_IDS.PEFKOHORI,
  LOCATION_IDS.POLICHRONO,
] as const;

/** Cities under Sithonia (three segments: /locations/halkidiki/sithonia/[city]). */
export const SITHONIA_CITY_IDS: readonly LocationId[] = [
  LOCATION_IDS.NIKITI,
  LOCATION_IDS.NEOS_MARMARAS,
  LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI,
  LOCATION_IDS.SARTI,
] as const;

/** Cities directly under Halkidiki (two segments: /locations/halkidiki/[city] — not Sithonia/Kassandra). */
export const HALKIDIKI_DIRECT_CITY_IDS: readonly LocationId[] = [
  LOCATION_IDS.NEA_MOUDANIA,
  LOCATION_IDS.METAMORFOSI,
  LOCATION_IDS.ORMILIA,
  LOCATION_IDS.PETRALONA,
  LOCATION_IDS.VRASNA,
  LOCATION_IDS.OLYMPIADA,
] as const;

/** Map: location id -> path segments (e.g. afitos -> ['halkidiki','kassandra','afitos']). */
const LOCATION_PATH_SEGMENTS = new Map<LocationId, LocationId[]>();

function registerPath(id: LocationId, segments: LocationId[]) {
  LOCATION_PATH_SEGMENTS.set(id, segments);
}

// Root regions: one segment
ROOT_REGION_IDS.forEach((id) => registerPath(id, [id]));

// Halkidiki areas: two segments
HALKIDIKI_AREA_IDS.forEach((areaId) => registerPath(areaId, [LOCATION_IDS.HALKIDIKI, areaId]));

// Kassandra cities: three segments
KASSANDRA_CITY_IDS.forEach((cityId) =>
  registerPath(cityId, [LOCATION_IDS.HALKIDIKI, LOCATION_IDS.KASSANDRA, cityId])
);

// Sithonia cities: three segments
SITHONIA_CITY_IDS.forEach((cityId) =>
  registerPath(cityId, [LOCATION_IDS.HALKIDIKI, LOCATION_IDS.SITHONIA, cityId])
);

// Halkidiki direct cities: two segments (e.g. Nea Moudania — not in Sithonia/Kassandra)
HALKIDIKI_DIRECT_CITY_IDS.forEach((cityId) =>
  registerPath(cityId, [LOCATION_IDS.HALKIDIKI, cityId])
);

// NEA_KALLIKRATIA is both root and in Halkidiki childIds in repo; we keep it as root only
// (already registered above as root).

/**
 * Returns path segments for a location (for hierarchical URL).
 * If the location is not in the hierarchy, returns null (use flat slug URL).
 */
export function getLocationPathSegments(locationId: LocationId): LocationId[] | null {
  return LOCATION_PATH_SEGMENTS.get(locationId) ?? null;
}

/**
 * Resolves path segments (from URL) to a location id, or null if invalid.
 * path = ['halkidiki'] -> HALKIDIKI
 * path = ['halkidiki','kassandra'] -> KASSANDRA
 * path = ['halkidiki','kassandra','afitos'] -> AFITOS
 */
export function resolveLocationIdByPath(path: string[]): LocationId | null {
  if (path.length === 0) return null;
  const normalized = path.map((p) => p.toLowerCase().trim()).filter(Boolean);
  if (normalized.length === 0) return null;

  if (normalized.length === 1) {
    const id = normalized[0];
    if (ROOT_REGION_IDS.includes(id as LocationId)) return id as LocationId;
    return null;
  }

  if (normalized.length === 2) {
    const [region, second] = normalized;
    if (region !== LOCATION_IDS.HALKIDIKI) return null;
    if (HALKIDIKI_AREA_IDS.includes(second as LocationId)) return second as LocationId;
    if (HALKIDIKI_DIRECT_CITY_IDS.includes(second as LocationId)) return second as LocationId;
    return null;
  }

  if (normalized.length === 3) {
    const [region, area, city] = normalized;
    if (region !== LOCATION_IDS.HALKIDIKI) return null;
    if (area === LOCATION_IDS.KASSANDRA && KASSANDRA_CITY_IDS.includes(city as LocationId))
      return city as LocationId;
    if (area === LOCATION_IDS.SITHONIA && SITHONIA_CITY_IDS.includes(city as LocationId))
      return city as LocationId;
    return null;
  }

  return null;
}

/**
 * Returns all path arrays for static generation (hierarchical + root).
 */
export function getAllHierarchyPathSegments(): LocationId[][] {
  const out: LocationId[][] = [];
  ROOT_REGION_IDS.forEach((id) => out.push([id]));
  HALKIDIKI_AREA_IDS.forEach((areaId) => out.push([LOCATION_IDS.HALKIDIKI, areaId]));
  KASSANDRA_CITY_IDS.forEach((cityId) =>
    out.push([LOCATION_IDS.HALKIDIKI, LOCATION_IDS.KASSANDRA, cityId])
  );
  SITHONIA_CITY_IDS.forEach((cityId) =>
    out.push([LOCATION_IDS.HALKIDIKI, LOCATION_IDS.SITHONIA, cityId])
  );
  HALKIDIKI_DIRECT_CITY_IDS.forEach((cityId) =>
    out.push([LOCATION_IDS.HALKIDIKI, cityId])
  );
  return out;
}
