import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SuccessMessage from "../SuccessMessage";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe("SuccessMessage numberOfDays", () => {
  test("shows numberOfDays from submitted order in user UI", () => {
    const submittedOrder = {
      carModel: "Toyota Yaris",
      numberOfDays: 6,
      totalPrice: 420,
      timeIn: "2026-05-02T09:00:00.000Z",
      timeOut: "2026-05-08T09:00:00.000Z",
    };

    const html = renderToStaticMarkup(
      <SuccessMessage
        submittedOrder={submittedOrder}
        presetDates={{ startDate: null, endDate: null }}
        onClose={() => {}}
        emailSent={false}
      />
    );

    expect(html).toContain("bookMesssages.bookDays");
    expect(html).toContain("bookMesssages.bookDays 6");
  });
});
