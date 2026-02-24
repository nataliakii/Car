import { Order } from "@models/order";
import { Car } from "@models/car";
import Company from "@models/company";
import { connectToDB } from "@utils/database";
import { requireAdmin } from "@/lib/adminAuth";
import { getOrderAccess } from "@/domain/orders/orderAccessPolicy";
import { getTimeBucket } from "@/domain/time/athensTime";
import { checkFieldAccess } from "@/middleware/withOrderAccess";
import { ROLE } from "@/domain/orders/admin-rbac";
import { getActionFromChangedFields } from "@/domain/orders/orderNotificationPolicy";
import { notifyOrderAction } from "@/domain/orders/orderNotificationDispatcher";
import { analyzeConfirmationConflicts } from "@/domain/booking/analyzeConfirmationConflicts";
import { COMPANY_ID } from "@config/company";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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

function getBusinessDaySpan(start, end) {
  const startDay = toBusinessStartOfDay(start);
  const endDay = toBusinessStartOfDay(end);
  return Math.max(0, endDay.diff(startDay, "day"));
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

function setSecondDriverField(orderDoc, value) {
  const normalized = toBooleanField(value, false);
  if (orderDoc && typeof orderDoc.set === "function") {
    orderDoc.set("secondDriver", normalized, { strict: false });
  } else if (orderDoc) {
    orderDoc.secondDriver = normalized;
  }
  return normalized;
}

// Restored from pre-refactor conflict logic: ИСПРАВЛЕННАЯ функция проверки конфликтов
function checkConflictsFixed(allOrders, newStart, newEnd) {
  const conflictingOrders = [];
  const conflictDates = { start: null, end: null };

  for (const existingOrder of allOrders) {
    const existingStart = dayjs(existingOrder.timeIn);
    const existingEnd = dayjs(existingOrder.timeOut);

    // КЛЮЧЕВАЯ ЛОГИКА: заказы НЕ конфликтуют если "касаются" по времени
    const newEndsWhenExistingStarts = newEnd.isSame(existingStart);
    const newStartsWhenExistingEnds = newStart.isSame(existingEnd);

    // Если заказы касаются - это НЕ конфликт
    if (newEndsWhenExistingStarts || newStartsWhenExistingEnds) {
      continue;
    }

    // Проверяем реальное пересечение периодов
    const hasOverlap =
      newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);

    if (hasOverlap) {
      conflictingOrders.push(existingOrder);

      // Определяем конкретные конфликтные времена
      if (newStart.isBefore(existingEnd) && newStart.isAfter(existingStart)) {
        conflictDates.start = existingStart.toISOString();
      }
      if (newEnd.isAfter(existingStart) && newEnd.isBefore(existingEnd)) {
        conflictDates.end = existingEnd.toISOString();
      }
    }
  }

  if (conflictingOrders.length === 0) {
    return { status: null, data: null }; // Нет конфликтов
  }

  // Проверяем подтвержденность конфликтующих заказов
  const confirmedConflicts = conflictingOrders.filter(
    (order) => order.confirmed
  );

  if (confirmedConflicts.length > 0) {
    // Конфликт с подтвержденными заказами - блокируем
    return {
      status: 409,
      data: {
        conflictMessage: `Time has conflict with confirmed bookings`,
        conflictDates,
        conflictingOrders: confirmedConflicts,
      },
    };
  } else {
    // Конфликт только с неподтвержденными заказами
    return {
      status: 202,
      data: {
        conflictMessage: `Time has conflict with unconfirmed bookings`,
        conflictDates,
        conflictOrdersIds: conflictingOrders.map((order) =>
          order._id.toString()
        ),
        conflictingOrders,
      },
    };
  }
}

