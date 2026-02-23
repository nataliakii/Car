/**
 * Official customer confirmation email template.
 * Formal layout with a dedicated document block and PDF attachment note.
 */

import { EMAIL_STYLE, escapeHtml } from "@/app/ui/email/theme/nataliCarsEmailTheme";
import { EMAIL_SIGNATURE_HTML } from "@/app/ui/email/templates/signature";

/**
 * @param {{
 *   title: string,
 *   greeting: string,
 *   intro: string,
 *   pdfNote: string,
 *   generatedAtLabel: string,
 *   generatedAt: string,
 *   orderNumberLabel: string,
 *   orderNumberValue: string,
 *   vehicleLabel: string,
 *   vehicleValue: string,
 *   rentalPeriodLabel: string,
 *   rentalPeriodValue: string,
 *   pickupLocationLabel: string,
 *   pickupLocationValue: string,
 *   returnLocationLabel: string,
 *   returnLocationValue: string,
 *   insuranceLabel: string,
 *   insuranceValue: string,
 *   childSeatsLabel: string,
 *   childSeatsValue: string,
 *   secondDriverLabel: string,
 *   secondDriverValue: string,
 *   totalAmountLabel: string,
 *   totalAmountValue: string,
 *   orderRefText: string,
 * }} data
 * @returns {string}
 */
export function renderCustomerOfficialConfirmation(data) {
  const s = EMAIL_STYLE;
  const {
    title,
    greeting,
    intro,
    pdfNote,
    // TEMP: hide generated timestamp block in official confirmation email
    // generatedAtLabel,
    // generatedAt,
    orderNumberLabel,
    orderNumberValue,
    vehicleLabel,
    vehicleValue,
    rentalPeriodLabel,
    rentalPeriodValue,
    pickupLocationLabel,
    pickupLocationValue,
    returnLocationLabel,
    returnLocationValue,
    insuranceLabel,
    insuranceValue,
    childSeatsLabel,
    childSeatsValue,
    secondDriverLabel,
    secondDriverValue,
    totalAmountLabel,
    totalAmountValue,
    orderRefText,
  } = data;

  const metaRow = (label, value) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${s.border};vertical-align:top;">
        <div style="font-size:11px;color:${s.muted};text-transform:uppercase;letter-spacing:0.4px;font-family:${s.fontSans};">${escapeHtml(label)}</div>
        <div style="margin-top:2px;font-size:14px;font-weight:600;color:${s.text};font-family:${s.fontSans};">${escapeHtml(value || "—")}</div>
      </td>
    </tr>`;

  const detailsTable = [
    metaRow(orderNumberLabel, orderNumberValue),
    metaRow(vehicleLabel, vehicleValue),
    metaRow(rentalPeriodLabel, rentalPeriodValue),
    metaRow(pickupLocationLabel, pickupLocationValue),
    metaRow(returnLocationLabel, returnLocationValue),
    metaRow(insuranceLabel, insuranceValue),
    metaRow(childSeatsLabel, childSeatsValue),
    metaRow(secondDriverLabel, secondDriverValue),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${s.bgPage};font-family:${s.fontSans};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${s.bgPage};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="620" style="max-width:620px;background-color:${s.bgCard};border:1px solid ${s.border};">
          <tr>
            <td style="background-color:${s.headerTeal};padding:22px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.2px;color:${s.headerText};font-family:${s.fontSans};">${escapeHtml(title)}</div>
              <div style="margin-top:8px;font-size:13px;color:${s.headerText};opacity:0.95;font-family:${s.fontSans};">${escapeHtml(orderRefText)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:${s.text};line-height:1.6;font-family:${s.fontSans};">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 12px 0;font-size:14px;color:${s.text};line-height:1.7;font-family:${s.fontSans};">${escapeHtml(intro)}</p>
              <p style="margin:0 0 20px 0;font-size:13px;color:${s.accent};line-height:1.6;font-family:${s.fontSans};">${escapeHtml(pdfNote)}</p>

              <!-- TEMP: generated timestamp block hidden -->

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid ${s.border};border-bottom:1px solid ${s.border};">
                ${detailsTable}
              </table>

              <div style="margin-top:18px;padding:16px;background:${s.bgPriceBlock};border-left:4px solid ${s.accent};">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.4px;color:${s.muted};font-family:${s.fontSans};">${escapeHtml(totalAmountLabel)}</div>
                <div style="margin-top:6px;font-size:28px;font-weight:700;color:${s.accent};font-family:${s.fontSans};">€${escapeHtml(totalAmountValue || "0")}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              ${EMAIL_SIGNATURE_HTML}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
