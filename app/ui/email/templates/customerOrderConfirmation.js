/**
 * Customer order confirmation email — premium HTML template.
 * Голубая заставка с заголовком, контент, подпись BBQR в цветах, копирайт.
 */

import { EMAIL_STYLE, escapeHtml, strongFromMarkdown } from "@/app/ui/email/theme/nataliCarsEmailTheme";
import { EMAIL_SIGNATURE_HTML } from "@/app/ui/email/templates/signature";

/**
 * @param {{
 *   t: Record<string, string>,
 *   greeting: string,
 *   fromStr: string,
 *   toStr: string,
 *   carDisplay: string,
 *   orderNum: string,
 *   total: string,
 *   numberOfDays?: string,
 *   childSeats?: string,
 *   insurance?: string,
 *   secondDriverLabel?: string,
 *   secondDriverEnabled?: boolean,
 *   secondDriverText?: string,
 *   placeIn?: string,
 *   placeOut?: string,
 *   timeInStr?: string,
 *   timeOutStr?: string,
 *   flightNumber?: string,
 * }} data
 * @returns {string} Full HTML document
 */
export function renderCustomerOrderConfirmation(data) {
  const {
    t,
    greeting,
    fromStr,
    toStr,
    carDisplay,
    orderNum,
    total,
    numberOfDays = "",
    childSeats = "0",
    insurance = "",
    secondDriverLabel = "",
    secondDriverEnabled = false,
    secondDriverText = "",
    placeIn = "",
    placeOut = "",
    timeInStr = "",
    timeOutStr = "",
    flightNumber = "",
  } = data;
  const s = EMAIL_STYLE;
  const p = (style, content) =>
    `<p style="margin:0 0 16px 0;color:${s.text};line-height:1.6;font-size:15px;font-family:${s.fontSans};${style || ""}">${content}</p>`;
  const label = (text) =>
    `<div style="font-size:12px;color:${s.muted};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-family:${s.fontSans};">${escapeHtml(text)}</div>`;
  const value = (text) =>
    `<div style="font-size:15px;font-weight:600;color:${s.text};font-family:${s.fontSans};">${escapeHtml(String(text ?? ""))}</div>`;
  const row = (labelText, valueText) =>
    `<tr><td style="padding:12px 0;border-bottom:1px solid ${s.border};vertical-align:top;">${label(labelText)}${value(valueText)}</td></tr>`;

  const reservationDetailsHeading = (t.reservationDetails || "").replace(/\*\*/g, "");
  const whatHappensNextHeading = (t.whatHappensNext || "").replace(/^#+\s*/, "");
  const teamText = (t.team || "").replace(/\*\*/g, "");
  // const phonesHtml = (t.phones || "")
  //   .split("\n")
  //   .filter(Boolean)
  //   .map((line) => `<div style="margin:4px 0;font-size:14px;color:${s.text};font-family:${s.fontSans};">${escapeHtml(line.trim())}</div>`)
  //   .join("");
  const phonesHtml = "";

  const rentalPeriodValue =
    fromStr && toStr
      ? `${fromStr}${timeInStr ? " " + timeInStr : ""} – ${toStr}${timeOutStr ? " " + timeOutStr : ""}`.trim()
      : "—";

  const detailRows = [
    row(t.orderNumberLabel || "Order number", orderNum ? "#" + orderNum : "—"),
    row(t.vehicleLabel || "Vehicle", carDisplay || "—"),
    row(t.rentalPeriodLabel || "Rental period", rentalPeriodValue),
    row(t.daysLabel || "Number of days", numberOfDays || "—"),
    row(t.childSeatsLabel || "Child seats", childSeats !== undefined && childSeats !== "" ? childSeats : "0"),
    row(t.insuranceLabel || "Insurance", insurance || "—"),
    ...(secondDriverEnabled
      ? [row(secondDriverLabel || t.secondDriverLabel || "Second driver", secondDriverText || (t.secondDriverEnabled || "Yes"))]
      : []),
    row(t.pickupLocationLabel || "Pick-up location", placeIn || "—"),
    row(t.returnLocationLabel || "Return location", placeOut || "—"),
    ...(flightNumber ? [row(t.flightNumberLabel || "Flight number", flightNumber)] : []),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(t.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${s.bgPage};font-family:${s.fontSans};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${s.bgPage};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:${s.bgCard};border:1px solid ${s.border};box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Голубая заставка с заголовком -->
          <tr>
            <td style="background-color:${s.headerTeal};padding:30px 40px;text-align:center;">
              <h1 style="margin:0;color:${s.headerText};font-size:22px;font-weight:600;letter-spacing:0.5px;font-family:${s.fontSans};">${escapeHtml(t.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 36px 40px;">
              ${p("margin-bottom:8px;", escapeHtml(greeting))}
              ${p("", strongFromMarkdown(escapeHtml(t.thankYouChoose || "")))}
              ${p("", escapeHtml(t.weReceived || ""))}
              <div style="margin:28px 0 0 0;padding:24px;background-color:${s.bgDetailsCard};border:1px solid ${s.border};">
                <div style="font-size:13px;color:${s.accent};font-weight:600;margin-bottom:16px;font-family:${s.fontSans};">${escapeHtml(reservationDetailsHeading)}</div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${detailRows}
                </table>
              </div>
              <div style="margin:24px 0 0 0;padding:24px;background-color:${s.bgPriceBlock};border-left:4px solid ${s.accent};">
                <div style="font-size:12px;color:${s.muted};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;font-family:${s.fontSans};">${escapeHtml(t.totalAmountLabel || "Total amount")}</div>
                <div style="font-size:28px;font-weight:700;color:${s.accent};font-family:${s.fontSans};">€${escapeHtml(total)}</div>
              </div>
              <div style="margin:32px 0 0 0;">
                <div style="font-size:16px;font-weight:600;color:${s.accent};margin-bottom:16px;font-family:${s.fontSans};">${escapeHtml(whatHappensNextHeading)}</div>
                ${p("margin-bottom:8px;", escapeHtml(t.step1 || ""))}
                ${p("margin-bottom:8px;", escapeHtml(t.step2 || ""))}
                ${p("margin-bottom:0;", escapeHtml(t.step3 || ""))}
              </div>
              ${p("margin-top:28px;", escapeHtml(t.questionsParagraph || ""))}
              <p style="margin:24px 0 8px 0;color:${s.text};font-size:15px;font-family:${s.fontSans};">${escapeHtml(t.kindRegards || "")}</p>
              <p style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:${s.accent};font-family:${s.fontSans};">${escapeHtml(teamText)}</p>
              ${phonesHtml}
            </td>
          </tr>
          <!-- Подпись BBQR в цветах -->
          <tr>
            <td style="padding:0 40px 30px 40px;">
              ${EMAIL_SIGNATURE_HTML}
            </td>
          </tr>
        </table>
        <!-- Копирайт -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin-top:20px;">
          <tr>
            <td style="text-align:center;padding:20px;color:${s.muted};font-size:12px;font-family:${s.fontSans};">
              <p style="margin:0;">© ${new Date().getFullYear()} Natali Cars. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
