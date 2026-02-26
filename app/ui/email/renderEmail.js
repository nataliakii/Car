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

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatAmount(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(2).replace(/\.?0+$/, "");
}

function isKaskoInsurance(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "cdw" ||
    normalized === "kasko" ||
    normalized === "casco" ||
    normalized === "каско"
  );
}

function buildCustomerEmailViewModel(payload) {
  const t = getCustomerEmailStrings(payload.locale);
  const locale = normalizeLocale(payload.locale);
  const fromStr = formatDateLong(payload.rentalStartDate, locale);
  const toStr = formatDateLong(payload.rentalEndDate, locale);
  const carRegNumber =
    payload.regNumber && String(payload.regNumber).trim()
      ? String(payload.regNumber).trim()
      : payload.carNumber && String(payload.carNumber).trim()
        ? String(payload.carNumber).trim()
        : "";
  const carDisplay = carRegNumber
    ? `${payload.carModel || "—"} (${carRegNumber})`
    : payload.carModel || "—";
  const customerName = normalizeText(payload.customerName) || "Guest";
  const orderNum = normalizeText(payload.orderNumber) || normalizeText(payload.orderId);
  const total = payload.totalPrice != null ? formatAmount(payload.totalPrice) : "";
  const numberOfDays =
    payload.numberOfDays != null ? String(payload.numberOfDays) : "";
  const childSeats = payload.ChildSeats != null ? String(payload.ChildSeats) : "0";
  const insurance = normalizeText(payload.insurance);
  const franchiseNumber = Number(payload.franchiseOrder);
  const franchiseAmount =
    payload.franchiseOrder !== null &&
    payload.franchiseOrder !== undefined &&
    normalizeText(payload.franchiseOrder) &&
    Number.isFinite(franchiseNumber) &&
    franchiseNumber > 0
      ? formatAmount(franchiseNumber)
      : "";
  const shouldShowFranchise = isKaskoInsurance(insurance);
  const insuranceWithFranchise =
    insurance && franchiseAmount && shouldShowFranchise
      ? `${insurance} (${t.franchiseLabel || "Franchise"} ${franchiseAmount} EUR)`
      : insurance;
  const secondDriverEnabled = payload.secondDriver === true;
  const secondDriverText = t.secondDriverEnabled || "Yes";
  const secondDriverPriceLabelValue = getSecondDriverPriceLabelValue();
  const secondDriverLabel = interpolatePrice(
    t.secondDriverLabel || "Second driver ({{price}} €/day)",
    secondDriverPriceLabelValue
  );
  const placeIn = normalizeText(payload.placeIn);
  const placeOut = normalizeText(payload.placeOut);
  const timeInStr = payload.timeIn ? formatTime(payload.timeIn) : "";
  const timeOutStr = payload.timeOut ? formatTime(payload.timeOut) : "";
  const flightNumber = normalizeText(payload.flightNumber);
  const flightShortLabel = t.flightShortLabel || "Flight";
  const pickupLocationWithFlight =
    placeIn && flightNumber
      ? `${placeIn} (${flightShortLabel} ${flightNumber})`
      : placeIn;
  const phone = normalizeText(payload.phone);
  const email = normalizeText(payload.email);
  const phoneInlineLabel = t.phoneInlineLabel || "tel.";
  const emailInlineLabel = t.emailInlineLabel || "e-mail";
  const customerContactParts = [];
  if (phone) customerContactParts.push(`${phoneInlineLabel} ${phone}`);
  if (email) customerContactParts.push(`${emailInlineLabel}: ${email}`);
  const customerContactValue = customerContactParts.length
    ? `${customerName} (${customerContactParts.join(", ")})`
    : customerName;
  const greeting = (t.greeting || "").replace("{{CustomerName}}", customerName);
  const greetingBase = greeting.trim().replace(/[,\s]+$/g, "");
  const officialGreeting = customerContactParts.length
    ? `${greetingBase} (${customerContactParts.join(", ")}),`
    : greeting;
  const meetingContactPhone = normalizeText(payload.meetingContactPhone);
  const meetingContactChannel = normalizeText(payload.meetingContactChannel);
  const meetingContactName = normalizeText(payload.meetingContactName);
  const meetingContactValue = [
    meetingContactPhone,
    meetingContactChannel ? `(${meetingContactChannel})` : "",
    meetingContactName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
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
    insuranceWithFranchise,
    franchiseAmount,
    secondDriverEnabled,
    secondDriverText,
    secondDriverLabel,
    placeIn,
    placeOut,
    pickupLocationWithFlight,
    timeInStr,
    timeOutStr,
    flightNumber,
    phone,
    email,
    customerContactValue,
    greeting,
    officialGreeting,
    meetingContactValue,
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
    insuranceWithFranchise,
    secondDriverLabel,
    secondDriverEnabled,
    secondDriverText,
    placeIn,
    placeOut,
    pickupLocationWithFlight,
    customerContactValue,
    officialGreeting,
    meetingContactValue,
    phone,
    email,
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
  const customerContactLabel = t.customerContactLabel || "Customer contact";
  const emailLabel = t.emailLabel || "Email";
  const phoneLabel = t.phoneLabel || "Phone";
  const meetingContactLabel =
    t.meetingContactLabel || "Meeting contact";
  const meetingContactFallback = t.meetingContactFallback || "—";

  const rentalPeriodValue =
    rentalPeriodWithTime ||
    (t.rentalPeriod || "")
      .replace("{{from}}", fromStr || "—")
      .replace("{{to}}", toStr || "—");
  const secondDriverValue = secondDriverEnabled
    ? secondDriverText || t.yes || "Yes"
    : t.no || "No";
  const orderNumberValue = orderNum ? String(orderNum) : "—";
  const pickupLocationValue = pickupLocationWithFlight || placeIn || "—";
  const insuranceValue = insuranceWithFranchise || insurance || "—";
  const customerContactDisplay = customerContactValue || customerName || "—";
  const meetingContactDisplay = meetingContactValue || meetingContactFallback;

  const html = renderCustomerOfficialConfirmation({
    title,
    greeting: officialGreeting,
    intro,
    pdfNote,
    // TEMP: hide generated timestamp block in HTML email
    // generatedAtLabel,
    // generatedAt: generatedAtValue,
    orderNumberLabel,
    orderNumberValue,
    vehicleLabel,
    vehicleValue: carDisplay,
    customerContactLabel,
    customerContactValue: customerContactDisplay,
    rentalPeriodLabel,
    rentalPeriodValue,
    pickupLocationLabel,
    pickupLocationValue,
    returnLocationLabel,
    returnLocationValue: placeOut || "—",
    insuranceLabel,
    insuranceValue,
    childSeatsLabel,
    childSeatsValue: childSeats || "0",
    secondDriverLabel,
    secondDriverValue,
    meetingContactLabel,
    meetingContactValue: meetingContactDisplay,
    totalAmountLabel,
    totalAmountValue: total || "0",
    orderRefText:
      orderNumberValue !== "—"
        ? `${orderNumberLabel}: ${orderNumberValue}`
        : orderNumberValue,
  });

  const text = [
    officialGreeting,
    "",
    title,
    "",
    intro,
    pdfNote,
    "",
    `${orderNumberLabel}: ${orderNumberValue}`,
    `${vehicleLabel}: ${carDisplay || "—"}`,
    `${customerContactLabel}: ${customerContactDisplay}`,
    `${rentalPeriodLabel}: ${rentalPeriodValue || "—"}`,
    `${pickupLocationLabel}: ${pickupLocationValue}`,
    `${returnLocationLabel}: ${placeOut || "—"}`,
    `${insuranceLabel}: ${insuranceValue}`,
    `${childSeatsLabel}: ${childSeats || "0"}`,
    `${secondDriverLabel}: ${secondDriverValue}`,
    `${meetingContactLabel}: ${meetingContactDisplay}`,
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
    customerContactLabel,
    customerContactValue: customerContactDisplay,
    customerLabel,
    customerValue: customerName || "—",
    emailLabel,
    emailValue: email || "—",
    phoneLabel,
    phoneValue: phone || "—",
    rentalPeriodLabel,
    rentalPeriodValue: rentalPeriodValue || "—",
    pickupLocationLabel,
    pickupLocationValue,
    returnLocationLabel,
    returnLocationValue: placeOut || "—",
    insuranceLabel,
    insuranceValue,
    childSeatsLabel,
    childSeatsValue: childSeats || "0",
    secondDriverLabel,
    secondDriverValue,
    meetingContactLabel,
    meetingContactValue: meetingContactDisplay,
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
