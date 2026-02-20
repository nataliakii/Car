/**
 * Determines whether start date updates are allowed.
 * Source of truth: fieldPermissions.rentalStartDate from orderAccessPolicy mapping.
 *
 * @param {Object} permissions
 * @param {boolean} permissions.viewOnly
 * @param {Object} permissions.fieldPermissions
 * @returns {boolean}
 */
export function canUpdateStartDate(permissions) {
  if (!permissions || permissions.viewOnly) return false;
  if (permissions.isCurrentOrder) return false;
  return permissions.fieldPermissions?.rentalStartDate === true;
}
