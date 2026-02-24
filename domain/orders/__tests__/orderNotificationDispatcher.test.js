import { notifyOrderAction } from "../orderNotificationDispatcher";
import { sendTelegramMessage } from "@utils/action";

jest.mock("@utils/action", () => ({
  getApiUrl: jest.fn((path) => `http://localhost:3000${path}`),
  sendTelegramMessage: jest.fn(),
}));

describe("orderNotificationDispatcher", () => {
  const originalEmailTesting = process.env.EMAIL_TESTING;

  const baseOrder = {
    _id: "order-1",
    orderNumber: "1001",
    carNumber: "0052",
    regNumber: "AA-1234",
    carModel: "Toyota Yaris",
    rentalStartDate: "2026-01-14T22:00:00.000Z", // 15-01-26 Athens
    rentalEndDate: "2026-01-16T22:00:00.000Z", // 17-01-26 Athens
    timeIn: "2026-01-15T12:00:00.000Z",
    timeOut: "2026-01-17T08:00:00.000Z",
    totalPrice: 123,
    customerName: "Test User",
    phone: "+306900000000",
    email: "customer@example.com",
    my_order: true,
    confirmed: false,
    locale: "en",
  };

  const baseUser = {
    id: "admin-1",
    isAdmin: true,
    role: 1,
    email: "admin@example.com",
    name: "Admin",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_TESTING = "false";
    global.fetch = jest.fn();
    sendTelegramMessage.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env.EMAIL_TESTING = originalEmailTesting;
  });

  test("CREATE client order sends all channels and formats dates in Athens timezone", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await expect(
      notifyOrderAction({
        order: baseOrder,
        user: baseUser,
        action: "CREATE",
        source: "BACKEND",
        companyEmail: "company@example.com",
        locale: "en",
      })
    ).resolves.toBeUndefined();

    // COMPANY_EMAIL + SUPERADMIN + CUSTOMER -> 3 email sends
    expect(global.fetch).toHaveBeenCalledTimes(3);
    // SUPERADMIN telegram only once for this scenario
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);

    const firstPayload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(firstPayload.message).toContain("📅 From: 15-01-26");
    expect(firstPayload.message).toContain("📅 To: 17-01-26");
    expect(firstPayload.message).toContain("AA-1234");
    expect(sendTelegramMessage.mock.calls[0][0]).toContain("AA-1234");
  });

  test("throws aggregated error when at least one channel fails, but still attempts all channels", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "SMTP down" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok" }),
      });

    await expect(
      notifyOrderAction({
        order: baseOrder,
        user: baseUser,
        action: "CREATE",
        source: "BACKEND",
        companyEmail: "company@example.com",
        locale: "en",
      })
    ).rejects.toThrow(/Notification dispatch failed/);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  test("UPDATE_DATES on confirmed client order includes old/new prices in critical message", async () => {
    const confirmedClientOrderBefore = {
      ...baseOrder,
      confirmed: true,
      rentalStartDate: "2099-01-14T22:00:00.000Z",
      rentalEndDate: "2099-01-16T22:00:00.000Z",
      totalPrice: 100,
      OverridePrice: null,
    };
    const confirmedClientOrderAfter = {
      ...baseOrder,
      confirmed: true,
      rentalStartDate: "2099-01-15T22:00:00.000Z",
      rentalEndDate: "2099-01-17T22:00:00.000Z",
      totalPrice: 120,
      OverridePrice: null,
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await expect(
      notifyOrderAction({
        order: confirmedClientOrderAfter,
        previousOrder: confirmedClientOrderBefore,
        user: baseUser,
        action: "UPDATE_DATES",
        source: "BACKEND",
      })
    ).resolves.toBeUndefined();

    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    const telegramText = sendTelegramMessage.mock.calls[0][0];
    expect(telegramText).toContain("CRITICAL: CRITICAL_EDIT on confirmed client order");
    expect(telegramText).toContain("Действие: UPDATE_DATES");
    expect(telegramText).toContain("Старая цена: €100.00");
    expect(telegramText).toContain("Новая цена: €120.00");
  });
});
