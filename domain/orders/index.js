/**
 * domain/orders
 * 
 * Доменная логика для работы с заказами.
 */

export {
  getOrderColor,
  getOrderMainColor,
  getOrderLightColor,
  getOrderBgColor,
  getOrderType,
} from "./getOrderColor";

export { buildPendingConfirmBlockMap } from "./buildPendingConfirmBlockMap";

// ============================================
// PRICE HELPERS (Single Source of Truth)
// ============================================

export {
  getEffectivePrice,
  hasPriceOverride,
  getPriceInfo,
} from "./orderPriceHelpers";

// ============================================
// ACCESS POLICY (Single Source of Truth for UI)
// ============================================

export {
  getOrderAccess,
  createOrderContext,
} from "./orderAccessPolicy";

// confirmOrderFlow, notifyOrderAction — server-only (nodemailer/fs).
// Импортируй напрямую: @/domain/orders/confirmOrderFlow, @/domain/orders/orderNotificationDispatcher

// Helpers для определения action из изменённых полей
export { getActionFromChangedFields } from "./orderNotificationPolicy";

// ============================================
// RBAC — role/ownership from admin-rbac; permission/time/policy from orderRbacShim (thin wrappers over orderAccessPolicy + athensTime)
// ============================================

export {
  ROLE,
  isSuperAdmin,
  isAdmin,
  isClientOrder,
  isAdminCreatedOrder,
  getOrderCreatorId,
  isOwnOrder,
} from "./admin-rbac";

export {
  getOrderTimeBucket,
  isPastOrder,
  isFutureOrder,
  isCurrentOrder,
  canViewOrder,
  canEditOrder,
  canEditPricing,
  canDeleteOrder,
  canConfirmOrder,
  canEditOrderField,
  ADMIN_POLICY,
  getPermissionDeniedMessage,
} from "./orderRbacShim";

// ============================================
// DEPRECATED EXPORTS (for backward compatibility)
// Do NOT use in new code
// ============================================

/**
 * @deprecated Use isClientOrder or isAdminCreatedOrder instead
 */
export function isSuperadminOrder(order) {
  return false;
}

/**
 * @deprecated Use isAdminCreatedOrder instead
 */
export function isAdminOrder(order) {
  return order?.my_order === false;
}

/**
 * @deprecated Use canDeleteOrder or canEditOrder instead
 */
export function canAdminModifyOrder({ order, adminRole }) {
  // Legacy compatibility: always allow for superadmin
  const { ROLE } = require("./admin-rbac");
  if (adminRole === ROLE.SUPERADMIN) {
    return { allowed: true, reason: null, isProtected: order?.my_order === true };
  }
  // Admin can only modify admin-created orders
  if (order?.my_order === true) {
    return { allowed: false, reason: "Only superadmin can modify client orders", isProtected: true };
  }
  return { allowed: true, reason: null, isProtected: false };
}

/**
 * @deprecated Use isClientOrder instead
 */
export function isOrderProtected(order) {
  return order?.my_order === true;
}

/**
 * @deprecated Use getPermissionDeniedMessage instead
 */
export function getLegacyPermissionDeniedMessage(locale = "en") {
  const messages = {
    en: "Only superadmin can modify client orders.",
    ru: "Только суперадмин может редактировать клиентские заказы.",
    el: "Μόνο ο υπερδιαχειριστής μπορεί να τροποποιήσει παραγγελίες πελατών.",
  };
  return messages[locale] || messages.en;
}

/**
 * @deprecated Use ADMIN_POLICY directly
 */
export function getAdminPolicy() {
  const { ADMIN_POLICY: policy } = require("./orderRbacShim");
  return policy;
}

/**
 * @deprecated Role normalization is no longer needed.
 * Use ROLE.ADMIN and ROLE.SUPERADMIN directly.
 * 
 * ⚠️ This function is kept for backward compatibility only.
 * Returns ROLE.ADMIN (1) or ROLE.SUPERADMIN (2).
 */
export function normalizeUserRole(input) {
  const { ROLE } = require("./admin-rbac");
  if (input === null || input === undefined) return ROLE.ADMIN;
  if (typeof input === "number") {
    return input === ROLE.SUPERADMIN ? ROLE.SUPERADMIN : ROLE.ADMIN;
  }
  if (typeof input === "string") {
    const upper = input.toUpperCase().trim();
    if (upper === "SUPERADMIN" || upper === "SUPER_ADMIN") return ROLE.SUPERADMIN;
    if (upper === "ADMIN") return ROLE.ADMIN;
    const num = Number(upper);
    if (!isNaN(num)) {
      return num === ROLE.SUPERADMIN ? ROLE.SUPERADMIN : ROLE.ADMIN;
    }
  }
  return ROLE.ADMIN;
}
