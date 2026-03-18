import { notifyOrderAction } from "../orderNotificationDispatcher";
import { sendEmailDirect } from "@/lib/email/sendDirect";
import { sendTelegramDirect } from "@/lib/telegram/sendDirect";

jest.mock("@/lib/email/sendDirect", () => ({ sendEmailDirect: jest.fn() }));
jest.mock("@/lib/telegram/sendDirect", () => ({ sendTelegramDirect: jest.fn() }));

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
    sendEmailDirect.mockResolvedValue({ messageId: "test-id" });
    sendTelegramDirect.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env.EMAIL_TESTING = originalEmailTesting;
  });

  test("CREATE client order sends all channels and formats dates in Athens timezone", async () => {
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
    expect(sendEmailDirect).toHaveBeenCalledTimes(3);
    // SUPERADMIN telegram only once for this scenario
    expect(sendTelegramDirect).toHaveBeenCalledTimes(1);

    const firstEmailCall = sendEmailDirect.mock.calls[0][0];
    expect(firstEmailCall.message).toContain("📅 From: 15-01-26");
    expect(firstEmailCall.message).toContain("📅 To: 17-01-26");
    expect(firstEmailCall.message).toContain("AA-1234");
    expect(sendTelegramDirect.mock.calls[0][0]).toContain("AA-1234");
  });

  test("throws aggregated error when at least one channel fails, but still attempts all channels", async () => {
    sendEmailDirect
      .mockResolvedValueOnce({ messageId: "ok" })
      .mockRejectedValueOnce(new Error("SMTP down"))
      .mockResolvedValueOnce({ messageId: "ok" });

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

    expect(sendEmailDirect).toHaveBeenCalledTimes(3);
    expect(sendTelegramDirect).toHaveBeenCalledTimes(1);
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

    await expect(
      notifyOrderAction({
        order: confirmedClientOrderAfter,
        previousOrder: confirmedClientOrderBefore,
        user: baseUser,
        action: "UPDATE_DATES",
        source: "BACKEND",
      })
    ).resolves.toBeUndefined();

    expect(sendTelegramDirect).toHaveBeenCalledTimes(1);
    const telegramText = sendTelegramDirect.mock.calls[0][0];
    expect(telegramText).toContain("CRITICAL: CRITICAL_EDIT on confirmed client order");
    expect(telegramText).toContain("Действие: UPDATE_DATES");
    expect(telegramText).toContain("Старая цена: €100.00");
    expect(telegramText).toContain("Новая цена: €120.00");
  });
});
