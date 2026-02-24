import { revalidateTag } from "next/cache";
import sendEmail from "./sendEmail";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.tz.setDefault("Europe/Athens");

// Normalize API base URL from env. Trim whitespace and remove trailing slash.
const RAW_API_URL =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_LOCAL_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL;

export const API_URL = RAW_API_URL
  ? String(RAW_API_URL).trim().replace(/\/$/, "")
  : "";

/**
 * Get API URL that works both on server and client
 * - Client-side: returns relative path (avoids CORS issues)
 * - Server-side: returns absolute URL (required for Server Components)
 *
 * @param {string} path - API path starting with /api/...
 * @returns {string} Full URL for server, relative path for client
 */
export function getApiUrl(path) {
  // Client-side: use relative path to avoid CORS
  if (typeof window !== "undefined") {
    return path;
  }

  // Server-side: need absolute URL
  // API_URL comes from NEXT_PUBLIC_API_BASE_URL (set in next.config.mjs)
  // In development: http://localhost:3000
  // In production: https://natali-cars.com
  if (!API_URL) {
    console.warn("[getApiUrl] API_URL is not set, using localhost fallback");
  }
  const baseUrl = API_URL || "http://localhost:3000";

  return `${baseUrl}${path}`;
}

// Fetch a single car by ID using fetch
export const fetchCar = async (id) => {
  try {
    const response = await fetch(getApiUrl(`/api/car/${id}`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      throw new Error("Car not found");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching car:", error.message);
    throw error;
  }
};

/** Fetch a single car by slug (SEO-friendly URL). */
export const fetchCarBySlug = async (slug) => {
  try {
    const response = await fetch(
      getApiUrl(`/api/car/slug/${encodeURIComponent(slug)}`),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.status === 404) throw new Error("Car not found");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching car by slug:", error.message);
    throw error;
  }
};

// Fetch all cars using fetch
export const fetchAll = async () => {
  try {
    const response = await fetch(getApiUrl(`/api/car/all`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { cache: "no-store" },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      console.error("Fetch /api/car/all failed", {
        status: response.status,
        body,
      });
      // Return empty array instead of throwing to avoid unhandled runtime errors in the UI
      return [];
    }
    const carsData = await response.json();
    return carsData;
  } catch (error) {
    console.error("Error fetching cars:", error);
    throw error;
  }
};

// Fetch all cars using fetch
// По умолчанию используем кеширование (revalidate: 600 секунд = 10 минут).
// Для мгновенно-актуальных данных (админка/оперативный UI) передавайте { skipCache: true }.
export const fetchAllCars = async (options = {}) => {
  try {
    const skipCache = Boolean(options?.skipCache);
    const response = await fetch(
      getApiUrl(`/api/car/all`),
      skipCache
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
              Pragma: "no-cache",
            },
            cache: "no-store",
          }
        : {
            method: "GET",
            cache: "force-cache",
            headers: {
              "Content-Type": "application/json",
            },
            // Кеширование: данные обновляются каждые 20 минут
            next: { revalidate: 1200, tags: ["cars"] },
          }
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      console.error("Fetch /api/car/all failed", {
        url: getApiUrl(`/api/car/all`),
        skipCache,
        status: response.status,
        body,
      });
      // Return empty array instead of throwing to avoid unhandled runtime errors in the UI
      return [];
    }
    const carsData = await response.json();
    return carsData;
  } catch (error) {
    console.error("Error fetching cars:", error);
    throw error;
  }
};

// ============================================================
// ✅ CLIENT-SAFE — Use this in public/client pages!
// Fetches orders with rentalEndDate >= today (Athens): current + future only.
// Excludes only orders that have already ended (so calendar shows all relevant blocks).
// ============================================================
export const reFetchActiveOrders = async () => {
  try {
    const response = await fetch(getApiUrl(`/api/order/refetch-active`), {
      method: "POST",
      next: { cache: "no-store" },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch active orders");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching active orders:", error);
    throw error;
  }
};

// ============================================================
// 🔴 ADMIN ONLY — Do not use in client/public pages!
// This function fetches ALL orders including historical data.
// For client pages, use reFetchActiveOrders() instead.
// ============================================================
export const reFetchAllOrders = async () => {
  try {
    const response = await fetch(getApiUrl(`/api/order/refetch`), {
      next: { cache: "no-store" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }
    const ordersData = await response.json();
    return ordersData;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

//Adding new order using new order api
export const addOrderNew = async (orderData) => {
  try {
    const response = await fetch(getApiUrl(`/api/order/add`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.status === 201) {
      return { status: "success", data: result };
    } else if (response.status === 200) {
      // Non-confirmed dates conflict
      return {
        status: "startEndConflict",
        message: result.message,
        data: result.data,
      };
    } else if (response.status === 202) {
      // Non-confirmed dates conflict
      return {
        status: "pending",
        message: result.message,
        data: result.data,
        messageCode: result.messageCode,
        dates: result.dates,
      };
    } else if (response.status === 409) {
      // Confirmed dates conflict
      return { status: "conflict", message: result.message };
    } else {
      return { status: "error", message: result.message };
      // throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error occurred:", error.message);
    // Handling fetch-specific errors
    if (error.message === "Failed to fetch") {
      return { status: "error", message: "No response received from server." };
    } else {
      return {
        status: "error",
        message: error.message || "An error occurred.",
      };
    }
  }
};

// Fetch orders by car ID using fetch
export const fetchOrdersByCar = async (carId) => {
  try {
    const response = await fetch(getApiUrl(`/api/order/${carId}`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }

    const orders = await response.json();
    return orders; // Return the orders data
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// UPDATE 0. action for moving order to another car (ADMIN and SUPERADMIN allowed)
/**
 * Move order to another car
 *
 * @param {string} orderId - Order ID
 * @param {string} newCarId - New car ID
 * @param {string} newCarNumber - New car number
 * @returns {Promise<{ status: number, updatedOrder: Object|null, conflicts: Array, message: string }>}
 */
export const moveOrderToCar = async (orderId, newCarId, newCarNumber) => {
  try {
    const response = await fetch("/api/order/update/moveCar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({
        orderId,
        newCarId,
        newCarNumber,
      }),
    });

    const data = await response.json();

    return {
      status: response.status,
      updatedOrder: data.updatedOrder || null,
      conflicts: data.conflicts || [],
      message: data.message || "Order moved successfully",
    };
  } catch (error) {
    console.error("[moveOrderToCar] Error:", error);
    throw error;
  }
};

// UPDATE 1. action for changing rental dates
export const changeRentalDates = async (
  orderId,
  newStartDate,
  newEndDate,
  timeIn,
  timeOut,
  placeIn,
  placeOut,
  car,
  carNumber, // <-- добавьте этот аргумент!
  ChildSeats,
  insurance,
  franchiseOrder,
  numberOrder,
  insuranceOrder,
  totalPrice, // <-- добавить
  numberOfDays // <-- добавить
) => {
  try {
    const response = await fetch("/api/order/update/changeDates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _id: orderId,
        rentalStartDate: newStartDate,
        rentalEndDate: newEndDate,
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        placeIn: placeIn || null,
        placeOut: placeOut || null,
        car: car || null, // <-- обязательно!
        carNumber: carNumber || null, // <-- обязательно!
        ChildSeats: ChildSeats, // ДОБАВИТЬ!
        insurance: insurance, // ДОБАВИТЬ!
        franchiseOrder: franchiseOrder, // <-- добавляем франшизу заказа!
        numberOrder: numberOrder,
        insuranceOrder: insuranceOrder,
        // Новое: сохраняем стоимость и дни
        totalPrice,
        numberOfDays,
      }),
    });

    const data = await response.json();

    if (response.status === 201) {
      // Handle success, no conflicts
      return {
        status: 201,
        message: data.message,
        updatedOrder: data.data,
      };
    } else if (response.status === 202) {
      // Handle non-confirmed conflict dates (partial update)
      return {
        status: 202,
        message: data.message,
        conflicts: data.data.nonConfirmedOrders,
        updatedOrder: data.data.updatedOrder,
      };
    } else if (response.status === 408) {
      // Handle non-confirmed conflict dates (partial update)
      return {
        status: 408,
        message: data.message,
        conflicts: data.conflictDates,
      };
    } else if (response.status === 409) {
      // Handle confirmed conflict dates (no update)
      return {
        status: 409,
        message: data.message,
        conflicts: data.confirmedOrders,
      };
    } else if (response.status === 403) {
      // Handle permission denied (protected order)
      return {
        status: 403,
        message:
          data.message ||
          "Permission denied: Only superadmin can modify this order",
        code: data.code || "PERMISSION_DENIED",
      };
    } else if (response.status === 401) {
      // Handle unauthorized
      return {
        status: 401,
        message: data.message || "Unauthorized",
      };
    } else {
      // Handle unexpected responses
      console.error("Unexpected response:", data);
      return {
        status: response.status,
        message: data.message || "Unexpected response",
        data: data,
      };
    }
  } catch (error) {
    // Handle fetch or server errors
    console.error("Error updating order:", error);
    return {
      status: 500,
      message: "Error updating order: " + error.message,
    };
  }
};

// UPDATE 2.  action for switching confirmed status
/**
 * Переключает статус подтверждения заказа
 *
 * @returns {{
 *   success: boolean,
 *   updatedOrder?: Object,
 *   message: string,
 *   level?: "block" | "warning" | null,
 *   affectedOrders?: Array,
 *   conflicts?: Array
 * }}
 */
export const toggleConfirmedStatus = async (orderId) => {
  try {
    const response = await fetch(
      getApiUrl(`/api/order/update/switchConfirm/${orderId}`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "include",
      }
    );

    const data = await response.json();

    // ✅ Успех (200) или успех с предупреждением (202)
    if (response.status === 200 || response.status === 202) {
      return {
        success: true,
        updatedOrder: data.data,
        message: data.message,
        level: data.level || null,
        affectedOrders: data.affectedOrders || [],
      };
    }

    // ⛔ Блок (409) — нельзя подтвердить
    if (response.status === 409) {
      return {
        success: false,
        message: data.message,
        level: data.level || "block",
        conflicts: data.conflicts || [],
      };
    }

    // ⛔ Permission denied (403) — только суперадмин может изменить
    if (response.status === 403) {
      return {
        success: false,
        message:
          data.message ||
          "Permission denied: Only superadmin can modify this order",
        level: "block",
        code: data.code || "PERMISSION_DENIED",
      };
    }

    // Другие ошибки
    return {
      success: false,
      message: data.message || "Ошибка при обновлении статуса",
      level: "block",
    };
  } catch (error) {
    console.error("Error updating confirmation status:", error);
    return {
      success: false,
      message: error.message || "Ошибка сети",
      level: "block",
    };
  }
};

// UPDATE 3.  action for changing customer information
export const updateCustomerInfo = async (orderId, updateData) => {
  const response = await fetch("/api/order/update/customer", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _id: orderId,
      phone: updateData.phone,
      email: updateData.email,
      customerName: updateData.customerName,
      flightNumber: updateData.flightNumber,
    }),
  });

  const data = await response.json();

  // Handle permission denied (403)
  if (response.status === 403) {
    throw new Error(
      data.message || "Permission denied: Only superadmin can modify this order"
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to update customer information");
  }

  return data;
};

/**
 * Unified order update action - single source of truth for all order updates
 *
 * @param {string} orderId - The order ID to update
 * @param {Object} payload - Partial update payload with any order fields:
 *   - rentalStartDate?, rentalEndDate?, timeIn?, timeOut?
 *   - car?, carNumber?, placeIn?, placeOut?
 *   - insurance?, ChildSeats?, franchiseOrder?
 *   - totalPrice?, numberOfDays?
 *   - customerName?, phone?, email?, flightNumber?
 *   - confirmed?
 *
 * @returns {Promise<Object>} Response object with status, message, updatedOrder, etc.
 */
export const updateOrder = async (orderId, payload) => {
  try {
    const response = await fetch(getApiUrl(`/api/order/update/${orderId}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Handle success responses
    if (response.status === 200 || response.status === 201) {
      return {
        status: response.status,
        message: data.message || "Order updated successfully",
        updatedOrder: data.updatedOrder || data.data,
        success: data.success !== false, // Default to true if not specified
      };
    }

    // Handle partial success with conflicts (202)
    if (response.status === 202) {
      return {
        status: 202,
        message: data.message,
        conflicts: data.conflicts,
        updatedOrder: data.updatedOrder || data.data,
        level: data.level || null,
        affectedOrders: data.affectedOrders || [],
        success: true, // Still a success, just with warnings
      };
    }

    // Handle conflict errors (408, 409)
    if (response.status === 408 || response.status === 409) {
      return {
        status: response.status,
        message: data.message || "Conflict detected",
        conflicts: data.conflicts || data.conflictDates,
        success: false,
      };
    }

    // Handle permission denied (403)
    if (response.status === 403) {
      return {
        status: 403,
        message: data.message || "Permission denied",
        code: data.code || "PERMISSION_DENIED",
        success: false,
        level: data.level || "block",
      };
    }

    // Handle unauthorized (401)
    if (response.status === 401) {
      return {
        status: 401,
        message: data.message || "Unauthorized",
        success: false,
      };
    }

    // Handle other errors
    return {
      status: response.status,
      message: data.message || "Unexpected response",
      data: data,
      success: false,
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      status: 500,
      message: "Error updating order: " + error.message,
      success: false,
    };
  }
};

// UPDATE 4. Inline order update action (for table inline editing)
/**
 * Update order fields inline (supports customer info, dates, and times)
 *
 * @param {string} orderId - Order ID
 * @param {Object} fields - Fields to update:
 *   - Customer: { customerName?, phone?, email?, flightNumber? }
 *   - Dates/Times: { rentalStartDate?, rentalEndDate?, timeIn?, timeOut? }
 * @returns {Promise<Object>} Normalized response with updated order
 */
export const updateOrderInline = async (orderId, fields) => {
  // 🔧 UNIFIED: Use single endpoint for all updates
  const response = await fetch(getApiUrl(`/api/order/update/${orderId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify(fields),
  });

  const data = await response.json();

  // Normalize response to match unified contract
  if (response.status === 403) {
    return {
      success: false,
      data: null,
      message: data.message || "Permission denied",
      level: "block",
      conflicts: [],
      affectedOrders: [],
      bufferHours: data.bufferHours,
    };
  }

  if (!response.ok) {
    // For 409 conflicts, return normalized structure
    if (response.status === 409 || response.status === 408) {
      return {
        success: false,
        data: null,
        message: data.message || "Update blocked by conflict",
        level: "block",
        conflicts: data.conflicts ?? data.conflictDates ?? [],
        affectedOrders: data.affectedOrders ?? [],
        bufferHours: data.bufferHours,
      };
    }
    throw new Error(data.message || "Failed to update order");
  }

  // Success - return normalized structure
  // changeDates endpoint returns { data: order } or { updatedOrder: order }
  // customer endpoint returns { updatedOrder: order }
  const updatedOrder = data.data || data.updatedOrder || data;

  return {
    success: true,
    data: updatedOrder,
    message: data.message || "Order updated successfully",
    level: null,
    conflicts: [],
    affectedOrders: [],
    bufferHours: data.bufferHours,
  };
};

// UPDATE 5. Inline confirmation toggle action
/**
 * Toggle order confirmation status inline
 *
 * @param {string} orderId - Order ID
 * @returns {Promise<{ success: boolean, updatedOrder: Object|null, level: string|null, message: string }>}
 *   - success: true if toggle succeeded, false if blocked/denied (403/409)
 *   - updatedOrder: updated order object from server (only if success=true)
 *   - level: "warning" | "block" | null
 *   - message: status message
 * @throws {Error} if request fails (network error, 500, etc.)
 */
export const updateOrderConfirmation = async (orderId) => {
  const response = await fetch(
    getApiUrl(`/api/order/update/switchConfirm/${orderId}`),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      credentials: "include",
    }
  );

  const data = await response.json();

  // Pass through normalized response structure from backend
  // Backend always returns: { success, data, message, level, conflicts, affectedOrders, bufferHours }

  // Check if response is ok
  if (!response.ok) {
    // For 403, 409, etc. - return error result, don't throw
    if (response.status === 403 || response.status === 409) {
      return {
        success: false,
        data: null,
        message: data.message || "Cannot update order confirmation",
        level: data.level || "block",
        conflicts: data.conflicts ?? [],
        affectedOrders: data.affectedOrders ?? [],
        bufferHours: data.bufferHours,
      };
    }
    // For other errors, throw
    throw new Error(data.message || "Failed to toggle confirmation");
  }

  // Success (200 or 202)
  if (response.status === 200 || response.status === 202) {
    return {
      success: true,
      data: data.data, // Server returns { success: true, data: updatedOrder }
      message: data.message,
      level: data.level ?? null,
      conflicts: data.conflicts ?? [],
      affectedOrders: data.affectedOrders ?? [],
      bufferHours: data.bufferHours,
    };
  }

  // Unexpected status
  throw new Error(data.message || "Unexpected response from server");
};

export const addCar = async (formData) => {
  try {
    const response = await fetch("/api/car/addOne", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      return { message: result.message, data: result.data, type: 200 };
    } else {
      console.error("Failed to add car:", result.message);
      return { message: result.message, data: result.data, type: 400 };
    }
  } catch (error) {
    console.error("Error adding car:", error);
    return { message: error.message, data: error, type: 500 };
  }
};

export const deleteCar = async (carId) => {
  try {
    const response = await fetch(`api/car/delete/${carId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return { message: data.message, type: 200, data: carId };
  } catch (error) {
    console.error("Error deleting car", error);
    return {
      message: error.message || "Error deleting car",
      data: error,
      type: 500,
    };
  }
};

// UPDATE car
export const updateCar = async (updatedCar) => {
  try {
    const response = await fetch(getApiUrl(`/api/car/update`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedCar),
    });

    if (!response.ok) {
      throw new Error("Failed to update car");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating car:", error);
    throw error;
  }
};

export async function getOrderById(orderId) {
  try {
    const response = await fetch(getApiUrl(`/api/order/refetch/${orderId}`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed toget order");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting order:", error);
    throw error;
  }
}

// aункции, которая принимает массив ID заказов и возвращает подтвержденные заказы
export async function getConfirmedOrders(orderIds) {
  try {
    const orders = await Promise.all(orderIds.map(getOrderById));
    // Фильтруем заказы, оставляя только подтвержденные
    const confirmedOrders = orders.filter(
      (order) => order.status === "confirmed"
    );
    // Если подтвержденные заказы есть, возвращаем их, иначе возвращаем false
    return confirmedOrders.length > 0 ? confirmedOrders : false;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return false; // Возвращаем false в случае ошибки
  }
}

/**
 * Загружает компанию из БД.
 * @param {string} companyId - ID компании
 * @param {{ skipCache?: boolean }} [options] - skipCache: true — всегда читать из БД (после сохранения буфера и т.д.)
 */
export async function fetchCompany(companyId, options = {}) {
  try {
    const skipCache = Boolean(options.skipCache);
    const cacheBuster = skipCache ? `?ts=${Date.now()}` : "";
    const response = await fetch(
      getApiUrl(`/api/company/${companyId}${cacheBuster}`),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(skipCache
            ? {
                "Cache-Control":
                  "no-cache, no-store, max-age=0, must-revalidate",
                Pragma: "no-cache",
              }
            : {}),
        },
        ...(skipCache ? { cache: "no-store" } : { next: { revalidate: 3600 } }),
      }
    );

    if (response.status === 404) {
      throw new Error("Company not found");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching company:", error.message);
    throw error;
  }
}

/**
 * Обновляет bufferTime компании
 * @param {string} companyId - ID компании
 * @param {number} bufferTime - Буферное время в часах (0-24)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateCompanyBuffer(companyId, bufferTime) {
  try {
    // Валидация
    if (!companyId) {
      return { success: false, error: "Company ID is required" };
    }

    const bufferTimeNumber = Number(bufferTime);
    if (
      isNaN(bufferTimeNumber) ||
      bufferTimeNumber < 0 ||
      bufferTimeNumber > 24
    ) {
      return {
        success: false,
        error: "bufferTime must be a number between 0 and 24 hours",
      };
    }

    const path = `/api/company/buffer/${String(companyId)}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : getApiUrl(path);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ bufferTime: bufferTimeNumber }),
      cache: "no-store",
    });

    let data;
    try {
      data = await response.json();
    } catch (_) {
      return { success: false, error: "Сервер вернул неверный ответ" };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || "Failed to update buffer",
      };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error updating company buffer:", error);
    const message = error.message || "Network error";
    return {
      success: false,
      error:
        message === "Failed to fetch"
          ? "Нет связи с сервером. Проверьте интернет или откройте страницу заново."
          : message,
    };
  }
}

/**
 * Calculate total price for rental order
 * @param {string} carIdentifier - Car reg number (preferred) or legacy car number
 * @param {Date|string} rentalStartDate - Start date
 * @param {Date|string} rentalEndDate - End date
 * @param {string} kacko - Insurance type (default: "TPL")
 * @param {number} childSeats - Number of child seats (default: 0)
 * @param {Object} options - Optional settings
 * @param {AbortSignal} options.signal - AbortController signal for cancellation
 * @param {boolean} options.secondDriver - Whether second driver is enabled
 * @param {Date|string} [options.timeIn] - Exact pickup datetime (optional)
 * @param {Date|string} [options.timeOut] - Exact return datetime (optional)
 * @returns {Promise<{totalPrice: number, days: number, ok: boolean}>}
 */
export async function calculateTotalPrice(
  carIdentifier,
  rentalStartDate,
  rentalEndDate,
  kacko = "TPL",
  childSeats = 0,
  options = {}
) {
  try {
    const normalizedOptions =
      options && typeof options === "object" && !Array.isArray(options)
        ? options
        : {};
    const normalizedSecondDriver =
      normalizedOptions.secondDriver === true ||
      normalizedOptions.secondDriver === 1 ||
      (typeof normalizedOptions.secondDriver === "string" &&
        ["true", "1"].includes(
          normalizedOptions.secondDriver.trim().toLowerCase()
        ));
    const normalizedTimeIn =
      normalizedOptions.timeIn !== undefined && normalizedOptions.timeIn !== null
        ? normalizedOptions.timeIn
        : undefined;
    const normalizedTimeOut =
      normalizedOptions.timeOut !== undefined && normalizedOptions.timeOut !== null
        ? normalizedOptions.timeOut
        : undefined;

    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        regNumber: carIdentifier,
        carNumber: carIdentifier, // legacy fallback
        rentalStartDate,
        rentalEndDate,
        timeIn: normalizedTimeIn,
        timeOut: normalizedTimeOut,
        kacko,
        childSeats,
        secondDriver: normalizedSecondDriver,
      }),
      cache: "no-store",
    };

    // Add AbortSignal if provided
    if (normalizedOptions.signal) {
      fetchOptions.signal = normalizedOptions.signal;
    }

    const response = await fetch(
      getApiUrl(`/api/order/calcTotalPrice`),
      fetchOptions
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to calculate total price");
    }

    const data = await response.json();
    return { totalPrice: data.totalPrice || 0, days: data.days || 0, ok: true };
  } catch (error) {
    // Don't log abort errors (expected behavior)
    if (error.name !== "AbortError") {
      console.error("Error calculating total price:", error);
    }
    return { totalPrice: 0, days: 0, ok: false, error: error.message };
  }
}

