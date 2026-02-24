/**
 * orderNotificationDispatcher.js
 * 
 * ════════════════════════════════════════════════════════════════
 * ЕДИНАЯ ТОЧКА ОТПРАВКИ УВЕДОМЛЕНИЙ
 * ════════════════════════════════════════════════════════════════
 * 
 * 🔑 КЛЮЧЕВОЙ ПРИНЦИП:
 * UI и backend НЕ отправляют уведомления напрямую.
 * Они вызывают notifyOrderAction() — и всё.
 * 
 * 🧭 Схема:
 * notifyOrderAction()
 *     ↓
 * getOrderAccess()        ← ЕДИНАЯ логика прав
 *     ↓
 * isActionAllowedByAccess() ← 🛑 SAFETY CHECK
 *     ↓
 * getOrderNotifications() ← декларативно
 *     ↓
 * sanitizePayload()       ← PII firewall
 *     ↓
 * auditLog()              ← compliance
 *     ↓
 * dispatchOrderNotifications()
 */

import { 
  getOrderNotifications, 
  getActionIntent, 
  isActionAllowedByAccess,
  getPriorityByIntent,
} from "./orderNotificationPolicy";
import { getOrderAccess } from "./orderAccessPolicy";
import { getBusinessDaySpanFromStoredDates } from "./numberOfDays";
import { getTimeBucket, fromServerUTC } from "@/domain/time/athensTime";
import { ROLE } from "./admin-rbac";
import { getApiUrl, sendTelegramMessage } from "@utils/action";
import { DEVELOPER_EMAIL } from "@config/email";
import { renderCustomerOrderConfirmationEmail, renderAdminOrderNotificationEmail } from "@/app/ui/email/renderEmail";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {"UI" | "BACKEND" | "CRON" | "SYSTEM"} NotificationSource
 */

/**
 * @typedef {Object} NotificationPayload
 * @property {string} orderId - Order ID
 * @property {string} [orderNumber] - Order number for display
 * @property {string} [regNumber] - Car registration number (preferred)
 * @property {string} [carNumber] - Legacy internal car number (fallback)
 * @property {string} [carModel] - Car model name
 * @property {Date|string} [rentalStartDate] - Rental start
 * @property {Date|string} [rentalEndDate] - Rental end
 * @property {number} [totalPrice] - Total price
 * @property {string} [customerName] - Customer name (if PII allowed)
 * @property {string} [phone] - Customer phone (if PII allowed)
 * @property {string} [email] - Customer email (if PII allowed)
 * @property {boolean} [secondDriver] - Second driver selected
 * @property {boolean} [Viber] - Prefer Viber contact
 * @property {boolean} [Whatsapp] - Prefer Whatsapp contact
 * @property {boolean} [Telegram] - Prefer Telegram contact
 * @property {number | null} [oldPrice] - Effective price before update
 * @property {number | null} [newPrice] - Effective price after update
 * @property {string} action - Action performed
 * @property {string} intent - Action intent (from ACTION_INTENT)
 * @property {string} [actorName] - Who performed the action
 * @property {NotificationSource} source - Where the action originated
 * @property {Date} timestamp - When the action was performed
 */

// ════════════════════════════════════════════════════════════════
// PII SANITIZER (ОБЯЗАТЕЛЬНЫЙ)
// ════════════════════════════════════════════════════════════════

/**
 * Список PII полей, которые могут быть в payload.
 */
const PII_FIELDS = ["customerName", "phone", "email", "Viber", "Whatsapp", "Telegram"];

/**
 * Санитайзер payload — гарантирует что PII не утечёт.
 * - SUPERADMIN: всегда с контактами клиента (девелоперу).
 * - CUSTOMER: всегда с контактами (клиент получает свои данные).
 * - COMPANY_EMAIL: никогда не включаем контакты клиента (политика задаёт includePII: false, здесь явно стрипим).
 * - Остальные: по флагу includePII и access.canSeeClientPII.
 *
 * @param {NotificationPayload} payload
 * @param {import("./orderAccessPolicy").OrderAccess} access
 * @param {boolean} includePII - Флаг из notification
 * @param {string} [target] - SUPERADMIN | CUSTOMER | COMPANY_EMAIL | ...
 * @returns {NotificationPayload}
 */
