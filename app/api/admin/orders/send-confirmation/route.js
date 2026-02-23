import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import { authOptions } from "@lib/authOptions";
import { connectToDB } from "@utils/database";
import { Order } from "@models/order";
import { ROLE } from "@models/user";
import { renderCustomerOfficialConfirmationEmail } from "@/app/ui/email/renderEmail";
import { buildCustomerOfficialConfirmationPdf } from "@/app/ui/email/pdf/customerOfficialConfirmationPdf";

const SUPPORTED_LOCALES = new Set(["en", "ru", "el", "de", "bg", "ro", "sr"]);
const INTERNAL_PASSWORD_HEADER = "x-internal-password";
const DEFAULT_CC_EMAIL = "admin@bbqr.site";

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

    const effectiveTotalPrice =
      order.OverridePrice !== null && order.OverridePrice !== undefined
        ? order.OverridePrice
        : order.totalPrice;

    const payload = {
      orderId: order._id?.toString?.() || order._id,
      orderNumber: order.orderNumber,
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
      flightNumber: order.flightNumber,
      totalPrice: effectiveTotalPrice,
      customerName: order.customerName,
      phone: order.phone,
      email: customerEmail,
      secondDriver: order.secondDriver === true,
      locale,
    };

    const { title, text, html, pdfFileName, pdfData } =
      renderCustomerOfficialConfirmationEmail(payload);
    const pdfBytes = await buildCustomerOfficialConfirmationPdf(pdfData);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const ccEmail =
      normalizeEmail(process.env.ORDER_CONFIRMATION_CC_EMAIL) || DEFAULT_CC_EMAIL;

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
      { $set: { IsConfirmedEmailSent: true } }
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
