import {
  formatConfirmedConflictMessage,
  formatPendingConflictMessage,
} from "../formatConflictMessages";

describe("formatConflictMessages", () => {
  it("показывает fallback-имя и отрицательный буфер для pending-конфликта", () => {
    const message = formatPendingConflictMessage({
      conflictingOrderName: "—",
      conflictingOrderEmail: "",
      conflictingOrderDates: "4 Мар 01:58 — 7 Мар 19:00",
      currentReturnTime: "12:00",
      nextPickupTime: "01:58",
      actualGapMinutes: -602,
      requiredBufferHours: 2,
    });

    expect(message).toContain("«Клиент»");
    expect(message).toContain("Реальная разница (буфер): -10 ч 2 мин");
  });

  it("сохраняет имя и форматирует положительный буфер для confirmed-конфликта", () => {
    const message = formatConfirmedConflictMessage({
      conflictingOrderName: "Иван",
      currentReturnTime: "12:00",
      nextPickupTime: "14:00",
      actualGapMinutes: 120,
      requiredBufferHours: 2,
    });

    expect(message).toContain("«Иван»");
    expect(message).toContain("Реальная разница (буфер): 2 ч");
  });

  it("для generic имени подставляет email (pending)", () => {
    const message = formatPendingConflictMessage({
      conflictingOrderName: "Клиент",
      conflictingOrderEmail: "name@example.com",
      conflictingOrderDates: "4 Мар 01:58 — 7 Мар 19:00",
      currentReturnTime: "12:00",
      nextPickupTime: "01:58",
      actualGapMinutes: -602,
      requiredBufferHours: 2,
    });

    expect(message).toContain("«name@example.com»");
    expect(message).not.toContain("«Клиент (name@example.com)»");
  });

  it("для generic имени подставляет email (confirmed)", () => {
    const message = formatConfirmedConflictMessage({
      conflictingOrderName: "Клиент",
      conflictingOrderEmail: "name@example.com",
      currentReturnTime: "12:00",
      nextPickupTime: "14:00",
      actualGapMinutes: 120,
      requiredBufferHours: 2,
    });

    expect(message).toContain("«name@example.com»");
  });
});
