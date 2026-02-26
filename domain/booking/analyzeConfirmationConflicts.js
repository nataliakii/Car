/**
 * analyzeConfirmationConflicts
 *
 * 🎯 ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ для анализа конфликтов при подтверждении.
 *
 * Реализует АСИММЕТРИЧНУЮ логику:
 * ✅ Подтверждаемый → pending = WARNING (разрешить)
 * ⛔ Подтверждаемый → confirmed = BLOCK (запретить)
 *
 * ❗ Использует СТРОГО Athens timezone через fromServerUTC
 * ❗ НИКОГДА не использует dayjs() напрямую для времени из БД
 */

import { fromServerUTC, formatTimeHHMM } from "../time/athensTime";
import {
  formatConfirmedConflictMessage,
  formatPendingConflictMessage,
} from "./formatConflictMessages";

/**
 * @typedef {Object} ConfirmationConflict
 * @property {string} orderId
 * @property {string} customerName
 * @property {boolean} isConfirmed
 * @property {number} overlapHours - Чистое пересечение (без буфера)
 * @property {number} effectiveConflictHours - overlap + buffer
 * @property {string} otherTimeIn - "HH:mm"
 * @property {string} otherTimeOut - "HH:mm"
 */

/**
 * @typedef {Object} ConfirmationAnalysisResult
 * @property {boolean} canConfirm
 * @property {"block" | "warning" | null} level
 * @property {string | null} message
 * @property {ConfirmationConflict[]} blockedByConfirmed
 * @property {ConfirmationConflict[]} affectedPendingOrders
 * @property {number} bufferHours
 */

/**
 * Проверяет пересечение времени С УЧЁТОМ буфера
 */
function doTimesOverlap(start1, end1, start2, end2, bufferHours) {
  const bufferedStart2 = start2.subtract(bufferHours, "hour");
  const bufferedEnd2 = end2.add(bufferHours, "hour");
  return start1.isBefore(bufferedEnd2) && end1.isAfter(bufferedStart2);
}

/**
 * Вычисляет ЧИСТЫЕ часы пересечения (без буфера)
 */
function calculateOverlapHours(start1, end1, start2, end2) {
  const overlapStart = start1.isAfter(start2) ? start1 : start2;
  const overlapEnd = end1.isBefore(end2) ? end1 : end2;

  if (overlapStart.isAfter(overlapEnd)) {
    return 0;
  }

  return overlapEnd.diff(overlapStart, "hour", true);
}

/**
 * Выбирает ближайшую конфликтующую границу между двумя интервалами.
 * Это защищает от случаев, когда одна из пар даёт очень большой отрицательный gap
 * (например -149 ч), а реальный конфликт — на соседней границе (-2 мин).
 */
function resolveNearestBoundaryConflict({ currentStart, currentEnd, otherStart, otherEnd }) {
  // currentReturn -> otherPickup
  const gapReturnVsPickup = otherStart.diff(currentEnd, "minute", true);
  // otherReturn -> currentPickup
  const gapPickupVsReturn = currentStart.diff(otherEnd, "minute", true);

  const returnGapAbs = Math.abs(gapReturnVsPickup);
  const pickupGapAbs = Math.abs(gapPickupVsReturn);

  // При равенстве оставляем return-сценарий (историческое поведение).
  const usePickupSide = pickupGapAbs < returnGapAbs;
  const actualGapMinutes = Math.round(
    usePickupSide ? gapPickupVsReturn : gapReturnVsPickup
  );

  return {
    conflictTime: usePickupSide ? "pickup" : "return",
    conflictReturnTime: usePickupSide
      ? formatTimeHHMM(otherEnd)
      : formatTimeHHMM(currentEnd),
    conflictPickupTime: usePickupSide
      ? formatTimeHHMM(currentStart)
      : formatTimeHHMM(otherStart),
    actualGapMinutes,
    gapHours: (usePickupSide ? gapPickupVsReturn : gapReturnVsPickup) / 60,
  };
}

/**
 * Анализирует конфликты при подтверждении заказа
 *
 * @param {Object} params
 * @param {Object} params.orderToConfirm - Заказ, который хотим подтвердить
 * @param {Array} params.allOrders - Все заказы для этой машины
 * @param {number} [params.bufferHours] - Буферное время в часах (только из company.bufferTime)
 * @returns {ConfirmationAnalysisResult}
 */
