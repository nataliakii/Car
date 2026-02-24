/**
 * Unit tests for orderNotificationPolicy
 * 
 * ════════════════════════════════════════════════════════════════
 * 🔑 КЛЮЧЕВОЙ ПРИНЦИП:
 * NotificationPolicy НЕ ДУМАЕТ — реагирует на OrderAccess.
 * ════════════════════════════════════════════════════════════════
 */

import { 
  getOrderNotifications,
  isCriticalAction,
  getActionIntent,
  getActionFromChangedFields,
  ACTION_INTENT,
  isActionAllowedByAccess,
  getPriorityByIntent,
  PRIORITY_BY_INTENT,
} from "../orderNotificationPolicy";

// ════════════════════════════════════════════════════════════════
// HELPER: Create mock access object
// ════════════════════════════════════════════════════════════════

const createAccess = (overrides = {}) => ({
  canView: true,
  canEdit: true,
  canDelete: true,
  canEditPickupDate: true,
  canEditReturnDate: true,
  canEditReturn: true,
  canEditInsurance: true,
  canEditPricing: true,
  canConfirm: false,
  canSeeClientPII: true,
  notifySuperadminOnEdit: false,
  isViewOnly: false,
  ...overrides,
});

const createOrder = (overrides = {}) => ({
  my_order: false,
  confirmed: false,
  ...overrides,
});

// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

