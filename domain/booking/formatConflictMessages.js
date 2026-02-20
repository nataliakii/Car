/**
 * formatConflictMessages
 *
 * 🎯 UX-копирайт для сообщений о конфликтах заказов
 *
 * ⚠️ ВАЖНО: Только форматирование сообщений, НЕ логика конфликтов
 * Все вычисления (времена, разницы, буферы) должны быть переданы как параметры
 */

function normalizeCustomerLabel(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed === "—" || trimmed === "-") return null;
  return trimmed;
}

function isGenericCustomerLabel(label) {
  if (!label) return false;
  return label === "Клиент" || /^Заказ\s+/u.test(label);
}

function buildConflictingOrderLabel({ name, email }) {
  const safeName = normalizeCustomerLabel(name);
  const safeEmail = typeof email === "string" && email.trim() ? email.trim() : null;

  if (safeName && safeEmail) {
    if (safeName.toLowerCase() === safeEmail.toLowerCase()) return safeEmail;
    if (isGenericCustomerLabel(safeName)) return safeEmail;
    return `${safeName} (${safeEmail})`;
  }
  if (safeName) return safeName;
  if (safeEmail) return safeEmail;
  return "Клиент";
}

function formatGapText(actualGapMinutes) {
  const numericGap = Number.isFinite(actualGapMinutes)
    ? Math.round(actualGapMinutes)
    : 0;
  const sign = numericGap < 0 ? "-" : "";
  const absMinutes = Math.abs(numericGap);
  const gapHours = Math.floor(absMinutes / 60);
  const gapMins = absMinutes % 60;

  if (absMinutes === 0) {
    return "0 мин";
  }
  if (gapHours > 0 && gapMins > 0) {
    return `${sign}${gapHours} ч ${gapMins} мин`;
  }
  if (gapHours > 0) {
    return `${sign}${gapHours} ч`;
  }
  return `${sign}${gapMins} мин`;
}

/**
 * Форматирует сообщение о конфликте с подтверждённым заказом (BLOCK)
 * 
 * @param {Object} params
 * @param {string} params.conflictingOrderName - Имя клиента конфликтующего заказа
 * @param {string} [params.conflictingOrderEmail] - Email конфликтующего заказа (опционально)
 * @param {string} [params.currentReturnTime] - Время возврата текущего заказа "HH:mm" (если конфликт по возврату)
 * @param {string} [params.currentPickupTime] - Время забора текущего заказа "HH:mm" (если конфликт по забору)
 * @param {string} [params.nextPickupTime] - Время забора следующим клиентом "HH:mm" (если конфликт по возврату)
 * @param {string} [params.nextReturnTime] - Время возврата следующим клиентом "HH:mm" (если конфликт по забору)
 * @param {number} params.actualGapMinutes - Фактический интервал в минутах
 * @param {number} params.requiredBufferHours - Требуемый буфер в часах
 * @returns {string}
 */
export function formatConfirmedConflictMessage({
  conflictingOrderName,
  conflictingOrderEmail,
  currentReturnTime,
  currentPickupTime,
  nextPickupTime,
  nextReturnTime,
  actualGapMinutes,
  requiredBufferHours,
}) {
  // Определяем направление конфликта на основе переданных параметров
  // Если есть currentReturnTime и nextPickupTime → конфликт по возврату
  // Если есть currentPickupTime и nextReturnTime → конфликт по забору
  const isReturnConflict = currentReturnTime && nextPickupTime;
  const isPickupConflict = currentPickupTime && nextReturnTime;
  
  // Определяем метки динамически
  const sourceLabelCapitalized = isPickupConflict ? "Забор" : "Возврат";
  const targetLabel = isPickupConflict ? "возврат" : "забор";
  const conflictLabel = buildConflictingOrderLabel({
    name: conflictingOrderName,
    email: conflictingOrderEmail,
  });

  const sourceTime = isPickupConflict ? currentPickupTime : currentReturnTime;
  const targetTime = isPickupConflict ? nextReturnTime : nextPickupTime;
  const gapText = formatGapText(actualGapMinutes);

  return (
    `Пересечение с подтверждённым заказом «${conflictLabel}».\n` +
    `${sourceLabelCapitalized} в ${sourceTime} конфликтует с ${targetLabel}ом в ${targetTime}.\n` +
    `Реальная разница (буфер): ${gapText}, при требуемом буфере ${requiredBufferHours} ч.\n` +
    `Изменить буфер — ⚙️`
  );
}

/**
 * Форматирует сообщение о конфликте с неподтверждённым заказом (WARNING)
 * 
 * @param {Object} params
 * @param {string} params.conflictingOrderName - Имя клиента конфликтующего заказа
 * @param {string} [params.conflictingOrderEmail] - Email конфликтующего заказа (опционально)
 * @param {string} params.conflictingOrderDates - Даты конфликтующего заказа (например: "28 Янв 14:00 — 30 Янв 12:00")
 * @param {string} [params.currentReturnTime] - Время возврата текущего заказа "HH:mm" (если конфликт по возврату)
 * @param {string} [params.currentPickupTime] - Время забора текущего заказа "HH:mm" (если конфликт по забору)
 * @param {string} [params.nextPickupTime] - Время забора следующим клиентом "HH:mm" (если конфликт по возврату)
 * @param {string} [params.nextReturnTime] - Время возврата следующим клиентом "HH:mm" (если конфликт по забору)
 * @param {number} params.actualGapMinutes - Фактический интервал в минутах
 * @param {number} params.requiredBufferHours - Требуемый буфер в часах
 * @returns {string}
 */
export function formatPendingConflictMessage({
  conflictingOrderName,
  conflictingOrderEmail,
  conflictingOrderDates,
  currentReturnTime,
  currentPickupTime,
  nextPickupTime,
  nextReturnTime,
  actualGapMinutes,
  requiredBufferHours,
}) {
  // Определяем направление конфликта на основе переданных параметров
  // Если есть currentReturnTime и nextPickupTime → конфликт по возврату
  // Если есть currentPickupTime и nextReturnTime → конфликт по забору
  const isReturnConflict = currentReturnTime && nextPickupTime;
  const isPickupConflict = currentPickupTime && nextReturnTime;
  
  // Определяем метки динамически
  const sourceLabelCapitalized = isPickupConflict ? "Забор" : "Возврат";
  const targetLabel = isPickupConflict ? "возврат" : "забор";
  const conflictLabel = buildConflictingOrderLabel({
    name: conflictingOrderName,
    email: conflictingOrderEmail,
  });

  const sourceTime = isPickupConflict ? currentPickupTime : currentReturnTime;
  const targetTime = isPickupConflict ? nextReturnTime : nextPickupTime;
  const gapText = formatGapText(actualGapMinutes);

  return (
    `Пересечение с неподтверждённым заказом: «${conflictLabel}» —\n` +
    `${conflictingOrderDates}.\n` +
    `${sourceLabelCapitalized} в ${sourceTime} конфликтует с ${targetLabel}ом в ${targetTime}.\n` +
    `Реальная разница (буфер): ${gapText}, при требуемом буфере ${requiredBufferHours} ч.\n` +
    `Изменить буфер — ⚙️`
  );
}
