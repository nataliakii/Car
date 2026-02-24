import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EMAIL_STYLE } from "@/app/ui/email/theme/nataliCarsEmailTheme";

const FONT_PATH = path.join(
  process.cwd(),
  "app/ui/email/pdf/fonts/NotoSans-Regular.ttf"
);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgbTuple(hex) {
  if (typeof hex !== "string") return [0, 0, 0];
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [0, 0, 0];
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
}

function colorFromTheme(hex) {
  const [r, g, b] = hexToRgbTuple(hex);
  return rgb(r, g, b);
}

function wrapText(text, font, size, maxWidth) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  const paragraphs = source.split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${line} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }

  return lines;
}

function drawTextBlock({
  page,
  font,
  text,
  x,
  y,
  maxWidth,
  size = 11,
  lineHeight = 15,
  color,
}) {
  const lines = wrapText(text, font, size, maxWidth);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line || " ", {
      x,
      y: currentY,
      size,
      font,
      color,
    });
    currentY -= lineHeight;
  }

  return currentY;
}

/**
 * @param {{
 *   title: string,
 *   generatedAtLabel: string,
 *   generatedAtValue: string,
 *   orderNumberLabel: string,
 *   orderNumberValue: string,
 *   vehicleLabel: string,
 *   vehicleValue: string,
 *   customerContactLabel: string,
 *   customerContactValue: string,
 *   customerLabel: string,
 *   customerValue: string,
 *   emailLabel: string,
 *   emailValue: string,
 *   phoneLabel: string,
 *   phoneValue: string,
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
 *   meetingContactLabel: string,
 *   meetingContactValue: string,
 *   totalAmountLabel: string,
 *   totalAmountValue: string,
 *   pdfNote: string,
 * }} data
 * @returns {Promise<Uint8Array>}
 */
export async function buildCustomerOfficialConfirmationPdf(data) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const fontBytes = await readFile(FONT_PATH);
  const baseFont = await pdf.embedFont(fontBytes, { subset: true });

  const colorText = colorFromTheme(EMAIL_STYLE.text);
  const colorMuted = colorFromTheme(EMAIL_STYLE.muted);
  const colorAccent = colorFromTheme(EMAIL_STYLE.accent);
  const colorHeader = colorFromTheme(EMAIL_STYLE.headerTeal);
  const colorBorder = colorFromTheme(EMAIL_STYLE.border);
  const colorHeaderText = colorFromTheme(EMAIL_STYLE.headerText);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;

  // Header block
  page.drawRectangle({
    x: marginX,
    y: pageHeight - 120,
    width: contentWidth,
    height: 72,
    color: colorHeader,
  });
  page.drawText(String(data.title || "Official Booking Confirmation"), {
    x: marginX + 20,
    y: pageHeight - 84,
    size: 18,
    font: baseFont,
    color: colorHeaderText,
  });

  let y = pageHeight - 155;

  // TEMP: hide generated timestamp in PDF
  // y = drawTextBlock({
  //   page,
  //   font: baseFont,
  //   text: `${data.generatedAtLabel || "Generated at"}: ${data.generatedAtValue || "—"}`,
  //   x: marginX,
  //   y,
  //   maxWidth: contentWidth,
  //   size: 10,
  //   lineHeight: 13,
  //   color: colorMuted,
  // });
  // y -= 12;

  const rows = [
    [data.orderNumberLabel, data.orderNumberValue],
    [data.vehicleLabel, data.vehicleValue],
    [data.customerContactLabel, data.customerContactValue],
    [data.customerLabel, data.customerValue],
    [data.emailLabel, data.emailValue],
    [data.phoneLabel, data.phoneValue],
    [data.rentalPeriodLabel, data.rentalPeriodValue],
    [data.pickupLocationLabel, data.pickupLocationValue],
    [data.returnLocationLabel, data.returnLocationValue],
    [data.insuranceLabel, data.insuranceValue],
    [data.childSeatsLabel, data.childSeatsValue],
    [data.secondDriverLabel, data.secondDriverValue],
    [data.meetingContactLabel, data.meetingContactValue],
  ];

  for (const [label, value] of rows) {
    if (y < 130) {
      break;
    }

    page.drawLine({
      start: { x: marginX, y: y + 2 },
      end: { x: marginX + contentWidth, y: y + 2 },
      thickness: 0.8,
      color: colorBorder,
    });

    page.drawText(`${String(label || "").toUpperCase()}`, {
      x: marginX,
      y: y - 11,
      size: 9,
      font: baseFont,
      color: colorMuted,
    });

    y = drawTextBlock({
      page,
      font: baseFont,
      text: value || "—",
      x: marginX + 180,
      y: y - 11,
      maxWidth: contentWidth - 180,
      size: 11,
      lineHeight: 14,
      color: colorText,
    });
    y -= 6;
  }

  // Total block
  const totalBlockHeight = 72;
  if (y < 140) {
    y = 140;
  }
  page.drawRectangle({
    x: marginX,
    y: y - totalBlockHeight,
    width: contentWidth,
    height: totalBlockHeight,
    borderColor: colorBorder,
    borderWidth: 1,
  });

  page.drawText(String(data.totalAmountLabel || "TOTAL AMOUNT").toUpperCase(), {
    x: marginX + 16,
    y: y - 24,
    size: 10,
    font: baseFont,
    color: colorMuted,
  });
  page.drawText(`€${String(data.totalAmountValue || "0")}`, {
    x: marginX + 16,
    y: y - 52,
    size: 24,
    font: baseFont,
    color: colorAccent,
  });

  // Footer note
  drawTextBlock({
    page,
    font: baseFont,
    text: data.pdfNote || "",
    x: marginX,
    y: 70,
    maxWidth: contentWidth,
    size: 9.5,
    lineHeight: 12,
    color: colorMuted,
  });

  return pdf.save();
}