function sanitizePayload(payload, access, includePII, target) {
  if (target === "COMPANY_EMAIL") {
    const sanitized = { ...payload };
    for (const field of PII_FIELDS) {
      delete sanitized[field];
    }
    return sanitized;
  }

  const allowPII =
    target === "SUPERADMIN" ||
    target === "CUSTOMER" ||
    (includePII && access?.canSeeClientPII);
  if (allowPII) {
    return payload;
  }

  const sanitized = { ...payload };
  for (const field of PII_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}

// ════════════════════════════════════════════════════════════════
// AUDIT LOG (compliance-ready)
// ════════════════════════════════════════════════════════════════

/**
 * Audit log hook — логирует ВСЕ действия над заказами.
 * 
 * @param {Object} params
 * @param {Object} params.order
 * @param {Object} params.user
 * @param {string} params.action
 * @param {import("./orderAccessPolicy").OrderAccess} params.access
 * @param {string} params.intent
 * @param {NotificationSource} params.source
 */
async function auditLog({ order, user, action, access, intent, source }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    orderId: order?._id?.toString?.() || order?._id,
    action,
    intent,
    source,
    actor: {
      email: user?.email,
      role: user?.role,
    },
    access: {
      canEdit: access?.canEdit,
      canDelete: access?.canDelete,
      canSeeClientPII: access?.canSeeClientPII,
    },
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[AUDIT]", JSON.stringify(logEntry, null, 2));
    return;
  }

  // TODO: Интеграция с внешним audit storage
  // - MongoDB collection (AuditLog)
  // - S3 bucket
  // - External service (Datadog, Sentry, etc.)
  // 
  // Example:
  // await AuditLog.create(logEntry);
}

// ════════════════════════════════════════════════════════════════
// CHANNEL IMPLEMENTATIONS
// ════════════════════════════════════════════════════════════════

/**
 * Форматирует дату в DD-MM-YY для уведомлений.
 * @param {Date|string} d
 * @returns {string}
 */
function formatDateShort(d) {
  if (!d) return "—";
  const athens = fromServerUTC(d);
  if (!athens || !athens.isValid()) return "—";
  return athens.format("DD-MM-YY");
}

/**
 * Форматирует payload в текст для Telegram/email.
 * Для нового заказа (ORDER_CREATED) — полный блок с данными клиента.
 * @param {NotificationPayload} payload
 * @param {string} reason
 * @returns {string}
 */
