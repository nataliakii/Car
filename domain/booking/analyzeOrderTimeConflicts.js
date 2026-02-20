/**
 * analyzeOrderTimeConflicts
 *
 * 🎯 НАЗНАЧЕНИЕ:
 * Проанализировать редактируемый заказ относительно других заказов
 * на ту же дату и вернуть:
 * - summary (один summarized message)
 * - hasBlockingConflict
 * - minPickupTime / maxReturnTime
 *
 * ❗ Использует СТРОГО Athens timezone через athensTime.js
 * ❗ НЕ зависит от таймзоны браузера
 */

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  ATHENS_TZ,
  fromServerUTC,
  createAthensDateTime,
  athensStartOfDay,
  athensEndOfDay,
  formatTimeHHMM,
  formatDateYYYYMMDD,
} from "../time/athensTime";
import {
  formatConfirmedConflictMessage,
  formatPendingConflictMessage,
} from "./formatConflictMessages";

/**
 * Форматирует дату в читаемый формат "D MMM" (например: "1 Фев")
 */
function formatDateReadable(dayjsDate) {
  if (!dayjsDate) return "—";
  // Используем русские названия месяцев
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return `${dayjsDate.date()} ${months[dayjsDate.month()]}`;
}

/**
 * Форматирует информацию о заказе для сообщений
 */
function formatOrderInfo(order, timeIn, timeOut, startDate, endDate) {
  const rawName = typeof order?.customerName === "string" ? order.customerName.trim() : "";
  const visibilityHidden = order?._visibility?.hideClientContacts === true;
  const fallbackLabel = visibilityHidden
    ? "Клиент"
    : (order?.orderNumber ? `Заказ ${order.orderNumber}` : "Клиент");
  const name = rawName && rawName !== "—" ? rawName : fallbackLabel;
  const email = order.email ? ` (${order.email})` : "";
  const pickupDate = formatDateReadable(startDate);
  const returnDate = formatDateReadable(endDate);
  const pickupTime = formatTimeHHMM(timeIn) || "—";
  const returnTime = formatTimeHHMM(timeOut) || "—";
  
  return {
    name,
    email,
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    fullName: `${name}${email}`,
  };
}

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * @typedef {Object} ConflictSummary
 * @property {"block" | "warning"} level
 * @property {string} message
 */

/**
 * @typedef {Object} TimeConflictResult
 * @property {string|null} minPickupTime - "HH:mm" или null
 * @property {string|null} maxReturnTime - "HH:mm" или null
 * @property {ConflictSummary|null} summary - Один summarized message
 * @property {boolean} hasBlockingConflict
 */

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Проверяет, пересекаются ли два временных интервала с учётом буфера
 * 
 * ⚠️ Важно: буфер применяется МЕЖДУ заказами, а не расширяет интервалы
 * 
 * Правила:
 * - Если заказ 1 возвращается в end1, а заказ 2 забирается в start2,
 *   то между ними должно быть минимум bufferHours: start2 - end1 >= bufferHours
 * - Если заказ 2 возвращается в end2, а заказ 1 забирается в start1,
 *   то между ними должно быть минимум bufferHours: start1 - end2 >= bufferHours
 * 
 * Конфликт возникает если:
 * - Интервалы пересекаются напрямую (без учета буфера), ИЛИ
 * - Между возвратом одного и забором другого меньше bufferHours
 */
