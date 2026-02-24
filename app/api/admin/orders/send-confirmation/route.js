import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import { authOptions } from "@lib/authOptions";
import { connectToDB } from "@utils/database";
import { Order } from "@models/order";
import { Car } from "@models/car";
import { ROLE } from "@models/user";
import { renderCustomerOfficialConfirmationEmail } from "@/app/ui/email/renderEmail";
import { buildCustomerOfficialConfirmationPdf } from "@/app/ui/email/pdf/customerOfficialConfirmationPdf";

const SUPPORTED_LOCALES = new Set(["en", "ru", "el", "de", "bg", "ro", "sr"]);
const INTERNAL_PASSWORD_HEADER = "x-internal-password";
const DEFAULT_CC_EMAIL = "admin@bbqr.site";
const DEFAULT_MEETING_CONTACT_PHONE = "+30-697-003-47-07";
const DEFAULT_MEETING_CONTACT_NAME = "Orest";
const DEFAULT_MEETING_CONTACT_CHANNEL = "WhatsApp";

function normalizeLocale(input) {
  if (typeof input !== "string") return "en";
  const normalized = input.trim().toLowerCase();
  if (!normalized) return "en";
  return SUPPORTED_LOCALES.has(normalized) ? normalized : "en";
}

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDateTime(a, b) {
  const ad = toDateValue(a);
  const bd = toDateValue(b);
  if (!ad && !bd) return true;
  if (!ad || !bd) return false;
  return ad.getTime() === bd.getTime();
}

function buildSnapshot(order, effectiveTotalPrice) {
  return {
    rentalStartDate: toDateValue(order?.rentalStartDate),
    rentalEndDate: toDateValue(order?.rentalEndDate),
    timeIn: toDateValue(order?.timeIn),
    timeOut: toDateValue(order?.timeOut),
    totalPrice: normalizeNumber(order?.totalPrice),
    overridePrice: normalizeNumber(order?.OverridePrice),
    effectiveTotalPrice: normalizeNumber(effectiveTotalPrice),
  };
}

