import {
  mapOrderToOrdersDataGridRow,
  mapOrderToCarsDataGridRow,
} from "../orderRows";

describe("order rows mapping", () => {
  const order = {
    customerName: "User",
    phone: "+306900000000",
    email: "user@example.com",
    carNumber: "0052",
    carModel: "Toyota Yaris",
    rentalStartDate: "2026-05-01T21:00:00.000Z", // 02 May Athens
    rentalEndDate: "2026-05-07T21:00:00.000Z", // 08 May Athens
    numberOfDays: 6,
    totalPrice: 420,
    confirmed: false,
  };

  test("maps numberOfDays for Orders DataGrid", () => {
    const row = mapOrderToOrdersDataGridRow(order, 0, [
      { carNumber: "0052", regNumber: "AA-1234" },
    ]);

    expect(row.numberOfDays).toBe(6);
    expect(row.regNumber).toBe("AA-1234");
  });

  test("maps numberOfDays for Cars DataGrid", () => {
    const row = mapOrderToCarsDataGridRow(order, 0);

    expect(row.numberOfDays).toBe(6);
  });
});

