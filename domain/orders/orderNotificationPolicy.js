/**
 * orderNotificationPolicy.js
 * 
 * ════════════════════════════════════════════════════════════════
 * ДЕКЛАРАТИВНАЯ ПОЛИТИКА УВЕДОМЛЕНИЙ
 * ════════════════════════════════════════════════════════════════
 * 
 * 🔑 КЛЮЧЕВОЙ ПРИНЦИП:
 * NotificationPolicy НЕ ДУМАЕТ. Она РЕАГИРУЕТ на OrderAccess.
 * 
 * ❌ НЕ пересчитывает бизнес-правила
 * ✅ Реагирует на флаги из orderAccessPolicy
 * 
 * Точки входа:
 * - Кто что может → orderAccessPolicy.js
 * - Кого уведомляем → orderNotificationPolicy.js (этот файл)
 * - Как отправляем → orderNotificationDispatcher.js
 */

import { ORDER_FIELD_KEYS } from "./orderPermissions";

// ════════════════════════════════════════════════════════════════
// TYPES (JSDoc)
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {"CREATE" | "CONFIRM" | "UNCONFIRM" | "UPDATE_DATES" | "UPDATE_SECOND_DRIVER" | "UPDATE_RETURN" | "UPDATE_INSURANCE" | "UPDATE_PRICING" | "DELETE"} OrderAction
 */

/**
 * @typedef {"SUPERADMIN" | "DEVELOPERS" | "COMPANY_EMAIL" | "CUSTOMER"} NotificationTarget
 */

/**
 * @typedef {"TELEGRAM" | "EMAIL"} NotificationChannel
 */

/**
 * @typedef {Object} Notification
 * @property {NotificationTarget} target - Who to notify
 * @property {NotificationChannel[]} channels - How to notify
 * @property {string} reason - Why notifying (for logs/debug)
 * @property {boolean} [includePII] - Whether to include customer data
 * @property {"CRITICAL" | "INFO" | "DEBUG"} [priority] - Notification priority
 */

/**
 * @typedef {Object} NotificationParams
 * @property {OrderAction} action - What action was performed
 * @property {import("./orderAccessPolicy").OrderAccess} access - Result of getOrderAccess
 * @property {Object} order - Order object (минимально нужные поля)
 * @property {boolean} order.my_order - Is client order
 * @property {boolean} order.confirmed - Is confirmed
 */

// ════════════════════════════════════════════════════════════════
// ACTION INTENT MAPPING
// ════════════════════════════════════════════════════════════════

/**
 * Смысл действий — для логирования, фильтрации, группировки.
 * 
 * @type {Record<OrderAction, string>}
 */
export const ACTION_INTENT = {
  CREATE: "ORDER_CREATED",
  CONFIRM: "ORDER_CONFIRMED",
  UNCONFIRM: "ORDER_UNCONFIRMED",
  UPDATE_DATES: "CRITICAL_EDIT",
  UPDATE_SECOND_DRIVER: "CRITICAL_EDIT",
  UPDATE_PRICING: "CRITICAL_EDIT",
  UPDATE_RETURN: "SAFE_EDIT",
  UPDATE_INSURANCE: "SAFE_EDIT",
  DELETE: "ORDER_DELETED",
};

/**
 * Критические действия — требуют усиленного уведомления.
 */
const CRITICAL_ACTIONS = [
  "UPDATE_DATES",
  "UPDATE_SECOND_DRIVER",
  "UPDATE_PRICING",
  "DELETE",
];

/**
 * Безопасные действия — разрешены для ADMIN на confirmed client orders.
 */
const SAFE_ACTIONS = ["UPDATE_RETURN", "UPDATE_INSURANCE"];

// ════════════════════════════════════════════════════════════════
// NOTIFICATION POLICY
// ════════════════════════════════════════════════════════════════

/**
 * Определяет список уведомлений для действия над заказом.
 * 
 * 🔑 НЕ ДУМАЕТ — реагирует на OrderAccess.
 * 
 * @param {NotificationParams} params
 * @returns {Notification[]}
 */
