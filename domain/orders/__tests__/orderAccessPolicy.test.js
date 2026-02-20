/**
 * Unit tests for orderAccessPolicy
 * 
 * ════════════════════════════════════════════════════════════════
 * TEST MATRIX (защита от регрессий)
 * ════════════════════════════════════════════════════════════════
 * 
 * | Role       | Order    | Confirmed | Past | canView | canEdit | canDelete | PII |
 * |------------|----------|-----------|------|---------|---------|-----------|-----|
 * | ADMIN      | Client   | ❌        | ❌   | ✅      | ❌      | ✅        | ❌  |
 * | ADMIN      | Client   | ✅        | ❌   | ✅      | ✅*     | ❌        | ✅  |
 * | ADMIN      | Client   | ✅        | ✅   | ✅      | ❌      | ❌        | ✅  |
 * | ADMIN      | Client   | ❌        | ✅   | ✅      | ❌      | ❌        | ❌  |
 * | ADMIN      | Internal | any       | ❌   | ✅      | ✅      | ✅        | ✅  |
 * | ADMIN      | Internal | any       | ✅   | ✅      | ❌      | ❌        | ✅  |
 * | SUPERADMIN | any      | any       | any  | ✅      | ✅      | ✅        | ✅  |
 * 
 * * edit = только return / insurance
 */

import { getOrderAccess } from "../orderAccessPolicy";

