/**
 * Regression test: car lookup must prefer carId (_id) over carNumber/regNumber.
 *
 * _id is always unique in MongoDB (default index). carNumber is unique,
 * regNumber is NOT. Order: carId → carNumber → regNumber.
 */
jest.mock("@models/car", () => ({
  Car: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("@lib/database", () => ({ connectToDB: jest.fn().mockResolvedValue(undefined) }));

const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

const { Car } = require("@models/car");
const { POST } = require("../route");

describe("calcTotalPrice car lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("uses carId first when valid ObjectId - _id is always unique in MongoDB", async () => {
    const carById = {
      _id: "507f1f77bcf86cd799439011",
      carNumber: "001",
      regNumber: "NKT 123",
      calculateTotalRentalPricePerDay: jest.fn().mockResolvedValue({ total: 100, days: 2 }),
    };

    Car.findById.mockResolvedValue(carById);
    Car.findOne.mockResolvedValue(null);

    const request = new Request("http://localhost/api/order/calcTotalPrice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: "507f1f77bcf86cd799439011",
        carNumber: "001",
        regNumber: "NKT 123",
        rentalStartDate: "2026-06-01",
        rentalEndDate: "2026-06-03",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalPrice).toBe(100);
    expect(Car.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    expect(Car.findOne).not.toHaveBeenCalled();
  });

  test("falls back to carNumber when carId not provided - avoids wrong car when regNumber duplicated", async () => {
    const carByCarNumber = {
      _id: "car-001",
      carNumber: "001",
      regNumber: "NKT 123",
      calculateTotalRentalPricePerDay: jest.fn().mockResolvedValue({ total: 100, days: 2 }),
    };
    const carByRegNumber = {
      _id: "car-002",
      carNumber: "002",
      regNumber: "NKT 123",
      calculateTotalRentalPricePerDay: jest.fn().mockResolvedValue({ total: 150, days: 2 }),
    };

    Car.findById.mockResolvedValue(null);
    Car.findOne.mockImplementation((query) => {
      if (query.carNumber === "001") return Promise.resolve(carByCarNumber);
      if (query.regNumber === "NKT 123") return Promise.resolve(carByRegNumber);
      return Promise.resolve(null);
    });

    const request = new Request("http://localhost/api/order/calcTotalPrice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carNumber: "001",
        regNumber: "NKT 123",
        rentalStartDate: "2026-06-01",
        rentalEndDate: "2026-06-03",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalPrice).toBe(100);
    expect(Car.findOne).toHaveBeenNthCalledWith(1, { carNumber: "001" });
    expect(Car.findOne).not.toHaveBeenCalledWith({ regNumber: "NKT 123" });
  });

  test("falls back to regNumber when carId and carNumber are empty", async () => {
    const carByReg = {
      _id: "car-abc",
      carNumber: "003",
      regNumber: "ABC-456",
      calculateTotalRentalPricePerDay: jest.fn().mockResolvedValue({ total: 80, days: 1 }),
    };

    Car.findById.mockResolvedValue(null);
    Car.findOne.mockImplementation((query) => {
      if (query.regNumber === "ABC-456") return Promise.resolve(carByReg);
      return Promise.resolve(null);
    });

    const request = new Request("http://localhost/api/order/calcTotalPrice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carNumber: "",
        regNumber: "ABC-456",
        rentalStartDate: "2026-06-01",
        rentalEndDate: "2026-06-02",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalPrice).toBe(80);
    expect(Car.findOne).toHaveBeenCalledWith({ regNumber: "ABC-456" });
  });
});
