import { fromServerUTC } from "@/domain/time/athensTime";

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

  if (!start || !end || !start.isValid() || !end.isValid()) return 0;
  return Math.max(0, end.startOf("day").diff(start.startOf("day"), "day"));
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