describe("orderNotificationPolicy", () => {
  
  describe("ACTION_INTENT mapping", () => {
    it("maps all actions correctly", () => {
      expect(ACTION_INTENT.CREATE).toBe("ORDER_CREATED");
      expect(ACTION_INTENT.CONFIRM).toBe("ORDER_CONFIRMED");
      expect(ACTION_INTENT.UPDATE_DATES).toBe("CRITICAL_EDIT");
      expect(ACTION_INTENT.UPDATE_SECOND_DRIVER).toBe("CRITICAL_EDIT");
      expect(ACTION_INTENT.UPDATE_RETURN).toBe("SAFE_EDIT");
      expect(ACTION_INTENT.DELETE).toBe("ORDER_DELETED");
    });
  });

  describe("getActionFromChangedFields", () => {
    it("maps secondDriver change to UPDATE_SECOND_DRIVER", () => {
      expect(getActionFromChangedFields(["secondDriver"])).toBe("UPDATE_SECOND_DRIVER");
    });
  });

  describe("isCriticalAction", () => {
    it("identifies critical actions", () => {
      expect(isCriticalAction("UPDATE_DATES")).toBe(true);
      expect(isCriticalAction("UPDATE_SECOND_DRIVER")).toBe(true);
      expect(isCriticalAction("UPDATE_PRICING")).toBe(true);
      expect(isCriticalAction("DELETE")).toBe(true);
    });

    it("identifies safe actions", () => {
      expect(isCriticalAction("UPDATE_RETURN")).toBe(false);
      expect(isCriticalAction("UPDATE_INSURANCE")).toBe(false);
      expect(isCriticalAction("CONFIRM")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // access.notifySuperadminOnEdit = false (SUPERADMIN or internal)
  // ════════════════════════════════════════════════════════════════
  
  describe("notifySuperadminOnEdit = false", () => {
    it("no SUPERADMIN notification for any action", () => {
      const access = createAccess({ notifySuperadminOnEdit: false });
      const order = createOrder({ my_order: false });

      const actions = ["UPDATE_DATES", "UPDATE_RETURN", "DELETE"];
      
      for (const action of actions) {
        const notifications = getOrderNotifications({ action, access, order });
        const superadminNotifs = notifications.filter(n => n.target === "SUPERADMIN");
        expect(superadminNotifs).toHaveLength(0);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  // access.notifySuperadminOnEdit = true (ADMIN + confirmed client)
  // ════════════════════════════════════════════════════════════════
  
  describe("notifySuperadminOnEdit = true", () => {
    const access = createAccess({ 
      notifySuperadminOnEdit: true,
      canSeeClientPII: true,
    });
    const order = createOrder({ my_order: true, confirmed: true });

    it("critical actions → SUPERADMIN telegram + email", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_DATES", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "SUPERADMIN")).toBe(true);
      const superadminNotif = notifications.find(n => n.target === "SUPERADMIN");
      expect(superadminNotif.channels).toContain("TELEGRAM");
      expect(superadminNotif.channels).toContain("EMAIL");
      expect(superadminNotif.priority).toBe("CRITICAL");
    });

    it("safe actions → SUPERADMIN telegram only", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_RETURN", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "SUPERADMIN")).toBe(true);
      const superadminNotif = notifications.find(n => n.target === "SUPERADMIN");
      expect(superadminNotif.channels).toEqual(["TELEGRAM"]);
      expect(superadminNotif.priority).toBe("INFO");
    });

    it("includePII matches access.canSeeClientPII for critical", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_PRICING", 
        access, 
        order,
      });

      const superadminNotif = notifications.find(n => n.target === "SUPERADMIN");
      expect(superadminNotif.includePII).toBe(true);
    });

    it("includePII is false for safe actions", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_INSURANCE", 
        access, 
        order,
      });

      const superadminNotif = notifications.find(n => n.target === "SUPERADMIN");
      expect(superadminNotif.includePII).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CUSTOMER NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  
  describe("Customer notification", () => {
    it("CONFIRM client order → CUSTOMER email", () => {
      const access = createAccess();
      const order = createOrder({ my_order: true, confirmed: false });

      const notifications = getOrderNotifications({ 
        action: "CONFIRM", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "CUSTOMER")).toBe(true);
      const customerNotif = notifications.find(n => n.target === "CUSTOMER");
      expect(customerNotif.channels).toEqual(["EMAIL"]);
      expect(customerNotif.includePII).toBe(true);
    });

    it("CONFIRM internal order → no CUSTOMER notification", () => {
      const access = createAccess();
      const order = createOrder({ my_order: false });

      const notifications = getOrderNotifications({ 
        action: "CONFIRM", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "CUSTOMER")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // COMPANY NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  
  describe("Company notification", () => {
    it("CREATE unconfirmed client order → COMPANY_EMAIL", () => {
      const access = createAccess();
      const order = createOrder({ my_order: true, confirmed: false });

      const notifications = getOrderNotifications({ 
        action: "CREATE", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "COMPANY_EMAIL")).toBe(true);
      const companyNotif = notifications.find(n => n.target === "COMPANY_EMAIL");
      expect(companyNotif.includePII).toBe(false);
    });

    it("CREATE internal order → no COMPANY_EMAIL notification", () => {
      const access = createAccess();
      const order = createOrder({ my_order: false });

      const notifications = getOrderNotifications({ 
        action: "CREATE", 
        access, 
        order,
      });

      expect(notifications.some(n => n.target === "COMPANY_EMAIL")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DEVELOPERS NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  
  describe("Developers notification", () => {
    it("DELETE any order → DEVELOPERS telegram", () => {
      const access = createAccess();
      
      for (const my_order of [true, false]) {
        const order = createOrder({ my_order });
        const notifications = getOrderNotifications({ 
          action: "DELETE", 
          access, 
          order,
        });

        expect(notifications.some(n => n.target === "DEVELOPERS")).toBe(true);
        const devNotif = notifications.find(n => n.target === "DEVELOPERS");
        expect(devNotif.channels).toEqual(["TELEGRAM"]);
        expect(devNotif.priority).toBe("DEBUG");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ════════════════════════════════════════════════════════════════
  
  describe("Edge cases", () => {
    it("returns empty array if access is null", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_DATES", 
        access: null, 
        order: createOrder(),
      });

      expect(notifications).toEqual([]);
    });

    it("returns empty array if order is null", () => {
      const notifications = getOrderNotifications({ 
        action: "UPDATE_DATES", 
        access: createAccess(), 
        order: null,
      });

      expect(notifications).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // isActionAllowedByAccess (SAFETY CHECK)
  // ════════════════════════════════════════════════════════════════
  
  describe("isActionAllowedByAccess", () => {
    it("returns false if access is null", () => {
      expect(isActionAllowedByAccess("UPDATE_DATES", null)).toBe(false);
    });

    it("UPDATE_DATES requires canEditPickupDate or canEditReturnDate", () => {
      expect(isActionAllowedByAccess("UPDATE_DATES", createAccess({ canEditPickupDate: true, canEditReturnDate: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_DATES", createAccess({ canEditPickupDate: true, canEditReturnDate: false }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_DATES", createAccess({ canEditPickupDate: false, canEditReturnDate: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_DATES", createAccess({ canEditPickupDate: false, canEditReturnDate: false }))).toBe(false);
    });

    it("UPDATE_SECOND_DRIVER requires canEdit", () => {
      expect(isActionAllowedByAccess("UPDATE_SECOND_DRIVER", createAccess({ canEdit: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_SECOND_DRIVER", createAccess({ canEdit: false }))).toBe(false);
    });

    it("UPDATE_RETURN requires canEditReturn", () => {
      expect(isActionAllowedByAccess("UPDATE_RETURN", createAccess({ canEditReturn: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_RETURN", createAccess({ canEditReturn: false }))).toBe(false);
    });

    it("UPDATE_INSURANCE requires canEditInsurance", () => {
      expect(isActionAllowedByAccess("UPDATE_INSURANCE", createAccess({ canEditInsurance: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_INSURANCE", createAccess({ canEditInsurance: false }))).toBe(false);
    });

    it("UPDATE_PRICING requires canEditPricing", () => {
      expect(isActionAllowedByAccess("UPDATE_PRICING", createAccess({ canEditPricing: true }))).toBe(true);
      expect(isActionAllowedByAccess("UPDATE_PRICING", createAccess({ canEditPricing: false }))).toBe(false);
    });

    it("CONFIRM/UNCONFIRM requires canConfirm", () => {
      expect(isActionAllowedByAccess("CONFIRM", createAccess({ canConfirm: true }))).toBe(true);
      expect(isActionAllowedByAccess("CONFIRM", createAccess({ canConfirm: false }))).toBe(false);
      expect(isActionAllowedByAccess("UNCONFIRM", createAccess({ canConfirm: true }))).toBe(true);
      expect(isActionAllowedByAccess("UNCONFIRM", createAccess({ canConfirm: false }))).toBe(false);
    });

    it("DELETE requires canDelete", () => {
      expect(isActionAllowedByAccess("DELETE", createAccess({ canDelete: true }))).toBe(true);
      expect(isActionAllowedByAccess("DELETE", createAccess({ canDelete: false }))).toBe(false);
    });

    it("CREATE is always allowed", () => {
      expect(isActionAllowedByAccess("CREATE", createAccess())).toBe(true);
      expect(isActionAllowedByAccess("CREATE", createAccess({ canEdit: false }))).toBe(true);
    });

    it("unknown action returns false", () => {
      expect(isActionAllowedByAccess("UNKNOWN_ACTION", createAccess())).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PRIORITY_BY_INTENT
  // ════════════════════════════════════════════════════════════════
  
  describe("getPriorityByIntent", () => {
    it("CRITICAL_EDIT → CRITICAL", () => {
      expect(getPriorityByIntent("CRITICAL_EDIT")).toBe("CRITICAL");
    });

    it("ORDER_DELETED → CRITICAL", () => {
      expect(getPriorityByIntent("ORDER_DELETED")).toBe("CRITICAL");
    });

    it("SAFE_EDIT → INFO", () => {
      expect(getPriorityByIntent("SAFE_EDIT")).toBe("INFO");
    });

    it("ORDER_CONFIRMED → INFO", () => {
      expect(getPriorityByIntent("ORDER_CONFIRMED")).toBe("INFO");
    });

    it("unknown intent → DEBUG", () => {
      expect(getPriorityByIntent("UNKNOWN")).toBe("DEBUG");
    });
  });
});
