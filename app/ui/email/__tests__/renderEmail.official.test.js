import { renderCustomerOfficialConfirmationEmail } from "@/app/ui/email/renderEmail";
import { buildCustomerOfficialConfirmationPdf } from "@/app/ui/email/pdf/customerOfficialConfirmationPdf";

describe("official customer confirmation email", () => {
  test("renders official HTML and builds downloadable PDF bytes", async () => {
    const payload = {
      locale: "ru",
      orderId: "order-1",
      orderNumber: "7788",
      carNumber: "AB1234",
      carModel: "Toyota Yaris",
      rentalStartDate: "2026-03-01T12:00:00.000Z",
      rentalEndDate: "2026-03-04T10:00:00.000Z",
      timeIn: "2026-03-01T12:00:00.000Z",
      timeOut: "2026-03-04T10:00:00.000Z",
      placeIn: "Nea Kallikratia",
      placeOut: "Airport",
      numberOfDays: 3,
      ChildSeats: 1,
      insurance: "CDW",
      totalPrice: 150,
      customerName: "Иван Петров",
      phone: "+306900000000",
      email: "ivan@example.com",
      secondDriver: true,
    };

    const result = renderCustomerOfficialConfirmationEmail(payload);

    expect(result.title).toContain("подтверждение");
    expect(result.html).toContain("7788");
    expect(result.pdfFileName).toContain("7788");
    expect(result.pdfData).toBeTruthy();

    const pdfBytes = await buildCustomerOfficialConfirmationPdf(result.pdfData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1200);
  });
});
