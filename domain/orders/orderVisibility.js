/**
 * orderVisibility.js
 * 
 * ЧИСТАЯ ЛОГИКА visibility.
 * 
 * ❗ Никаких fetch, session, response, mongoose
 * ❗ Только правила "что скрывать"
 * 
 * Правила:
 * - SUPERADMIN → всё видно
 * - ADMIN + internal order → всё видно
 * - ADMIN + confirmed client order → всё видно
 * - ADMIN + unconfirmed client order → PII скрыты
 * - НЕ-админ → PII скрыты для client orders
 */

import { ROLE } from "./admin-rbac";

export const CLIENT_PRIVATE_FIELDS = [
  "customerName",
  "phone",
  "email",
  "Viber",
  "Whatsapp",
  "Telegram",
];

const CLIENT_PRIVATE_META_FIELDS = ["confirmationEmailHistory"];

/**
 * Удаляет PII из заказа
 */
function stripPII(order) {
  const clean = { ...order };
  for (const field of CLIENT_PRIVATE_FIELDS) {
    delete clean[field];
  }
  for (const field of CLIENT_PRIVATE_META_FIELDS) {
    delete clean[field];
  }
  clean._visibility = {
    hideClientContacts: true,
    reason: "Client PII hidden",
  };
  return clean;
}

/**
 * Применяет visibility к одному заказу.
 * 
 * @param {Object} order - Plain object
 * @param {Object} user - session.user
 * @returns {Object} Order с примененной visibility
 */
export function applyVisibilityToOrder(order, user) {
  if (!order) return order;

  // SUPERADMIN → всё видно
  if (user?.isAdmin && user.role === ROLE.SUPERADMIN) {
    return order;
  }

  // INTERNAL order (my_order === false) → всё видно
  if (order.my_order === false) {
    return order;
  }

  // CLIENT order (my_order === true)
  const isConfirmed = order.confirmed === true;
  const isAdmin = user?.isAdmin === true;

  // ADMIN + confirmed client order → всё видно
  if (isAdmin && isConfirmed) {
    return order;
  }

  // ❗ НЕ-админ НИКОГДА не видит PII
  // ❗ ADMIN + unconfirmed client order → PII скрыты
  return stripPII(order);
}

/**
 * Применяет visibility к массиву заказов.
 */
export function applyVisibilityToOrders(orders, user) {
  if (!Array.isArray(orders)) return orders;
  return orders.map((o) => applyVisibilityToOrder(o, user));
}

/**
 * Получает информацию о visibility для UI.
 */
export function getOrderVisibility(order, user) {
  if (user?.isAdmin && user.role === ROLE.SUPERADMIN) {
    return { hideClientContacts: false, reason: null };
  }

  if (order?.my_order === false) {
    return { hideClientContacts: false, reason: null };
  }

  const isConfirmed = order?.confirmed === true;
  const isAdmin = user?.isAdmin === true;

  if (isAdmin && isConfirmed) {
    return { hideClientContacts: false, reason: null };
  }

  return {
    hideClientContacts: true,
    reason: "Client PII hidden",
  };
}
