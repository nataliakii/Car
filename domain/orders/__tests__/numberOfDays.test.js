import {
  getBusinessDaySpanFromStoredDates,
  getBusinessRentalDaysByMinutes,
  getOrderNumberOfDays,
  getOrderNumberOfDaysOrZero,
} from "../numberOfDays";

describe("numberOfDays helpers", () => {
  test("calculates Athens day span from stored UTC dates", () => {
    const start = "2026-05-01T21:00:00.000Z"; // 02 May Athens
    const end = "2026-05-07T21:00:00.000Z"; // 08 May Athens

    expect(getBusinessDaySpanFromStoredDates(start, end)).toBe(6);
  });

  test("rounds rental days by 24-hour blocks", () => {
    const start = "2026-03-01T10:00:00.000Z";
    const plus26h = "2026-03-02T12:00:00.000Z";
    const plus49h = "2026-03-03T11:00:00.000Z";

    expect(getBusinessRentalDaysByMinutes(start, plus26h)).toBe(2);
    expect(getBusinessRentalDaysByMinutes(start, plus49h)).toBe(3);
  });

  test("returns raw numberOfDays", () => {
    expect(getOrderNumberOfDays({ numberOfDays: 3 })).toBe(3);
    expect(getOrderNumberOfDays({})).toBeUndefined();
  });

  test("returns zero fallback for empty order", () => {
    expect(getOrderNumberOfDaysOrZero({ numberOfDays: 0 })).toBe(0);
    expect(getOrderNumberOfDaysOrZero({})).toBe(0);
  });
});
