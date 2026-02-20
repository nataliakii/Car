/**
 * Contextual Time Restriction Messages
 *
 * Генерирует контекстные сообщения об ограничениях времени.
 *
 * Объясняет:
 * - Следующий подтверждённый BUSINESS заказ
 * - Следующий подтверждённый INTERNAL блок
 * - Ожидающие бизнес-заявки
 *
 * Пример:
 * "Next confirmed client rental starts at 14:00.
 * Car must be returned before 12:00."
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BUSINESS_TZ, formatTime, formatDate } from "../time/businessTime";
import { getOrderOwnership, isBusinessOrder, isInternalOrder } from "../booking/orderOwnership";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * @typedef {Object} TimeRestriction
 * @property {string} type - "pickup" | "return"
 * @property {string} constraintTime - Время ограничения (HH:mm)
 * @property {string} recommendedTime - Рекомендуемое время
 * @property {string} reason - Причина ограничения
 * @property {string} message - Человекочитаемое сообщение
 * @property {Object} conflictOrder - Заказ, вызывающий конфликт
 */

/**
 * Буфер в часах: только из company.bufferTime. Если не передан — 0 (без буфера).
 */
function effectiveBufferHours(bufferHours) {
  return typeof bufferHours === "number" && !isNaN(bufferHours) && bufferHours >= 0 ? bufferHours : 0;
}

/**
 * Получает сообщение об ограничении времени получения (pickup)
 *
 * @param {Object} params
 * @param {string} params.pickupDate - Дата получения YYYY-MM-DD
 * @param {Array} params.existingOrders - Существующие заказы на машину
 * @param {number} [params.bufferHours] - Буфер в часах (только из company.bufferTime)
 * @param {string} [params.locale="ru"] - Язык сообщений
 * @returns {TimeRestriction|null}
 */
export function getPickupTimeRestriction({ pickupDate, existingOrders, bufferHours, locale = "ru" }) {
  if (!pickupDate || !existingOrders?.length) {
    return null;
  }

  // Ищем заказы, которые ЗАКАНЧИВАЮТСЯ в день получения
  const endingOrders = existingOrders.filter((order) => {
    if (!order.confirmed) return false;
    const endDate = dayjs(order.rentalEndDate).tz(BUSINESS_TZ).format("YYYY-MM-DD");
    return endDate === pickupDate;
  });

  if (endingOrders.length === 0) {
    return null;
  }

  // Сортируем по времени окончания (от позднего к раннему)
  const sortedOrders = endingOrders.sort((a, b) => {
    return dayjs(b.timeOut).valueOf() - dayjs(a.timeOut).valueOf();
  });

  // Берём заказ с самым поздним временем окончания
  const lastEndingOrder = sortedOrders[0];
  const returnTime = dayjs(lastEndingOrder.timeOut).tz(BUSINESS_TZ);
  const minPickupTime = returnTime.add(effectiveBufferHours(bufferHours), "hour");

  const ownership = getOrderOwnership(lastEndingOrder);
  const isBusiness = ownership.ownership === "business";

  // Генерируем сообщение
  const messages = {
    ru: {
      business: `Предыдущий клиент возвращает машину в ${formatTime(lastEndingOrder.timeOut)}. Получение возможно с ${minPickupTime.format("HH:mm")}.`,
      internal: `Машина освобождается после внутреннего использования в ${formatTime(lastEndingOrder.timeOut)}. Получение возможно с ${minPickupTime.format("HH:mm")}.`,
    },
    en: {
      business: `Previous client returns the car at ${formatTime(lastEndingOrder.timeOut)}. Pickup available from ${minPickupTime.format("HH:mm")}.`,
      internal: `Car available after internal use at ${formatTime(lastEndingOrder.timeOut)}. Pickup available from ${minPickupTime.format("HH:mm")}.`,
    },
    el: {
      business: `Ο προηγούμενος πελάτης επιστρέφει το αυτοκίνητο στις ${formatTime(lastEndingOrder.timeOut)}. Παραλαβή διαθέσιμη από ${minPickupTime.format("HH:mm")}.`,
      internal: `Το αυτοκίνητο διαθέσιμο μετά την εσωτερική χρήση στις ${formatTime(lastEndingOrder.timeOut)}. Παραλαβή διαθέσιμη από ${minPickupTime.format("HH:mm")}.`,
    },
  };

  const localeMessages = messages[locale] || messages.ru;

  return {
    type: "pickup",
    constraintTime: formatTime(lastEndingOrder.timeOut),
    recommendedTime: minPickupTime.format("HH:mm"),
    reason: isBusiness ? "previous_client_rental" : "internal_use",
    message: isBusiness ? localeMessages.business : localeMessages.internal,
    conflictOrder: lastEndingOrder,
    ownership: ownership.ownership,
    bufferHours: effectiveBufferHours(bufferHours),
  };
}

