/**
 * Internal API: list cars for external consumers (e.g. bbqr.site, Nea Kallikratia Guide).
 * - Returns ONLY real cars (testingCar = false or not set).
 * - Protected by Bearer token (INTERNAL_API_TOKEN).
 * - CORS allowed only from https://bbqr.site.
 * - Returns extended public fields: slug, transmission, fueltype, seats, model, class, and optional detail fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { Car } from "@models/car";
import { connectToDB } from "@lib/database";
import { PRODUCTION_BASE_URL } from "@config/seo";

const ALLOWED_ORIGIN = "https://bbqr.site";
const AUTH_SCHEME = "Bearer";

/** Extended format for external listings (e.g. BBQR, Nea Kallikratia Guide). */
export type InternalCarItem = {
  externalId: string;
  title: string;
  slug: string;
  priceFrom: number;
  image: string | null;
  bookingUrl: string;
  transmission: string;
  fueltype: string | null;
  seats: number;
  model?: string;
  class?: string;
  registration?: number;
  color?: string | null;
  numberOfDoors?: number;
  airConditioning?: boolean;
  enginePower?: number;
  engine?: string | null;
};

/** Base URL for booking links (no trailing slash). */
function getBookingBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL;
  if (typeof raw !== "string" || !raw.trim()) return PRODUCTION_BASE_URL;
  const url = raw.trim().replace(/\/+$/, "");
  return url.startsWith("http") ? url : `https://${url}`;
}

/** Capitalize first letter of a word. */
function capitalizeWord(s: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Build display title: "Toyota Yaris Automatic". */
function buildTitle(
  model: string | undefined,
  transmission: string | undefined
): string {
  const combined = [(model ?? "").trim(), (transmission ?? "").trim()]
    .filter(Boolean)
    .join(" ");
  return combined
    .split(/\s+/)
    .map(capitalizeWord)
    .filter(Boolean)
    .join(" ");
}

/**
 * Get a representative price from pricingTiers (min across all seasons and day tiers).
 * pricingTiers after .lean(): { [season]: { days: { [dayCount]: number } } } or Map.
 */
function getRepresentativePrice(pricingTiers: unknown): number {
  if (pricingTiers == null) return 0;
  const tiers =
    pricingTiers instanceof Map
      ? Object.fromEntries(pricingTiers as Map<string, { days?: Record<string, number> }>)
      : (pricingTiers as Record<string, { days?: Record<string, number> }>);
  let min = Infinity;
  for (const tier of Object.values(tiers ?? {})) {
    const days = tier?.days;
    if (days == null) continue;
    const dayMap = days instanceof Map ? Object.fromEntries(days) : days;
    for (const value of Object.values(dayMap ?? {})) {
      const n = Number(value);
      if (Number.isFinite(n) && n < min) min = n;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/** Validate Bearer token. Returns true iff token is valid. */
function validateToken(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (typeof expected !== "string" || expected.length === 0) {
    return false;
  }
  const auth = request.headers.get("Authorization")?.trim();
  if (!auth || !auth.startsWith(AUTH_SCHEME)) {
    return false;
  }
  const token = auth.slice(AUTH_SCHEME.length).trim();
  return token.length > 0 && token === expected;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/** OPTIONS: preflight for CORS. */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/** GET: return only real cars (testingCar = false), extended public fields for listings. */
export async function GET(request: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
    ...corsHeaders(),
  };

  if (!validateToken(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers }
    );
  }

  try {
    await connectToDB();
  } catch (err) {
    console.error("[internal/cars] DB connection error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers }
    );
  }

  try {
    // Only real cars: testingCar is false or not set (exclude testingCar === true)
    const filter = {
      $or: [
        { testingCar: false },
        { testingCar: { $exists: false } },
      ],
    };
    // Mongoose Query has union overloads that confuse TS; assert to run the chain
    const cars = await (Car as import("mongoose").Model<Record<string, unknown>>)
      .find(filter)
      .select(
        "_id model transmission slug photoUrl pricingTiers fueltype seats class registration color numberOfDoors airConditioning enginePower engine"
      )
      .lean()
      .exec();

    const baseUrl = getBookingBaseUrl();
    const items: InternalCarItem[] = (cars as Array<Record<string, unknown>>).map(
      (doc) => {
        const slug = (doc.slug as string) ?? "";
        const model = (doc.model as string) ?? "";
        const transmission = (doc.transmission as string) ?? "";
        const seats = Number(doc.seats);
        return {
          externalId: String(doc._id),
          title: buildTitle(model, transmission),
          slug,
          priceFrom: getRepresentativePrice(doc.pricingTiers),
          image: typeof doc.photoUrl === "string" ? doc.photoUrl : null,
          bookingUrl: `${baseUrl}/cars/${encodeURIComponent(slug)}`,
          transmission: transmission || "",
          fueltype:
            typeof doc.fueltype === "string" && doc.fueltype
              ? doc.fueltype
              : null,
          seats: Number.isFinite(seats) && seats > 0 ? seats : 5,
          ...(typeof doc.model === "string" && { model: doc.model }),
          ...(typeof doc.class === "string" && { class: doc.class }),
          ...(Number.isFinite(Number(doc.registration)) && {
            registration: Number(doc.registration),
          }),
          ...(typeof doc.color === "string" && { color: doc.color || null }),
          ...(Number.isFinite(Number(doc.numberOfDoors)) && {
            numberOfDoors: Number(doc.numberOfDoors),
          }),
          ...(typeof doc.airConditioning === "boolean" && {
            airConditioning: doc.airConditioning,
          }),
          ...(Number.isFinite(Number(doc.enginePower)) && {
            enginePower: Number(doc.enginePower),
          }),
          ...(typeof doc.engine === "string" && { engine: doc.engine || null }),
        };
      }
    );

    return NextResponse.json(items, { status: 200, headers });
  } catch (err) {
    console.error("[internal/cars] Error fetching cars:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers }
    );
  }
}
