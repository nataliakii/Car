/**
 * withOrderAccess.js
 * 
 * ════════════════════════════════════════════════════════════════
 * BACKEND MIDDLEWARE: Policy Enforcement
 * ════════════════════════════════════════════════════════════════
 * 
 * ❗ Backend НЕ доверяет UI
 * ❗ Backend сам решает: можно / нельзя
 * ❗ Использует тот же orderAccessPolicy что и UI
 * 
 * Гарантирует:
 * - READ всегда разрешён (canView === true)
 * - WRITE проверяет canEdit и field-level permissions
 * - PII фильтруется автоматически
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@lib/authOptions";
import dayjs from "dayjs";
import { getOrderAccess, ROLE } from "@/domain/orders/orderAccessPolicy";
import { applyVisibilityToOrder } from "@/domain/orders/orderVisibility";
import { getTimeBucket } from "@/domain/time/athensTime";
import { ORDER_FIELD_KEYS } from "@/domain/orders/orderPermissions";

// Athens timezone
const ATHENS_TZ = "Europe/Athens";

/**
 * Создаёт OrderContext из order и session.
 * timeBucket обязателен для getOrderAccess (CURRENT vs FUTURE).
 *
 * @param {Object} order - Order object
 * @param {Object} session - NextAuth session
 * @returns {import("@/domain/orders/orderAccessPolicy").OrderContext}
 */
function createContext(order, session) {
  const user = session?.user;
  const isSuperAdmin = user?.role === ROLE.SUPERADMIN;

  const endDate = order?.rentalEndDate
    ? dayjs(order.rentalEndDate).tz(ATHENS_TZ)
    : null;
  const today = dayjs().tz(ATHENS_TZ).startOf("day");
  const isPast = endDate ? endDate.isBefore(today, "day") : false;
  const timeBucket = getTimeBucket(order);

  return {
    role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
    isClientOrder: order?.my_order === true,
    confirmed: order?.confirmed === true,
    isPast,
    timeBucket,
  };
}

/**
 * Middleware для проверки доступа к заказу.
 * 
 * Автоматически:
 * - Получает session
 * - Вычисляет access
 * - Проверяет разрешения для метода
 * - Добавляет orderAccess в context
 * 
 * @param {Function} handler - Route handler
 * @param {Object} options
 * @param {boolean} options.requireOrder - Whether order is required in context
 * @returns {Function} Wrapped handler
 */
export function withOrderAccess(handler, options = {}) {
  const { requireOrder = false } = options;
  
  return async (req, ctx) => {
    // Получаем session
    const session = await getServerSession(authOptions);
    
    // Проверяем авторизацию
    if (!session?.user?.isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Если order требуется, но его нет — ошибка
    if (requireOrder && !ctx.order) {
      return new Response(JSON.stringify({ error: "Order not found in context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Вычисляем access
    const orderAccess = ctx.order 
      ? getOrderAccess(createContext(ctx.order, session))
      : null;
    
    // Добавляем в context
    const enrichedCtx = {
      ...ctx,
      session,
      user: session.user,
      orderAccess,
    };
    
    // READ — всегда разрешён
    if (req.method === "GET") {
      return handler(req, enrichedCtx);
    }
    
    // WRITE — проверяем canEdit
    if (orderAccess && !orderAccess.canView) {
      return new Response(JSON.stringify({ 
        error: "Forbidden",
        reason: "Order not viewable",
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return handler(req, enrichedCtx);
  };
}

/**
 * Field-level access check для PATCH/PUT запросов.
 * 
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess} access
 * @param {string[]} fieldsToUpdate
 * @returns {{ allowed: boolean, deniedFields: string[] }}
 */
export function checkFieldAccess(access, fieldsToUpdate) {
  if (!access) {
    return { allowed: false, deniedFields: fieldsToUpdate };
  }
  
  const deniedFields = [];
  
  for (const field of fieldsToUpdate) {
    if (["rentalStartDate", "timeIn"].includes(field)) {
      if (!access.canEditPickupDate) deniedFields.push(field);
    } else if (["rentalEndDate", "numberOfDays"].includes(field)) {
      if (!access.canEditReturnDate) deniedFields.push(field);
    }
    // Место получения (placeIn) — только canEditPickupPlace
    else if (["placeIn", "flightNumber"].includes(field)) {
      if (!access.canEditPickupPlace) deniedFields.push(field);
    }
    // Возврат (placeOut, timeOut) — canEditReturn
    else if (["placeOut", "timeOut"].includes(field)) {
      if (!access.canEditReturn) deniedFields.push(field);
    }
    // Страховка / детские кресла
    else if (["insurance", "ChildSeats"].includes(field)) {
      if (!access.canEditInsurance) deniedFields.push(field);
    }
    // Франшиза — только canEditFranchise (client orders NEVER)
    else if (["franchiseOrder"].includes(field)) {
      if (!access.canEditFranchise) deniedFields.push(field);
    }
    // Цена
    else if (["totalPrice", "OverridePrice"].includes(field)) {
      if (!access.canEditPricing) deniedFields.push(field);
    }
    // Опция бронирования (не PII): доступна только при общем праве редактирования заказа
    else if ([ORDER_FIELD_KEYS.SECOND_DRIVER].includes(field)) {
      if (!access.canEdit) deniedFields.push(field);
    }
    // Подтверждение
    else if (["confirmed"].includes(field)) {
      if (!access.canConfirm) deniedFields.push(field);
    }
    // PII — редактирование только при canEditClientPII
    else if (["customerName", "phone", "email", "Viber", "Whatsapp", "Telegram"].includes(field)) {
      if (!access.canEditClientPII) deniedFields.push(field);
    }
  }
  
  return {
    allowed: deniedFields.length === 0,
    deniedFields,
  };
}

/**
 * Применяет visibility к response на основе access.
 * 
 * @param {Object} order - Order to filter
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess} access
 * @returns {Object} Filtered order
 */
export function applyAccessVisibility(order, access) {
  if (!order || !access) return order;
  
  // Если можно видеть PII — возвращаем как есть
  if (access.canSeeClientPII) {
    return order;
  }
  
  // Иначе удаляем PII
  const filtered = { ...order };
  const piiFields = ["customerName", "phone", "email", "Viber", "Whatsapp", "Telegram"];
  
  for (const field of piiFields) {
    delete filtered[field];
  }
  
  filtered._visibility = {
    hideClientContacts: true,
    reason: "PII hidden by access policy",
  };
  
  return filtered;
}