/**
 * Fetch orders for admin panel (requires authentication)
 * @returns {Promise<{success: boolean, data: Array, message?: string}>}
 */
export async function fetchAdminOrders() {
  try {
    const response = await fetch(getApiUrl(`/api/admin/orders`), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return { success: false, data: [], message: error.message };
  }
}

/**
 * Delete an order by ID
 * @param {string} orderId - Order ID to delete
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function deleteOrder(orderId) {
  try {
    const response = await fetch(getApiUrl(`/api/order/deleteOne/${orderId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Error ${response.status}: Failed to delete order`
      );
    }

    const data = await response.json().catch(() => ({ success: true }));
    return { success: true, ...data };
  } catch (error) {
    console.error("Error deleting order:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Normalize API base URL - remove trailing slashes and handle double slashes
 * @param {string} url - Base URL
 * @returns {string} Normalized URL
 */
function normalizeApiUrl(url) {
  if (!url) return "";
  return String(url)
    .trim()
    .replace(/\/+$/, "")
    .replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Fetch legal document from AWS API with ETag caching
 *
 * @typedef {Object} LegalDocResponse
 * @property {number} version - Document version
 * @property {string} updatedAt - ISO timestamp
 * @property {Object} content - Document content
 * @property {string} content.title - Document title
 * @property {"EU"|"IE"|"UA"} content.jurisdiction - Jurisdiction code
 * @property {Array<{id: string, text: string}>} content.sections - Document sections
 * @property {boolean} [stale] - True if data came from cache due to API failure
 *
 * @param {Object} options
 * @param {"privacy-policy"|"terms-of-service"|"cookie-policy"} options.docType - Document type
 * @param {string} [options.lang="en"] - Language code
 * @param {"EU"|"IE"|"UA"} [options.jur="EU"] - Jurisdiction
 * @returns {Promise<LegalDocResponse>}
 * @throws {Error} If API fails and no cache exists
 */
export async function getLegalDoc({ docType, lang = "en", jur = "EU" }) {
  // Validate docType
  const validDocTypes = ["privacy-policy", "terms-of-service", "cookie-policy"];
  if (!validDocTypes.includes(docType)) {
    throw new Error(
      `Invalid docType: ${docType}. Must be one of: ${validDocTypes.join(", ")}`
    );
  }

  // Get API base URL from env
  const legalApiBase = process.env.NEXT_PUBLIC_LEGAL_API;
  if (!legalApiBase) {
    throw new Error("NEXT_PUBLIC_LEGAL_API environment variable is not set");
  }

  // Normalize URL
  const baseUrl = normalizeApiUrl(legalApiBase);
  const apiUrl = `${baseUrl}/legal/${docType}?lang=${lang}&jur=${jur}`;

  // Cache key for localStorage
  const cacheKey = `legal:${docType}:${lang}:${jur}`;

  // Try to get cached data
  let cachedData = null;
  try {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        cachedData = JSON.parse(cached);
      }
    }
  } catch (e) {
    console.warn("Failed to read cache:", e);
  }

  // Prepare request headers
  const headers = {
    "Content-Type": "application/json",
  };
  if (cachedData?.etag) {
    headers["If-None-Match"] = cachedData.etag;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    // Handle 304 Not Modified - return cached data
    if (response.status === 304) {
      if (cachedData?.data) {
        return cachedData.data;
      }
      // Fallback: if 304 but no cache, treat as error
      throw new Error("Server returned 304 but no cached data available");
    }

    // Handle 200 OK - update cache and return data
    if (response.ok) {
      const data = await response.json();
      const etag = response.headers.get("ETag");

      // Validate response structure
      if (!data || !data.content || !Array.isArray(data.content.sections)) {
        throw new Error("Invalid response structure from legal API");
      }

      // Update cache
      if (typeof window !== "undefined" && etag) {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              etag,
              data,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.warn("Failed to update cache:", e);
        }
      }

      return data;
    }

    // Handle other status codes
    throw new Error(
      `API returned status ${response.status}: ${response.statusText}`
    );
  } catch (error) {
    // If API fails but we have cached data, return it with stale flag
    if (cachedData?.data) {
      console.warn(
        `Legal API failed for ${docType}, using cached data:`,
        error.message
      );
      return {
        ...cachedData.data,
        stale: true,
      };
    }

    // No cache available - throw error
    throw new Error(`Failed to fetch legal document: ${error.message}`);
  }
}

