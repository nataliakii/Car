"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
  alpha,
  Switch,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Block as BlockIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Autorenew as AutorenewIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { useMainContext } from "@app/Context";
import { getOrderColor } from "@/domain/orders/getOrderColor";
import {
  ROLE,
  isClientOrder,
} from "@/domain/orders";
import { getOrderAccess } from "@/domain/orders/orderAccessPolicy";
import { getOrderNumberOfDaysOrZero } from "@/domain/orders/numberOfDays";
import { getTimeBucket } from "@/domain/time/athensTime";
import { updateOrderInline, updateOrderConfirmation, fetchAdminOrders, calculateTotalPrice } from "@/utils/action";
import { useSession } from "next-auth/react";
import { palette } from "@/theme";
import { useSnackbar } from "notistack";
import InlineEditCell from "@/app/components/orderFields/InlineEditCell";

// Dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const ATHENS_TZ = "Europe/Athens";

/**
 * PRICE ARCHITECTURE HELPER
 * 
 * Returns the effective price used by UI, invoices, and payments
 * effectivePrice = OverridePrice !== null ? OverridePrice : totalPrice
 */
const getEffectivePrice = (order) => {
  if (!order) return 0;
  // If OverridePrice is set (not null/undefined), use it
  if (order.OverridePrice !== null && order.OverridePrice !== undefined) {
    return Number(order.OverridePrice);
  }
  // Otherwise use auto-calculated totalPrice
  return Number(order.totalPrice) || 0;
};

/**
 * OrdersTableSection - Admin orders table with inline editing
 * 
 * Features:
 * - Filter by car (autocomplete)
 * - Filter by date range (pickup/return overlap)
 * - Filter by status (confirmed/pending)
 * - Filter by origin (my_order: client/admin)
 * - Text search (customerName, phone, email, orderNumber, car model/regNumber)
 * - Pagination (10/25/50 per page)
 * - Visual indicator using getOrderColor
 * - Inline editing with RBAC (only one row editable at a time)
 * - Confirmed column with Switch toggle
 * - Field-level permission checks
 */