function buildChangesSincePrevious(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot) {
    return {
      hasPrevious: false,
      hasChanges: false,
      price: { changed: false, old: null, new: currentSnapshot?.effectiveTotalPrice ?? null },
      dates: {
        changed: false,
        oldStartDate: null,
        newStartDate: currentSnapshot?.rentalStartDate ?? null,
        oldEndDate: null,
        newEndDate: currentSnapshot?.rentalEndDate ?? null,
      },
      times: {
        changed: false,
        oldTimeIn: null,
        newTimeIn: currentSnapshot?.timeIn ?? null,
        oldTimeOut: null,
        newTimeOut: currentSnapshot?.timeOut ?? null,
      },
    };
  }

  const oldPrice = normalizeNumber(previousSnapshot?.effectiveTotalPrice);
  const newPrice = normalizeNumber(currentSnapshot?.effectiveTotalPrice);
  const priceChanged = oldPrice !== newPrice;

  const datesChanged =
    !isSameDateTime(previousSnapshot?.rentalStartDate, currentSnapshot?.rentalStartDate) ||
    !isSameDateTime(previousSnapshot?.rentalEndDate, currentSnapshot?.rentalEndDate);

  const timesChanged =
    !isSameDateTime(previousSnapshot?.timeIn, currentSnapshot?.timeIn) ||
    !isSameDateTime(previousSnapshot?.timeOut, currentSnapshot?.timeOut);

  return {
    hasPrevious: true,
    hasChanges: priceChanged || datesChanged || timesChanged,
    price: {
      changed: priceChanged,
      old: oldPrice,
      new: newPrice,
    },
    dates: {
      changed: datesChanged,
      oldStartDate: toDateValue(previousSnapshot?.rentalStartDate),
      newStartDate: toDateValue(currentSnapshot?.rentalStartDate),
      oldEndDate: toDateValue(previousSnapshot?.rentalEndDate),
      newEndDate: toDateValue(currentSnapshot?.rentalEndDate),
    },
    times: {
      changed: timesChanged,
      oldTimeIn: toDateValue(previousSnapshot?.timeIn),
      newTimeIn: toDateValue(currentSnapshot?.timeIn),
      oldTimeOut: toDateValue(previousSnapshot?.timeOut),
      newTimeOut: toDateValue(currentSnapshot?.timeOut),
    },
  };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdminSession =
      session?.user?.isAdmin === true && session?.user?.role === ROLE.SUPERADMIN;

    const expectedInternalPassword = process.env.ORDER_CONFIRMATION_INTERNAL_PASSWORD;
    const providedInternalPassword = request.headers
      .get(INTERNAL_PASSWORD_HEADER)
      ?.trim();
    const hasInternalPassword =
      typeof expectedInternalPassword === "string" &&
      expectedInternalPassword.length > 0 &&
      providedInternalPassword === expectedInternalPassword;

    if (!isSuperAdminSession && !hasInternalPassword) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const locale = normalizeLocale(body?.locale);

    if (!orderId) {
      return NextResponse.json(
        { message: "orderId is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { message: "Invalid orderId format" },
        { status: 400 }
      );
    }

    await connectToDB();
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    const customerEmail = normalizeEmail(order.email);
    if (!customerEmail) {
      return NextResponse.json(
        { message: "Order has no customer email" },
        { status: 400 }
      );
    }

    let regNumber =
      typeof order.regNumber === "string" ? order.regNumber.trim() : "";
    if (!regNumber && order.car && mongoose.Types.ObjectId.isValid(String(order.car))) {
      const car = await Car.findById(order.car).select("regNumber").lean();
      regNumber =
        typeof car?.regNumber === "string" ? car.regNumber.trim() : "";
    }

    const effectiveTotalPrice =
      order.OverridePrice !== null && order.OverridePrice !== undefined
        ? order.OverridePrice
        : order.totalPrice;
    const meetingContactPhone =
      normalizeText(process.env.ORDER_CONFIRMATION_MEETING_CONTACT_PHONE) ||
      DEFAULT_MEETING_CONTACT_PHONE;
    const meetingContactName =
      normalizeText(process.env.ORDER_CONFIRMATION_MEETING_CONTACT_NAME) ||
      DEFAULT_MEETING_CONTACT_NAME;
    const meetingContactChannel =
      normalizeText(process.env.ORDER_CONFIRMATION_MEETING_CONTACT_CHANNEL) ||
      DEFAULT_MEETING_CONTACT_CHANNEL;
    const ccEmail =
      normalizeEmail(process.env.ORDER_CONFIRMATION_CC_EMAIL) || DEFAULT_CC_EMAIL;
    const currentSnapshot = buildSnapshot(order, effectiveTotalPrice);
    const history = Array.isArray(order.confirmationEmailHistory)
      ? order.confirmationEmailHistory
      : [];
    const previousSnapshot = history.length
      ? history[history.length - 1]?.snapshot
      : null;
    const changesSincePrevious = buildChangesSincePrevious(
      previousSnapshot,
      currentSnapshot
    );
    const sentBy = isSuperAdminSession
      ? {
          id: normalizeText(session?.user?.id),
          name: normalizeText(session?.user?.name),
          email: normalizeEmail(session?.user?.email),
          role: String(session?.user?.role ?? ""),
        }
      : {
          id: "",
          name: "Internal API",
          email: "",
          role: "INTERNAL",
        };
    const confirmationEmailEvent = {
      sentAt: new Date(),
      sentTo: customerEmail,
      cc: ccEmail,
      locale,
      sentBy,
      snapshot: currentSnapshot,
      changesSincePrevious,
    };

    const payload = {
      orderId: order._id?.toString?.() || order._id,
      orderNumber: order.orderNumber,
      regNumber,
      carNumber: order.carNumber,
      carModel: order.carModel,
      rentalStartDate: order.rentalStartDate,
      rentalEndDate: order.rentalEndDate,
      timeIn: order.timeIn,
      timeOut: order.timeOut,
      placeIn: order.placeIn,
      placeOut: order.placeOut,
      numberOfDays: order.numberOfDays,
      ChildSeats: order.ChildSeats ?? order.childSeats ?? 0,
      insurance: order.insurance,
      franchiseOrder: order.franchiseOrder,
      flightNumber: order.flightNumber,
      totalPrice: effectiveTotalPrice,
      customerName: order.customerName,
      phone: order.phone,
      email: customerEmail,
      secondDriver: order.secondDriver === true,
      meetingContactPhone,
      meetingContactName,
      meetingContactChannel,
      locale,
    };

    const { title, text, html, pdfFileName, pdfData } =
      renderCustomerOfficialConfirmationEmail(payload);
    const pdfBytes = await buildCustomerOfficialConfirmationPdf(pdfData);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    const sendEmailResponse = await fetch(`${new URL(request.url).origin}/api/sendEmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        title,
        text,
        html,
        to: [customerEmail],
        cc: [ccEmail],
        attachments: [
          {
            filename: pdfFileName,
            contentBase64: pdfBase64,
            contentType: "application/pdf",
          },
        ],
      }),
    });

    if (!sendEmailResponse.ok) {
      const errorBody = await sendEmailResponse
        .json()
        .catch(() => ({ message: "Email service error" }));
      const message =
        errorBody?.error || errorBody?.message || "Failed to send email";
      return NextResponse.json(
        { message },
        { status: sendEmailResponse.status }
      );
    }

    const flagUpdateResult = await Order.updateOne(
      { _id: order._id },
      {
        $set: { IsConfirmedEmailSent: true },
        $push: { confirmationEmailHistory: confirmationEmailEvent },
      }
    );
    if (!flagUpdateResult?.acknowledged || flagUpdateResult?.matchedCount === 0) {
      return NextResponse.json(
        { message: "Email sent, but failed to persist IsConfirmedEmailSent flag" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Confirmation email sent",
        sentTo: customerEmail,
        cc: ccEmail,
        orderId,
        locale,
        IsConfirmedEmailSent: true,
        confirmationEmailEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[send-confirmation] error:", error);
    return NextResponse.json(
      {
        message: "Failed to send confirmation email",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
