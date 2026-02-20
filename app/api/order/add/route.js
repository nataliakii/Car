import { connectToDB } from "@utils/database";
import mongoose from "mongoose";
import { Car } from "@models/car";
import { Order } from "@models/order";
import { User } from "@models/user";
import Company from "@models/company";
import { COMPANY_ID } from "@config/company";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@lib/authOptions";
import {
  analyzeDates,
  isSameDay,
  isSameOrBefore,
  calculateAvailableTimes,
  setTimeToDatejs,
  checkConflicts,
} from "@utils/analyzeDates";
import { notifyOrderAction } from "@/domain/orders/orderNotificationDispatcher";
import { orderGuard } from "@/middleware/orderGuard";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const BUSINESS_TZ = "Europe/Athens";

function toBusinessStartOfDay(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dayjs.tz(value, "YYYY-MM-DD", BUSINESS_TZ).startOf("day");
  }
  return dayjs(value).tz(BUSINESS_TZ).startOf("day");
}

function toStoredBusinessDate(value) {
  const businessDay = dayjs.isDayjs(value)
    ? value.tz(BUSINESS_TZ).startOf("day")
    : toBusinessStartOfDay(value);
  return dayjs
    .utc(businessDay.format("YYYY-MM-DD"))
    .hour(12)
    .minute(0)
    .second(0)
    .millisecond(0)
    .toDate();
}

function toBooleanField(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0" || normalized === "") return false;
  }
  return Boolean(value);
}