function formatNotificationText(payload, reason) {
  const carRegNumber =
    payload.regNumber && String(payload.regNumber).trim()
      ? String(payload.regNumber).trim()
      : payload.carNumber && String(payload.carNumber).trim()
        ? String(payload.carNumber).trim()
        : "";
  const carDisplay = carRegNumber
    ? `${payload.carModel || "—"} (${carRegNumber})`
    : payload.carModel || "—";

  if (payload.intent === "ORDER_CREATED") {
    const days =
      payload.numberOfDays ??
      getBusinessDaySpanFromStoredDates(payload.rentalStartDate, payload.rentalEndDate);
    const customerLines = [
      payload.customerName != null ? `• Name: ${payload.customerName}` : null,
      payload.phone != null ? `• Phone: ${payload.phone}` : null,
      payload.email != null && payload.email !== "" ? `• Email: ${payload.email}` : null,
      payload.Viber === true ? "• Viber ✓" : null,
      payload.Whatsapp === true ? "• Whatsapp ✓" : null,
      payload.Telegram === true ? "• Telegram ✓" : null,
    ].filter(Boolean);
    const hasPII = customerLines.length > 0;
    const lines = [
      `🆕 NEW ORDER #${payload.orderNumber || payload.orderId}`,
      `🚗 Car: ${carDisplay}`,
      `📅 From: ${formatDateShort(payload.rentalStartDate)}`,
      `📅 To: ${formatDateShort(payload.rentalEndDate)}`,
      `🗓 Days: ${days}`,
      `💰 Total: €${payload.totalPrice ?? ""}`,
      ...(hasPII ? ["", "👤 Customer:", ...customerLines, "------------"] : []),
    ].filter(Boolean);
    return lines.join("\n");
  }

  const oldPrice =
    typeof payload.oldPrice === "number" && !Number.isNaN(payload.oldPrice)
      ? payload.oldPrice
      : null;
  const newPrice =
    typeof payload.newPrice === "number" && !Number.isNaN(payload.newPrice)
      ? payload.newPrice
      : null;

  const lines = [
    reason,
    "",
    `Заказ: ${payload.orderNumber || payload.orderId}`,
    `Авто: ${carDisplay || "—"}`,
    `Действие: ${payload.action}`,
    oldPrice !== null ? `Старая цена: €${oldPrice.toFixed(2)}` : null,
    newPrice !== null ? `Новая цена: €${newPrice.toFixed(2)}` : null,
    payload.actorName ? `Кто: ${payload.actorName}` : null,
    `Источник: ${payload.source}`,
    payload.timestamp ? `Время: ${new Date(payload.timestamp).toISOString()}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function getEffectivePrice(order) {
  if (!order || typeof order !== "object") return null;
  if (
    typeof order.OverridePrice === "number" &&
    !Number.isNaN(order.OverridePrice)
  ) {
    return Number(order.OverridePrice);
  }
  if (typeof order.totalPrice === "number" && !Number.isNaN(order.totalPrice)) {
    return Number(order.totalPrice);
  }
  return null;
}

/**
 * Форматирует письмо для клиента: title, text, html из единого рендерера (app/ui/email).
 * @param {NotificationPayload} payload
 * @returns {{ title: string, body: string, bodyHtml: string }}
 */
function formatCustomerEmailContent(payload) {
  const { title, text, html } = renderCustomerOrderConfirmationEmail(payload);
  return {
    title,
    body: text,
    bodyHtml: html,
  };
}

/**
 * Отправляет уведомление в Telegram.
 *
 * @param {string} target - Recipient (SUPERADMIN, DEVELOPERS, etc.)
 * @param {NotificationPayload} payload
 * @param {string} reason
 * @param {"CRITICAL" | "INFO" | "DEBUG"} priority
 */
async function sendTelegramNotification(target, payload, reason, priority) {
  const emoji = priority === "CRITICAL" ? "🚨" : priority === "INFO" ? "ℹ️" : "🔍";
  const text = `${emoji} ${reason}\n\n${formatNotificationText(payload, reason)}`;
  const sent = await sendTelegramMessage(text);
  if (process.env.NODE_ENV !== "production" && !sent) {
    console.log(`[TELEGRAM → ${target}] [${priority}] (send failed, logged)`, reason, payload);
  }
}

/**
 * Отправляет уведомление по email.
 * Получатель по target (политика уже не даёт COMPANY_EMAIL при EMAIL_TESTING):
 * - CUSTOMER и payload.email → to = клиент, cc = DEVELOPER_EMAIL
 * - COMPANY_EMAIL и companyEmail → to = компания, cc = DEVELOPER_EMAIL
 * - Иначе → to = DEVELOPER_EMAIL, cc пусто
 * DEVELOPER_EMAIL всегда в to или в cc.
 *
 * @param {string} target - Из getOrderNotifications (SUPERADMIN, COMPANY_EMAIL, etc.)
 * @param {NotificationPayload} payload
 * @param {string} reason
 * @param {"CRITICAL" | "INFO" | "DEBUG"} priority
 * @param {string} [companyEmail] - Email компании из БД (для target COMPANY_EMAIL)
 */
async function sendEmailNotification(target, payload, reason, priority, companyEmail) {
  // Режим тестирования решается в orderNotificationPolicy (COMPANY_EMAIL не добавляется при EMAIL_TESTING).
  const customerEmail = payload.email && String(payload.email).trim();
  const sendToCustomer = target === "CUSTOMER" && customerEmail;
  const sendToCompany = target === "COMPANY_EMAIL" && companyEmail;
  let to;
  let cc;
  if (sendToCustomer) {
    to = [customerEmail];
    cc = [DEVELOPER_EMAIL];
  } else if (sendToCompany) {
    to = [companyEmail];
    cc = [DEVELOPER_EMAIL];
  } else {
    to = [DEVELOPER_EMAIL];
    cc = [];
  }

  let title;
  let body;
  let html;
  if (sendToCustomer) {
    const customerContent = formatCustomerEmailContent(payload);
    title = customerContent.title;
    body = customerContent.body;
    html = customerContent.bodyHtml;
  } else {
    const emoji = priority === "CRITICAL" ? "🚨" : priority === "INFO" ? "ℹ️" : "🔍";
    title = `${emoji} ${reason}`;
    body = formatNotificationText(payload, reason);
    html = renderAdminOrderNotificationEmail(title, body);
  }

  const toList = Array.isArray(to) ? to.filter(Boolean) : [];
  const ccList = Array.isArray(cc) ? cc.filter(Boolean) : [];
  if (toList.length === 0 && !sendToCustomer) {
    toList.push(DEVELOPER_EMAIL);
  }

  try {
    const url = getApiUrl("/api/sendEmail");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "",
        emailCompany: DEVELOPER_EMAIL,
        title,
        message: body,
        html: html || undefined,
        to: toList,
        cc: ccList,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[EMAIL → ${target}] [${priority}] (send failed)`, reason, err?.message);
    }
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════
// DISPATCHER (internal, не экспортируем напрямую)
// ════════════════════════════════════════════════════════════════