// =============================================================================
// TELEGRAM NOTIFICATIONS
// =============================================================================

/**
 * Formats currency code to symbol
 * @param {string} currency - Currency code (EUR, USD, etc.)
 * @returns {string} Currency symbol
 */
function formatCurrencySymbol(currency) {
  const symbols = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    RUB: "₽",
  };
  return symbols[currency?.toUpperCase()] || currency || "€";
}

/**
 * Formats date string for Telegram message
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (YYYY-MM-DD)
 */
function formatTelegramDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    // Format: DD-MM-YY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Validates order data for Telegram notification
 * @param {Object} order - Order data
 * @returns {string|null} Error message or null if valid
 */
function validateOrderForTelegram(order) {
  if (!order || typeof order !== "object") {
    return "Order must be a non-null object";
  }

  if (order.id === undefined || order.id === null) {
    return "Order is missing required field: id";
  }

  if (!order.startDate || typeof order.startDate !== "string") {
    return "Order is missing or has invalid field: startDate";
  }

  if (!order.endDate || typeof order.endDate !== "string") {
    return "Order is missing or has invalid field: endDate";
  }

  if (typeof order.totalPrice !== "number" || isNaN(order.totalPrice)) {
    return "Order is missing or has invalid field: totalPrice";
  }

  if (!order.currency || typeof order.currency !== "string") {
    return "Order is missing or has invalid field: currency";
  }

  if (!order.customer || typeof order.customer !== "object") {
    return "Order is missing required field: customer";
  }

  if (!order.customer.name || typeof order.customer.name !== "string") {
    return "Order customer is missing required field: name";
  }

  return null;
}

