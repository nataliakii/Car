import { addOrderNew } from "@utils/action";

describe("addOrderNew", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test("returns messageCode and dates for 202 pending response", async () => {
    global.fetch.mockResolvedValue({
      status: 202,
      json: async () => ({
        message: "Pending confirmation",
        data: { _id: "order-1" },
        messageCode: "bookMesssages.bookPendingDates",
        dates: ["Apr 14", "Apr 15"],
      }),
    });

    const result = await addOrderNew({ carNumber: "0052" });

    expect(result).toEqual({
      status: "pending",
      message: "Pending confirmation",
      data: { _id: "order-1" },
      messageCode: "bookMesssages.bookPendingDates",
      dates: ["Apr 14", "Apr 15"],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/order/add"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });
});