// Restored from pre-refactor conflict logic: Function to check if existing conflicts are resolved after changing dates
async function checkForResolvedConflicts(order, newStartDate, newEndDate) {
  const existingConflicts = order.hasConflictDates || [];

  const resolvedConflicts = [];
  const stillConflictingOrders = [];

  // Check each existing conflict
  for (const conflictId of existingConflicts) {
    const conflictingOrder = await Order.findById(conflictId);

    if (conflictingOrder) {
      // Compare conflicting order dates with new start/end dates
      const conflictStartDate = dayjs(conflictingOrder.rentalStartDate);
      const conflictEndDate = dayjs(conflictingOrder.rentalEndDate);

      // ИСПРАВЛЕНО: используем правильную логику сравнения
      // Конфликт разрешен если заказы НЕ пересекаются (могут касаться)
      const ordersTouch =
        newEndDate.isSame(conflictStartDate) ||
        newStartDate.isSame(conflictEndDate);
      const ordersDoNotOverlap =
        newEndDate.isBefore(conflictStartDate) ||
        newStartDate.isAfter(conflictEndDate);

      if (ordersDoNotOverlap || ordersTouch) {
        resolvedConflicts.push(conflictingOrder._id); // This conflict is resolved
      } else {
        stillConflictingOrders.push(conflictingOrder._id); // Still conflicting
      }
    }
  }

  return { resolvedConflicts, stillConflictingOrders };
}

// Restored from pre-refactor conflict logic: timeAndDate function
// Важно: используем точные моменты startTime/endTime (из клиента/базы),
// чтобы избежать ошибок из-за локали сервера и DST при пересборке часов.
async function timeAndDate(startDate, endDate, startTime, endTime) {
  return {
    start: dayjs(startTime),
    end: dayjs(endTime),
  };
}