function doTimesOverlap(start1, end1, start2, end2, bufferHours) {
  // Проверяем прямое пересечение интервалов (без буфера)
  const directOverlap = start1.isBefore(end2) && end1.isAfter(start2);
  
  if (directOverlap) {
    // Если интервалы пересекаются напрямую - это конфликт
    if (IS_DEV) {
      console.log(
        `🔍 doTimesOverlap: DIRECT overlap detected: ` +
        `editing=${start1.format("HH:mm")}-${end1.format("HH:mm")} ` +
        `other=${start2.format("HH:mm")}-${end2.format("HH:mm")} ` +
        `buffer=${bufferHours}h → overlap=true (direct)`
      );
    }
    return true;
  }
  
  // Проверяем буфер между заказами
  // Случай 1: заказ 1 возвращается раньше, чем заказ 2 забирается
  // end1 должен быть минимум на bufferHours раньше start2
  const gap1 = start2.diff(end1, "hour", true);
  // Проверяем буфер ТОЛЬКО если gap >= 0 (т.е. end1 <= start2)
  // Отрицательный gap означает пересечение интервалов — не этот случай
  const violatesBuffer1 = gap1 >= 0 && gap1 < bufferHours;
  
  // Случай 2: заказ 2 возвращается раньше, чем заказ 1 забирается
  // end2 должен быть минимум на bufferHours раньше start1
  const gap2 = start1.diff(end2, "hour", true);
  // Проверяем буфер ТОЛЬКО если gap >= 0 (т.е. end2 <= start1)
  // Отрицательный gap означает пересечение интервалов — не этот случай
  const violatesBuffer2 = gap2 >= 0 && gap2 < bufferHours;
  
  const overlap = violatesBuffer1 || violatesBuffer2;

  if (IS_DEV) {
    console.log(
      `🔍 doTimesOverlap: editing=${start1.format("HH:mm")}-${end1.format("HH:mm")} ` +
      `other=${start2.format("HH:mm")}-${end2.format("HH:mm")} ` +
      `buffer=${bufferHours}h ` +
      `gap1=${gap1.toFixed(1)}h (end1→start2), gap2=${gap2.toFixed(1)}h (end2→start1) ` +
      `→ overlap=${overlap} (violatesBuffer1=${violatesBuffer1}, violatesBuffer2=${violatesBuffer2})`
    );
  }

  return overlap;
}

/**
 * Анализирует конфликты времени для редактируемого заказа
 *
 * @param {Object} params
 * @param {Object} params.editingOrder - Редактируемый заказ
 * @param {Array} params.orders - Все заказы для этой машины
 * @param {string} params.date - Дата в формате "YYYY-MM-DD"
 * @param {string} [params.editingPickupTime] - Время получения "HH:mm" (Athens)
 * @param {string} [params.editingReturnTime] - Время возврата "HH:mm" (Athens)
 * @param {number} [params.bufferHours] - Буферное время в часах (только из company.bufferTime)
 * @returns {TimeConflictResult}
 */