export default function OrdersTableSection() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { 
    cars, 
    pendingConfirmBlockById, 
    setConflictHighlightsFromResult,
    clearConflictHighlights,
    conflictHighlightById,
  } = useMainContext();
  const { data: session } = useSession();
  
  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING STATE (from /api/admin/orders)
  // ─────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ─────────────────────────────────────────────────────────────
  // INLINE EDITING STATE (per-field, not per-row)
  // ─────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState({}); // Track saving per field: { orderId_field: true }
  const [isTogglingConfirm, setIsTogglingConfirm] = useState({});
  const [isRecalculatingPrice, setIsRecalculatingPrice] = useState({}); // Track price recalculation: { orderId: true }
  
  // ─────────────────────────────────────────────────────────────
  // CONFLICT STATE (persistent, per-order)
  // ─────────────────────────────────────────────────────────────
  // ⚠️ RBAC SOURCE OF TRUTH: session.user.role is the ONLY source for UI permissions
  // adminRole from API is NOT used for permissions (only for debugging if needed)
  const [conflictsByOrderId, setConflictsByOrderId] = useState({}); // { orderId: { message, conflicts: [] } }
  
  // Get current user for permission checks
  // ⚠️ RBAC SOURCE OF TRUTH: session.user.role is the single source of truth for UI permissions
  // adminRole from API is NOT used for permissions
  const currentUser = useMemo(() => {
    if (!session?.user?.isAdmin) {
      return null;
    }
    const user = {
      isAdmin: true,
      role: session.user.role, // SINGLE SOURCE OF TRUTH: Use session.user.role directly
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
    
    // Dev-only: Log role source once (not spammy)
    if (process.env.NODE_ENV !== "production") {
      console.log("[RBAC] sessionRole:", session.user.role, "currentUser.role:", user.role);
    }
    
    return user;
  }, [session]);

  
  // Fetch orders from admin API endpoint
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOrders();
      
      if (data.success) {
        setOrders(data.data || []);
        // Note: data.adminRole from API is NOT used for permissions
        // RBAC source of truth is session.user.role (see currentUser memo above)
      } else {
        throw new Error(data.message || "Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching admin orders:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // 🔧 FIXED: Use orderAccessPolicy directly (no legacy shims)
  // Permission check helpers using SSOT: getOrderAccess + getTimeBucket
  const getAccessForOrder = useCallback((order) => {
    if (!currentUser || !order) return null;
    const timeBucket = getTimeBucket(order);
    const isPast = timeBucket === "PAST";
    return getOrderAccess({
      role: currentUser.role === ROLE.SUPERADMIN ? "SUPERADMIN" : "ADMIN",
      isClientOrder: order.my_order === true,
      confirmed: order.confirmed === true,
      isPast,
      timeBucket,
    });
  }, [currentUser]);
  
  const canEdit = useCallback((order) => {
    const access = getAccessForOrder(order);
    if (!access) return false;
    return !access.isViewOnly;
  }, [getAccessForOrder]);
  
  const canDelete = useCallback((order) => {
    const access = getAccessForOrder(order);
    if (!access) return false;
    return access.canDelete;
  }, [getAccessForOrder]);
  
  /**
   * Get field-level permission for an order
   * Uses orderAccessPolicy.disabledFields (SSOT)
   * 
   * @param {Object} order
   * @param {string} fieldName
   * @returns {{ allowed: boolean, reason: string|null }}
   */
  const getFieldPermission = useCallback((order, fieldName) => {
    const access = getAccessForOrder(order);
    if (!access) {
      return { allowed: false, reason: "Not authenticated" };
    }
    // Check if field is in disabledFields
    const isDisabled = access.disabledFields?.includes(fieldName);
    return { allowed: !isDisabled, reason: isDisabled ? "Field is disabled by policy" : null };
  }, [getAccessForOrder]);
  
  const canEditField = useCallback((order, fieldName) => {
    if (!currentUser) {
      console.warn("[canEditField] currentUser is null", { orderId: order._id, fieldName });
      return false;
    }
    const permission = getFieldPermission(order, fieldName);
    if (!permission.allowed && process.env.NODE_ENV !== "production") {
      console.log("[canEditField] Permission denied", {
        orderId: order._id,
        fieldName,
        userRole: currentUser.role,
        orderMyOrder: order.my_order,
        reason: permission.reason,
      });
    }
    return permission.allowed;
  }, [currentUser, getFieldPermission]);
  

  // ─────────────────────────────────────────────────────────────
  // FIELD CONFIGURATION MAP
  // ─────────────────────────────────────────────────────────────
  /**
   * Field configuration map for table columns
   * Defines which fields are editable and their types
   */
  const FIELD_CONFIG = {
    customerName: { type: "text", editable: true },
    phone: { type: "text", editable: true },
    email: { type: "email", editable: true },
    rentalStartDate: { type: "date", editable: true },
    rentalEndDate: { type: "date", editable: true },
    timeIn: { type: "time", editable: true },
    timeOut: { type: "time", editable: true },
    totalPrice: { type: "number", editable: true },
    // Non-editable fields (explicitly marked)
    orderNumber: { type: "text", editable: false }, // System-generated, not editable
    carModel: { type: "text", editable: false }, // Car selection handled separately
    carNumber: { type: "text", editable: false }, // Car selection handled separately
    numberOfDays: { type: "number", editable: false }, // Calculated field, not directly editable
    confirmed: { type: "boolean", editable: true }, // Editable via Switch, not InlineEditCell
  };

  // ─────────────────────────────────────────────────────────────
  // FILTER STATE
  // ─────────────────────────────────────────────────────────────
  const [selectedCar, setSelectedCar] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ─────────────────────────────────────────────────────────────
  // PAGINATION STATE
  // ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ─────────────────────────────────────────────────────────────
  // CAR OPTIONS FOR AUTOCOMPLETE
  // ─────────────────────────────────────────────────────────────
  const carOptions = useMemo(() => {
    // Get unique cars from orders
    const carsFromOrders = orders.reduce((acc, order) => {
      const carId = order.car?._id || order.car;
      if (carId && !acc.find((c) => c._id === carId)) {
        // Try to get car details from cars array or order itself
        const carDetails = cars.find((c) => c._id === carId);
        acc.push({
          _id: carId,
          model: carDetails?.model || order.carModel || "Unknown",
          regNumber: carDetails?.regNumber || order.carNumber || "",
          label: `${carDetails?.model || order.carModel || "Unknown"} (${carDetails?.regNumber || order.carNumber || ""})`,
        });
      }
      return acc;
    }, []);
    return carsFromOrders.sort((a, b) => a.model.localeCompare(b.model));
  }, [orders, cars]);

  // ─────────────────────────────────────────────────────────────
  // FILTERING LOGIC
  // ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Car filter
      if (selectedCar) {
        const orderCarId = order.car?._id || order.car;
        if (orderCarId !== selectedCar._id) return false;
      }

      // 2. Status filter (confirmed/pending)
      if (statusFilter === "confirmed" && !order.confirmed) return false;
      if (statusFilter === "pending" && order.confirmed) return false;

      // 3. Origin filter (my_order: client=true, admin=false)
      if (originFilter === "client" && !order.my_order) return false;
      if (originFilter === "admin" && order.my_order) return false;

      // 4. Date range filter (overlap: orderPickup <= filterEnd AND orderReturn >= filterStart)
      // If only dateFrom is set, show orders that end on or after dateFrom
      // If only dateTo is set, show orders that start on or before dateTo
      // If both are set, show orders that overlap with the range
      if (dateFrom || dateTo) {
        const orderStart = dayjs(order.rentalStartDate).tz(ATHENS_TZ).startOf("day");
        const orderEnd = dayjs(order.rentalEndDate).tz(ATHENS_TZ).startOf("day");

        if (dateFrom) {
          const filterStart = dayjs(dateFrom).startOf("day");
          // Order must end on or after filterStart
          if (orderEnd.isBefore(filterStart)) return false;
        }

        if (dateTo) {
          const filterEnd = dayjs(dateTo).startOf("day");
          // Order must start on or before filterEnd
          if (orderStart.isAfter(filterEnd)) return false;
        }
      }

      // 6. Text search (case-insensitive)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchFields = [
          order.customerName,
          order.phone,
          order.email,
          order.orderNumber,
          order.carModel,
          order.carNumber,
          order.car?.model,
          order.car?.regNumber,
        ].filter(Boolean);

        const matchesSearch = searchFields.some((field) =>
          String(field).toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      return true;
    })
    // Sort by start date (rentalStartDate) - ascending, so neighboring orders are together
    .sort((a, b) => {
      const dateA = dayjs(a.rentalStartDate).tz(ATHENS_TZ);
      const dateB = dayjs(b.rentalStartDate).tz(ATHENS_TZ);
      // Primary sort: by start date
      if (dateA.isBefore(dateB)) return -1;
      if (dateA.isAfter(dateB)) return 1;
      // Secondary sort: by start time (timeIn) if dates are equal
      const timeA = a.timeIn ? dayjs(a.timeIn).tz(ATHENS_TZ) : null;
      const timeB = b.timeIn ? dayjs(b.timeIn).tz(ATHENS_TZ) : null;
      if (timeA && timeB) {
        if (timeA.isBefore(timeB)) return -1;
        if (timeA.isAfter(timeB)) return 1;
      }
      return 0;
    });
  }, [orders, selectedCar, statusFilter, originFilter, dateFrom, dateTo, searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // PAGINATED ORDERS
  // ─────────────────────────────────────────────────────────────
  const paginatedOrders = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredOrders.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredOrders, page, rowsPerPage]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleResetFilters = useCallback(() => {
    setSelectedCar(null);
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setOriginFilter("all");
    setSearchQuery("");
    setPage(0);
  }, []);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  // Reset page when filters change
  const handleFilterChange = useCallback((setter) => (value) => {
    setter(value);
    setPage(0);
  }, []);
  
  // ─────────────────────────────────────────────────────────────
  // INLINE EDITING HANDLERS
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Handle individual field update (called by InlineEditCell onCommit)
   * 
   * @param {string} orderId - Order ID
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @param {Object} options - Options object
   * @param {string} options.source - Source of update: "manual" | "recalculate" | undefined
   */
  const handleFieldUpdate = useCallback(async (orderId, field, value, options = {}) => {
    const savingKey = `${orderId}_${field}`;
    setIsSaving((prev) => ({ ...prev, [savingKey]: true }));
    try {
      const fieldsToSend = {};
      const order = orders.find((o) => o._id === orderId);
      
      // Format value based on field type
      if (field === "rentalStartDate" || field === "rentalEndDate") {
        // Date field: "YYYY-MM-DD" -> ISO string in Athens timezone
        if (value) {
          const dateTime = dayjs.tz(value, ATHENS_TZ).startOf("day");
          fieldsToSend[field] = dateTime.utc().toISOString();
        }
      } else if (field === "timeIn" || field === "timeOut") {
        // Time field: "HH:mm" -> combine with existing date -> ISO string
        if (order && value) {
          const dateField = field === "timeIn" ? "rentalStartDate" : "rentalEndDate";
          const existingDate = dayjs(order[dateField]).tz(ATHENS_TZ);
          const [hours, minutes] = value.split(":");
          const dateTime = existingDate.hour(parseInt(hours, 10)).minute(parseInt(minutes, 10));
          fieldsToSend[field] = dateTime.utc().toISOString();
        }
      } else {
        // Other fields: pass as-is
        fieldsToSend[field] = value;
      }
      
      // 🔧 PRICE ARCHITECTURE: Handle totalPrice field based on source
      // - manual input → set OverridePrice (isOverridePrice: true)
      // - recalculate → update totalPrice only (isOverridePrice: false)
      if (field === "totalPrice") {
        if (options.source === "manual") {
          // Manual input: save to OverridePrice
          fieldsToSend.isOverridePrice = true;
        } else if (options.source === "recalculate") {
          // Recalculate: update totalPrice only, clear OverridePrice
          fieldsToSend.isOverridePrice = false;
        } else {
          // Default (backward compatibility): treat as manual input
          fieldsToSend.isOverridePrice = true;
        }
      }
      
      // Debug logging (dev only)
      if (process.env.NODE_ENV !== "production") {
        console.log("[handleFieldUpdate] Update request:", {
          orderId,
          field,
          rawValue: value,
          fieldsToSend,
          isOverridePrice: field === "totalPrice",
        });
      }
      
      const result = await updateOrderInline(orderId, fieldsToSend);
      
      // Debug logging (dev only)
      if (process.env.NODE_ENV !== "production") {
        console.log("[handleFieldUpdate] Update response:", {
          orderId,
          field,
          success: result?.success,
          dataKeys: result?.data ? Object.keys(result.data) : [],
          resultData: result?.data,
        });
      }
      
      if (result && typeof result.success === "boolean") {
        if (!result.success) {
          // Conflict: Store persistently (no auto-clear)
          const message = result.message || "Cannot update order";
          setConflictsByOrderId((prev) => ({
            ...prev,
            [orderId]: {
              message: message,
              conflicts: result.conflicts || [],
            },
          }));
          setConflictHighlightsFromResult({ sourceOrderId: orderId, result });
          // NO snackbar for conflicts - only inline display
          return;
        }
        
        // Success: Clear conflicts for this order
        setConflictsByOrderId((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        clearConflictHighlights();
        
        // Always merge fieldsToSend with result.data (even if result.data is empty)
        // This ensures UI updates even if backend doesn't return updated fields
        const mergedUpdate = {
          ...fieldsToSend,
          ...(result.data || {}),
        };
        
        // Debug logging (dev only)
        if (process.env.NODE_ENV !== "production") {
          console.log("[handleFieldUpdate] Merged update:", {
            orderId,
            field,
            fieldsToSend,
            resultData: result.data,
            mergedUpdate,
          });
        }
        
        // Always update state with mergedUpdate
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? { ...order, ...mergedUpdate } : order
          )
        );
        
        // Success snackbar only (conflicts shown inline, not in snackbar)
        enqueueSnackbar(result.message || "Order updated successfully", { variant: "success" });
      }
    } catch (error) {
      console.error("Error updating order field:", error);
      enqueueSnackbar(error.message || "Failed to update order", { variant: "error" });
    } finally {
      setIsSaving((prev) => ({ ...prev, [savingKey]: false }));
    }
  }, [orders, enqueueSnackbar, setConflictHighlightsFromResult, clearConflictHighlights]);
  
  /**
   * Recalculate price based on order's current data (dates, car, insurance, child seats)
   * Available to all users (no permission check)
   */
  const handleRecalculatePrice = useCallback(async (order) => {
    const orderId = order._id;
    const recalculatingKey = orderId;
    
    setIsRecalculatingPrice((prev) => ({ ...prev, [recalculatingKey]: true }));
    
    try {
      // Get carNumber from order
      let carNumber = null;
      if (order.car?.carNumber) {
        carNumber = order.car.carNumber;
      } else if (order.carNumber) {
        carNumber = order.carNumber;
      } else if (order.car?._id || order.car) {
        // Find car in cars array
        const carId = order.car?._id || order.car;
        const car = cars.find((c) => c._id?.toString() === carId?.toString());
        if (car?.carNumber) {
          carNumber = car.carNumber;
        }
      }
      
      if (!carNumber) {
        enqueueSnackbar("❌ Не удалось определить номер автомобиля", { variant: "error" });
        return;
      }
      
      // Get dates (format as YYYY-MM-DD for API)
      const rentalStartDate = order.rentalStartDate 
        ? dayjs.utc(order.rentalStartDate).tz(ATHENS_TZ).format("YYYY-MM-DD")
        : null;
      const rentalEndDate = order.rentalEndDate
        ? dayjs.utc(order.rentalEndDate).tz(ATHENS_TZ).format("YYYY-MM-DD")
        : null;
      
      if (!rentalStartDate || !rentalEndDate) {
        enqueueSnackbar("❌ Не указаны даты аренды", { variant: "error" });
        return;
      }
      
      // Get insurance (kacko) and child seats
      const kacko = order.insurance || "TPL";
      const childSeats = order.ChildSeats || 0;
      const secondDriver = Boolean(order.secondDriver);
      
      // Call calcTotalPrice via centralized action
      const data = await calculateTotalPrice(
        carNumber,
        rentalStartDate,
        rentalEndDate,
        kacko,
        childSeats,
        { secondDriver }
      );
      
      if (!data.ok) {
        throw new Error(data.error || "Ошибка пересчета цены");
      }
      
      // 🔧 PRICE ARCHITECTURE: Recalculate updates totalPrice only (not OverridePrice)
      // This preserves manual overrides when recalculating
      if (data.totalPrice !== undefined) {
        await handleFieldUpdate(orderId, "totalPrice", data.totalPrice, {
          source: "recalculate",
        });
      }
      if (data.days !== undefined) {
        // Note: numberOfDays is not editable, but we can update it if needed
        // For now, just update totalPrice
      }
      
      enqueueSnackbar(`✅ Цена пересчитана: €${data.totalPrice?.toFixed(2) || "0"}`, { variant: "success" });
    } catch (error) {
      console.error("Error recalculating price:", error);
      enqueueSnackbar(error.message || "Ошибка пересчета цены", { variant: "error" });
    } finally {
      setIsRecalculatingPrice((prev) => ({ ...prev, [recalculatingKey]: false }));
    }
  }, [cars, enqueueSnackbar, handleFieldUpdate]);
  
  const handleToggleConfirm = useCallback(async (orderId) => {
    setIsTogglingConfirm((prev) => ({ ...prev, [orderId]: true }));
    
    try {
      const result = await updateOrderConfirmation(orderId);
      
      // If not successful, show error in table, set conflict highlights, and return (do NOT update state)
      // Manual test: 403/409 should NOT flip the Switch
      if (!result?.success) {
        const message = result.message || "Cannot update order confirmation";
        console.log("[handleToggleConfirm] Error result:", { result, message });
        
        // Conflict: Store persistently (no auto-clear)
        setConflictsByOrderId((prev) => ({
          ...prev,
          [orderId]: {
            message: message,
            conflicts: result.conflicts || [],
          },
        }));
        
        // Set conflict highlights for calendar (if needed later)
        setConflictHighlightsFromResult({ sourceOrderId: orderId, result });
        
        // NO snackbar for conflicts - only inline display
        return;
      }
      
      // Success - clear conflicts for this order
      setConflictsByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      
      // Success - clear conflict highlights and update confirmed field from result.data
      // Manual test: 200/202 should flip the Switch
      clearConflictHighlights();
      
      if (result.data) {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId
              ? { ...order, confirmed: result.data.confirmed }
              : order
          )
        );
        
        // Show appropriate message based on level
        if (result.level === "warning") {
          // For warnings, show in table (persistent conflict panel)
          setConflictsByOrderId((prev) => ({
            ...prev,
            [orderId]: {
              message: result.message || "Order confirmed with warnings",
              conflicts: result.affectedOrders || [],
            },
          }));
          // Set highlights for affected pending orders
          setConflictHighlightsFromResult({ sourceOrderId: orderId, result });
          // NO snackbar for warnings - only inline display
        } else {
          // Success snackbar only
          enqueueSnackbar(
            result.message || "Order status updated successfully",
            { variant: "success" }
          );
        }
      }
    } catch (error) {
      console.error("Error toggling confirmation:", error);
      // On error, do NOT update UI
      enqueueSnackbar(error.message || "Failed to toggle confirmation", { variant: "error" });
    } finally {
      setIsTogglingConfirm((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [enqueueSnackbar, setConflictHighlightsFromResult, clearConflictHighlights]);

  // ─────────────────────────────────────────────────────────────
  // FORMAT HELPERS
  // ─────────────────────────────────────────────────────────────
  const formatDate = useCallback((date) => {
    if (!date) return "-";
    return dayjs(date).tz(ATHENS_TZ).format("DD.MM.YYYY");
  }, []);

  const formatTime = useCallback((date) => {
    if (!date) return "-";
    return dayjs(date).tz(ATHENS_TZ).format("HH:mm");
  }, []);

  const formatDateTime = useCallback((date, time) => {
    const dateStr = formatDate(date);
    const timeStr = time ? formatTime(time) : "";
    return timeStr ? `${dateStr} ${timeStr}` : dateStr;
  }, [formatDate, formatTime]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ px: { xs: 1, md: 2 }, pb: 6, pt: { xs: 8, md: 4 } }}>
      {/* Page Title */}
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 3, 
          fontWeight: 700,
          color: palette.neutral.gray900,
        }}
      >
        {t("table.ordersTable")}
      </Typography>

      {/* Filters Toolbar */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          border: `1px solid ${palette.neutral.gray200}`,
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          {/* First Row: Car, Date Range */}
          <Stack 
            direction={{ xs: "column", md: "row" }} 
            spacing={2}
            alignItems={{ xs: "stretch", md: "flex-end" }}
            flexWrap="wrap"
          >
            {/* Car Filter */}
            <Autocomplete
              value={selectedCar}
              onChange={(e, newValue) => handleFilterChange(setSelectedCar)(newValue)}
              options={carOptions}
              getOptionLabel={(option) => option.label || ""}
              isOptionEqualToValue={(option, value) => option._id === value?._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("table.filterByCar")}
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <FilterIcon sx={{ color: palette.neutral.gray500, mr: 1 }} fontSize="small" />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{ minWidth: 250, flex: 1 }}
              clearOnEscape
            />

            {/* Date From */}
            <TextField
              type="date"
              label={t("table.dateFrom")}
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />

            {/* Date To */}
            <TextField
              type="date"
              label={t("table.dateTo")}
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
          </Stack>

          {/* Second Row: Status, Origin, Search, Actions */}
          <Stack 
            direction={{ xs: "column", sm: "row" }} 
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
          >
            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t("table.filterByStatus")}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                label={t("table.filterByStatus")}
              >
                <MenuItem value="all">{t("table.all")}</MenuItem>
                <MenuItem value="confirmed">{t("table.confirmed")}</MenuItem>
                <MenuItem value="pending">{t("table.pending")}</MenuItem>
              </Select>
            </FormControl>

            {/* Origin Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t("table.filterByOrigin")}</InputLabel>
              <Select
                value={originFilter}
                onChange={(e) => handleFilterChange(setOriginFilter)(e.target.value)}
                label={t("table.filterByOrigin")}
              >
                <MenuItem value="all">{t("table.all")}</MenuItem>
                <MenuItem value="client">{t("table.clientOrder")}</MenuItem>
                <MenuItem value="admin">{t("table.adminOrder")}</MenuItem>
              </Select>
            </FormControl>

            {/* Search */}
            <TextField
              placeholder={t("table.search")}
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
              size="small"
              sx={{ minWidth: 200, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: palette.neutral.gray500 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange(setSearchQuery)("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Reset Button */}
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleResetFilters}
              size="small"
              startIcon={<ClearIcon />}
            >
              {t("table.reset")}
            </Button>

            {/* Refresh Button */}
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>

            {/* TODO STEP 2: Export Buttons (placeholders) */}
            <Button
              variant="outlined"
              size="small"
              disabled
              sx={{ opacity: 0.5 }}
            >
              {t("table.exportExcel")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled
              sx={{ opacity: 0.5 }}
            >
              {t("table.exportPdf")}
            </Button>
          </Stack>
        </Stack>

        {/* Filter Summary */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("table.allOrders")}: {filteredOrders.length} / {orders.length}
          </Typography>
        </Box>
      </Paper>

      {/* Orders Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: `1px solid ${palette.neutral.gray200}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ maxHeight: "60vh", minHeight: 300 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>
                  {t("table.status")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>
                  {t("table.orderNumber")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                  {t("table.carModel")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>
                  {t("table.pickup")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>
                  {t("table.return")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                  {t("table.customer")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                  {t("table.price")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 100, textAlign: "center" }}>
                  {t("table.confirmed")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t("table.loadingOrders")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("table.noOrders")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => {
                  const orderColor = getOrderColor(order);
                  const isBlocked = pendingConfirmBlockById?.[order._id];
                  const carDisplay = order.car?.model || order.carModel || "-";
                  const carRegNumber = order.car?.regNumber || order.carNumber || "";
                  
                  // Permission checks
                  const orderCanEdit = canEdit(order);
                  const isClient = isClientOrder(order);
                  
                  // Field-level permissions (computed for all editable fields)
                  const canEditCustomerName = canEditField(order, "customerName");
                  const canEditPhone = canEditField(order, "phone");
                  const canEditEmail = canEditField(order, "email");
                  const canEditStartDate = canEditField(order, "rentalStartDate");
                  const canEditEndDate = canEditField(order, "rentalEndDate");
                  const canEditTimeIn = canEditField(order, "timeIn");
                  const canEditTimeOut = canEditField(order, "timeOut");
                  const canEditTotalPrice = canEditField(order, "totalPrice");
                  
                  // Legacy aliases for backward compatibility
                  const canEditDates = canEditStartDate || canEditEndDate; // Any date editable
                  const canEditTimes = canEditTimeIn; // Used for both times
                  
                  // Dev-only: Permission audit log for first 1-2 orders (not spammy)
                  if (process.env.NODE_ENV !== "production" && paginatedOrders.indexOf(order) < 2) {
                    const permissionAudit = {
                      orderId: order._id,
                      orderNumber: order.orderNumber,
                      my_order: order.my_order,
                      confirmed: order.confirmed,
                      userRole: currentUser?.role,
                      customerName: canEditCustomerName,
                      phone: canEditPhone,
                      email: canEditEmail,
                      rentalStartDate: canEditStartDate,
                      rentalEndDate: canEditEndDate,
                      timeIn: canEditTimeIn,
                      timeOut: canEditTimeOut,
                      totalPrice: canEditTotalPrice,
                    };
                    console.log(`[Permission Audit] Order ${paginatedOrders.indexOf(order) + 1}:`, permissionAudit);
                  }
                  
                  // Check if this order has a conflict (from persistent conflictsByOrderId)
                  const orderConflict = conflictsByOrderId[order._id];
                  const isConflictSource = !!orderConflict;
                  
                  // Check if this order is in another order's conflicts list
                  const isConflictingOrder = Object.values(conflictsByOrderId).some((conflict) => {
                    return conflict.conflicts?.some((c) => {
                      const conflictId = c.orderId || c._id || c;
                      return String(conflictId) === String(order._id);
                    });
                  });
                  
                  // Check if this order is highlighted from context
                  const hasContextHighlight = conflictHighlightById[order._id];
                  
                  const hasConflict = isConflictSource || isConflictingOrder || hasContextHighlight;
                  const conflictInfo = conflictHighlightById[order._id];
                  const conflictMessage = orderConflict?.message || conflictInfo?.message;

                  return (
                    <React.Fragment key={order._id}>
                      <TableRow
                        hover
                        sx={{
                          borderLeft: `4px solid ${orderColor.main}`,
                          "&:hover": {
                            backgroundColor: orderColor.bg || alpha(orderColor.main, 0.04),
                          },
                          ...(hasConflict && {
                            backgroundColor: isConflictSource 
                              ? alpha(palette.status.error, 0.25)
                              : alpha(palette.status.error, 0.21),
                            border: `4px solid ${isConflictSource ? palette.status.error : palette.status.warning}`,
                            borderTop: `2px solid ${isConflictSource ? palette.status.error : palette.status.warning}`,
                            borderBottom: `2px solid ${isConflictSource ? palette.status.error : palette.status.warning}`,
                            color: "white"
                          }),
                        }}
                      >
                      {/* Status + Origin Chips + Protected indicator */}
                      <TableCell>
                        <Stack direction="column" spacing={0.5} alignItems="flex-start">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={order.confirmed ? t("table.confirmed") : t("table.pending")}
                              size="small"
                              sx={{
                                backgroundColor: orderColor.bg,
                                color: orderColor.text,
                                fontWeight: 500,
                                fontSize: "0.7rem",
                                height: 22,
                              }}
                            />
                            {/* Lock icon for orders admin cannot edit */}
                            {!orderCanEdit && isClient && (
                              <Tooltip title="Admin cannot edit client orders">
                                <LockIcon 
                                  fontSize="small" 
                                  sx={{ 
                                    color: palette.neutral.gray500, 
                                    fontSize: 14,
                                    ml: 0.5,
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
                          <Chip
                            label={order.my_order ? t("table.clientOrder") : t("table.adminOrder")}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: "0.65rem",
                              height: 20,
                              borderColor: palette.neutral.gray400,
                              color: palette.neutral.gray600,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.65rem",
                              lineHeight: 1.1,
                              color: order.IsConfirmedEmailSent
                                ? palette.status.success
                                : palette.neutral.gray500,
                            }}
                          >
                            {`Email sent: ${
                              order.IsConfirmedEmailSent ? "true" : "false"
                            }`}
                          </Typography>
                          {isBlocked && (
                            <Tooltip title={isBlocked}>
                              <BlockIcon 
                                fontSize="small" 
                                sx={{ color: palette.status.warning, mt: 0.5 }}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Order Number - NOT EDITABLE: System-generated identifier */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {order.orderNumber || "-"}
                        </Typography>
                      </TableCell>

                      {/* Car - NOT EDITABLE: Car selection handled separately via modal */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {carDisplay}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {carRegNumber}
                        </Typography>
                      </TableCell>

                      {/* Pickup Date/Time */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          <InlineEditCell
                            type="date"
                            value={order.rentalStartDate ? dayjs(order.rentalStartDate).tz(ATHENS_TZ).format("YYYY-MM-DD") : ""}
                            disabled={!canEditStartDate || isSaving[`${order._id}_rentalStartDate`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "rentalStartDate");
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать дату начала", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "rentalStartDate", val)}
                            formatDisplay={(val) => {
                              if (!val) return "-";
                              const date = dayjs(val, "YYYY-MM-DD");
                              return date.isValid() ? date.format("DD.MM.YYYY") : val;
                            }}
                          />
                          <InlineEditCell
                            type="time"
                            value={order.timeIn ? formatTime(order.timeIn) : ""}
                            disabled={!canEditTimeIn || isSaving[`${order._id}_timeIn`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "timeIn");
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать время начала", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "timeIn", val)}
                            formatDisplay={(val) => (val ? val : "-")}
                          />
                        </Stack>
                      </TableCell>

                      {/* Return Date/Time */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          <InlineEditCell
                            type="date"
                            value={order.rentalEndDate ? dayjs(order.rentalEndDate).tz(ATHENS_TZ).format("YYYY-MM-DD") : ""}
                            disabled={!canEditEndDate || isSaving[`${order._id}_rentalEndDate`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "rentalEndDate", currentUser);
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать дату окончания", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "rentalEndDate", val)}
                            formatDisplay={(val) => {
                              if (!val) return "-";
                              const date = dayjs(val, "YYYY-MM-DD");
                              return date.isValid() ? date.format("DD.MM.YYYY") : val;
                            }}
                          />
                          <InlineEditCell
                            type="time"
                            value={order.timeOut ? formatTime(order.timeOut) : ""}
                            disabled={!canEditTimeOut || isSaving[`${order._id}_timeOut`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "timeOut");
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать время окончания", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "timeOut", val)}
                            formatDisplay={(val) => (val ? val : "-")}
                          />
                        </Stack>
                      </TableCell>

                      {/* Customer - Inline Editing */}
                      {/* Скрываем контактные данные если _visibility.hideClientContacts === true */}
                      <TableCell>
                        {order._visibility?.hideClientContacts ? (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        ) : (
                        <Stack spacing={0.5}>
                          <InlineEditCell
                            value={order.customerName || ""}
                            disabled={!canEditCustomerName || isSaving[`${order._id}_customerName`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "customerName");
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать имя клиента", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "customerName", val)}
                          />
                          <InlineEditCell
                            value={order.phone || ""}
                            disabled={!canEditPhone || isSaving[`${order._id}_phone`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "phone");
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать телефон", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "phone", val)}
                          />
                          <InlineEditCell
                            type="email"
                            value={order.email || ""}
                            disabled={!canEditEmail || isSaving[`${order._id}_email`]}
                            onDenied={() => {
                              const permission = getFieldPermission(order, "email", currentUser);
                              enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать email", { variant: "warning" });
                            }}
                            onCommit={(val) => handleFieldUpdate(order._id, "email", val)}
                          />
                        </Stack>
                        )}
                      </TableCell>

                      {/* Price - Inline Editing with Recalculate Button */}
                      <TableCell align="right">
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {(() => {
                              /**
                               * PRICE FLOW (IMPORTANT)
                               *
                               * totalPrice
                               *   - ALWAYS auto-calculated price
                               *   - Updated ONLY by backend recalculation
                               *
                               * OverridePrice
                               *   - Manual price set by admin
                               *   - NEVER changed automatically
                               *
                               * effectivePrice =
                               *   OverridePrice !== null ? OverridePrice : totalPrice
                               *
                               * UI rules:
                               * - Inline edit → sets OverridePrice
                               * - Recalculate button → updates totalPrice ONLY
                               * - UI displays effectivePrice
                               * - Admin can reset OverridePrice explicitly
                               */
                              const effectivePrice = getEffectivePrice(order);
                              const hasManualOverride = order.OverridePrice !== null && order.OverridePrice !== undefined;
                              
                              return (
                                <>
                                  <InlineEditCell
                                    type="number"
                                    value={effectivePrice?.toString() || "0"}
                                    disabled={!canEditTotalPrice || isSaving[`${order._id}_totalPrice`]}
                                    onDenied={() => {
                                      const permission = getFieldPermission(order, "totalPrice");
                                      enqueueSnackbar(permission.reason || "⛔ Нельзя редактировать сумму", { variant: "warning" });
                                    }}
                                    onCommit={(val) => {
                                      // Parse numeric value carefully
                                      const numericValue = val ? parseFloat(val) : null;
                                      
                                      // Validate: reject NaN and empty
                                      if (numericValue === null || isNaN(numericValue) || val.trim() === "") {
                                        enqueueSnackbar("⛔ Введите корректное число", { variant: "error" });
                                        return;
                                      }
                                      
                                      // Accept positive numbers (allow decimals like "120.50")
                                      if (numericValue < 0) {
                                        enqueueSnackbar("⛔ Сумма не может быть отрицательной", { variant: "error" });
                                        return;
                                      }
                                      
                                      // 🔧 PRICE ARCHITECTURE: Manual input sets OverridePrice
                                      handleFieldUpdate(order._id, "totalPrice", numericValue, {
                                        source: "manual",
                                      });
                                    }}
                                    formatDisplay={(val) => {
                                      if (!val || val === "0") return "€0";
                                      const num = parseFloat(val);
                                      if (isNaN(num)) return "€0";
                                      return `€${num.toFixed(2)}`;
                                    }}
                                    inputProps={{
                                      step: "0.01",
                                      min: "0",
                                    }}
                                    sx={{ textAlign: "right" }}
                                    inputSx={{ textAlign: "right", fontWeight: 600 }}
                                  />
                                  {/* Visual marker for manual override */}
                                  {hasManualOverride && (
                                    <Tooltip title={`Автоматическая цена: €${order.totalPrice?.toFixed(2) || "0"}`}>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: palette.status.warning,
                                          fontSize: "0.65rem",
                                          whiteSpace: "nowrap",
                                          ml: 0.5,
                                        }}
                                      >
                                        ✏️ Manual
                                      </Typography>
                                    </Tooltip>
                                  )}
                                </>
                              );
                            })()}
                            <Tooltip title="Пересчитать цену на основе текущих данных заказа">
                              <IconButton
                                size="small"
                                onClick={() => handleRecalculatePrice(order)}
                                disabled={isRecalculatingPrice[order._id]}
                                sx={{ 
                                  p: 0.5,
                                  color: palette.primary.main,
                                  "&:hover": {
                                    backgroundColor: alpha(palette.primary.main, 0.1),
                                  },
                                }}
                              >
                                {isRecalculatingPrice[order._id] ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <AutorenewIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {getOrderNumberOfDaysOrZero(order)} {t("table.days")}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Confirmed - Switch Toggle */}
                      <TableCell align="center">
                        <Tooltip
                          title={
                            isTogglingConfirm[order._id]
                              ? t("table.loading")
                              : order.confirmed
                              ? t("table.unconfirm")
                              : t("table.confirm")
                          }
                        >
                          <span>
                            <Switch
                              checked={order.confirmed || false}
                              onChange={() => handleToggleConfirm(order._id)}
                              disabled={isTogglingConfirm[order._id]}
                              size="small"
                              color="primary"
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    
                    {/* Persistent Conflict Panel - only for source order */}
                    {isConflictSource && orderConflict && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 1.5, px: 2, backgroundColor: alpha(palette.status.error, 0.08) }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <BlockIcon sx={{ color: palette.status.error, fontSize: 18 }} />
                              <Typography variant="body2" sx={{ color: palette.status.error, fontWeight: 500 }}>
                                {orderConflict.message}
                              </Typography>
                              {orderConflict.conflicts && orderConflict.conflicts.length > 0 && (
                                <>
                                  <Typography variant="caption" sx={{ color: palette.status.error, ml: 1 }}>
                                    ({orderConflict.conflicts.length} {orderConflict.conflicts.length === 1 ? "conflict" : "conflicts"})
                                  </Typography>
                                  {orderConflict.conflicts.length > 0 && (
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                                      <Typography variant="caption" sx={{ color: palette.status.error }}>
                                        Conflicting orders:
                                      </Typography>
                                      {orderConflict.conflicts.slice(0, 5).map((conflict, idx) => {
                                        const conflictId = conflict.orderId || conflict._id || conflict;
                                        const conflictOrder = orders.find((o) => String(o._id) === String(conflictId));
                                        const conflictOrderNumber = conflictOrder?.orderNumber || conflictId;
                                        return (
                                          <Chip
                                            key={idx}
                                            label={conflictOrderNumber}
                                            size="small"
                                            sx={{
                                              height: 20,
                                              fontSize: "0.65rem",
                                              backgroundColor: alpha(palette.status.error, 0.2),
                                              color: palette.status.error,
                                            }}
                                          />
                                        );
                                      })}
                                      {orderConflict.conflicts.length > 5 && (
                                        <Typography variant="caption" sx={{ color: palette.status.error }}>
                                          +{orderConflict.conflicts.length - 5} more
                                        </Typography>
                                      )}
                                    </Stack>
                                  )}
                                </>
                              )}
                            </Stack>
                            {/* Clear button */}
                            <IconButton
                              size="small"
                              onClick={() => {
                                setConflictsByOrderId((prev) => {
                                  const next = { ...prev };
                                  delete next[order._id];
                                  return next;
                                });
                                clearConflictHighlights();
                              }}
                              sx={{
                                color: palette.status.error,
                                "&:hover": {
                                  backgroundColor: alpha(palette.status.error, 0.1),
                                },
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Conflict indicator for conflicting orders (not source) */}
                    {isConflictingOrder && !isConflictSource && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 0.5, px: 2, backgroundColor: alpha(palette.status.warning, 0.05) }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BlockIcon sx={{ color: palette.status.warning, fontSize: 16 }} />
                            <Typography variant="caption" sx={{ color: palette.status.warning, fontStyle: "italic" }}>
                              This order conflicts with the update attempt above
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredOrders.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage={t("table.rowsPerPage")}
          sx={{
            borderTop: `1px solid ${palette.neutral.gray200}`,
          }}
        />
      </Paper>
    </Box>
  );
}
