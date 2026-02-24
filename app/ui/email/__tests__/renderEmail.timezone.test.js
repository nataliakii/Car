import { renderCustomerOrderConfirmationEmail } from "@/app/ui/email/renderEmail";

describe("renderCustomerOrderConfirmationEmail timezone", () => {
  const basePayload = {
    locale: "en",
    orderId: "order-1",
    orderNumber: "1001",
    carNumber: "AB1234",
    regNumber: "AA-1234",
    carModel: "Toyota Yaris",
    customerName: "Test User",
    totalPrice: 123,
  };

  test("formats winter dates/times in Athens timezone", () => {
    const { text } = renderCustomerOrderConfirmationEmail({
      ...basePayload,
      rentalStartDate: "2026-01-14T22:00:00.000Z", // 15 Jan in Athens
      rentalEndDate: "2026-01-16T22:00:00.000Z", // 17 Jan in Athens
      timeIn: "2026-01-15T12:00:00.000Z", // 14:00 Athens
      timeOut: "2026-01-17T08:00:00.000Z", // 10:00 Athens
    });

    expect(text).toContain("15 Jan 2026");
    expect(text).toContain("17 Jan 2026");
    expect(text).toContain("14:00");
    expect(text).toContain("10:00");
    expect(text).toContain("AA-1234");
  });

  test("formats summer dates/times in Athens timezone", () => {
    const { text } = renderCustomerOrderConfirmationEmail({
      ...basePayload,
      rentalStartDate: "2026-07-14T21:00:00.000Z", // 15 Jul in Athens (UTC+3)
      rentalEndDate: "2026-07-16T21:00:00.000Z", // 17 Jul in Athens
      timeIn: "2026-07-15T11:00:00.000Z", // 14:00 Athens
      timeOut: "2026-07-17T07:00:00.000Z", // 10:00 Athens
    });

    expect(text).toContain("15 Jul 2026");
    expect(text).toContain("17 Jul 2026");
    expect(text).toContain("14:00");
    expect(text).toContain("10:00");
  });
});