async function postOrderAddHandler(request) {
  try {
    await connectToDB();

    const {
      carNumber,
      customerName,
      phone,
      email,
      secondDriver,
      rentalStartDate,
      rentalEndDate,
      timeIn,
      timeOut,
      placeIn,
      placeOut,
      flightNumber,
      confirmed,
      my_order = false,
      ChildSeats,
      insurance,
      franchiseOrder,
      orderNumber,
      Viber,
      Whatsapp,
      Telegram,
      totalPrice: totalPriceFromClient,
      locale: clientLocale,
    } = await request.json();

    // Check if request comes from admin session
    // If admin creates order, we store their role for permission control
    let createdByRole = 0; // default: regular admin role
    let createdByAdminId = null;
    
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) {
      // Admin is creating this order - fetch their role from User model
      const adminUser = await User.findOne({ username: session.user.name });
      if (adminUser) {
        createdByRole = adminUser.role || 0;
        createdByAdminId = adminUser._id;
      }
    }

    // Явно присваиваем email пустую строку, если он не передан или undefined/null
    const safeEmail = typeof email === "string" ? email : "";

    // Canonical dates come from actual pickup/return moments when available.
    // This prevents browser timezone from shifting rental dates during submit.
    const startDateSource = timeIn || rentalStartDate;
    const endDateSource = timeOut || rentalEndDate;
    const startDate = toBusinessStartOfDay(startDateSource);
    const endDate = toBusinessStartOfDay(endDateSource);

    if (!startDate.isValid() || !endDate.isValid()) {
      return new Response(
        JSON.stringify({
          message: "Invalid rental dates",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // status 405 for startdate = enddate - order NOT created
    if (startDate.isSame(endDate, "day")) {
      return new Response(
        JSON.stringify({
          message: "Start and End dates could't be at the same date",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Find the car by its car number
    const existingCar = await Car.findOne({ carNumber: carNumber });
    if (!existingCar) {
      return new Response(
        JSON.stringify({
          message: "Car is not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check for existing orders for this car
    const existingOrders = await Order.find({
      car: existingCar._id,
    });

    let nonConfirmedDates = [];
    let conflicOrdersId = [];

    const { status, data } = checkConflicts(
      existingOrders,
      startDate.toDate(),
      endDate.toDate(),
      timeIn,
      timeOut
    );

    // Debug logs removed - checkConflicts returns undefined status/data when no conflicts
    if (status) {
      switch (status) {
        case 409:
          return new Response(
            JSON.stringify({
              message: data?.conflictMessage,
              conflictDates: data?.conflictDates,
            }),
            {
              status: 409,
              headers: { "Content-Type": "application/json" },
            }
          );
        //// TODO CREATE ORDERS FOR CASE 200
        case 200:
          return new Response(
            JSON.stringify({
              message: data.conflictMessage,
              conflictDates: data.conflictDates,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        case 202:
          conflicOrdersId = data.conflictOrdersIds;
          nonConfirmedDates = data.conflictDates;
      }
    }

    const normalizedSecondDriver = toBooleanField(secondDriver, false);

    // Calculate the number of rental days and total price using the new algorithm
    const { total, days } = await existingCar.calculateTotalRentalPricePerDay(
      startDate,
      endDate,
      insurance,
      ChildSeats,
      normalizedSecondDriver
    );

    // Используем totalPrice из клиента ТОЛЬКО если он > 0, иначе используем рассчитанный на бэкенде
    // Это защищает от случаев когда фронтенд отправляет 0 (до завершения расчёта)
    const totalPriceToSave =
      typeof totalPriceFromClient === "number" && totalPriceFromClient > 0
        ? totalPriceFromClient
        : total;

    // Create a new order document with calculated values
    const newOrder = new Order({
      carNumber: carNumber,
      customerName,
      phone,
      email: safeEmail,
      rentalStartDate: toStoredBusinessDate(startDate),
      rentalEndDate: toStoredBusinessDate(endDate),
      car: existingCar._id,
      carModel: existingCar.model,
      numberOfDays: days,
      totalPrice: totalPriceToSave,
      timeIn: timeIn ? timeIn : setTimeToDatejs(startDate, null, true),
      timeOut: timeOut ? timeOut : setTimeToDatejs(endDate, null),
      placeIn,
      placeOut,
      // Keep creation date as a real Date object in business timezone context.
      date: dayjs().tz(BUSINESS_TZ).toDate(),
      confirmed: confirmed,
      my_order: my_order,
      ChildSeats,
      insurance,
      franchiseOrder,
      orderNumber,
      flightNumber,
      Viber: Boolean(Viber),
      Whatsapp: Boolean(Whatsapp),
      Telegram: Boolean(Telegram),
      // Permission tracking: store who created this order
      createdByRole,
      createdByAdminId,
    });

    // HMR/cache safety: persist secondDriver even if cached schema was stale.
    newOrder.set("secondDriver", normalizedSecondDriver, { strict: false });

    if (nonConfirmedDates.length > 0) {
      newOrder.hasConflictDates = [
        ...new Set([...newOrder.hasConflictDates, ...conflicOrdersId]),
      ];

      await newOrder.save();
      // Keep Car.orders in sync for pending orders too.
      if (!existingCar.orders.some((id) => String(id) === String(newOrder._id))) {
        existingCar.orders.push(newOrder._id);
        await existingCar.save();
      }

      await updateConflictingOrders(conflicOrdersId, newOrder._id);

      // Уведомления по политике (orderNotificationPolicy)
      let notificationError = null;
      const orderPlain = newOrder.toObject ? newOrder.toObject() : { ...newOrder };
      const user = session?.user || { id: null, role: 0, isAdmin: false };
      const company = await Company.findById(COMPANY_ID);
      try {
        await notifyOrderAction({
          order: orderPlain,
          user,
          action: "CREATE",
          source: "BACKEND",
          companyEmail: company?.email,
          locale: clientLocale,
        });
      } catch (err) {
        notificationError = err?.message || "Notifications failed";
      }

      return new Response(
        JSON.stringify({
          messageCode: "bookMesssages.bookPendingDates",
          dates: nonConfirmedDates,
          data: newOrder,
          ...(notificationError && { notificationError }),
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save the new order
    await newOrder.save();
    // Add the new order to the car's orders array
    if (!existingCar.orders.some((id) => String(id) === String(newOrder._id))) {
      existingCar.orders.push(newOrder._id);
      // Save the updated car document
      await existingCar.save();
    }

    // Уведомления по политике (orderNotificationPolicy)
    let notificationError = null;
    const orderPlain = newOrder.toObject ? newOrder.toObject() : { ...newOrder };
    const user = session?.user || { id: null, role: 0, isAdmin: false };
    const company = await Company.findById(COMPANY_ID);
    try {
      await notifyOrderAction({
        order: orderPlain,
        user,
        action: "CREATE",
        source: "BACKEND",
        companyEmail: company?.email,
        locale: clientLocale,
      });
    } catch (err) {
      notificationError = err?.message || "Notifications failed";
    }

    const body = newOrder.toObject ? newOrder.toObject() : { ...newOrder };
    if (notificationError) body.notificationError = notificationError;

    return new Response(JSON.stringify(body), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Логгирование ошибки с деталями запроса
    console.error("API: Ошибка при обработке заказа:", error);
    return new Response(
      JSON.stringify({
        error: `Failed to add new order: ${error.message}`,
        details: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const POST = orderGuard(postOrderAddHandler);

// function that iterates over all conflicting orders adding to them new conflicts orders
async function updateConflictingOrders(conflicOrdersId, newOrderId) {
  try {
    // Iterate over each conflicting order ID
    for (const conflictOrderId of conflicOrdersId) {
      // Find the order by its ID
      const order = await Order.findById(conflictOrderId);

      if (order) {
        // Add the new order ID to the conflicting order's hasConflictDates array
        if (!order.hasConflictDates.includes(newOrderId)) {
          order.hasConflictDates.push(newOrderId);
          await order.save(); // Save the updated order
        }
      }
    }
  } catch (error) {
    console.error("Error updating conflicting orders:", error);
  }
}