/**
 * Formats order data into a Telegram message
 * @param {"new_order"|"order_deleted"} type - Notification type
 * @param {Object} order - Order data
 * @param {string} [deletedBy] - Email of user who deleted the order
 * @returns {string} Formatted message
 */
function formatOrderTelegramMessage(type, order, deletedBy) {
  const currencySymbol = formatCurrencySymbol(order.currency);
  const formattedStartDate = formatTelegramDate(order.startDate);
  const formattedEndDate = formatTelegramDate(order.endDate);

  const lines = [];

  // Header based on type
  if (type === "new_order") {
    lines.push("--------------------------------");
    lines.push(`🆕 NEW ORDER #${order.id}`);
  } else {
    lines.push("--------------------------------");
    lines.push(`❌ ORDER DELETED #${order.id}`);
  }

  // Car information
  if (order.car) {
    const carInfo = order.car.model
      ? `${order.car.model}${
          order.car.regNumber ? ` (${order.car.regNumber})` : ""
        }`
      : order.car;
    lines.push(`🚗 Car: ${carInfo}`);
  }

  // Order details
  lines.push(`📅 From: ${formattedStartDate}`);
  lines.push(`📅 To: ${formattedEndDate}`);
  lines.push(`💰 Total: ${currencySymbol}${order.totalPrice}`);

  // Customer information
  lines.push("");
  lines.push("👤 Customer:");
  lines.push(`• Name: ${order.customer.name}`);

  // Always include phone and email for both new and deleted orders
  if (order.customer.phone) {
    lines.push(`• Phone: ${order.customer.phone}`);
  }
  if (order.customer.email) {
    lines.push(`• Email: ${order.customer.email}`);
  }

  // Deleted by info (only for deletions)
  if (type === "order_deleted" && deletedBy) {
    lines.push("");
    lines.push(`🛑 Deleted by: ${deletedBy}`);
  }

  lines.push("--------------------------------");

  return lines.join("\n");
}

