/**
 * orderPermissions.js
 *
 * ⚠️ DEPRECATED: Re-export wrapper only.
 *
 * Permission/time/policy logic lives in domain/orders/index.js (thin wrappers over orderAccessPolicy + athensTime).
 * Role/ownership helpers live in admin-rbac.js. This file re-exports from index for backward compatibility.
 */

// Shared order field keys for permissions/policy checks.
export const ORDER_FIELD_KEYS = Object.freeze({
  SECOND_DRIVER: "secondDriver",
});

// Re-export from admin-rbac + orderRbacShim only (avoids loading index → confirmOrderFlow in tests)
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

// Deprecated functions (kept for backward compatibility only)
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