export function getOrderNotifications(params) {
  const { action, access, order } = params;
  
  // Валидация
  if (!access || !order) {
    return [];
  }
  
  /** @type {Notification[]} */
  const notifications = [];
  
  const isClientOrder = order.my_order === true;
  const isConfirmed = order.confirmed === true;
  const intent = ACTION_INTENT[action] || "UNKNOWN";

  // ════════════════════════════════════════════════════════════════
  // 🔔 SUPERADMIN NOTIFICATION (на основе access.notifySuperadminOnEdit)
  // ════════════════════════════════════════════════════════════════
  
  if (access.notifySuperadminOnEdit) {
    // Критические действия — telegram + email
    if (CRITICAL_ACTIONS.includes(action)) {
      notifications.push({
        target: "SUPERADMIN",
        channels: ["TELEGRAM", "EMAIL"],
        reason: `CRITICAL: ${intent} on confirmed client order`,
        includePII: access.canSeeClientPII,
        priority: "CRITICAL",
      });
    }
    // Безопасные действия — только telegram
    else if (SAFE_ACTIONS.includes(action)) {
      notifications.push({
        target: "SUPERADMIN",
        channels: ["TELEGRAM"],
        reason: `INFO: ${intent} on confirmed client order`,
        includePII: false,
        priority: "INFO",
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 📧 CUSTOMER NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  
  if (action === "CONFIRM" && isClientOrder) {
    notifications.push({
      target: "CUSTOMER",
      channels: ["EMAIL"],
      reason: "Order confirmed — customer notification",
      includePII: true, // Customer gets their own data
      priority: "INFO",
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 🏢 COMPANY NOTIFICATION (новый клиентский заказ)
  // ════════════════════════════════════════════════════════════════
  // EMAIL_TESTING=true → только SUPERADMIN (без письма компании)
  // иначе → COMPANY_EMAIL без данных клиента + SUPERADMIN
  // ════════════════════════════════════════════════════════════════
  
  if (action === "CREATE" && isClientOrder && !isConfirmed) {
    const emailTesting = process.env.EMAIL_TESTING === "true";

    if (emailTesting) {
      // Режим тестирования: уведомление только SUPERADMIN
      notifications.push({
        target: "SUPERADMIN",
        channels: ["TELEGRAM", "EMAIL"],
        reason: "New client order created (EMAIL_TESTING)",
        includePII: true,
        priority: "INFO",
      });
    } else {
      // Продакшен: компания — письмо без данных клиента; суперадмин — полное уведомление
      notifications.push({
        target: "COMPANY_EMAIL",
        channels: ["EMAIL"],
        reason: "New client order created",
        includePII: false, // без данных клиента
        priority: "INFO",
      });
      notifications.push({
        target: "SUPERADMIN",
        channels: ["TELEGRAM", "EMAIL"],
        reason: "New client order created",
        includePII: true,
        priority: "INFO",
      });
      if (order.email && String(order.email).trim()) {
        notifications.push({
          target: "CUSTOMER",
          channels: ["EMAIL"],
          reason: "New client order created — confirmation to customer",
          includePII: true,
          priority: "INFO",
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 👩‍💻 DEVELOPERS NOTIFICATION (для аудита)
  // ════════════════════════════════════════════════════════════════
  
  if (action === "DELETE") {
    // Удаление любого заказа — логируем
    notifications.push({
      target: "DEVELOPERS",
      channels: ["TELEGRAM"],
      reason: `AUDIT: ${isClientOrder ? "Client" : "Internal"} order deleted`,
      includePII: true,
      priority: "DEBUG",
    });
  }

  return notifications;
}

// ════════════════════════════════════════════════════════════════
// ACTION CLASSIFICATION HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Определяет OrderAction из изменённых полей.
 * 
 * @param {string[]} changedFields - Список изменённых полей
 * @param {Object} [changes] - Объект с новыми значениями (для CONFIRM/UNCONFIRM)
 * @returns {OrderAction}
 */
export function getActionFromChangedFields(changedFields, changes = {}) {
  const fields = new Set(changedFields);
  
  // Подтверждение
  if (fields.has("confirmed")) {
    return changes.confirmed === true ? "CONFIRM" : "UNCONFIRM";
  }
  
  // Даты
  if (fields.has("rentalStartDate") || fields.has("rentalEndDate") || 
      fields.has("timeIn") || fields.has("timeOut") || fields.has("numberOfDays")) {
    return "UPDATE_DATES";
  }

  // Опция второго водителя (важно для цены/условий)
  if (fields.has(ORDER_FIELD_KEYS.SECOND_DRIVER)) {
    return "UPDATE_SECOND_DRIVER";
  }
  
  // Цена
  if (fields.has("totalPrice") || fields.has("OverridePrice")) {
    return "UPDATE_PRICING";
  }
  
  // Страховка
  if (fields.has("insurance")) {
    return "UPDATE_INSURANCE";
  }
  
  // Возврат
  if (fields.has("placeOut")) {
    return "UPDATE_RETURN";
  }
  
  // Fallback
  return "UPDATE_RETURN";
}

/**
 * Проверяет, является ли действие критическим.
 * 
 * @param {OrderAction} action
 * @returns {boolean}
 */
export function isCriticalAction(action) {
  return CRITICAL_ACTIONS.includes(action);
}

/**
 * Получает intent для действия (для логирования).
 * 
 * @param {OrderAction} action
 * @returns {string}
 */
export function getActionIntent(action) {
  return ACTION_INTENT[action] || "UNKNOWN";
}

// ════════════════════════════════════════════════════════════════
// ACTION VALIDATION (CRITICAL SAFETY CHECK)
// ════════════════════════════════════════════════════════════════

/**
 * 🛑 SAFETY CHECK: Проверяет, разрешено ли действие по access policy.
 * 
 * Notification = side-effect.
 * Side-effect НИКОГДА не должен происходить, если действие запрещено.
 * 
 * @param {OrderAction} action
 * @param {import("./orderAccessPolicy").OrderAccess} access
 * @returns {boolean}
 */
export function isActionAllowedByAccess(action, access) {
  if (!access) return false;

  switch (action) {
    case "UPDATE_DATES":
      return access.canEditPickupDate === true || access.canEditReturnDate === true;
    case "UPDATE_SECOND_DRIVER":
      return access.canEdit === true;
    case "UPDATE_RETURN":
      return access.canEditReturn === true;
    case "UPDATE_INSURANCE":
      return access.canEditInsurance === true;
    case "UPDATE_PRICING":
      return access.canEditPricing === true;
    case "CONFIRM":
    case "UNCONFIRM":
      return access.canConfirm === true;
    case "DELETE":
      return access.canDelete === true;
    case "CREATE":
      // CREATE всегда разрешён (проверяется на уровне API/формы)
      return true;
    default:
      return false;
  }
}

// ════════════════════════════════════════════════════════════════
// PRIORITY BY INTENT (декларативно, без ручных ошибок)
// ════════════════════════════════════════════════════════════════

/**
 * @type {Record<string, "CRITICAL" | "INFO" | "DEBUG">}
 */
export const PRIORITY_BY_INTENT = {
  ORDER_CREATED: "CRITICAL",
  ORDER_CONFIRMED: "INFO",
  ORDER_UNCONFIRMED: "INFO",
  CRITICAL_EDIT: "CRITICAL",
  SAFE_EDIT: "INFO",
  ORDER_DELETED: "CRITICAL",
};

/**
 * Получает приоритет уведомления по intent.
 * 
 * @param {string} intent
 * @returns {"CRITICAL" | "INFO" | "DEBUG"}
 */
export function getPriorityByIntent(intent) {
  return PRIORITY_BY_INTENT[intent] ?? "DEBUG";
}
