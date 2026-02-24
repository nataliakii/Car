import { renderCustomerOfficialConfirmationEmail } from "@/app/ui/email/renderEmail";
import { buildCustomerOfficialConfirmationPdf } from "@/app/ui/email/pdf/customerOfficialConfirmationPdf";

describe("official customer confirmation email", () => {
  test("renders official HTML and builds downloadable PDF bytes", async () => {
    const payload = {
      locale: "ru",
      orderId: "order-1",
      orderNumber: "7788",
      carNumber: "AB1234",
      regNumber: "AA-1234",
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
      franchiseOrder: 300,
      flightNumber: "FR2552",
      totalPrice: 150,
      customerName: "Иван Петров",
      phone: "+306900000000",
      email: "ivan@example.com",
      secondDriver: true,
      meetingContactPhone: "+30-697-003-47-07",
      meetingContactChannel: "WhatsApp",
      meetingContactName: "Orest",
    };

    const result = renderCustomerOfficialConfirmationEmail(payload);

    expect(result.title).toContain("подтверждение");
    expect(result.html).toContain("7788");
    expect(result.html).toContain("AA-1234");
    expect(result.text).toContain("FR2552");
    expect(result.text).toContain("CDW (Франшиза 300 EUR)");
    expect(result.pdfData.pickupLocationValue).toContain("FR2552");
    expect(result.pdfData.customerContactValue).toContain("ivan@example.com");
    expect(result.pdfData.meetingContactValue).toContain("Orest");
    expect(result.pdfFileName).toContain("7788");
    expect(result.pdfData).toBeTruthy();

    const pdfBytes = await buildCustomerOfficialConfirmationPdf(result.pdfData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1200);
  });
});
