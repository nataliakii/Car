/**
 * Email renderer — builds title, text, and HTML for each email type.
 * Single entry: payload + intent → full email content. No design in API.
 */

import "dayjs/locale/ru";
import "dayjs/locale/el";
import { getCustomerEmailStrings } from "@locales/customerEmail";
import { fromServerUTC, formatTimeHHMM } from "@/domain/time/athensTime";
import { renderCustomerOrderConfirmation } from "@/app/ui/email/templates/customerOrderConfirmation";
import { renderCustomerOfficialConfirmation } from "@/app/ui/email/templates/customerOfficialConfirmation";
import { renderAdminOrderNotificationHtml } from "@/app/ui/email/templates/adminOrderNotification";
import { getSecondDriverPriceLabelValue } from "@utils/secondDriverPricing";

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

function interpolatePrice(template, priceLabelValue) {
  if (!template || typeof template !== "string") return "";
  return template.replace(/{{\s*price\s*}}/g, priceLabelValue);
}

function normalizeLocale(localeInput) {
  return localeInput === "ru" ? "ru" : localeInput === "el" ? "el" : "en";
}

function toSafeFilePart(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "order";
}

function buildCustomerEmailViewModel(payload) {
  const t = getCustomerEmailStrings(payload.locale);
  const locale = normalizeLocale(payload.locale);
  const fromStr = formatDateLong(payload.rentalStartDate, locale);
  const toStr = formatDateLong(payload.rentalEndDate, locale);
  const carDisplay = payload.carNumber
    ? `${payload.carModel || "—"} (${payload.carNumber})`
    : payload.carModel || "—";
  const customerName =
    payload.customerName && String(payload.customerName).trim()
      ? payload.customerName
      : "Guest";
  const orderNum = payload.orderNumber || payload.orderId || "";
  const total = payload.totalPrice != null ? String(payload.totalPrice) : "";
  const numberOfDays =
    payload.numberOfDays != null ? String(payload.numberOfDays) : "";
  const childSeats = payload.ChildSeats != null ? String(payload.ChildSeats) : "0";
  const insurance =
    payload.insurance && String(payload.insurance).trim() ? payload.insurance : "";
  const secondDriverEnabled = payload.secondDriver === true;
  const secondDriverText = t.secondDriverEnabled || "Yes";
  const secondDriverPriceLabelValue = getSecondDriverPriceLabelValue();
  const secondDriverLabel = interpolatePrice(
    t.secondDriverLabel || "Second driver ({{price}} €/day)",
    secondDriverPriceLabelValue
  );
  const placeIn =
    payload.placeIn && String(payload.placeIn).trim() ? payload.placeIn : "";
  const placeOut =
    payload.placeOut && String(payload.placeOut).trim() ? payload.placeOut : "";
  const timeInStr = payload.timeIn ? formatTime(payload.timeIn) : "";
  const timeOutStr = payload.timeOut ? formatTime(payload.timeOut) : "";
  const flightNumber =
    payload.flightNumber && String(payload.flightNumber).trim()
      ? payload.flightNumber
      : "";
  const greeting = (t.greeting || "").replace("{{CustomerName}}", customerName);
  const rentalPeriodWithTime =
    fromStr && toStr
      ? `${fromStr}${timeInStr ? ` ${timeInStr}` : ""} – ${toStr}${
          timeOutStr ? ` ${timeOutStr}` : ""
        }`.trim()
      : "";

  return {
    t,
    locale,
    fromStr,
    toStr,
    carDisplay,
    customerName,
    orderNum,
    total,
    numberOfDays,
    childSeats,
    insurance,
    secondDriverEnabled,
    secondDriverText,
    secondDriverLabel,
    placeIn,
    placeOut,
    timeInStr,
    timeOutStr,
    flightNumber,
    greeting,
    rentalPeriodWithTime,
  };
}

/**
 * Renders customer order confirmation email (title, plain text, HTML).
 * @param {import("@/domain/orders/orderNotificationDispatcher").NotificationPayload} payload
 * @returns {{ title: string, text: string, html: string }}
 */