describe("orderAccessPolicy", () => {
  // ════════════════════════════════════════════════════════════════
  // SUPERADMIN TESTS
  // ════════════════════════════════════════════════════════════════
  
  describe("SUPERADMIN", () => {
    it("has full access to any order", () => {
      const access = getOrderAccess({
        role: "SUPERADMIN",
        isClientOrder: true,
        confirmed: false,
        isPast: true,
        timeBucket: "PAST",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(true);
      expect(access.canDelete).toBe(true);
      expect(access.canEditPickupDate).toBe(true);
      expect(access.canEditReturnDate).toBe(true);
      expect(access.canEditReturn).toBe(true);
      expect(access.canEditInsurance).toBe(true);
      expect(access.canEditPricing).toBe(true);
      expect(access.canConfirm).toBe(true);
      expect(access.canSeeClientPII).toBe(true);
      expect(access.notifySuperadminOnEdit).toBe(false);
      expect(access.isViewOnly).toBe(false);
    });

    it("has full access to internal order", () => {
      const access = getOrderAccess({
        role: "SUPERADMIN",
        isClientOrder: false,
        confirmed: false,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(true);
      expect(access.canSeeClientPII).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN + CLIENT ORDER TESTS
  // ════════════════════════════════════════════════════════════════
  
  describe("ADMIN + Client Order", () => {
    it("UNCONFIRMED + FUTURE: view only, no PII, cannot delete; return fields allowed by field flags", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: true,
        confirmed: false,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(false);
      expect(access.canDelete).toBe(false);
      expect(access.canEditPickupDate).toBe(false);
      expect(access.canEditReturnDate).toBe(true);
      expect(access.canEditReturn).toBe(true);
      expect(access.canSeeClientPII).toBe(false); // 🔥 KEY TEST
      expect(access.isViewOnly).toBe(true);
    });

    it("CONFIRMED + FUTURE: limited edit (only return), sees PII, notifies superadmin", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: true,
        confirmed: true,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(true);
      expect(access.canDelete).toBe(false); // ❌ can't delete confirmed
      expect(access.canEditPickupDate).toBe(false); // ❌ can't edit dates
      expect(access.canEditReturnDate).toBe(true);
      expect(access.canEditPickupPlace).toBe(false); // ❌ can't edit placeIn
      expect(access.canEditReturn).toBe(true); // ✅ can edit return only
      expect(access.canEditInsurance).toBe(false); // ❌ client: never insurance
      expect(access.canEditFranchise).toBe(false); // ❌ client: never franchise
      expect(access.canEditPricing).toBe(false); // ❌ can't edit pricing
      expect(access.canSeeClientPII).toBe(true); // 🔥 KEY TEST
      expect(access.notifySuperadminOnEdit).toBe(true); // 🔔 notify
      expect(access.isViewOnly).toBe(false);
    });

    it("CONFIRMED + PAST: view only, sees PII", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: true,
        confirmed: true,
        isPast: true,
        timeBucket: "PAST",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(false);
      expect(access.canDelete).toBe(false);
      expect(access.canSeeClientPII).toBe(true); // ✅ confirmed = PII visible
      expect(access.isViewOnly).toBe(true);
    });

    it("UNCONFIRMED + PAST: view only, NO PII", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: true,
        confirmed: false,
        isPast: true,
        timeBucket: "PAST",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(false);
      expect(access.canDelete).toBe(false);
      expect(access.canSeeClientPII).toBe(false); // 🔥 KEY TEST
      expect(access.isViewOnly).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN + INTERNAL ORDER TESTS
  // ════════════════════════════════════════════════════════════════
  
  describe("ADMIN + Internal Order", () => {
    it("FUTURE: full edit access", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: false,
        confirmed: false,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(true);
      expect(access.canDelete).toBe(true);
      expect(access.canEditPickupDate).toBe(true);
      expect(access.canEditReturnDate).toBe(true);
      expect(access.canEditReturn).toBe(true);
      expect(access.canEditInsurance).toBe(true);
      expect(access.canEditPricing).toBe(true);
      expect(access.canSeeClientPII).toBe(true);
      expect(access.notifySuperadminOnEdit).toBe(false);
      expect(access.isViewOnly).toBe(false);
    });

    it("PAST: view only, sees data", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: false,
        confirmed: false,
        isPast: true,
        timeBucket: "PAST",
      });

      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(false);
      expect(access.canDelete).toBe(false);
      expect(access.canSeeClientPII).toBe(true); // internal = always visible
      expect(access.isViewOnly).toBe(true);
    });

    it("CURRENT: only start blocked (rentalStartDate, timeIn, placeIn); end + return editable; can confirm", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: false,
        confirmed: false,
        isPast: false,
        timeBucket: "CURRENT",
      });

      expect(access.canView).toBe(true);
      expect(access.canEditPickupDate).toBe(false); // ❌ start
      expect(access.canEditReturnDate).toBe(true);  // ✅ end
      expect(access.canEditPickupPlace).toBe(false);
      expect(access.canEditReturn).toBe(true);
      expect(access.canEditInsurance).toBe(false);
      expect(access.canEditFranchise).toBe(false);
      expect(access.canEditPricing).toBe(false);
      expect(access.canEditClientPII).toBe(true);
      expect(access.canConfirm).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ════════════════════════════════════════════════════════════════
  
  describe("Edge Cases", () => {
    it("always allows viewing (canView is always true)", () => {
      const scenarios = [
        { role: "ADMIN", isClientOrder: true, confirmed: false, isPast: true, timeBucket: "PAST" },
        { role: "ADMIN", isClientOrder: true, confirmed: true, isPast: true, timeBucket: "PAST" },
        { role: "ADMIN", isClientOrder: false, confirmed: false, isPast: true, timeBucket: "PAST" },
        { role: "SUPERADMIN", isClientOrder: true, confirmed: false, isPast: true, timeBucket: "PAST" },
      ];

      scenarios.forEach((ctx) => {
        const access = getOrderAccess(ctx);
        expect(access.canView).toBe(true);
      });
    });

    it("superadmin never notifies superadmin", () => {
      const access = getOrderAccess({
        role: "SUPERADMIN",
        isClientOrder: true,
        confirmed: true,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.notifySuperadminOnEdit).toBe(false);
    });

    it("admin editing confirmed client order notifies superadmin", () => {
      const access = getOrderAccess({
        role: "ADMIN",
        isClientOrder: true,
        confirmed: true,
        isPast: false,
        timeBucket: "FUTURE",
      });

      expect(access.notifySuperadminOnEdit).toBe(true);
    });

    it("throws when timeBucket is missing (CURRENT must exist, no FUTURE fallback)", () => {
      expect(() =>
        getOrderAccess({
          role: "ADMIN",
          isClientOrder: false,
          confirmed: false,
          isPast: false,
          // timeBucket omitted
        })
      ).toThrow("timeBucket is required");
    });
  });
});
