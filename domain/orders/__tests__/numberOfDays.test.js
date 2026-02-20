import {
  getBusinessDaySpanFromStoredDates,
  getOrderNumberOfDays,
  getOrderNumberOfDaysOrZero,
} from "../numberOfDays";

describe("numberOfDays helpers", () => {
  test("calculates Athens day span from stored UTC dates", () => {
    const start = "2026-05-01T21:00:00.000Z"; // 02 May Athens
    const end = "2026-05-07T21:00:00.000Z"; // 08 May Athens

    expect(getBusinessDaySpanFromStoredDates(start, end)).toBe(6);
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