/**
 * Sends a message to Telegram via internal API route
 * @param {string} message - Formatted message to send
 * @returns {Promise<boolean>} Success status
 */
export async function sendTelegramMessage(message) {
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!chatId) {
    console.error(
      "[Telegram] TELEGRAM_CHAT_ID is not configured in environment variables"
    );
    return false;
  }

  const chatIdNumber = parseInt(chatId, 10);
  if (isNaN(chatIdNumber)) {
    console.error(
      "[Telegram] TELEGRAM_CHAT_ID must be a valid number, got:",
      chatId
    );
    return false;
  }

  try {
    const response = await fetch(getApiUrl(`/api/telegram/send`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "/button2607",
        chat_id: chatIdNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[Telegram] API returned error status:",
        response.status,
        errorData.error || "Unknown error"
      );
      return false;
    }

    const result = await response.json();

    if (!result.success) {
      console.error("[Telegram] API returned failure:", result.error);
      return false;
    }

    return true;
  } catch (error) {
    // Log error but don't throw - Telegram notifications must never break core flows
    console.error(
      "[Telegram] Failed to send message:",
      error.message || "Unknown error"
    );
    return false;
  }
}

/**
 * Sends a Telegram notification when a new order is created
 *
 * @param {Object} order - Order data
 * @param {string|number} order.id - Order ID or number
 * @param {string} order.startDate - Rental start date (ISO string)
 * @param {string} order.endDate - Rental end date (ISO string)
 * @param {number} order.totalPrice - Total price
 * @param {string} order.currency - Currency code (EUR, USD, etc.)
 * @param {Object} [order.car] - Car info
 * @param {string} [order.car.model] - Car model
 * @param {string} [order.car.regNumber] - Car registration number
 * @param {Object} order.customer - Customer info
 * @param {string} order.customer.name - Customer name
 * @param {string} [order.customer.phone] - Customer phone
 * @param {string} [order.customer.email] - Customer email
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 *
 * @example
 * await sendNewOrderTelegramNotification({
 *   id: '1234',
 *   startDate: '2026-02-01',
 *   endDate: '2026-02-05',
 *   totalPrice: 450,
 *   currency: 'EUR',
 *   car: {
 *     model: 'Toyota Yaris',
 *     regNumber: 'XYZ-1234'
 *   },
 *   customer: {
 *     name: 'John Doe',
 *     phone: '+353...',
 *     email: 'john@email.com'
 *   }
 * });
 */
