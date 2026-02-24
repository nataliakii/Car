import { renderCustomerOrderConfirmationEmail } from "@/app/ui/email/renderEmail";
import { getOrdersForDate } from "@/app/admin/features/calendar/helpers/orders/orderSelectors";
import {
  mapOrderToOrdersDataGridRow,
  mapOrderToCarsDataGridRow,
} from "@/app/admin/features/shared/orderRows";
import { fromServerUTC } from "@/domain/time/athensTime";
import { getBusinessDaySpanFromStoredDates } from "../numberOfDays";
import { notifyOrderAction } from "../orderNotificationDispatcher";
import { sendTelegramMessage } from "@utils/action";

jest.mock("@utils/action", () => ({
  getApiUrl: jest.fn((path) => `http://localhost:3000${path}`),
  sendTelegramMessage: jest.fn(),
}));

describe("order date consistency across channels", () => {
  const originalEmailTesting = process.env.EMAIL_TESTING;

  const order = {
    _id: "order-1",
    orderNumber: "1001",
    carNumber: "0052",
    regNumber: "AA-1234",
    carModel: "Toyota Yaris",
    rentalStartDate: "2026-01-14T22:00:00.000Z", // 15 Jan Athens
    rentalEndDate: "2026-01-16T22:00:00.000Z", // 17 Jan Athens
    timeIn: "2026-01-15T12:00:00.000Z",
    timeOut: "2026-01-17T08:00:00.000Z",
    totalPrice: 123,
    numberOfDays: 2,
    customerName: "Test User",
    phone: "+306900000000",
    email: "customer@example.com",
    my_order: true,
    confirmed: false,
    locale: "en",
  };

  const mayOrder = {
    ...order,
    rentalStartDate: "2026-05-05T21:00:00.000Z", // 06 May 00:00 Athens
    rentalEndDate: "2026-05-08T21:00:00.000Z", // 09 May 00:00 Athens
    timeIn: "2026-05-06T11:00:00.000Z", // 14:00 Athens
    timeOut: "2026-05-09T09:00:00.000Z", // 12:00 Athens
    numberOfDays: 3,
  };

  const actor = {
    id: "admin-1",
    isAdmin: true,
    role: 1,
    email: "admin@example.com",
    name: "Admin",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_TESTING = "false";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    sendTelegramMessage.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env.EMAIL_TESTING = originalEmailTesting;
  });

  test("keeps same Athens calendar day in email, telegram, and calendar selectors", async () => {
    expect(
      getBusinessDaySpanFromStoredDates(order.rentalStartDate, order.rentalEndDate)
    ).toBe(order.numberOfDays);

    const startAthens = fromServerUTC(order.rentalStartDate);
    const endAthens = fromServerUTC(order.rentalEndDate);

    const expectedStartTelegram = startAthens.format("DD-MM-YY");
    const expectedEndTelegram = endAthens.format("DD-MM-YY");
    const expectedStartEmail = startAthens.format("D MMM YYYY");
    const expectedEndEmail = endAthens.format("D MMM YYYY");
    const expectedStartCalendar = startAthens.format("YYYY-MM-DD");
    const expectedEndCalendar = endAthens.format("YYYY-MM-DD");
    const previousDay = startAthens.subtract(1, "day").format("YYYY-MM-DD");

    const { text } = renderCustomerOrderConfirmationEmail({
      ...order,
      locale: "en",
    });
    expect(text).toContain(expectedStartEmail);
    expect(text).toContain(expectedEndEmail);
    expect(text).toContain(`Number of days: ${order.numberOfDays}`);

    await notifyOrderAction({
      order,
      user: actor,
      action: "CREATE",
      source: "BACKEND",
      companyEmail: "company@example.com",
      locale: "en",
    });

    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    const telegramText = sendTelegramMessage.mock.calls[0][0];
    expect(telegramText).toContain(`📅 From: ${expectedStartTelegram}`);
    expect(telegramText).toContain(`📅 To: ${expectedEndTelegram}`);
    expect(telegramText).toContain(`🗓 Days: ${order.numberOfDays}`);
    expect(telegramText).toContain("AA-1234");

    const firstEmailPayload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(firstEmailPayload.message).toContain(`🗓 Days: ${order.numberOfDays}`);

    const ordersGridRow = mapOrderToOrdersDataGridRow(order, 0, [
      { carNumber: order.carNumber, regNumber: "AA-1234" },
    ]);
    expect(ordersGridRow.numberOfDays).toBe(order.numberOfDays);

    const carsGridRow = mapOrderToCarsDataGridRow(order, 0);
    expect(carsGridRow.numberOfDays).toBe(order.numberOfDays);

    expect(getOrdersForDate([order], expectedStartCalendar)).toHaveLength(1);
    expect(getOrdersForDate([order], expectedEndCalendar)).toHaveLength(1);
    expect(getOrdersForDate([order], previousDay)).toHaveLength(0);
  });

  test("summer UTC midnight representation still maps to expected Athens days (06-09 May)", async () => {
    expect(
      getBusinessDaySpanFromStoredDates(mayOrder.rentalStartDate, mayOrder.rentalEndDate)
    ).toBe(mayOrder.numberOfDays);

    const startAthens = fromServerUTC(mayOrder.rentalStartDate);
    const endAthens = fromServerUTC(mayOrder.rentalEndDate);

    expect(startAthens.format("YYYY-MM-DD HH:mm")).toBe("2026-05-06 00:00");
    expect(endAthens.format("YYYY-MM-DD HH:mm")).toBe("2026-05-09 00:00");

    const expectedStartTelegram = startAthens.format("DD-MM-YY");
    const expectedEndTelegram = endAthens.format("DD-MM-YY");
    const expectedStartEmail = startAthens.format("D MMM YYYY");
    const expectedEndEmail = endAthens.format("D MMM YYYY");
    const expectedStartCalendar = startAthens.format("YYYY-MM-DD");
    const expectedEndCalendar = endAthens.format("YYYY-MM-DD");

    const { text } = renderCustomerOrderConfirmationEmail({
      ...mayOrder,
      locale: "en",
    });
    expect(text).toContain(expectedStartEmail);
    expect(text).toContain(expectedEndEmail);
    expect(text).toContain(`Number of days: ${mayOrder.numberOfDays}`);
    expect(text).toContain("14:00");
    expect(text).toContain("12:00");

    await notifyOrderAction({
      order: mayOrder,
      user: actor,
      action: "CREATE",
      source: "BACKEND",
      companyEmail: "company@example.com",
      locale: "en",
    });

    const telegramText = sendTelegramMessage.mock.calls[0][0];
    expect(telegramText).toContain(`📅 From: ${expectedStartTelegram}`);
    expect(telegramText).toContain(`📅 To: ${expectedEndTelegram}`);
    expect(telegramText).toContain(`🗓 Days: ${mayOrder.numberOfDays}`);
    expect(telegramText).toContain("AA-1234");

    const emailPayload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(emailPayload.message).toContain(`🗓 Days: ${mayOrder.numberOfDays}`);

    const ordersGridRow = mapOrderToOrdersDataGridRow(mayOrder, 0, [
      { carNumber: mayOrder.carNumber, regNumber: "AA-1234" },
    ]);
    expect(ordersGridRow.numberOfDays).toBe(mayOrder.numberOfDays);

    const carsGridRow = mapOrderToCarsDataGridRow(mayOrder, 0);
    expect(carsGridRow.numberOfDays).toBe(mayOrder.numberOfDays);

    expect(getOrdersForDate([mayOrder], expectedStartCalendar)).toHaveLength(1);
    expect(getOrdersForDate([mayOrder], expectedEndCalendar)).toHaveLength(1);
  });
});