export function analyzeConfirmationConflicts({ orderToConfirm, allOrders, bufferHours }) {
  // Единственный источник: company.bufferTime. Без fallback — если не передан, считаем 0 (нет буфера).
  const effectiveBufferHours =
    typeof bufferHours === "number" && !isNaN(bufferHours) && bufferHours >= 0 ? bufferHours : 0;
  const result = {
    canConfirm: true,
    level: null,
    message: null,
    blockedByConfirmed: [],
    affectedPendingOrders: [],
    bufferHours: effectiveBufferHours,
  };

  if (!orderToConfirm || !allOrders) {
    return result;
  }

  // Если заказ уже подтверждён — нечего анализировать
  if (orderToConfirm.confirmed) {
    return result;
  }

  // 🎯 КРИТИЧНО: используем fromServerUTC для правильной интерпретации времени
  const confirmingStart = fromServerUTC(orderToConfirm.timeIn);
  const confirmingEnd = fromServerUTC(orderToConfirm.timeOut);

  if (!confirmingStart || !confirmingEnd) {
    return result;
  }

  allOrders.forEach((order) => {
    // Пропускаем текущий заказ
    const orderId = order._id?.toString?.() || order._id;
    const confirmingId = orderToConfirm._id?.toString?.() || orderToConfirm._id;
    if (orderId === confirmingId) return;

    // 🎯 КРИТИЧНО: используем fromServerUTC
    const otherStart = fromServerUTC(order.timeIn);
    const otherEnd = fromServerUTC(order.timeOut);

    if (!otherStart || !otherEnd) return;

    // Проверяем пересечение С УЧЁТОМ буфера
    const hasOverlap = doTimesOverlap(
      confirmingStart,
      confirmingEnd,
      otherStart,
      otherEnd,
      effectiveBufferHours
    );

    if (!hasOverlap) return;

    // Вычисляем ЧИСТОЕ пересечение (без буфера)
    const overlapHours = calculateOverlapHours(
      confirmingStart,
      confirmingEnd,
      otherStart,
      otherEnd
    );

    const nearestConflict = resolveNearestBoundaryConflict({
      currentStart: confirmingStart,
      currentEnd: confirmingEnd,
      otherStart,
      otherEnd,
    });

    // Форматируем даты для конфликтующего заказа
    const otherStartDate = fromServerUTC(order.rentalStartDate);
    const otherEndDate = fromServerUTC(order.rentalEndDate);
    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    const formatDateReadable = (date) => {
      if (!date) return "—";
      return `${date.date()} ${months[date.month()]}`;
    };

    const safeCustomerName =
      typeof order.customerName === "string" && order.customerName.trim()
        ? order.customerName.trim()
        : "Клиент";

    const conflictInfo = {
      orderId,
      customerName: safeCustomerName,
      email: order.email || null,
      isConfirmed: order.confirmed === true,
      overlapHours: Math.round(overlapHours * 10) / 10,
      effectiveConflictHours: Math.round((overlapHours + effectiveBufferHours) * 10) / 10,
      gapHours: Math.round(nearestConflict.gapHours * 10) / 10,
      gapMinutes: nearestConflict.actualGapMinutes,
      conflictTime: nearestConflict.conflictTime,
      conflictReturnTime: nearestConflict.conflictReturnTime,
      conflictPickupTime: nearestConflict.conflictPickupTime,
      otherTimeIn: formatTimeHHMM(otherStart),
      otherTimeOut: formatTimeHHMM(otherEnd),
      otherStartDateFormatted: formatDateReadable(otherStartDate),
      otherEndDateFormatted: formatDateReadable(otherEndDate),
    };

    if (order.confirmed) {
      result.blockedByConfirmed.push(conflictInfo);
    } else {
      result.affectedPendingOrders.push(conflictInfo);
    }
  });

  // Формируем результат с профессиональным UX-копирайтом
  if (result.blockedByConfirmed.length > 0) {
    // 🔴 BLOCK: строго, спокойно
    result.canConfirm = false;
    result.level = "block";

    const c = result.blockedByConfirmed[0];
    // Используем gapMinutes, если доступен, иначе вычисляем из gapHours
    const actualGapMinutes =
      c.gapMinutes !== undefined ? c.gapMinutes : Math.round(c.gapHours * 60);
    const conflictDirectionFields =
      c.conflictTime === "pickup"
        ? {
            currentPickupTime: c.conflictPickupTime,
            nextReturnTime: c.conflictReturnTime,
          }
        : {
            currentReturnTime: c.conflictReturnTime,
            nextPickupTime: c.conflictPickupTime,
          };

    result.message = formatConfirmedConflictMessage({
      conflictingOrderName: c.customerName,
      conflictingOrderEmail: c.email,
      actualGapMinutes: actualGapMinutes,
      requiredBufferHours: effectiveBufferHours,
      ...conflictDirectionFields,
    });
  } else if (result.affectedPendingOrders.length > 0) {
    // ⚠️ WARNING: информативно
    result.canConfirm = true;
    result.level = "warning";

    const totalAffected = result.affectedPendingOrders.length;
    const c = result.affectedPendingOrders[0];

    if (totalAffected === 1) {
      // Форматируем даты конфликтующего заказа (уже вычислены в conflictInfo)
      const conflictingOrderDates = `${c.otherStartDateFormatted} ${c.otherTimeIn} — ${c.otherEndDateFormatted} ${c.otherTimeOut}`;

      // Используем gapMinutes, если доступен, иначе вычисляем из gapHours
      const actualGapMinutes =
        c.gapMinutes !== undefined ? c.gapMinutes : Math.round(c.gapHours * 60);
      const conflictDirectionFields =
        c.conflictTime === "pickup"
          ? {
              currentPickupTime: c.conflictPickupTime,
              nextReturnTime: c.conflictReturnTime,
            }
          : {
              currentReturnTime: c.conflictReturnTime,
              nextPickupTime: c.conflictPickupTime,
            };

      result.message = formatPendingConflictMessage({
        conflictingOrderName: c.customerName,
        conflictingOrderEmail: c.email,
        conflictingOrderDates: conflictingOrderDates,
        actualGapMinutes: actualGapMinutes,
        requiredBufferHours: effectiveBufferHours,
        ...conflictDirectionFields,
      });
    } else {
      result.message =
        `Заказ подтверждён. ` +
        `Конфликт с ${totalAffected} ожидающими заказами. ` +
        `Они не смогут быть подтверждены без изменения времени.`;
    }
  }

  return result;
}

