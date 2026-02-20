/**
 * useEditOrderPermissions
 *
 * 🎯 THIN ADAPTER — orderAccessPolicy is the only source of truth
 *
 * Responsibilities:
 * - Map access (from useOrderAccess) to fieldPermissions and legacy flags
 * - No dayjs, no RBAC helpers, no duplicate isPast/confirmed/my_order logic
 *
 * Rules:
 * - MUST NOT use React state
 * - MUST NOT fetch data
 * - MUST NOT mutate order
 * - ONLY returns booleans derived from access
 */

import { useMemo } from "react";

/**
 * Default access when useOrderAccess returns null (e.g. no session).
 * Safe: everything read-only, no edit/delete/confirm.
 */
// When access is null (e.g. no session), all edits forbidden. Explicit flags so we never infer from canEdit.
const DEFAULT_ACCESS = {
  canEdit: false,
  canDelete: false,
  canConfirm: false,
  canEditPickupDate: false,
  canEditReturnDate: false,
  canEditPickupPlace: false,
  canEditReturn: false,
  canEditInsurance: false,
  canEditFranchise: false,
  canEditPricing: false,
  canEditClientPII: false,
  isViewOnly: true,
  isPast: true,
  timeBucket: "PAST",
};

/**
 * Hook: thin adapter from orderAccessPolicy (access) to UI shape.
 * Single source of truth: access. No orderPermissions, no dayjs.
 *
 * @param {Object} order - Order object (unused; kept for API compatibility)
 * @param {Object} currentUser - Current user (unused; kept for API compatibility)
 * @param {boolean} isViewOnly - Unused; forceViewOnly is applied in useOrderAccess
 * @param {import("@/domain/orders/orderAccessPolicy").OrderAccess | null} access - From useOrderAccess
 * @returns {Object} fieldPermissions, canEdit, canDelete, canConfirm, viewOnly, isCurrentOrder
 */
export function useEditOrderPermissions(order, currentUser, isViewOnly = false, access = null) {
  const a = access ?? DEFAULT_ACCESS;

  const fieldPermissions = useMemo(
    () => ({
      rentalStartDate: a.canEditPickupDate,
      rentalEndDate: a.canEditReturnDate,
      timeIn: a.canEditPickupDate,
      timeOut: a.canEditReturnDate,
      totalPrice: a.canEditPricing,
      placeIn: a.canEditPickupPlace,
      placeOut: a.canEditReturn,
      car: a.canEdit,
      insurance: a.canEditInsurance,
      ChildSeats: a.canEditInsurance,
      franchiseOrder: a.canEditFranchise,
      customerName: a.canEditClientPII,
      phone: a.canEditClientPII,
      email: a.canEditClientPII,
      secondDriver: a.canEdit,
      Viber: a.canEditClientPII,
      Whatsapp: a.canEditClientPII,
      Telegram: a.canEditClientPII,
      flightNumber: a.canEditPickupPlace, // backend checks flightNumber with canEditPickupPlace (placeIn group)
    }),
    [
      a.canEdit,
      a.canEditPickupDate,
      a.canEditReturnDate,
      a.canEditPickupPlace,
      a.canEditReturn,
      a.canEditInsurance,
      a.canEditFranchise,
      a.canEditPricing,
      a.canEditClientPII,
    ]
  );

  return useMemo(
    () => ({
      fieldPermissions,
      canEditField: (field) => Boolean(fieldPermissions[field]),
      canEdit: a.canEdit,
      canDelete: a.canDelete,
      canConfirm: a.canConfirm,
      viewOnly: a.isViewOnly,
      isCurrentOrder: a.timeBucket === "CURRENT",
      isCompletedOrder: a.timeBucket === "PAST",
    }),
    [fieldPermissions, a.canEdit, a.canDelete, a.canConfirm, a.isViewOnly, a.timeBucket]
  );
}

export default useEditOrderPermissions;
