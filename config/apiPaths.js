/**
 * Centralized API paths. Single source of truth for internal API routes.
 * Use with getApiUrl() from utils/action for server-side fetch.
 */

export const API_PATHS = {
  CAR_ALL: "/api/car/all",
  CAR_BY_ID: (id) => `/api/car/${id}`,
  CAR_BY_SLUG: (slug) => `/api/car/slug/${encodeURIComponent(slug)}`,
  CAR_ADD_ONE: "/api/car/addOne",
  CAR_UPDATE: "/api/car/update",
  CAR_DELETE: (carId) => `/api/car/delete/${carId}`,
  CAR_MODELS: "/api/car/models",

  ORDER_ADD: "/api/order/add",
  ORDER_BY_CAR: (carId) => `/api/order/${carId}`,
  ORDER_REFETCH: "/api/order/refetch",
  ORDER_REFETCH_ACTIVE: "/api/order/refetch-active",
  ORDER_REFETCH_ONE: (orderId) => `/api/order/refetch/${orderId}`,
  ORDER_UPDATE: (orderId) => `/api/order/update/${orderId}`,
  ORDER_UPDATE_MOVE_CAR: "/api/order/update/moveCar",
  ORDER_UPDATE_CHANGE_DATES: "/api/order/update/changeDates",
  ORDER_UPDATE_CUSTOMER: "/api/order/update/customer",
  ORDER_UPDATE_SWITCH_CONFIRM: (orderId) =>
    `/api/order/update/switchConfirm/${orderId}`,
  ORDER_DELETE_ONE: (orderId) => `/api/order/deleteOne/${orderId}`,
  ORDER_CALC_TOTAL_PRICE: "/api/order/calcTotalPrice",

  COMPANY: (id) => `/api/company/${id}`,
  COMPANY_BUFFER: (id) => `/api/company/buffer/${id}`,

  ADMIN_ORDERS: "/api/admin/orders",
  ADMIN_ORDERS_SEND_CONFIRMATION: "/api/admin/orders/send-confirmation",

  DISCOUNT: "/api/discount",
  SEND_EMAIL: "/api/sendEmail",
  TELEGRAM_SEND: "/api/telegram/send",
};
