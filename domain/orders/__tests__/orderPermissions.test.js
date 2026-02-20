/**
 * Unit tests for orderPermissions RBAC functions
 * 
 * Tests verify that permission logic is driven by ADMIN_POLICY config switches.
 */

import {
  canEditOrder,
  canDeleteOrder,
  canEditOrderField,
  canConfirmOrder,
  isClientOrder,
  isAdminCreatedOrder,
  isSuperadminOrder,
  isPastOrder,
  isFutureOrder,
  getOrderCreatorId,
  isOwnOrder,
  ROLE,
  ADMIN_POLICY,
} from "../orderPermissions";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

describe("orderPermissions RBAC", () => {
  // Test users
  const superadmin = {
    isAdmin: true,
    role: ROLE.SUPERADMIN, // 2
    id: "superadmin",
  };
  
  const admin = {
    isAdmin: true,
    role: ROLE.ADMIN, // 1
    id: "admin",
  };
  
  const nonAdmin = {
    isAdmin: false,
    role: 0,
  };
  
  // Test orders
  // Note: createdByRole is deprecated and not used in RBAC logic
  // Order type is determined by my_order flag only
  const clientOrder = {
    _id: "client1",
    my_order: true, // Client order
    confirmed: false,
    rentalStartDate: dayjs().add(1, "day").toDate(),
    rentalEndDate: dayjs().add(2, "days").toDate(),
  };
  
  const adminOrder = {
    _id: "admin1",
    my_order: false, // Admin-created order
    createdByAdminId: "admin",
    confirmed: false,
    rentalStartDate: dayjs().add(1, "day").toDate(),
    rentalEndDate: dayjs().add(2, "days").toDate(),
  };
  
  const otherAdminOrder = {
    _id: "admin2",
    my_order: false, // Admin-created order
    createdByAdminId: "other-admin",
    confirmed: false,
    rentalStartDate: dayjs().add(1, "day").toDate(),
    rentalEndDate: dayjs().add(2, "days").toDate(),
  };
  
  const superadminOrder = {
    _id: "superadmin1",
    my_order: false, // Admin-created order (superadmin is still admin-created)
    confirmed: false,
    rentalStartDate: dayjs().add(1, "day").toDate(),
    rentalEndDate: dayjs().add(2, "days").toDate(),
  };
  
  const pastConfirmedOrder = {
    _id: "past1",
    my_order: false,
    createdByAdminId: "admin",
    confirmed: true,
    rentalStartDate: dayjs().subtract(5, "days").toDate(),
    rentalEndDate: dayjs().subtract(2, "days").toDate(),
  };
  
  const pastPendingOrder = {
    _id: "past2",
    my_order: false,
    createdByAdminId: "admin",
    confirmed: false,
    rentalStartDate: dayjs().subtract(5, "days").toDate(),
    rentalEndDate: dayjs().subtract(2, "days").toDate(),
  };

  // ─────────────────────────────────────────────────────────────
  // SUPERADMIN TESTS (always allowed)
  // ─────────────────────────────────────────────────────────────
  
  describe("Superadmin permissions (always allowed)", () => {
    test("canEditOrder: superadmin can edit any order", () => {
      expect(canEditOrder(clientOrder, superadmin).allowed).toBe(true);
      expect(canEditOrder(adminOrder, superadmin).allowed).toBe(true);
      expect(canEditOrder(superadminOrder, superadmin).allowed).toBe(true);
    });
    
    test("canDeleteOrder: superadmin can delete any order", () => {
      expect(canDeleteOrder(clientOrder, superadmin).allowed).toBe(true);
      expect(canDeleteOrder(adminOrder, superadmin).allowed).toBe(true);
      expect(canDeleteOrder(superadminOrder, superadmin).allowed).toBe(true);
      expect(canDeleteOrder(pastConfirmedOrder, superadmin).allowed).toBe(true);
      expect(canDeleteOrder(pastPendingOrder, superadmin).allowed).toBe(true);
    });
    
    test("canEditOrderField: superadmin can edit any field of any order", () => {
      const fields = ["customerName", "phone", "email", "rentalStartDate", "rentalEndDate", "timeIn", "timeOut", "totalPrice"];
      fields.forEach((field) => {
        expect(canEditOrderField(clientOrder, superadmin, field).allowed).toBe(true);
        expect(canEditOrderField(adminOrder, superadmin, field).allowed).toBe(true);
        expect(canEditOrderField(superadminOrder, superadmin, field).allowed).toBe(true);
      });
    });
    
    test("canConfirmOrder: superadmin can always toggle confirmation", () => {
      expect(canConfirmOrder(clientOrder, superadmin).allowed).toBe(true);
      expect(canConfirmOrder(adminOrder, superadmin).allowed).toBe(true);
      expect(canConfirmOrder(superadminOrder, superadmin).allowed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ADMIN DELETE TESTS
  // ─────────────────────────────────────────────────────────────
  
  describe("Admin delete permissions", () => {
    // UPDATED: Per current orderAccessPolicy.js:
    // - ADMIN cannot delete client orders (confirmed or unconfirmed)
    test("ADMIN cannot delete UNCONFIRMED client orders", () => {
      // clientOrder is unconfirmed
      const result = canDeleteOrder(clientOrder, admin);
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN cannot delete CONFIRMED client orders", () => {
      const confirmedClientOrder = { ...clientOrder, confirmed: true };
      const result = canDeleteOrder(confirmedClientOrder, admin);
      expect(result.allowed).toBe(false);
    });
    
    // UPDATED: Per orderAccessPolicy.js, ownership is NOT checked for delete
    // Any ADMIN can delete any FUTURE internal order
    test("ADMIN can delete any FUTURE internal order (no ownership check)", () => {
      const result = canDeleteOrder(superadminOrder, admin);
      // Internal + future = allowed
      expect(result.allowed).toBe(true);
    });
    
    test("ADMIN can delete other admin's FUTURE internal order", () => {
      const result = canDeleteOrder(otherAdminOrder, admin);
      expect(result.allowed).toBe(true);
    });
    
    test("ADMIN can delete own FUTURE internal order", () => {
      const result = canDeleteOrder(adminOrder, admin);
      expect(result.allowed).toBe(true);
    });
    
    test("ADMIN cannot delete past confirmed orders", () => {
      const result = canDeleteOrder(pastConfirmedOrder, admin);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("delete");
    });

    test("ADMIN cannot delete past pending orders", () => {
      const result = canDeleteOrder(pastPendingOrder, admin);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("delete");
    });
  });
  
  // ─────────────────────────────────────────────────────────────
  // OWNERSHIP TESTS
  // ─────────────────────────────────────────────────────────────
  
  describe("Order ownership helpers", () => {
    test("getOrderCreatorId: returns createdByAdminId as string", () => {
      const order = { createdByAdminId: "admin123" };
      expect(getOrderCreatorId(order)).toBe("admin123");
    });
    
    test("getOrderCreatorId: returns null if no creator field", () => {
      expect(getOrderCreatorId({})).toBe(null);
      expect(getOrderCreatorId(null)).toBe(null);
    });
    
    test("getOrderCreatorId: handles ObjectId-like values", () => {
      const order = { createdByAdminId: { toString: () => "admin123" } };
      expect(getOrderCreatorId(order)).toBe("admin123");
    });
    
    test("isOwnOrder: returns true if user created the order", () => {
      const order = { createdByAdminId: "admin" };
      const user = { id: "admin" };
      expect(isOwnOrder(order, user)).toBe(true);
    });
    
    test("isOwnOrder: returns false if different user created the order", () => {
      const order = { createdByAdminId: "other-admin" };
      const user = { id: "admin" };
      expect(isOwnOrder(order, user)).toBe(false);
    });
    
    test("isOwnOrder: returns false if no creator", () => {
      const order = {};
      const user = { id: "admin" };
      expect(isOwnOrder(order, user)).toBe(false);
    });
    
    test("isOwnOrder: handles string comparison", () => {
      const order = { createdByAdminId: 123 };
      const user = { id: "123" };
      expect(isOwnOrder(order, user)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ADMIN EDIT FIELD TESTS (client orders)
  // ─────────────────────────────────────────────────────────────
  
  describe("Admin edit field permissions (client orders)", () => {
    // UPDATED: Per orderAccessPolicy.js:
    // - UNCONFIRMED client orders: ADMIN cannot see/edit PII
    // - CONFIRMED client orders: ADMIN can see PII but cannot edit core fields
    
    test("ADMIN cannot edit customerName of UNCONFIRMED client order", () => {
      const result = canEditOrderField(clientOrder, admin, "customerName");
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN cannot edit phone of UNCONFIRMED client order", () => {
      const result = canEditOrderField(clientOrder, admin, "phone");
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN cannot edit email of UNCONFIRMED client order", () => {
      const result = canEditOrderField(clientOrder, admin, "email");
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN cannot edit rentalStartDate of client orders", () => {
      const result = canEditOrderField(clientOrder, admin, "rentalStartDate");
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN can edit rentalEndDate of UNCONFIRMED client orders (field-level flag)", () => {
      const result = canEditOrderField(clientOrder, admin, "rentalEndDate");
      expect(result.allowed).toBe(true);
    });
    
    // UPDATED: Per orderAccessPolicy.js:
    // - UNCONFIRMED client orders: ADMIN cannot edit ANY fields
    // - CONFIRMED client orders: ADMIN can edit return (placeOut, timeOut) and insurance
    
    test("ADMIN cannot edit timeIn of UNCONFIRMED client order", () => {
      const result = canEditOrderField(clientOrder, admin, "timeIn");
      expect(result.allowed).toBe(false);
    });
    
    test("ADMIN can edit timeOut of UNCONFIRMED client order (field-level flag)", () => {
      const result = canEditOrderField(clientOrder, admin, "timeOut");
      expect(result.allowed).toBe(true);
    });
    
    test("ADMIN can edit timeOut of CONFIRMED client order", () => {
      const confirmedClientOrder = { ...clientOrder, confirmed: true };
      const result = canEditOrderField(confirmedClientOrder, admin, "timeOut");
      expect(result.allowed).toBe(true);
    });
    
    test("ADMIN cannot edit totalPrice of client orders", () => {
      const result = canEditOrderField(clientOrder, admin, "totalPrice");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("edit");
    });

    test("ADMIN can edit non-PII fields on internal orders (my_order=false)", () => {
      expect(canEditOrderField(adminOrder, admin, "rentalStartDate").allowed).toBe(true);
      expect(canEditOrderField(adminOrder, admin, "timeIn").allowed).toBe(true);
      expect(canEditOrderField(adminOrder, admin, "totalPrice").allowed).toBe(true);
    });

    test("ADMIN can edit client PII on internal FUTURE orders (policy: canEditClientPII true)", () => {
      expect(canEditOrderField(adminOrder, admin, "customerName").allowed).toBe(true);
      expect(canEditOrderField(adminOrder, admin, "phone").allowed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ADMIN CONFIRMATION TESTS
  // ─────────────────────────────────────────────────────────────
  
  describe("Admin confirmation permissions", () => {
    test("ADMIN cannot confirm client orders", () => {
      expect(canConfirmOrder(clientOrder, admin).allowed).toBe(false);
    });

    test("ADMIN can confirm/unconfirm internal orders (FUTURE)", () => {
      expect(canConfirmOrder(adminOrder, admin).allowed).toBe(true);
    });

    test("SUPERADMIN can confirm any orders", () => {
      expect(canConfirmOrder(clientOrder, superadmin).allowed).toBe(true);
      expect(canConfirmOrder(adminOrder, superadmin).allowed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TIMEZONE TESTS (isPastOrder / isFutureOrder)
  // ─────────────────────────────────────────────────────────────
  
  describe("Timezone handling (Athens)", () => {
    test("isPastOrder: rentalEndDate yesterday Athens should be past", () => {
      const yesterday = dayjs().tz("Europe/Athens").subtract(1, "day").toDate();
      const order = { rentalEndDate: yesterday };
      expect(isPastOrder(order)).toBe(true);
    });
    
    test("isPastOrder: rentalEndDate at 00:30 Athens today should NOT be past", () => {
      const todayAt0030 = dayjs().tz("Europe/Athens").hour(0).minute(30).second(0).millisecond(0).toDate();
      const order = { rentalEndDate: todayAt0030 };
      expect(isPastOrder(order)).toBe(false);
    });
    
    test("isPastOrder: rentalEndDate tomorrow Athens should NOT be past", () => {
      const tomorrow = dayjs().tz("Europe/Athens").add(1, "day").toDate();
      const order = { rentalEndDate: tomorrow };
      expect(isPastOrder(order)).toBe(false);
    });
    
    test("isFutureOrder: rentalStartDate tomorrow Athens should be future", () => {
      const tomorrow = dayjs().tz("Europe/Athens").add(1, "day").toDate();
      const order = { rentalStartDate: tomorrow };
      expect(isFutureOrder(order)).toBe(true);
    });
    
    test("isFutureOrder: rentalStartDate yesterday Athens should NOT be future", () => {
      const yesterday = dayjs().tz("Europe/Athens").subtract(1, "day").toDate();
      const order = { rentalStartDate: yesterday };
      expect(isFutureOrder(order)).toBe(false);
    });
    
    test("isFutureOrder: rentalStartDate today Athens should NOT be future", () => {
      const today = dayjs().tz("Europe/Athens").toDate();
      const order = { rentalStartDate: today };
      expect(isFutureOrder(order)).toBe(false);
    });
    
    test("isPastOrder: handles null rentalEndDate", () => {
      expect(isPastOrder({})).toBe(false);
      expect(isPastOrder(null)).toBe(false);
    });
    
    test("isFutureOrder: handles null rentalStartDate", () => {
      expect(isFutureOrder({})).toBe(false);
      expect(isFutureOrder(null)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────
  
  describe("Edge cases", () => {
    test("non-admin user cannot perform any actions", () => {
      expect(canEditOrder(clientOrder, nonAdmin).allowed).toBe(false);
      expect(canDeleteOrder(clientOrder, nonAdmin).allowed).toBe(false);
      expect(canEditOrderField(clientOrder, nonAdmin, "customerName").allowed).toBe(false);
      expect(canConfirmOrder(clientOrder, nonAdmin).allowed).toBe(false);
    });
    
    test("null/undefined user returns false", () => {
      expect(canEditOrder(clientOrder, null).allowed).toBe(false);
      expect(canDeleteOrder(clientOrder, undefined).allowed).toBe(false);
    });
  });
});