/**
 * Проверяет, может ли pending заказ быть подтверждён
 * (есть ли блокирующие confirmed заказы)
 *
 * @param {Object} params
 * @param {Object} params.pendingOrder
 * @param {Array} params.allOrders
 * @param {number} [params.bufferHours] - Буферное время в часах (только из company.bufferTime)
 * @returns {{ canConfirm: boolean, blockingOrder: Object | null, message: string | null }}
 */
export function canPendingOrderBeConfirmed({ pendingOrder, allOrders, bufferHours }) {
  const effectiveBufferHours =
    typeof bufferHours === "number" && !isNaN(bufferHours) && bufferHours >= 0 ? bufferHours : 0;

  if (!pendingOrder || pendingOrder.confirmed) {
    return { canConfirm: true, blockingOrder: null, message: null };
  }

  // 🎯 КРИТИЧНО: используем fromServerUTC
  const pendingStart = fromServerUTC(pendingOrder.timeIn);
  const pendingEnd = fromServerUTC(pendingOrder.timeOut);

  if (!pendingStart || !pendingEnd) {
    return { canConfirm: true, blockingOrder: null, message: null };
  }

  for (const order of allOrders) {
    const orderId = order._id?.toString?.() || order._id;
    const pendingId = pendingOrder._id?.toString?.() || pendingOrder._id;
    if (orderId === pendingId) continue;
    if (!order.confirmed) continue;

    const otherStart = fromServerUTC(order.timeIn);
    const otherEnd = fromServerUTC(order.timeOut);

    if (!otherStart || !otherEnd) continue;

    const hasOverlap = doTimesOverlap(
      pendingStart,
      pendingEnd,
      otherStart,
      otherEnd,
      effectiveBufferHours
    );

    if (hasOverlap) {
      const nearestConflict = resolveNearestBoundaryConflict({
        currentStart: pendingStart,
        currentEnd: pendingEnd,
        otherStart,
        otherEnd,
      });
      const {
        conflictTime,
        conflictReturnTime,
        conflictPickupTime,
        actualGapMinutes,
      } = nearestConflict;
      const conflictDirectionFields =
        conflictTime === "pickup"
          ? {
              currentPickupTime: conflictPickupTime,
              nextReturnTime: conflictReturnTime,
            }
          : {
              currentReturnTime: conflictReturnTime,
              nextPickupTime: conflictPickupTime,
            };

      return {
        canConfirm: false,
        blockingOrder: order,
        conflictTime,
        conflictReturnTime,
        conflictPickupTime,
        actualGapMinutes,
        requiredBufferHours: effectiveBufferHours,
        conflictData: {
          blockingOrder: order,
          conflictTime,
          conflictReturnTime,
          conflictPickupTime,
          actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        },
        message: formatConfirmedConflictMessage({
          conflictingOrderName:
            typeof order.customerName === "string" && order.customerName.trim()
              ? order.customerName.trim()
              : "Клиент",
          conflictingOrderEmail: order.email || null,
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
          ...conflictDirectionFields,
        }),
      };
    }
  }

  return { canConfirm: true, blockingOrder: null, message: null };
}

export default analyzeConfirmationConflicts;