/**
 * Получает сообщение об ограничении времени возврата
 *
 * @param {Object} params
 * @param {string} params.returnDate - Дата возврата YYYY-MM-DD
 * @param {Array} params.existingOrders - Существующие заказы на машину
 * @param {number} [params.bufferHours] - Буфер в часах (только из company.bufferTime)
 * @param {string} [params.locale="ru"] - Язык сообщений
 * @returns {TimeRestriction|null}
 */
export function getReturnTimeRestriction({ returnDate, existingOrders, bufferHours, locale = "ru" }) {
  if (!returnDate || !existingOrders?.length) {
    return null;
  }

  // Ищем заказы, которые НАЧИНАЮТСЯ в день возврата
  const startingOrders = existingOrders.filter((order) => {
    if (!order.confirmed) return false;
    const startDate = dayjs(order.rentalStartDate).tz(BUSINESS_TZ).format("YYYY-MM-DD");
    return startDate === returnDate;
  });

  if (startingOrders.length === 0) {
    return null;
  }

  // Сортируем по времени начала (от раннего к позднему)
  const sortedOrders = startingOrders.sort((a, b) => {
    return dayjs(a.timeIn).valueOf() - dayjs(b.timeIn).valueOf();
  });

  // Берём заказ с самым ранним временем начала
  const firstStartingOrder = sortedOrders[0];
  const pickupTime = dayjs(firstStartingOrder.timeIn).tz(BUSINESS_TZ);
  const maxReturnTime = pickupTime.subtract(effectiveBufferHours(bufferHours), "hour");

  const ownership = getOrderOwnership(firstStartingOrder);
  const isBusiness = ownership.ownership === "business";

  // Генерируем сообщение
  const messages = {
    ru: {
      business: `Следующий клиент забирает машину в ${formatTime(firstStartingOrder.timeIn)}. Машину необходимо вернуть до ${maxReturnTime.format("HH:mm")}.`,
      internal: `Машина зарезервирована для внутреннего использования с ${formatTime(firstStartingOrder.timeIn)}. Необходимо вернуть до ${maxReturnTime.format("HH:mm")}.`,
    },
    en: {
      business: `Next client pickup at ${formatTime(firstStartingOrder.timeIn)}. Car must be returned before ${maxReturnTime.format("HH:mm")}.`,
      internal: `Car reserved for internal use from ${formatTime(firstStartingOrder.timeIn)}. Must be returned before ${maxReturnTime.format("HH:mm")}.`,
    },
    el: {
      business: `Ο επόμενος πελάτης παραλαμβάνει στις ${formatTime(firstStartingOrder.timeIn)}. Το αυτοκίνητο πρέπει να επιστραφεί πριν τις ${maxReturnTime.format("HH:mm")}.`,
      internal: `Το αυτοκίνητο είναι κρατημένο για εσωτερική χρήση από ${formatTime(firstStartingOrder.timeIn)}. Πρέπει να επιστραφεί πριν τις ${maxReturnTime.format("HH:mm")}.`,
    },
  };

  const localeMessages = messages[locale] || messages.ru;

  return {
    type: "return",
    constraintTime: formatTime(firstStartingOrder.timeIn),
    recommendedTime: maxReturnTime.format("HH:mm"),
    reason: isBusiness ? "next_client_rental" : "internal_reservation",
    message: isBusiness ? localeMessages.business : localeMessages.internal,
    conflictOrder: firstStartingOrder,
    ownership: ownership.ownership,
    bufferHours: effectiveBufferHours(bufferHours),
  };
}

