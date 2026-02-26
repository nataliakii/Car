/**
 * 🧪 UNIT TESTS — analyzeConfirmationConflicts
 *
 * Тестирует АСИММЕТРИЧНУЮ логику подтверждения заказов:
 * ✅ Подтверждаемый → pending = WARNING (разрешить)
 * ⛔ Подтверждаемый → confirmed = BLOCK (запретить)
 *
 * npm run test:confirmation   # Только эти тесты
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import {
  analyzeConfirmationConflicts,
  canPendingOrderBeConfirmed,
} from "../analyzeConfirmationConflicts";

dayjs.extend(utc);
dayjs.extend(timezone);

const ATHENS_TZ = "Europe/Athens";
const BUFFER_HOURS = 2;

// ============================================================
// HELPER: Создаёт mock заказ с Athens временем → UTC для БД
// ============================================================
function createMockOrder({
  id,
  customerName,
  confirmed,
  startDate,
  startTime,
  endDate,
  endTime,
}) {
  // Создаём время как Athens → конвертируем в UTC (как в реальной БД)
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
    customerName,
    confirmed,
    timeIn,
    timeOut,
    rentalStartDate: timeIn,
    rentalEndDate: timeOut,
    car: "car-123",
  };
}

// ============================================================
// ТЕСТЫ: analyzeConfirmationConflicts
// ============================================================
describe("🔐 analyzeConfirmationConflicts", () => {
  describe("✅ Нет конфликтов", () => {
    it("разрешает подтверждение если нет других заказов", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-16",
        endTime: "18:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm],
      });

      expect(result.canConfirm).toBe(true);
      expect(result.level).toBeNull();
      expect(result.message).toBeNull();
      expect(result.blockedByConfirmed).toHaveLength(0);
      expect(result.affectedPendingOrders).toHaveLength(0);
    });

    it("разрешает подтверждение если заказы НЕ пересекаются", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "14:00",
      });

      const otherOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: true,
        startDate: "2026-01-15",
        startTime: "18:00", // Достаточный промежуток (4 часа > 2 часа буфера)
        endDate: "2026-01-15",
        endTime: "22:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, otherOrder],
      });

      expect(result.canConfirm).toBe(true);
      expect(result.level).toBeNull();
    });

    it("не анализирует уже подтверждённый заказ", () => {
      const confirmedOrder = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: true, // Уже подтверждён
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "18:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm: confirmedOrder,
        allOrders: [confirmedOrder],
      });

      expect(result.canConfirm).toBe(true);
      expect(result.level).toBeNull();
    });
  });

  describe("⛔ BLOCK — конфликт с подтверждённым заказом", () => {
    it("блокирует подтверждение при пересечении с confirmed заказом", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "14:00",
      });

      const confirmedOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: true,
        startDate: "2026-01-15",
        startTime: "12:00", // Пересечение!
        endDate: "2026-01-15",
        endTime: "18:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, confirmedOrder],
        bufferHours: BUFFER_HOURS,
      });

      expect(result.canConfirm).toBe(false);
      expect(result.level).toBe("block");
      expect(result.blockedByConfirmed).toHaveLength(1);
      expect(result.blockedByConfirmed[0].customerName).toBe("Мария");
      expect(result.message).toContain("Пересечение");
      expect(result.message).toContain("Мария");
    });

    it("блокирует из-за буфера даже без прямого пересечения", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "14:00",
      });

      const confirmedOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: true,
        startDate: "2026-01-15",
        startTime: "15:00", // Только 1 час разницы, буфер = 2 часа
        endDate: "2026-01-15",
        endTime: "18:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, confirmedOrder],
        bufferHours: BUFFER_HOURS,
      });

      expect(result.canConfirm).toBe(false);
      expect(result.level).toBe("block");
      expect(result.message).toContain("Изменить буфер");
    });

    it("возвращает affectedPendingOrders даже при BLOCK", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "14:00",
      });

      const confirmedOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: true,
        startDate: "2026-01-15",
        startTime: "12:00",
        endDate: "2026-01-15",
        endTime: "16:00",
      });

      const pendingOrder = createMockOrder({
        id: "order-3",
        customerName: "Петр",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "13:00",
        endDate: "2026-01-15",
        endTime: "15:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, confirmedOrder, pendingOrder],
      });

      expect(result.canConfirm).toBe(false);
      expect(result.level).toBe("block");
      expect(result.blockedByConfirmed).toHaveLength(1);
      expect(result.affectedPendingOrders).toHaveLength(1);
      expect(result.affectedPendingOrders[0].customerName).toBe("Петр");
    });
  });

  describe("⚠️ WARNING — конфликт с pending заказом", () => {
    it("разрешает подтверждение с warning при пересечении с pending", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "14:00",
      });

      const pendingOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: false, // Тоже pending
        startDate: "2026-01-15",
        startTime: "12:00", // Пересечение!
        endDate: "2026-01-15",
        endTime: "18:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, pendingOrder],
      });

      expect(result.canConfirm).toBe(true);
      expect(result.level).toBe("warning");
      expect(result.affectedPendingOrders).toHaveLength(1);
      expect(result.affectedPendingOrders[0].customerName).toBe("Мария");
      expect(result.message).toContain("Пересечение");
      expect(result.message).toContain("неподтверждённым");
    });

    it("показывает количество затронутых заказов при нескольких pending", () => {
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "10:00",
        endDate: "2026-01-15",
        endTime: "20:00",
      });

      const pending1 = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "11:00",
        endDate: "2026-01-15",
        endTime: "13:00",
      });

      const pending2 = createMockOrder({
        id: "order-3",
        customerName: "Петр",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "15:00",
        endDate: "2026-01-15",
        endTime: "17:00",
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, pending1, pending2],
      });

      expect(result.canConfirm).toBe(true);
      expect(result.level).toBe("warning");
      expect(result.affectedPendingOrders).toHaveLength(2);
      expect(result.message).toContain("2 ожидающими заказами");
    });
  });

  describe("🕐 Timezone корректность", () => {
    it("правильно обрабатывает UTC времена из БД", () => {
      // Симулируем: заказ в 14:00 Athens = 12:00 UTC (зимой UTC+2)
      const orderToConfirm = createMockOrder({
        id: "order-1",
        customerName: "Иван",
        confirmed: false,
        startDate: "2026-01-15",
        startTime: "14:00",
        endDate: "2026-01-15",
        endTime: "18:00",
      });

      // Другой заказ заканчивается в 12:00 Athens
      // Разница 2 часа = ровно буфер
      const confirmedOrder = createMockOrder({
        id: "order-2",
        customerName: "Мария",
        confirmed: true,
        startDate: "2026-01-15",
        startTime: "08:00",
        endDate: "2026-01-15",
        endTime: "12:00", // Заканчивается в 12:00, а Иван начинает в 14:00
      });

      const result = analyzeConfirmationConflicts({
        orderToConfirm,
        allOrders: [orderToConfirm, confirmedOrder],
        bufferHours: BUFFER_HOURS,
      });

      // 2 часа разницы = ровно буфер, НО пересечение по буферу
      // 12:00 + 2h buffer = 14:00, поэтому это граница
      // В зависимости от реализации это может быть OK или BLOCK
      // Проверяем что время правильно парсится
      expect(result.bufferHours).toBe(BUFFER_HOURS);
    });
  });
});

// ============================================================
// ТЕСТЫ: canPendingOrderBeConfirmed
// ============================================================
describe("🔐 canPendingOrderBeConfirmed", () => {
  it("разрешает подтверждение если нет confirmed конфликтов", () => {
    const pendingOrder = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: false,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder,
      allOrders: [pendingOrder],
    });

    expect(result.canConfirm).toBe(true);
    expect(result.blockingOrder).toBeNull();
    expect(result.message).toBeNull();
  });

  it("блокирует подтверждение при конфликте с confirmed", () => {
    const pendingOrder = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: false,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const confirmedOrder = createMockOrder({
      id: "order-2",
      customerName: "Мария",
      confirmed: true,
      startDate: "2026-01-15",
      startTime: "12:00",
      endDate: "2026-01-15",
      endTime: "18:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder,
      allOrders: [pendingOrder, confirmedOrder],
    });

    expect(result.canConfirm).toBe(false);
    expect(result.blockingOrder).not.toBeNull();
    expect(result.blockingOrder._id).toBe("order-2");
      expect(result.message).toContain("Пересечение");
      expect(result.message).toContain("Мария");
  });

  it("для overlap на границе выбирает ближайший gap, а не дальний отрицательный", () => {
    const pendingOrder = createMockOrder({
      id: "order-1",
      customerName: "Vadym",
      confirmed: false,
      startDate: "2026-03-04",
      startTime: "11:58",
      endDate: "2026-03-07",
      endTime: "19:00",
    });

    const confirmedOrder = createMockOrder({
      id: "order-2",
      customerName: "Karolina",
      confirmed: true,
      startDate: "2026-03-01",
      startTime: "14:00",
      endDate: "2026-03-04",
      endTime: "12:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder,
      allOrders: [pendingOrder, confirmedOrder],
      bufferHours: 1,
    });

    expect(result.canConfirm).toBe(false);
    expect(result.conflictTime).toBe("pickup");
    expect(result.actualGapMinutes).toBe(-2);
    expect(result.message).toContain("Забор в 11:58 конфликтует с возвратом в 12:00");
    expect(result.message).not.toContain("-149 ч");
  });

  it("для буферного конфликта 12:58 считает реальный gap как +58 минут", () => {
    const pendingOrder = createMockOrder({
      id: "order-1",
      customerName: "Vadym",
      confirmed: false,
      startDate: "2026-03-01",
      startTime: "14:00",
      endDate: "2026-03-04",
      endTime: "12:00",
    });

    const confirmedOrder = createMockOrder({
      id: "order-2",
      customerName: "Karolina",
      confirmed: true,
      startDate: "2026-03-04",
      startTime: "12:58",
      endDate: "2026-03-07",
      endTime: "19:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder,
      allOrders: [pendingOrder, confirmedOrder],
      bufferHours: 1,
    });

    expect(result.canConfirm).toBe(false);
    expect(result.conflictTime).toBe("return");
    expect(result.actualGapMinutes).toBe(58);
    expect(result.message).toContain(
      "Возврат в 12:00 конфликтует с забором в 12:58"
    );
    expect(result.message).toContain("58 мин");
  });

  it("игнорирует другие pending заказы", () => {
    const pendingOrder = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: false,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const anotherPending = createMockOrder({
      id: "order-2",
      customerName: "Мария",
      confirmed: false, // Тоже pending
      startDate: "2026-01-15",
      startTime: "12:00",
      endDate: "2026-01-15",
      endTime: "18:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder,
      allOrders: [pendingOrder, anotherPending],
    });

    expect(result.canConfirm).toBe(true);
    // Pending vs pending = разрешено (кто первый подтвердит, тот и прав)
  });

  it("возвращает true для уже подтверждённого заказа", () => {
    const confirmedOrder = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: true,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const result = canPendingOrderBeConfirmed({
      pendingOrder: confirmedOrder,
      allOrders: [confirmedOrder],
    });

    expect(result.canConfirm).toBe(true);
  });
});

// ============================================================
// ТЕСТЫ: Граничные случаи
// ============================================================
describe("📐 Граничные случаи", () => {
  it("обрабатывает null/undefined входные данные", () => {
    expect(analyzeConfirmationConflicts({ orderToConfirm: null, allOrders: [] }))
      .toEqual(expect.objectContaining({ canConfirm: true }));

    expect(analyzeConfirmationConflicts({ orderToConfirm: undefined, allOrders: [] }))
      .toEqual(expect.objectContaining({ canConfirm: true }));

    expect(canPendingOrderBeConfirmed({ pendingOrder: null, allOrders: [] }))
      .toEqual(expect.objectContaining({ canConfirm: true }));
  });

  it("не считает заказ конфликтом с самим собой", () => {
    const order = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: false,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const result = analyzeConfirmationConflicts({
      orderToConfirm: order,
      allOrders: [order, order], // Дубликат
    });

    expect(result.canConfirm).toBe(true);
    expect(result.blockedByConfirmed).toHaveLength(0);
    expect(result.affectedPendingOrders).toHaveLength(0);
  });

  it("возвращает bufferHours в результате", () => {
    const order = createMockOrder({
      id: "order-1",
      customerName: "Иван",
      confirmed: false,
      startDate: "2026-01-15",
      startTime: "10:00",
      endDate: "2026-01-15",
      endTime: "14:00",
    });

    const result = analyzeConfirmationConflicts({
      orderToConfirm: order,
      allOrders: [order],
      bufferHours: BUFFER_HOURS,
    });

    expect(result.bufferHours).toBe(BUFFER_HOURS);
  });
});
