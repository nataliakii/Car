import type { Metadata } from "next";

export const INDEXING_MODE = "allowlist" as const;

const ALLOWLISTED_PATHS = [
  "/ru/locations/arenda-avto-aeroport-saloniki",
  "/ru/locations/arenda-avto-halkidiki",
  "/ru/locations/arenda-avto-nea-kallikratia",
  "/ru/locations/arenda-avto-saloniki",
  "/en/locations/car-rental-halkidiki",
  "/en/locations/car-rental-nea-kallikratia",
  "/en/locations/car-rental-thessaloniki",
  "/en/locations/car-rental-thessaloniki-airport",
  "/el/locations/enoikiasi-autokinitou-aerodromio-thessalonikis",
  "/el/locations/enoikiasi-autokinitou-halkidiki",
  "/el/locations/enoikiasi-autokinitou-nea-kallikratia",
  "/el/locations/enoikiasi-autokinitou-thessaloniki",
  "/de/locations/mietwagen-halkidiki",
  "/de/locations/mietwagen-nea-kallikratia",
  "/de/locations/mietwagen-thessaloniki",
  "/de/locations/mietwagen-thessaloniki-flughafen",
] as const;

function normalizePath(path: string): string {
  if (!path) return "/";

  try {
    const url = path.startsWith("http")
      ? new URL(path)
      : new URL(path, "https://natali-cars.com");
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
    return withLeadingSlash.replace(/\/+$/, "") || "/";
  }
}

export const INDEXABLE_PATHS = new Set(
  ALLOWLISTED_PATHS.map((path) => normalizePath(path))
);

export function shouldIndexPath(path: string): boolean {
  if (INDEXING_MODE === "all") {
    return true;
  }

  return INDEXABLE_PATHS.has(normalizePath(path));
}

export function getRobotsForPath(
  path: string,
  forceNoindex = false
): Metadata["robots"] {
  if (forceNoindex || !shouldIndexPath(path)) {
    return { index: false, follow: true };
  }

  return { index: true, follow: true };
}

