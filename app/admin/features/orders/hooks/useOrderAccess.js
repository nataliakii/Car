/**
 * useOrderAccess.js
 * 
 * ════════════════════════════════════════════════════════════════
 * REACT HOOK: Single Entry Point for Order Access
 * ════════════════════════════════════════════════════════════════
 * 
 * ❗ UI никогда не вычисляет права сам
 * ❗ Использует orderAccessPolicy как единый источник истины
 * 
 * Использование:
 * ```js
 * const access = useOrderAccess(editedOrder);
 * 
 * {access.canSeeClientPII && <ClientContacts />}
 * {access.canEditPickupDate && <DateEditor />}
 * {access.canEditReturn && <ReturnPlaceEditor />}
 * {!access.canEdit && <ReadOnlyBanner />}
 * ```
 */

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  getOrderAccess,
  ROLE,
  getDisabledFields as getDisabledFieldsFromPolicy,
} from "@/domain/orders/orderAccessPolicy";
import { getTimeBucket, athensNow } from "@/domain/time/athensTime";

// Extend dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Athens timezone for consistent date comparison
const ATHENS_TZ = "Europe/Athens";

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Проверяет, является ли заказ прошлым (rentalEndDate < today в Athens TZ).
 * Parsing consistent with getTimeBucket: UTC then tz(ATHENS_TZ).
 *
 * @param {Object} order - Order object
 * @returns {boolean}
 */
function isOrderPast(order) {
  if (!order?.rentalEndDate) return false;

  const endDate = dayjs.utc(order.rentalEndDate).tz(ATHENS_TZ).startOf("day");
  const today = athensNow().startOf("day");

  return endDate.isBefore(today, "day");
}

/**
 * Создаёт OrderContext из order и session.
 *
 * @param {Object} order
 * @param {Object} session
 * @returns {import("@/domain/orders/orderAccessPolicy").OrderContext}
 */
function createContext(order, session) {
  if (!order || !session?.user) {
    return {
      role: "ADMIN",
      isClientOrder: false,
      confirmed: false,
      isPast: false,
      timeBucket: "FUTURE",
    };
  }

  const isSuperAdmin = session.user.role === ROLE.SUPERADMIN;
  const isPast = isOrderPast(order);
  const timeBucket = getTimeBucket(order); // from athensTime — single source for PAST/CURRENT/FUTURE

  return {
    role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
    isClientOrder: order.my_order === true,
    confirmed: order.confirmed === true,
    isPast,
    timeBucket,
  };
}

// ════════════════════════════════════════════════════════════════
// MAIN HOOK
// ════════════════════════════════════════════════════════════════

/**
 * React hook для получения доступов к заказу.
 * 
 * Автоматически:
 * - Получает роль из сессии
 * - Определяет isPast по Athens timezone
 * - Мемоизирует результат
 * 
 * @param {Object} order - Order object (can be editedOrder)
 * @param {Object} options - Optional overrides
 * @param {boolean} options.forceViewOnly - Force view-only mode
 * @returns {import("@/domain/orders/orderAccessPolicy").OrderAccess | null}
 */
export function useOrderAccess(order, options = {}) {
  const { data: session } = useSession();
  const { forceViewOnly = false } = options;

  return useMemo(() => {
    // Если нет order или session — возвращаем null
    if (!order || !session?.user) {
      return null;
    }
    
    // Создаём контекст
    const ctx = createContext(order, session);
    
    // Получаем доступы
    const access = getOrderAccess(ctx);
    // Attach timeBucket so UI can distinguish CURRENT vs FUTURE without re-deriving date logic.
    const accessWithBucket = {
      ...access,
      timeBucket: ctx.timeBucket,
    };
    
    // Применяем forceViewOnly если нужно, НО SUPERADMIN всегда имеет полный доступ
    // WHY: forceViewOnly передаётся из UI для прошлых заказов, но policy для SUPERADMIN
    // уже вернул полный доступ — не переопределяем его.
    const isSuperAdminAccess = ctx.role === "SUPERADMIN";
    if (forceViewOnly && accessWithBucket.canEdit && !isSuperAdminAccess) {
      return {
        ...accessWithBucket,
        canEdit: false,
        canEditPickupDate: false,
        canEditReturnDate: false,
        canEditPickupPlace: false,
        canEditReturn: false,
        canEditInsurance: false,
        canEditFranchise: false,
        canEditPricing: false,
        canEditClientPII: false,
        isViewOnly: true,
      };
    }
    
    return accessWithBucket;
  }, [order, session, forceViewOnly]);
}

// ════════════════════════════════════════════════════════════════
// HELPER EXPORTS
// ════════════════════════════════════════════════════════════════

/**
 * Возвращает человекочитаемую причину ограничения доступа.
 * 
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess} access
 * @param {Object} order
 * @returns {string|null}
 */
export function getAccessRestrictionReason(access, order) {
  if (!access) return null;
  
  if (access.isViewOnly) {
    if (isOrderPast(order)) {
      return "Прошлый заказ — только просмотр";
    }
    if (order?.my_order && !order?.confirmed) {
      return "Неподтверждённый клиентский заказ — только просмотр";
    }
  }
  
  if ((!access.canEditPickupDate && !access.canEditReturnDate) && order?.my_order) {
    return "Даты клиентского заказа нельзя изменять";
  }
  
  return null;
}

/**
 * Возвращает список полей, которые нельзя редактировать.
 * Delegates to orderAccessPolicy (single source of truth).
 *
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess} access
 * @returns {string[]}
 */
export function getDisabledFields(access) {
  return getDisabledFieldsFromPolicy(access);
}

/**
 * Проверяет, можно ли редактировать конкретное поле.
 * 
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess} access
 * @param {string} fieldName
 * @returns {boolean}
 */
export function canEditField(access, fieldName) {
  if (!access || !access.canEdit) return false;
  
  const disabledFields = getDisabledFields(access);
  return !disabledFields.includes(fieldName);
}

export default useOrderAccess;