export function renderCustomerOrderConfirmationEmail(payload) {
  const vm = buildCustomerEmailViewModel(payload);
  const {
    t,
    fromStr,
    toStr,
    carDisplay,
    orderNum,
    total,
    numberOfDays,
    childSeats,
    insurance,
    secondDriverLabel,
    secondDriverEnabled,
    secondDriverText,
    placeIn,
    placeOut,
    timeInStr,
    timeOutStr,
    flightNumber,
    greeting,
    rentalPeriodWithTime,
  } = vm;

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
    secondDriverLabel,
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
      ? `${secondDriverLabel || "Second driver"}: ${secondDriverText}`
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
 * Renders official customer confirmation email + metadata for attached PDF.
 * @param {import("@/domain/orders/orderNotificationDispatcher").NotificationPayload} payload
 * @returns {{ title: string, text: string, html: string, pdfFileName: string, pdfData: Record<string, string> }}
 */
export function renderCustomerOfficialConfirmationEmail(payload) {
  const vm = buildCustomerEmailViewModel(payload);
  const {
    t,
    fromStr,
    toStr,
    carDisplay,
    customerName,
    orderNum,
    total,
    childSeats,
    insurance,
    secondDriverLabel,
    secondDriverEnabled,
    secondDriverText,
    placeIn,
    placeOut,
    greeting,
    rentalPeriodWithTime,
  } = vm;

  const title = t.officialTitle || "Official Booking Confirmation";
  const intro =
    t.officialIntro ||
    "Your reservation has been officially confirmed by Natali Cars.";
  const pdfNote =
    t.officialPdfNote ||
    "The official confirmation PDF is attached to this email.";
  // TEMP: hide "Generated time" in official confirmation email + PDF
  // const generatedAtLabel = t.generatedAtLabel || "Generated at";
  // const generatedAtValue = `${formatDateLong(new Date(), vm.locale)} ${formatTime(
  //   new Date()
  // )}`.trim();

  const orderNumberLabel = t.orderNumberLabel || "Order number";
  const vehicleLabel = t.vehicleLabel || "Vehicle";
  const rentalPeriodLabel = t.rentalPeriodLabel || "Rental period";
  const pickupLocationLabel = t.pickupLocationLabel || "Pick-up location";
  const returnLocationLabel = t.returnLocationLabel || "Return location";
  const insuranceLabel = t.insuranceLabel || "Insurance";
  const childSeatsLabel = t.childSeatsLabel || "Child seats";
  const totalAmountLabel = t.totalAmountLabel || "Total amount";
  const customerLabel = t.customerLabel || "Customer";
  const emailLabel = t.emailLabel || "Email";
  const phoneLabel = t.phoneLabel || "Phone";

  const rentalPeriodValue =
    rentalPeriodWithTime ||
    (t.rentalPeriod || "")
      .replace("{{from}}", fromStr || "—")
      .replace("{{to}}", toStr || "—");
  const secondDriverValue = secondDriverEnabled
    ? secondDriverText || t.yes || "Yes"
    : t.no || "No";
  const orderNumberValue = orderNum ? `#${orderNum}` : "—";

  const html = renderCustomerOfficialConfirmation({
    title,
    greeting,
    intro,
    pdfNote,
    // TEMP: hide generated timestamp block in HTML email
    // generatedAtLabel,
    // generatedAt: generatedAtValue,
    orderNumberLabel,
    orderNumberValue,
    vehicleLabel,
    vehicleValue: carDisplay,
    rentalPeriodLabel,
    rentalPeriodValue,
    pickupLocationLabel,
    pickupLocationValue: placeIn || "—",
    returnLocationLabel,
    returnLocationValue: placeOut || "—",
    insuranceLabel,
    insuranceValue: insurance || "—",
    childSeatsLabel,
    childSeatsValue: childSeats || "0",
    secondDriverLabel,
    secondDriverValue,
    totalAmountLabel,
    totalAmountValue: total || "0",
    orderRefText: orderNumberValue,
  });

  const text = [
    greeting,
    "",
    title,
    "",
    intro,
    pdfNote,
    "",
    `${orderNumberLabel}: ${orderNumberValue}`,
    `${vehicleLabel}: ${carDisplay || "—"}`,
    `${rentalPeriodLabel}: ${rentalPeriodValue || "—"}`,
    `${pickupLocationLabel}: ${placeIn || "—"}`,
    `${returnLocationLabel}: ${placeOut || "—"}`,
    `${insuranceLabel}: ${insurance || "—"}`,
    `${childSeatsLabel}: ${childSeats || "0"}`,
    `${secondDriverLabel}: ${secondDriverValue}`,
    `${totalAmountLabel}: €${total || "0"}`,
    // TEMP: hide generated timestamp line in plain-text email
    // "",
    // `${generatedAtLabel}: ${generatedAtValue}`,
  ]
    .filter(Boolean)
    .join("\n");

  const filePart = toSafeFilePart(orderNum || payload.orderId);
  const pdfFileName = `NataliCars-Official-Confirmation-${filePart}.pdf`;

  const pdfData = {
    title,
    // TEMP: hide generated timestamp in PDF
    // generatedAtLabel,
    // generatedAtValue,
    orderNumberLabel,
    orderNumberValue,
    vehicleLabel,
    vehicleValue: carDisplay || "—",
    customerLabel,
    customerValue: customerName || "—",
    emailLabel,
    emailValue: payload.email || "—",
    phoneLabel,
    phoneValue: payload.phone || "—",
    rentalPeriodLabel,
    rentalPeriodValue: rentalPeriodValue || "—",
    pickupLocationLabel,
    pickupLocationValue: placeIn || "—",
    returnLocationLabel,
    returnLocationValue: placeOut || "—",
    insuranceLabel,
    insuranceValue: insurance || "—",
    childSeatsLabel,
    childSeatsValue: childSeats || "0",
    secondDriverLabel,
    secondDriverValue,
    totalAmountLabel,
    totalAmountValue: total || "0",
    pdfNote,
  };

  return { title, text, html, pdfFileName, pdfData };
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
