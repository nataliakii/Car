import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { analyzeOrderTimeConflicts } from "../analyzeOrderTimeConflicts";

dayjs.extend(utc);
dayjs.extend(timezone);

const ATHENS_TZ = "Europe/Athens";

function createMockOrder({
  id,
  customerName,
  email,
  confirmed,
  startDate,
  startTime,
  endDate,
  endTime,
  visibility,
}) {
  const timeIn = dayjs
    .tz(`${startDate} ${startTime}`, "YYYY-MM-DD HH:mm", ATHENS_TZ)
    .utc()
    .toDate();
  const timeOut = dayjs
    .tz(`${endDate} ${endTime}`, "YYYY-MM-DD HH:mm", ATHENS_TZ)
    .utc()
    .toDate();

  return {
    _id: id,
    car: "car-1",
    customerName,
    email,
    confirmed,
    timeIn,
    timeOut,
    rentalStartDate: timeIn,
    rentalEndDate: timeOut,
    _visibility: visibility,
  };
}

describe("analyzeOrderTimeConflicts", () => {
  it("показывает отрицательный буфер и email, если имени нет, в warning-сообщении", () => {
    const editingOrder = createMockOrder({
      id: "editing",
      customerName: "Редактируемый",
      confirmed: true,
      startDate: "2026-03-01",
      startTime: "14:00",
      endDate: "2026-03-04",
      endTime: "12:00",
    });

    const conflictingPending = createMockOrder({
      id: "pending-1",
      customerName: undefined,
      email: "pending@example.com",
      confirmed: false,
      startDate: "2026-03-04",
      startTime: "01:58",
      endDate: "2026-03-07",
      endTime: "19:00",
    });

    const result = analyzeOrderTimeConflicts({
      editingOrder,
      orders: [editingOrder, conflictingPending],
      date: "2026-03-04",
      editingPickupTime: "14:00",
      editingReturnTime: "12:00",
      bufferHours: 2,
    });

    expect(result.summary).not.toBeNull();
    expect(result.summary.level).toBe("warning");
    expect(result.summary.message).toContain("«pending@example.com»");
    expect(result.summary.message).toContain("Реальная разница (буфер): -10 ч 2 мин");
  });
});