export function analyzeOrderTimeConflicts({
  editingOrder,
  orders,
  date,
  editingPickupTime,
  editingReturnTime,
  bufferHours,
}) {
  const effectiveBufferHours =
    typeof bufferHours === "number" && !isNaN(bufferHours) && bufferHours >= 0 ? bufferHours : 0;

  const result = {
    minPickupTime: null,
    maxReturnTime: null,
    summary: null,
    hasBlockingConflict: false,
  };

  if (!editingOrder || !orders || !date) {
    return result;
  }

  const editingConfirmed = editingOrder.confirmed === true;
  const targetDay = athensStartOfDay(date);

  // 🎯 Определяем даты редактируемого заказа
  const editingStartDay = fromServerUTC(editingOrder.rentalStartDate).startOf("day");
  const editingEndDay = fromServerUTC(editingOrder.rentalEndDate).startOf("day");
  
  // 🎯 Определяем ПРАВИЛЬНЫЙ интервал времени для редактируемого заказа НА ЭТОТ ДЕНЬ
  // Это зависит от того, какой это день для заказа (первый, последний, или средний)
  let editingStart, editingEnd;
  
  const isEditingStartDay = targetDay.isSame(editingStartDay, "day");
  const isEditingEndDay = targetDay.isSame(editingEndDay, "day");
  
  if (isEditingStartDay && isEditingEndDay) {
    // Однодневный заказ — от pickupTime до returnTime
    editingStart = editingPickupTime
      ? createAthensDateTime(date, editingPickupTime)
      : null;
    editingEnd = editingReturnTime
      ? createAthensDateTime(date, editingReturnTime)
      : null;
  } else if (isEditingStartDay) {
    // Первый день многодневного заказа — от pickupTime до конца дня
    editingStart = editingPickupTime
      ? createAthensDateTime(date, editingPickupTime)
      : null;
    editingEnd = athensEndOfDay(date);
  } else if (isEditingEndDay) {
    // Последний день многодневного заказа — от начала дня до returnTime
    editingStart = athensStartOfDay(date);
    editingEnd = editingReturnTime
      ? createAthensDateTime(date, editingReturnTime)
      : null;
  } else {
    // Средний день — весь день занят
    editingStart = athensStartOfDay(date);
    editingEnd = athensEndOfDay(date);
  }

  if (IS_DEV) {
    console.log(
      `📅 analyzeOrderTimeConflicts: date=${date}, ` +
      `editingPickup=${editingPickupTime || "null"}, editingReturn=${editingReturnTime || "null"}, ` +
      `isStartDay=${isEditingStartDay}, isEndDay=${isEditingEndDay}, ` +
      `effectiveStart=${editingStart?.format("HH:mm") || "null"}, effectiveEnd=${editingEnd?.format("HH:mm") || "null"}, ` +
      `confirmed=${editingConfirmed}, ordersOnCar=${orders.length}`
    );
  }

  let hasBlock = false;
  let hasWarning = false;
  let blockMessage = "";
  let warningMessage = "";

  orders.forEach((order) => {
    // Пропускаем текущий заказ
    if (order._id === editingOrder._id) return;

    // Парсим даты заказа из UTC → Athens
    const orderStartDay = fromServerUTC(order.rentalStartDate).startOf("day");
    const orderEndDay = fromServerUTC(order.rentalEndDate).startOf("day");

    // Проверяем, попадает ли targetDay в диапазон заказа
    const isSameDay =
      targetDay.isSame(orderStartDay, "day") ||
      targetDay.isSame(orderEndDay, "day") ||
      (targetDay.isAfter(orderStartDay, "day") && targetDay.isBefore(orderEndDay, "day"));

    if (!isSameDay) return;

    const otherConfirmed = order.confirmed === true;

    // Парсим время другого заказа из UTC → Athens
    const otherTimeIn = fromServerUTC(order.timeIn);
    const otherTimeOut = fromServerUTC(order.timeOut);

    if (IS_DEV) {
      console.log(
        `📋 Checking order "${order.customerName || order._id}": ` +
        `confirmed=${otherConfirmed}, timeIn=${otherTimeIn?.format("HH:mm")}, timeOut=${otherTimeOut?.format("HH:mm")}`
      );
    }

    // Определяем время другого заказа на этот день (нужно для проверки пересечения и расчёта gap)
      let otherStart, otherEnd;

      if (targetDay.isSame(orderStartDay, "day") && targetDay.isSame(orderEndDay, "day")) {
        // Однодневный заказ
        otherStart = otherTimeIn;
        otherEnd = otherTimeOut;
      } else if (targetDay.isSame(orderStartDay, "day")) {
        // Первый день многодневного заказа — от timeIn до конца дня
        otherStart = otherTimeIn;
        otherEnd = athensEndOfDay(date);
      } else if (targetDay.isSame(orderEndDay, "day")) {
        // Последний день многодневного заказа — от начала дня до timeOut
        otherStart = athensStartOfDay(date);
        otherEnd = otherTimeOut;
      } else {
        // Середина многодневного заказа — весь день занят
        otherStart = athensStartOfDay(date);
        otherEnd = athensEndOfDay(date);
      }

    // Если у нас есть время редактируемого заказа — проверяем РЕАЛЬНОЕ пересечение
    if (editingStart && editingEnd) {
      // Проверяем пересечение с учётом буфера
      const hasTimeOverlap = doTimesOverlap(
        editingStart,
        editingEnd,
        otherStart,
        otherEnd,
        effectiveBufferHours
      );

      if (!hasTimeOverlap) {
        // Нет реального пересечения времени — пропускаем
        return;
      }
    }

    // --- Логика приоритетов (UX-копирайт для админа) ---
    
    // Форматируем информацию о конфликтующем заказе
    const info = formatOrderInfo(order, otherTimeIn, otherTimeOut, orderStartDay, orderEndDay);
    
    // 🎯 Получаем фактическое время возврата (business return time), не техническую границу дня
    // Используем editingReturnTime если доступно, иначе форматируем из editingOrder.timeOut
    const businessReturnTime = editingReturnTime 
      ? editingReturnTime 
      : (editingOrder.timeOut ? formatTimeHHMM(fromServerUTC(editingOrder.timeOut)) : "—");
    
    // 🎯 Получаем фактическое время забора (business pickup time)
    // Используем editingPickupTime если доступно, иначе форматируем из editingOrder.timeIn
    const businessPickupTime = editingPickupTime 
      ? editingPickupTime 
      : (editingOrder.timeIn ? formatTimeHHMM(fromServerUTC(editingOrder.timeIn)) : null);

    // 🟢 confirmed (editing) → pending (other) = INFO
    if (editingConfirmed && !otherConfirmed) {
      hasWarning = true;
      
      // Определяем направление конфликта используя РЕАЛЬНЫЕ времена заказов (не на конкретную дату)
      // Получаем реальные времена заказов
      const editingRealStart = editingPickupTime 
        ? createAthensDateTime(formatDateYYYYMMDD(fromServerUTC(editingOrder.rentalStartDate)), editingPickupTime)
        : fromServerUTC(editingOrder.timeIn);
      const editingRealEnd = editingReturnTime
        ? createAthensDateTime(formatDateYYYYMMDD(fromServerUTC(editingOrder.rentalEndDate)), editingReturnTime)
        : fromServerUTC(editingOrder.timeOut);
      const otherRealStart = otherTimeIn;
      const otherRealEnd = otherTimeOut;
      
      // Вычисляем оба возможных gap (в минутах)
      // gap1: возврат редактируемого → забор другого (положительный если возврат раньше забора)
      const gapReturnVsPickup = otherRealStart.diff(editingRealEnd, "minute", true);
      // gap2: возврат другого → забор редактируемого (положительный если возврат другого раньше забора редактируемого)
      const gapPickupVsReturn = editingRealStart.diff(otherRealEnd, "minute", true);
      
      // Определяем направление конфликта: какой gap положительный и нарушает буфер
      // Если gap положительный и < буфера → нарушение буфера
      const violatesBufferReturnVsPickup = gapReturnVsPickup >= 0 && gapReturnVsPickup < effectiveBufferHours * 60;
      const violatesBufferPickupVsReturn = gapPickupVsReturn >= 0 && gapPickupVsReturn < effectiveBufferHours * 60;
      
      let actualGapMinutes;
      let isPickupVsReturn = false;
      
      // Приоритет: если оба нарушают буфер, выбираем меньший gap
      if (violatesBufferPickupVsReturn && violatesBufferReturnVsPickup) {
        // Оба нарушают — выбираем меньший gap
        if (gapPickupVsReturn < gapReturnVsPickup) {
          isPickupVsReturn = true;
        }
      } else if (violatesBufferPickupVsReturn) {
        // Только забор редактируемого конфликтует с возвратом другого
        isPickupVsReturn = true;
      } else {
        // Если оба gap отрицательные (пересечение) или оба >= буфера, но есть пересечение
        // выбираем направление сообщения, а знак/величину берём из выбранного направления.
        if (gapPickupVsReturn >= 0 && gapReturnVsPickup >= 0) {
          // Оба положительные, но >= буфера — берём меньший gap
          isPickupVsReturn = gapPickupVsReturn < gapReturnVsPickup;
        } else if (gapPickupVsReturn >= 0) {
          isPickupVsReturn = true;
        } else {
          // Оба отрицательные (прямое пересечение): оставляем default-направление
          // (возврат редактируемого vs забор другого), чтобы знак остался отрицательным.
          isPickupVsReturn = false;
        }
      }
      actualGapMinutes = Math.round(
        isPickupVsReturn ? gapPickupVsReturn : gapReturnVsPickup
      );

      const conflictingOrderDates = `${info.pickupDate} ${info.pickupTime} — ${info.returnDate} ${info.returnTime}`;
      
      // Передаём параметры в зависимости от направления конфликта
      // Семантика: "Возврат в X конфликтует с забором в Y" — X предшествует Y
      if (isPickupVsReturn) {
        // Возврат ДРУГОГО конфликтует с забором РЕДАКТИРУЕМОГО
        // (другой возвращается в info.returnTime, редактируемый забирает в businessPickupTime)
        warningMessage = formatPendingConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          conflictingOrderDates: conflictingOrderDates,
          currentReturnTime: info.returnTime,       // ← время возврата ДРУГОГО заказа
          nextPickupTime: businessPickupTime,       // ← время забора РЕДАКТИРУЕМОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      } else {
        // Возврат РЕДАКТИРУЕМОГО конфликтует с забором ДРУГОГО (по умолчанию)
        // (редактируемый возвращается в businessReturnTime, другой забирает в info.pickupTime)
        warningMessage = formatPendingConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          conflictingOrderDates: conflictingOrderDates,
          currentReturnTime: businessReturnTime,    // ← время возврата РЕДАКТИРУЕМОГО заказа
          nextPickupTime: info.pickupTime,          // ← время забора ДРУГОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      }
      return;
    }

    // 🔴 pending (editing) → confirmed (other) = BLOCK
    if (!editingConfirmed && otherConfirmed) {
      hasBlock = true;
      
      // Определяем направление конфликта:
      // Если редактируемый начинается после/около конца другого,
      // сообщение строим как "возврат другого vs забор редактируемого".
      const isPickupVsReturn = editingStart && otherEnd && otherEnd.isSameOrBefore(editingStart);
      
      const gapReturnVsPickup = otherStart.diff(editingEnd, "minute", true);
      const gapPickupVsReturn = editingStart.diff(otherEnd, "minute", true);
      const actualGapMinutes = Math.round(
        isPickupVsReturn ? gapPickupVsReturn : gapReturnVsPickup
      );

      // Передаём параметры в зависимости от направления конфликта
      // Семантика: "Возврат в X конфликтует с забором в Y" — X предшествует Y
      if (isPickupVsReturn) {
        // Возврат ДРУГОГО конфликтует с забором РЕДАКТИРУЕМОГО
        // (другой возвращается в info.returnTime, редактируемый забирает в businessPickupTime)
        blockMessage = formatConfirmedConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          currentReturnTime: info.returnTime,       // ← время возврата ДРУГОГО заказа
          nextPickupTime: businessPickupTime,       // ← время забора РЕДАКТИРУЕМОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      } else {
        // Возврат РЕДАКТИРУЕМОГО конфликтует с забором ДРУГОГО (по умолчанию)
        // (редактируемый возвращается в businessReturnTime, другой забирает в info.pickupTime)
        blockMessage = formatConfirmedConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          currentReturnTime: businessReturnTime,    // ← время возврата РЕДАКТИРУЕМОГО заказа
          nextPickupTime: info.pickupTime,          // ← время забора ДРУГОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      }

      // Устанавливаем границы времени
      if (targetDay.isSame(orderStartDay, "day")) {
        const maxTime = otherTimeIn.subtract(effectiveBufferHours, "hour").format("HH:mm");
        if (!result.maxReturnTime || maxTime < result.maxReturnTime) {
          result.maxReturnTime = maxTime;
        }
      }

      if (targetDay.isSame(orderEndDay, "day")) {
        const minTime = otherTimeOut.add(effectiveBufferHours, "hour").format("HH:mm");
        if (!result.minPickupTime || minTime > result.minPickupTime) {
          result.minPickupTime = minTime;
        }
      }
      return;
    }

    // 🟡 pending → pending = INFO
    if (!editingConfirmed && !otherConfirmed) {
      hasWarning = true;
      
      // Определяем направление конфликта:
      // Если редактируемый начинается после/около конца другого,
      // сообщение строим как "возврат другого vs забор редактируемого".
      const isPickupVsReturn = editingStart && otherEnd && otherEnd.isSameOrBefore(editingStart);
      
      const gapReturnVsPickup = otherStart.diff(editingEnd, "minute", true);
      const gapPickupVsReturn = editingStart.diff(otherEnd, "minute", true);
      const actualGapMinutes = Math.round(
        isPickupVsReturn ? gapPickupVsReturn : gapReturnVsPickup
      );

      const conflictingOrderDates = `${info.pickupDate} ${info.pickupTime} — ${info.returnDate} ${info.returnTime}`;
      
      // Передаём параметры в зависимости от направления конфликта
      if (isPickupVsReturn) {
        // Забор редактируемого конфликтует с возвратом другого
        // "Возврат [другого] в [info.returnTime] конфликтует с забором [редактируемого] в [businessPickupTime]"
        warningMessage = formatPendingConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          conflictingOrderDates: conflictingOrderDates,
          currentReturnTime: info.returnTime,       // ← время возврата ДРУГОГО заказа
          nextPickupTime: businessPickupTime,       // ← время забора РЕДАКТИРУЕМОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      } else {
        // Возврат редактируемого конфликтует с забором другого (по умолчанию)
        // "Возврат [редактируемого] в [businessReturnTime] конфликтует с забором [другого] в [info.pickupTime]"
        warningMessage = formatPendingConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          conflictingOrderDates: conflictingOrderDates,
          currentReturnTime: businessReturnTime,    // ← время возврата РЕДАКТИРУЕМОГО заказа
          nextPickupTime: info.pickupTime,          // ← время забора ДРУГОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      }
      return;
    }

    // 🔴 confirmed → confirmed = BLOCK
    if (editingConfirmed && otherConfirmed) {
      hasBlock = true;
      
      // Определяем направление конфликта:
      // Если редактируемый начинается после/около конца другого,
      // сообщение строим как "возврат другого vs забор редактируемого".
      const isPickupVsReturn = editingStart && otherEnd && otherEnd.isSameOrBefore(editingStart);
      
      const gapReturnVsPickup = otherStart.diff(editingEnd, "minute", true);
      const gapPickupVsReturn = editingStart.diff(otherEnd, "minute", true);
      const actualGapMinutes = Math.round(
        isPickupVsReturn ? gapPickupVsReturn : gapReturnVsPickup
      );

      // Передаём параметры в зависимости от направления конфликта
      if (isPickupVsReturn) {
        // Забор редактируемого конфликтует с возвратом другого
        blockMessage = formatConfirmedConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          currentReturnTime: info.returnTime,       // ← время возврата ДРУГОГО заказа
          nextPickupTime: businessPickupTime,       // ← время забора РЕДАКТИРУЕМОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      } else {
        // Возврат редактируемого конфликтует с забором другого (по умолчанию)
        blockMessage = formatConfirmedConflictMessage({
          conflictingOrderName: info.name,
          conflictingOrderEmail: order.email || null,
          currentReturnTime: businessReturnTime,    // ← время возврата РЕДАКТИРУЕМОГО заказа
          nextPickupTime: info.pickupTime,          // ← время забора ДРУГОГО заказа
          actualGapMinutes: actualGapMinutes,
          requiredBufferHours: effectiveBufferHours,
        });
      }
    }
  });

  // Формируем summary (только один message)
  if (hasBlock) {
    result.hasBlockingConflict = true;
    result.summary = {
      level: "block",
      message: blockMessage,
    };
  } else if (hasWarning) {
    result.summary = {
      level: "warning",
      message: warningMessage,
    };
  }

  return result;
}

export default analyzeOrderTimeConflicts;