/**
 * Отправляет все уведомления для действия над заказом.
 *
 * @param {import("./orderNotificationPolicy").Notification[]} notifications
 * @param {NotificationPayload} payload
 * @param {import("./orderAccessPolicy").OrderAccess} access
 * @param {string} [companyEmail] - Email компании из БД (для target COMPANY_EMAIL)
 */
async function dispatchOrderNotifications(notifications, payload, access, companyEmail) {
  if (!notifications || notifications.length === 0) {
    return;
  }
  
  const intent = payload.intent;
  const promises = [];
  const failures = [];
  
  for (const notification of notifications) {
    const { target, channels, reason, includePII } = notification;
    
    // Priority вычисляется декларативно по intent
    const priority = getPriorityByIntent(intent);
    
    // 🔒 Санитайзим payload (SUPERADMIN всегда получает PII)
    const safePayload = sanitizePayload(payload, access, includePII, target);
    
    for (const channel of channels) {
      if (channel === "TELEGRAM") {
        promises.push(
          sendTelegramNotification(target, safePayload, reason, priority)
            .catch(err => {
              failures.push({ channel, target, reason, err });
              throw err;
            })
        );
      }
      
      if (channel === "EMAIL") {
        promises.push(
          sendEmailNotification(target, safePayload, reason, priority, companyEmail)
            .catch(err => {
              failures.push({ channel, target, reason, err });
              throw err;
            })
        );
      }
    }
  }
  
  // Отправляем параллельно; ошибки агрегируем и отдаём наверх вызывающему коду.
  await Promise.allSettled(promises);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `[Notification Error] ${failure.channel} → ${failure.target}:`,
        failure.err
      );
    }

    const firstErrorMessage = failures[0]?.err?.message || "Unknown notification error";
    throw new Error(
      `Notification dispatch failed (${failures.length} channel(s)): ${firstErrorMessage}`
    );
  }
}