/**
 * Получает сообщения об ожидающих бизнес-заявках
 *
 * @param {Object} params
 * @param {string} params.startDate - Дата начала YYYY-MM-DD
 * @param {string} params.endDate - Дата конца YYYY-MM-DD
 * @param {Array} params.existingOrders - Существующие заказы
 * @param {string} [params.locale="ru"]
 * @returns {Array<Object>}
 */
export function getPendingBusinessWarnings({ startDate, endDate, existingOrders, locale = "ru" }) {
  if (!startDate || !endDate || !existingOrders?.length) {
    return [];
  }

  const start = dayjs.tz(startDate, "YYYY-MM-DD", BUSINESS_TZ).startOf("day");
  const end = dayjs.tz(endDate, "YYYY-MM-DD", BUSINESS_TZ).startOf("day");

  // Ищем ожидающие бизнес-заявки в диапазоне
  const pendingBusiness = existingOrders.filter((order) => {
    if (order.confirmed) return false;
    if (!isBusinessOrder(order)) return false;

    const orderStart = dayjs.utc(order.rentalStartDate).tz(BUSINESS_TZ).startOf("day");
    const orderEnd = dayjs.utc(order.rentalEndDate).tz(BUSINESS_TZ).startOf("day");

    // Проверяем пересечение диапазонов
    return orderStart.isBefore(end) && orderEnd.isAfter(start);
  });

  if (pendingBusiness.length === 0) {
    return [];
  }

  const messages = {
    ru: (order) =>
      `Есть заявка клиента на ${formatDate(order.rentalStartDate, "DD.MM")} - ${formatDate(order.rentalEndDate, "DD.MM")} (ожидает подтверждения)`,
    en: (order) =>
      `Pending client request for ${formatDate(order.rentalStartDate, "DD.MM")} - ${formatDate(order.rentalEndDate, "DD.MM")}`,
    el: (order) =>
      `Αίτημα πελάτη για ${formatDate(order.rentalStartDate, "DD.MM")} - ${formatDate(order.rentalEndDate, "DD.MM")} (εκκρεμεί)`,
  };

  const getMessage = messages[locale] || messages.ru;

  return pendingBusiness.map((order) => ({
    type: "pending_business",
    order,
    message: getMessage(order),
    customerName: order.customerName,
    phone: order.phone,
    startDate: formatDate(order.rentalStartDate, "DD.MM.YY"),
    endDate: formatDate(order.rentalEndDate, "DD.MM.YY"),
  }));
}

/**
 * Получает все ограничения для нового заказа
 *
 * @param {Object} params
 * @param {string} params.pickupDate - YYYY-MM-DD
 * @param {string} params.returnDate - YYYY-MM-DD
 * @param {Array} params.existingOrders
 * @param {number} [params.bufferHours] - Буфер в часах (только из company.bufferTime)
 * @param {string} [params.locale="ru"]
 * @returns {Object}
 */
export function getAllTimeRestrictions({ pickupDate, returnDate, existingOrders, bufferHours, locale = "ru" }) {
  const pickupRestriction = getPickupTimeRestriction({
    pickupDate,
    existingOrders,
    bufferHours,
    locale,
  });

  const returnRestriction = getReturnTimeRestriction({
    returnDate,
    existingOrders,
    bufferHours,
    locale,
  });

  const pendingWarnings = getPendingBusinessWarnings({
    startDate: pickupDate,
    endDate: returnDate,
    existingOrders,
    locale,
  });

  return {
    pickup: pickupRestriction,
    return: returnRestriction,
    pendingWarnings,
    hasPickupRestriction: !!pickupRestriction,
    hasReturnRestriction: !!returnRestriction,
    hasPendingWarnings: pendingWarnings.length > 0,
    hasAnyRestriction:
      !!pickupRestriction || !!returnRestriction || pendingWarnings.length > 0,
  };
}

/**
 * Форматирует все ограничения в единый текст
 *
 * @param {Object} restrictions - Результат getAllTimeRestrictions
 * @returns {string}
 */
export function formatRestrictionsAsText(restrictions) {
  const parts = [];

  if (restrictions.pickup) {
    parts.push(restrictions.pickup.message);
  }

  if (restrictions.return) {
    parts.push(restrictions.return.message);
  }

  restrictions.pendingWarnings.forEach((warning) => {
    parts.push(warning.message);
  });

  return parts.join("\n\n");
}