export const PATCH = async (request, { params }) => {
  try {
    await connectToDB();

      console.log("HEADERS", Object.fromEntries(request.headers.entries()));

  console.log("COOKIES", request.headers.get("cookie"));

    // Check admin authentication
    const { session, errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    

    const { orderId } = params;
    const payload = await request.json();

    // Find the order
    const order = await Order.findById(orderId).populate("car");

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const previousOrderSnapshot = order.toObject
      ? order.toObject()
      : { ...order };

    // Determine which fields are being updated
    const hasDateTimeChanges =
      payload.rentalStartDate !== undefined ||
      payload.rentalEndDate !== undefined ||
      payload.timeIn !== undefined ||
      payload.timeOut !== undefined ||
      payload.car !== undefined ||
      payload.placeIn !== undefined ||
      payload.placeOut !== undefined ||
      payload.insurance !== undefined ||
      payload.ChildSeats !== undefined ||
      payload.franchiseOrder !== undefined ||
      payload.totalPrice !== undefined ||
      payload.numberOfDays !== undefined;

    const hasCustomerChanges =
      payload.customerName !== undefined ||
      payload.phone !== undefined ||
      payload.email !== undefined ||
      payload.secondDriver !== undefined ||
      payload.Viber !== undefined ||
      payload.Whatsapp !== undefined ||
      payload.Telegram !== undefined ||
      payload.flightNumber !== undefined;

    const hasConfirmationChange = payload.confirmed !== undefined;

    // ════════════════════════════════════════════════════════════════
    // ЕДИНАЯ ЛОГИКА ПРАВ: используем orderAccessPolicy напрямую
    // ════════════════════════════════════════════════════════════════
    const isSuperAdmin = session.user.role === ROLE.SUPERADMIN;
    const isPast = order.rentalEndDate
      ? dayjs(order.rentalEndDate).tz("Europe/Athens").isBefore(dayjs().tz("Europe/Athens"), "day")
      : false;
    const timeBucket = getTimeBucket(order);

    const access = getOrderAccess({
      role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
      isClientOrder: order.my_order === true,
      confirmed: order.confirmed === true,
      isPast,
      timeBucket,
    });

    // Проверяем все поля из payload через единую логику
    const fieldsToUpdate = Object.keys(payload).filter(key => payload[key] !== undefined);
    const fieldCheck = checkFieldAccess(access, fieldsToUpdate);
    
    if (!fieldCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Cannot edit fields: ${fieldCheck.deniedFields.join(", ")}`,
          code: "PERMISSION_DENIED",
          deniedFields: fieldCheck.deniedFields,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Дополнительная проверка для подтверждения (требует конфликт-анализа)
    if (hasConfirmationChange) {
      if (!access.canConfirm) {
        const company = await Company.findById(COMPANY_ID);
        const bufferHours = company?.bufferTime != null ? Number(company.bufferTime) : undefined;

        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            message: "Only superadmin can confirm or unconfirm orders",
            level: "block",
            conflicts: [],
            affectedOrders: [],
            bufferHours: bufferHours,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Handle confirmation toggle
    if (hasConfirmationChange) {
      const isConfirming = payload.confirmed === true && !order.confirmed;

      if (isConfirming) {
        // Get all orders for this car
        const allOrdersForCar = await Order.find({
          car: order.car,
        });

        const company = await Company.findById(COMPANY_ID);
        const bufferHours = company?.bufferTime != null ? Number(company.bufferTime) : undefined;

        // Analyze conflicts
        const conflictAnalysis = analyzeConfirmationConflicts({
          orderToConfirm: order,
          allOrders: allOrdersForCar,
          bufferHours: bufferHours,
        });

        if (!conflictAnalysis.canConfirm) {
          const normalized = {
            success: false,
            data: null,
            message: conflictAnalysis.message,
            level: "block",
            conflicts: conflictAnalysis.blockedByConfirmed ?? [],
            affectedOrders: conflictAnalysis.affectedPendingOrders ?? [],
            bufferHours: conflictAnalysis.bufferHours ?? bufferHours,
          };

          return new Response(JSON.stringify(normalized), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Can confirm (possibly with warning)
        order.confirmed = true;
        const updatedOrder = await order.save();

        try {
          const action = getActionFromChangedFields(fieldsToUpdate, payload);
          const orderPlain = updatedOrder.toObject ? updatedOrder.toObject() : { ...updatedOrder };
          await notifyOrderAction({
            order: orderPlain,
            previousOrder: previousOrderSnapshot,
            user: session.user,
            action,
            actorName: session.user?.name || session.user?.email,
            source: "BACKEND",
            companyEmail: company?.email,
          });
        } catch (notifyErr) {
          console.error("[update order] notifyOrderAction failed:", notifyErr?.message);
        }

        const responseStatus = conflictAnalysis.level === "warning" ? 202 : 200;
        const responseMessage =
          conflictAnalysis.message || "Заказ успешно подтверждён";

        return new Response(
          JSON.stringify({
            success: true,
            data: updatedOrder,
            message: responseMessage,
            level: conflictAnalysis.level ?? null,
            conflicts: [],
            affectedOrders: conflictAnalysis.affectedPendingOrders ?? [],
            bufferHours: conflictAnalysis.bufferHours ?? bufferHours,
            updatedOrder: updatedOrder,
          }),
          {
            status: responseStatus,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        order.confirmed = false;
        const updatedOrder = await order.save();

        const company = await Company.findById(COMPANY_ID);
        const bufferHours = company?.bufferTime != null ? Number(company.bufferTime) : undefined;

        return new Response(
          JSON.stringify({
            success: true,
            data: updatedOrder,
            message: "Подтверждение заказа снято",
            level: null,
            conflicts: [],
            affectedOrders: [],
            bufferHours: bufferHours,
            updatedOrder: updatedOrder,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle date/time/pricing/extras updates
    if (hasDateTimeChanges) {
      // Handle car change
      if (payload.car && (!order.car || String(order.car._id || order.car) !== String(payload.car))) {
        const newCar = await Car.findById(payload.car);
        if (!newCar) {
          return new Response(
            JSON.stringify({ message: "Car not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        order.car = newCar._id;
      }

      // Get car document for calculations
      let carDoc;
      if (order.car && typeof order.car === "object" && order.car._id) {
        carDoc = order.car;
      } else {
        carDoc = await Car.findById(order.car);
      }

      // Convert dates and times
      const newStartDate = payload.rentalStartDate
        ? toBusinessStartOfDay(payload.rentalStartDate)
        : toBusinessStartOfDay(order.rentalStartDate);
      const newEndDate = payload.rentalEndDate
        ? toBusinessStartOfDay(payload.rentalEndDate)
        : toBusinessStartOfDay(order.rentalEndDate);
      const newTimeIn = payload.timeIn
        ? dayjs(payload.timeIn)
        : dayjs(order.timeIn);
      const newTimeOut = payload.timeOut
        ? dayjs(payload.timeOut)
        : dayjs(order.timeOut);

      const { start, end } = await timeAndDate(
        newStartDate,
        newEndDate,
        newTimeIn,
        newTimeOut
      );

      // Restored from pre-refactor conflict logic: Debug logging for time period
      if (process.env.NODE_ENV !== "production") {
        console.log("=== DEBUGGING ORDER UPDATE ===");
        console.log("Order ID:", orderId);
        console.log("New time period:", {
          start: start.toISOString(),
          end: end.toISOString(),
        });
      }

      // Ensure start and end dates are not the same
      if (start.isSame(end, "day")) {
        return new Response(
          JSON.stringify({
            message: "Start and end dates cannot be the same.",
          }),
          {
            status: 405,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if current order already has conflicting dates
      const { resolvedConflicts, stillConflictingOrders } =
        await checkForResolvedConflicts(order, start, end);

      // Remove resolved conflicts from order
      if (resolvedConflicts.length > 0) {
        order.hasConflictDates = order.hasConflictDates.filter(
          (id) => !resolvedConflicts.includes(id.toString())
        );
      }

      // Fetch all orders for the car, excluding the current order
      const allOrders = await Order.find({
        car: order.car,
        _id: { $ne: orderId },
      });

      // Restored from pre-refactor conflict logic: Debug logging for conflict checks
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Existing orders for car:",
          allOrders.map((o) => ({
            id: o._id.toString(),
            timeIn: dayjs(o.timeIn).toISOString(),
            timeOut: dayjs(o.timeOut).toISOString(),
            confirmed: o.confirmed,
          }))
        );
      }

      // Restored from pre-refactor conflict logic: Check for conflicts
      const { status: conflictStatus, data: conflictData } =
        checkConflictsFixed(allOrders, start, end);

      // Restored from pre-refactor conflict logic: Debug logging
      if (process.env.NODE_ENV !== "production") {
        console.log("Conflict check result:", { status: conflictStatus, data: conflictData });
      }

      if (conflictStatus) {
        switch (conflictStatus) {
          case 409:
            // Restored from pre-refactor conflict logic: Confirmed conflicts (blocking)
            return new Response(
              JSON.stringify({
                message: conflictData?.conflictMessage,
                conflictDates: conflictData?.conflictDates,
              }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" },
              }
            );
          case 408:
            // Restored from pre-refactor conflict logic: Blocking time conflicts
            return new Response(
              JSON.stringify({
                message: conflictData.conflictMessage,
                conflictDates: conflictData.conflictDates,
              }),
              {
                status: 408,
                headers: { "Content-Type": "application/json" },
              }
            );
          case 202:
            // Restored from pre-refactor conflict logic: Update with pending conflicts (warning, but proceed)
            let totalPrice202 = order.totalPrice; // 🔧 FIX: Preserve existing price by default
            let days202 = getBusinessDaySpan(start, end);
            
            // ============================================
            // PRICE ARCHITECTURE LOGIC (202 status with conflicts)
            // ============================================
            // Same rules as main update: totalPrice recalculates, OverridePrice preserved
            
            // Handle manual price override (isOverridePrice flag)
            if (payload.isOverridePrice === true && typeof payload.totalPrice === "number") {
              // Manual override: save to OverridePrice, keep totalPrice untouched
              order.OverridePrice = payload.totalPrice;
            } else if (payload.isOverridePrice === false) {
              // Explicit reset: clear OverridePrice to return to auto pricing
              order.OverridePrice = null;
            }
            // If isOverridePrice is undefined/null, OverridePrice stays as-is (preserved)
            
            // Check if dates or price-affecting fields changed (not just time)
            const datesChanged202 = payload.rentalStartDate !== undefined || payload.rentalEndDate !== undefined;
            const priceAffectingFieldsChanged202 =
              payload.insurance !== undefined ||
              payload.ChildSeats !== undefined ||
              payload.secondDriver !== undefined ||
              payload.car !== undefined;
            
            // Recalculate totalPrice if rental parameters changed
            // This happens REGARDLESS of OverridePrice (totalPrice is always accurate)
            if (datesChanged202 || priceAffectingFieldsChanged202) {
              // Only recalculate if dates or price-affecting fields changed
              if (carDoc && carDoc.calculateTotalRentalPricePerDay) {
                const result = await carDoc.calculateTotalRentalPricePerDay(
                  start,
                  end,
                  payload.insurance ?? order.insurance,
                  payload.ChildSeats ?? order.ChildSeats,
                  payload.secondDriver !== undefined
                    ? toBooleanField(payload.secondDriver, false)
                    : toBooleanField(order.secondDriver, false)
                );
                totalPrice202 = result.total;
                days202 = result.days;
              }
            } else if (
              typeof payload.totalPrice === "number" &&
              !isNaN(payload.totalPrice) &&
              payload.isOverridePrice !== true
            ) {
              // If only price changed (not params) and NOT override, update totalPrice
              totalPrice202 = payload.totalPrice;
            }
            // 🔧 FIX: If only time changed (not dates), preserve existing totalPrice and numberOfDays

            // Restored from pre-refactor conflict logic: Update order fields
            order.rentalStartDate = toStoredBusinessDate(start);
            order.rentalEndDate = toStoredBusinessDate(end);
            order.numberOfDays = days202;
            
            // Always update totalPrice (it's the calculated price)
            // OverridePrice is handled separately above
            order.totalPrice = totalPrice202;
            
            order.timeIn = start.toDate();
            order.timeOut = end.toDate();
            // Restored from pre-refactor conflict logic: Use || operator for placeIn/placeOut to preserve existing values
            order.placeIn = payload.placeIn !== undefined ? payload.placeIn : order.placeIn;
            order.placeOut = payload.placeOut !== undefined ? payload.placeOut : order.placeOut;
            
            // Restored from pre-refactor conflict logic: Update hasConflictDates with new conflicts and still-conflicting orders
            order.hasConflictDates = [
              ...new Set([
                ...order.hasConflictDates,
                ...conflictData.conflictOrdersIds,
                ...stillConflictingOrders,
              ]),
            ];

            // Restored from pre-refactor conflict logic: Update extras fields
            order.ChildSeats =
              payload.ChildSeats !== undefined ? payload.ChildSeats : order.ChildSeats;
            order.insurance =
              payload.insurance !== undefined ? payload.insurance : order.insurance;

            // 🔧 FIX: Also update customer fields if they are in payload (even in conflict case 202)
            if (hasCustomerChanges) {
              if (payload.customerName !== undefined)
                order.customerName = payload.customerName;
              if (payload.phone !== undefined) order.phone = payload.phone;
              if (payload.email !== undefined) order.email = payload.email;
              if (payload.secondDriver !== undefined)
                setSecondDriverField(order, payload.secondDriver);
              if (payload.Viber !== undefined) order.Viber = payload.Viber;
              if (payload.Whatsapp !== undefined) order.Whatsapp = payload.Whatsapp;
              if (payload.Telegram !== undefined) order.Telegram = payload.Telegram;
              if (payload.flightNumber !== undefined)
                order.flightNumber = payload.flightNumber;
            }

            const updatedOrder = await order.save();

            try {
              const action = getActionFromChangedFields(fieldsToUpdate, payload);
              const orderPlain = updatedOrder.toObject ? updatedOrder.toObject() : { ...updatedOrder };
              await notifyOrderAction({
                order: orderPlain,
                previousOrder: previousOrderSnapshot,
                user: session.user,
                action,
                actorName: session.user?.name || session.user?.email,
                source: "BACKEND",
                companyEmail: company?.email,
              });
            } catch (notifyErr) {
              console.error("[update order] notifyOrderAction failed:", notifyErr?.message);
            }

            // Restored from pre-refactor conflict logic: Return response with conflict info (exact format match)
            return new Response(
              JSON.stringify({
                message: conflictData.conflictMessage,
                conflicts: conflictData.conflictDates,
                updatedOrder: updatedOrder,
                data: updatedOrder, // Added for unified API compatibility
              }),
              {
                status: 202,
                headers: { "Content-Type": "application/json" },
              }
            );
        }
      }

      // Restored from pre-refactor conflict logic: No conflicts - proceed with update
      let totalPrice = order.totalPrice; // 🔧 FIX: Preserve existing price by default
      let days = getBusinessDaySpan(start, end);

      // Check if dates or price-affecting fields changed (not just time)
      const datesChanged = payload.rentalStartDate !== undefined || payload.rentalEndDate !== undefined;
      const priceAffectingFieldsChanged =
        payload.insurance !== undefined ||
        payload.ChildSeats !== undefined ||
        payload.secondDriver !== undefined ||
        payload.car !== undefined;

      // ============================================
      // PRICE ARCHITECTURE LOGIC
      // ============================================
      // Rules:
      // - totalPrice: ALWAYS auto-calculated (never manually overridden)
      // - OverridePrice: Manual price from admin (preserved when params change)
      // - When params change: totalPrice recalculates, OverridePrice stays
      
      // Handle manual price override (isOverridePrice flag)
      if (payload.isOverridePrice === true && typeof payload.totalPrice === "number") {
        // Manual override: save to OverridePrice, keep totalPrice untouched
        order.OverridePrice = payload.totalPrice;
        // Don't recalculate totalPrice here - it will be recalculated if params changed
      } else if (payload.isOverridePrice === false) {
        // Explicit reset: clear OverridePrice to return to auto pricing
        order.OverridePrice = null;
      }
      // If isOverridePrice is undefined/null, OverridePrice stays as-is (preserved)
      
      // Recalculate totalPrice if rental parameters changed
      // This happens REGARDLESS of OverridePrice (totalPrice is always accurate)
      if (datesChanged || priceAffectingFieldsChanged) {
        if (carDoc && carDoc.calculateTotalRentalPricePerDay) {
          const result = await carDoc.calculateTotalRentalPricePerDay(
            start,
            end,
            payload.insurance ?? order.insurance,
            payload.ChildSeats ?? order.ChildSeats,
            payload.secondDriver !== undefined
              ? toBooleanField(payload.secondDriver, false)
              : toBooleanField(order.secondDriver, false)
          );
          totalPrice = result.total;
          days = result.days;
        }
      } else if (
        typeof payload.totalPrice === "number" &&
        !isNaN(payload.totalPrice) &&
        payload.isOverridePrice !== true
      ) {
        // If only price changed (not params) and NOT override, update totalPrice
        // This handles direct totalPrice updates (legacy or non-override cases)
        totalPrice = payload.totalPrice;
      }
      // 🔧 FIX: If only time changed (not dates), preserve existing totalPrice and numberOfDays

      // Restored from pre-refactor conflict logic: Update order fields
      order.rentalStartDate = toStoredBusinessDate(start);
      order.rentalEndDate = toStoredBusinessDate(end);
      order.numberOfDays = days;
      
      // Always update totalPrice (it's the calculated price)
      // OverridePrice is handled separately above
      order.totalPrice = totalPrice;
      order.timeIn = start.toDate();
      order.timeOut = end.toDate();
      // Restored from pre-refactor conflict logic: Use || operator to preserve existing values
      order.placeIn = payload.placeIn !== undefined ? payload.placeIn : order.placeIn;
      order.placeOut = payload.placeOut !== undefined ? payload.placeOut : order.placeOut;

      // Restored from pre-refactor conflict logic: Update extras fields
      order.ChildSeats =
        payload.ChildSeats !== undefined ? payload.ChildSeats : order.ChildSeats;
      order.insurance =
        payload.insurance !== undefined ? payload.insurance : order.insurance;
      order.franchiseOrder =
        payload.franchiseOrder !== undefined
          ? payload.franchiseOrder
          : order.franchiseOrder;

      // 🔧 FIX: Also update customer fields if they are in payload (even if hasDateTimeChanges is true)
      if (hasCustomerChanges) {
        if (payload.customerName !== undefined)
          order.customerName = payload.customerName;
        if (payload.phone !== undefined) order.phone = payload.phone;
        if (payload.email !== undefined) order.email = payload.email;
        if (payload.secondDriver !== undefined)
          setSecondDriverField(order, payload.secondDriver);
        if (payload.Viber !== undefined) order.Viber = payload.Viber;
        if (payload.Whatsapp !== undefined) order.Whatsapp = payload.Whatsapp;
        if (payload.Telegram !== undefined) order.Telegram = payload.Telegram;
        if (payload.flightNumber !== undefined)
          order.flightNumber = payload.flightNumber;
      }

      // Restored from pre-refactor conflict logic: Debug logging before save
      if (process.env.NODE_ENV !== "production") {
        console.log("SERVER: заказ перед сохранением:", {
          rentalStartDate: order.rentalStartDate,
          rentalEndDate: order.rentalEndDate,
          timeIn: order.timeIn,
          timeOut: order.timeOut,
          placeIn: order.placeIn,
          placeOut: order.placeOut,
          ChildSeats: order.ChildSeats,
          insurance: order.insurance,
          franchiseOrder: order.franchiseOrder,
          customerName: order.customerName,
          phone: order.phone,
          email: order.email,
          secondDriver: order.secondDriver,
          car: order.car,
          carModel: order.carModel,
          carNumber: order.carNumber,
          confirmed: order.confirmed,
          hasConflictDates: order.hasConflictDates,
          numberOfDays: order.numberOfDays,
          totalPrice: order.totalPrice,
          OverridePrice: order.OverridePrice,
          my_order: order.my_order,
          isOverridePrice: payload.isOverridePrice,
        });
      }

      const savedOrder = await order.save();

      try {
        const action = getActionFromChangedFields(fieldsToUpdate, payload);
        const orderPlain = savedOrder.toObject ? savedOrder.toObject() : { ...savedOrder };
        await notifyOrderAction({
          order: orderPlain,
          previousOrder: previousOrderSnapshot,
          user: session.user,
          action,
          actorName: session.user?.name || session.user?.email,
          source: "BACKEND",
        });
      } catch (notifyErr) {
        console.error("[update order] notifyOrderAction failed:", notifyErr?.message);
      }

      // Restored from pre-refactor conflict logic: Success logging
      if (process.env.NODE_ENV !== "production") {
        console.log("Order updated successfully");
      }

      return new Response(
        JSON.stringify({
          message: `ВСЕ ОТЛИЧНО! Даты изменены.`,
          data: savedOrder,
          updatedOrder: savedOrder,
          status: 201,
          success: true,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle customer info updates
    if (hasCustomerChanges) {
      if (payload.customerName !== undefined)
        order.customerName = payload.customerName;
      if (payload.phone !== undefined) order.phone = payload.phone;
      if (payload.email !== undefined) order.email = payload.email;
      let secondDriverChanged = false;
      if (payload.secondDriver !== undefined) {
        setSecondDriverField(order, payload.secondDriver);
        secondDriverChanged = true;
      }
      if (payload.Viber !== undefined) order.Viber = payload.Viber;
      if (payload.Whatsapp !== undefined) order.Whatsapp = payload.Whatsapp;
      if (payload.Telegram !== undefined) order.Telegram = payload.Telegram;
      if (payload.flightNumber !== undefined)
        order.flightNumber = payload.flightNumber;

      if (secondDriverChanged) {
        let carDoc;
        if (order.car && typeof order.car === "object" && order.car._id) {
          carDoc = order.car;
        } else {
          carDoc = await Car.findById(order.car);
        }

        if (carDoc && carDoc.calculateTotalRentalPricePerDay) {
          const result = await carDoc.calculateTotalRentalPricePerDay(
            toBusinessStartOfDay(order.rentalStartDate),
            toBusinessStartOfDay(order.rentalEndDate),
            order.insurance,
            order.ChildSeats,
            toBooleanField(order.secondDriver, false)
          );
          order.totalPrice = result.total;
          order.numberOfDays = result.days;
        }
      }

      const updatedOrder = await order.save();

      try {
        const action = getActionFromChangedFields(fieldsToUpdate, payload);
        const orderPlain = updatedOrder.toObject ? updatedOrder.toObject() : { ...updatedOrder };
        await notifyOrderAction({
          order: orderPlain,
          previousOrder: previousOrderSnapshot,
          user: session.user,
          action,
          actorName: session.user?.name || session.user?.email,
          source: "BACKEND",
          companyEmail: company?.email,
        });
      } catch (notifyErr) {
        console.error("[update order] notifyOrderAction failed:", notifyErr?.message);
      }

      return new Response(
        JSON.stringify({
          updatedOrder: updatedOrder,
          data: updatedOrder,
          message: "Данные клиента обновлены успешно",
          status: 200,
          success: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // No changes detected
    return new Response(
      JSON.stringify({
        message: "No changes detected",
        updatedOrder: order,
        status: 200,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return new Response(
      JSON.stringify({
        message: `Failed to update order: ${error.message}`,
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
