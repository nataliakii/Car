/**
 * Email renderer — builds title, text, and HTML for each email type.
 * Single entry: payload + intent → full email content. No design in API.
 */

import "dayjs/locale/ru";
import "dayjs/locale/el";
import { getCustomerEmailStrings } from "@locales/customerEmail";
import { fromServerUTC, formatTimeHHMM } from "@/domain/time/athensTime";
import { renderCustomerOrderConfirmation } from "@/app/ui/email/templates/customerOrderConfirmation";
import { renderAdminOrderNotificationHtml } from "@/app/ui/email/templates/adminOrderNotification";

/** Дата в формате "17 Jan 2026" / "17 Янв 2026" / "17 Ιαν 2026" по локали */
function formatDateLong(d, locale) {
  if (!d) return "—";
  const loc = locale === "ru" ? "ru" : locale === "el" ? "el" : "en";
  const athens = fromServerUTC(d);
  if (!athens || !athens.isValid()) return "—";
  return athens.locale(loc).format("D MMM YYYY");
}

function formatTime(d) {
  if (!d) return "—";
  const athens = fromServerUTC(d);
  if (!athens || !athens.isValid()) return "—";
  return formatTimeHHMM(athens);
}

/**
 * Renders customer order confirmation email (title, plain text, HTML).
 * @param {import("@/domain/orders/orderNotificationDispatcher").NotificationPayload} payload
 * @returns {{ title: string, text: string, html: string }}
 */
export function renderCustomerOrderConfirmationEmail(payload) {
  const t = getCustomerEmailStrings(payload.locale);
  const locale = payload.locale === "ru" ? "ru" : payload.locale === "el" ? "el" : "en";
  const fromStr = formatDateLong(payload.rentalStartDate, locale);
  const toStr = formatDateLong(payload.rentalEndDate, locale);
  const carDisplay = payload.carNumber
    ? `${payload.carModel || "—"} (${payload.carNumber})`
    : (payload.carModel || "—");
  const customerName = payload.customerName && String(payload.customerName).trim() ? payload.customerName : "Guest";
  const orderNum = payload.orderNumber || payload.orderId || "";
  const total = payload.totalPrice != null ? String(payload.totalPrice) : "";
  const numberOfDays = payload.numberOfDays != null ? String(payload.numberOfDays) : "";
  const childSeats = payload.ChildSeats != null ? String(payload.ChildSeats) : "0";
  const insurance = (payload.insurance && String(payload.insurance).trim()) ? payload.insurance : "";
  const secondDriverEnabled = payload.secondDriver === true;
  const secondDriverText = t.secondDriverEnabled || "Yes";
  const placeIn = (payload.placeIn && String(payload.placeIn).trim()) ? payload.placeIn : "";
  const placeOut = (payload.placeOut && String(payload.placeOut).trim()) ? payload.placeOut : "";
  const timeInStr = payload.timeIn ? formatTime(payload.timeIn) : "";
  const timeOutStr = payload.timeOut ? formatTime(payload.timeOut) : "";
  const flightNumber = (payload.flightNumber && String(payload.flightNumber).trim()) ? payload.flightNumber : "";

  const greeting = (t.greeting || "").replace("{{CustomerName}}", customerName);

  const data = {
    t,
    greeting,
    fromStr,
    toStr,
    carDisplay,
    orderNum,
    total,
    numberOfDays,
    childSeats,
    insurance,
    secondDriverEnabled,
    secondDriverText,
    placeIn,
    placeOut,
    timeInStr,
    timeOutStr,
    flightNumber,
  };
  const html = renderCustomerOrderConfirmation(data);

  const orderNumberLine = (t.orderNumber || "").replace("{{orderNumber}}", orderNum);
  const vehicleLine = (t.vehicle || "").replace("{{vehicle}}", carDisplay);
  const rentalPeriodWithTime =
    fromStr && toStr
      ? `${fromStr}${timeInStr ? " " + timeInStr : ""} – ${toStr}${timeOutStr ? " " + timeOutStr : ""}`.trim()
      : "";
  const rentalPeriodLine = (t.rentalPeriod || "").replace("{{from}}", fromStr).replace("{{to}}", toStr);
  const rentalPeriodLineWithTime = rentalPeriodWithTime
    ? (t.rentalPeriodLabel || "Rental period") + ": " + rentalPeriodWithTime
    : rentalPeriodLine;
  const totalAmountLine = (t.totalAmount || "").replace("{{total}}", total);

  const text = [
    greeting,
    "",
    t.thankYouChoose,
    "",
    t.weReceived,
    "",
    t.reservationDetails,
    orderNumberLine,
    vehicleLine,
    rentalPeriodLineWithTime || rentalPeriodLine,
    numberOfDays ? `${t.daysLabel || "Number of days"}: ${numberOfDays}` : "",
    childSeats !== "0" ? `${t.childSeatsLabel || "Child seats"}: ${childSeats}` : "",
    insurance ? `${t.insuranceLabel || "Insurance"}: ${insurance}` : "",
    secondDriverEnabled
      ? `${t.secondDriverLabel || "Second driver"}: ${secondDriverText}`
      : "",
    placeIn ? `${t.pickupLocationLabel || "Pick-up location"}: ${placeIn}` : "",
    placeOut ? `${t.returnLocationLabel || "Return location"}: ${placeOut}` : "",
    flightNumber ? `${t.flightNumberLabel || "Flight number"}: ${flightNumber}` : "",
    totalAmountLine,
    "",
    "---",
    "",
    t.whatHappensNext,
    "",
    t.step1,
    t.step2,
    t.step3,
    "",
    t.questionsParagraph,
    "",
    t.kindRegards,
    t.team,
    "",
    t.phones,
  ].filter(Boolean).join("\n");

  return {
    title: t.title,
    text,
    html,
  };
}

/**
 * Renders admin/system order notification email (HTML with teal header + BBQR signature).
 * @param {string} title - e.g. "🚨 New client order created"
 * @param {string} text - Plain text body (newline-separated lines)
 * @returns {string} Full HTML document
 */
export function renderAdminOrderNotificationEmail(title, text) {
  return renderAdminOrderNotificationHtml({ title, body: text || "" });
}
