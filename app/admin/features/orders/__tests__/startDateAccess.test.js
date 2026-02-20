import { canUpdateStartDate } from "../hooks/startDateAccess";

describe("startDateAccess", () => {
  test("denies start date update for current orders", () => {
    const permissions = {
      viewOnly: false,
      isCurrentOrder: true,
      fieldPermissions: {
        rentalStartDate: true,
      },
    };

    expect(canUpdateStartDate(permissions)).toBe(false);
  });

  test("denies when viewOnly is true", () => {
    const permissions = {
      viewOnly: true,
      fieldPermissions: {
        rentalStartDate: true,
      },
    };

    expect(canUpdateStartDate(permissions)).toBe(false);
  });

  test("denies when field permission is false", () => {
    const permissions = {
      viewOnly: false,
      fieldPermissions: {
        rentalStartDate: false,
      },
    };

    expect(canUpdateStartDate(permissions)).toBe(false);
  });

  test("allows when not current and field permission is true", () => {
    const permissions = {
      viewOnly: false,
      isCurrentOrder: false,
      fieldPermissions: {
        rentalStartDate: true,
      },
    };

    expect(canUpdateStartDate(permissions)).toBe(true);
  });
});