// ════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT (ЕДИНСТВЕННЫЙ ЭКСПОРТ)
// ════════════════════════════════════════════════════════════════

/**
 * 🔑 ЕДИНСТВЕННАЯ ФУНКЦИЯ, КОТОРУЮ НУЖНО ВЫЗЫВАТЬ.
 * 
 * Вычисляет и отправляет уведомления для действия над заказом.
 * 
 * @param {Object} params
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User from session
 * @param {import("./orderNotificationPolicy").OrderAction} params.action
 * @param {string} [params.actorName] - Who performed the action
 * @param {NotificationSource} [params.source="UI"] - Where the action originated
 * @param {string} [params.companyEmail] - Email компании из БД (для target COMPANY_EMAIL при EMAIL_TESTING=false)
 * @param {string} [params.locale] - Язык клиента (en, ru, el) для письма клиенту
 */
export async function notifyOrderAction({
  order,
  previousOrder = null,
  user,
  action,
  actorName,
  source = "UI",
  companyEmail,
  locale,
}) {
  if (!order || !user) {
    return;
  }
  
  // Вычисляем access из orderAccessPolicy (timeBucket обязателен)
  const isSuperAdmin = user.role === ROLE.SUPERADMIN;
  const timeBucket = getTimeBucket(order);
  const access = getOrderAccess({
    role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
    isClientOrder: order.my_order === true,
    confirmed: order.confirmed === true,
    isPast: timeBucket === "PAST",
    timeBucket,
  });
  
  const intent = getActionIntent(action);
  
  // ════════════════════════════════════════════════════════════════
  // 🛑 SAFETY CHECK: действие должно быть разрешено access policy
  // ════════════════════════════════════════════════════════════════
  if (!isActionAllowedByAccess(action, access)) {
    console.warn(
      `[NOTIFY BLOCKED] Action ${action} is not allowed by access policy`,
      { 
        orderId: order._id, 
        intent,
        source,
        access: {
          canEdit: access?.canEdit,
          canDelete: access?.canDelete,
          canConfirm: access?.canConfirm,
        },
      }
    );
    return;
  }
  
  // ════════════════════════════════════════════════════════════════
  // 📝 AUDIT LOG (всегда, даже если нет уведомлений)
  // ════════════════════════════════════════════════════════════════
  await auditLog({ order, user, action, access, intent, source });
  
  // Получаем список уведомлений
  const notifications = getOrderNotifications({
    action,
    access,
    order,
  });
  
  if (notifications.length === 0) {
    return;
  }
  
  // Формируем payload (все поля для формата NEW ORDER и PII для SUPERADMIN)
  const payload = {
    orderId: order._id?.toString?.() || order._id,
    orderNumber: order.orderNumber,
    regNumber: order.regNumber || order.car?.regNumber || "",
    carNumber: order.carNumber,
    carModel: order.carModel,
    rentalStartDate: order.rentalStartDate,
    rentalEndDate: order.rentalEndDate,
    timeIn: order.timeIn,
    timeOut: order.timeOut,
    placeIn: order.placeIn,
    placeOut: order.placeOut,
    numberOfDays: order.numberOfDays,
    ChildSeats: order.ChildSeats ?? order.childSeats ?? 0,
    insurance: order.insurance,
    flightNumber: order.flightNumber,
    totalPrice: order.totalPrice,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email ?? "",
    secondDriver: order.secondDriver === true,
    Viber: order.Viber === true,
    Whatsapp: order.Whatsapp === true,
    Telegram: order.Telegram === true,
    action,
    intent,
    actorName,
    source,
    timestamp: new Date(),
    locale: locale || order.locale || "en",
    oldPrice: getEffectivePrice(previousOrder),
    newPrice: getEffectivePrice(order),
  };
  
  await dispatchOrderNotifications(notifications, payload, access, companyEmail);
}