export async function sendNewOrderTelegramNotification(order) {
  // Validate order
  const validationError = validateOrderForTelegram(order);
  if (validationError) {
    console.error("[Telegram] New order notification failed:", validationError);
    return false;
  }

  // Format and send message
  const message = formatOrderTelegramMessage("new_order", order);
  return await sendTelegramMessage(message);
}

/**
 * Sends a Telegram notification when an order is deleted
 *
 * @param {Object} order - Order data
 * @param {string|number} order.id - Order ID or number
 * @param {string} order.startDate - Rental start date (ISO string)
 * @param {string} order.endDate - Rental end date (ISO string)
 * @param {number} order.totalPrice - Total price
 * @param {string} order.currency - Currency code (EUR, USD, etc.)
 * @param {Object} [order.car] - Car info
 * @param {string} [order.car.model] - Car model
 * @param {string} [order.car.regNumber] - Car registration number
 * @param {Object} order.customer - Customer info
 * @param {string} order.customer.name - Customer name
 * @param {string} [order.customer.phone] - Customer phone
 * @param {string} [order.customer.email] - Customer email
 * @param {string} deletedBy - Email or identifier of who deleted the order
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 *
 * @example
 * await sendOrderDeletedTelegramNotification({
 *   id: '1234',
 *   startDate: '2026-02-01',
 *   endDate: '2026-02-05',
 *   totalPrice: 450,
 *   currency: 'EUR',
 *   car: {
 *     model: 'Toyota Yaris',
 *     regNumber: 'XYZ-1234'
 *   },
 *   customer: {
 *     name: 'John Doe',
 *     phone: '+353...',
 *     email: 'john@email.com'
 *   }
 * }, 'admin@example.com');
 */
export async function sendOrderDeletedTelegramNotification(order, deletedBy) {
  // Validate order
  const validationError = validateOrderForTelegram(order);
  if (validationError) {
    console.error(
      "[Telegram] Order deleted notification failed:",
      validationError
    );
    return false;
  }

  // Validate deletedBy
  if (!deletedBy || typeof deletedBy !== "string" || deletedBy.trim() === "") {
    console.error(
      "[Telegram] Order deleted notification failed: deletedBy is required"
    );
    return false;
  }

  // Format and send message
  const message = formatOrderTelegramMessage("order_deleted", order, deletedBy);
  return await sendTelegramMessage(message);
}
