import { buildOrderDateRange } from "../calendarDays";

describe("buildOrderDateRange timezone", () => {
  test("maps summer UTC midnight representation to Athens day range", () => {
    const order = {
      rentalStartDate: "2026-05-05T21:00:00.000Z",
      rentalEndDate: "2026-05-08T21:00:00.000Z",
    };

    expect(buildOrderDateRange(order)).toEqual([
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
    ]);
  });

  test("maps winter UTC midnight representation to Athens day range", () => {
    const order = {
      rentalStartDate: "2026-01-14T22:00:00.000Z",
      rentalEndDate: "2026-01-16T22:00:00.000Z",
    };

    expect(buildOrderDateRange(order)).toEqual([
      "2026-01-15",
      "2026-01-16",
      "2026-01-17",
    ]);
  });
});
