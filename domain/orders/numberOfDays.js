import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ATHENS_TZ, fromServerUTC } from "@/domain/time/athensTime";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MINUTES_IN_RENTAL_DAY = 24 * 60;

/**
 * Normalizes any date-like value to a dayjs object in Athens timezone.
 * Date-only strings are interpreted as Athens midnight.
 *
 * @param {Date|string|import("dayjs").Dayjs} value
 * @returns {import("dayjs").Dayjs|null}
 */
export function toBusinessDateTime(value) {
  if (value == null) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.tz(ATHENS_TZ) : null;
  }

  if (value instanceof Date) {
    const parsedDate = dayjs(value).tz(ATHENS_TZ);
    return parsedDate.isValid() ? parsedDate : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (DATE_ONLY_PATTERN.test(trimmed)) {
      const parsedDateOnly = dayjs.tz(trimmed, "YYYY-MM-DD", ATHENS_TZ);
      return parsedDateOnly.isValid() ? parsedDateOnly : null;
    }

    const parsedDateTime = dayjs(trimmed).tz(ATHENS_TZ);
    return parsedDateTime.isValid() ? parsedDateTime : null;
  }

  const parsedFallback = dayjs(value).tz(ATHENS_TZ);
  return parsedFallback.isValid() ? parsedFallback : null;
}

/**
 * Calculates billable rental days using 24-hour blocks:
 * - 1..24 hours => 1 day
 * - 25..48 hours => 2 days
 * - etc.
 *
 * @param {Date|string|import("dayjs").Dayjs} rentalStartDateTime
 * @param {Date|string|import("dayjs").Dayjs} rentalEndDateTime
 * @returns {number}
 */
export function getBusinessRentalDaysByMinutes(
  rentalStartDateTime,
  rentalEndDateTime
) {
  const start = toBusinessDateTime(rentalStartDateTime);
  const end = toBusinessDateTime(rentalEndDateTime);

  if (!start || !end || !start.isValid() || !end.isValid()) return 0;

  const diffMinutes = end.diff(start, "minute", true);
  if (!Number.isFinite(diffMinutes) || diffMinutes <= 0) return 0;

  return Math.ceil(diffMinutes / MINUTES_IN_RENTAL_DAY);
}

/**
 * Returns business day span between stored UTC dates (Athens day boundaries).
 *
 * @param {Date|string} rentalStartDate
 * @param {Date|string} rentalEndDate
 * @returns {number}
 */
export function getBusinessDaySpanFromStoredDates(rentalStartDate, rentalEndDate) {
  if (!rentalStartDate || !rentalEndDate) return 0;

  const start = fromServerUTC(rentalStartDate);
  const end = fromServerUTC(rentalEndDate);

  return getBusinessRentalDaysByMinutes(start, end);
}

/**
 * Raw value for channels where "missing" should stay missing.
 *
 * @param {Object} order
 * @returns {number|undefined}
 */
export function getOrderNumberOfDays(order) {
  return order?.numberOfDays;
}

/**
 * Safe value for UI labels where empty should be rendered as 0.
 *
 * @param {Object} order
 * @returns {number}
 */
export function getOrderNumberOfDaysOrZero(order) {
  return order?.numberOfDays || 0;
}
