/**
 * useEditOrderState
 * 
 * 🎯 STATE & DATA ORCHESTRATION LAYER — The brain
 * 
 * This layer is the ONLY OWNER OF STATE:
 * - editedOrder
 * - startTime / endTime (Athens timezone)
 * - isManualTotalPrice
 * - isFirstOpen
 * - daysAndPriceState
 * - loading / updating flags
 * 
 * 🔥 SINGLE SOURCE OF TRUTH FOR PRICE 🔥
 * - totalPrice and numberOfDays live ONLY here
 * - UI never recalculates price
 * - UI never mutates numberOfDays directly
 * 
 * Price calculation rules:
 * - Server (`/calcTotalPrice`) is the ONLY calculator
 * - Manual price override sets `isManualTotalPrice = true`
 * - Any change in: car, rentalStartDate, rentalEndDate, insurance, childSeats, secondDriver
 * 
 *   resets `isManualTotalPrice = false`
 * 
 * Race-condition protection:
 * - Use requestId / abort logic so outdated calc responses are ignored
 * 
 * 🕐 ATHENS TIMEZONE CONTRACT 🕐
 * - editedOrder.rentalStartDate / rentalEndDate: dayjs in Athens (date-only, startOf("day"))
 * - startTime / endTime: dayjs in Athens (datetime)
 * - All time operations use athensTime.js utilities
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  fromServerUTC,
  createAthensDateTime,
  toServerUTC,
  formatTimeHHMM,
  formatDateYYYYMMDD,
  reinterpretAsAthens,
  athensStartOfDay,
  athensNow,
} from "@/domain/time/athensTime";
import { updateOrder, calculateTotalPrice, deleteOrder } from "@utils/action";
import { canUpdateStartDate } from "./startDateAccess";

/**
 * Hook for managing order edit state and price calculation
 * 
 * @param {Object} order - Original order object from props
 * @param {Array} cars - List of cars
 * @param {Object} company - Company data (for bufferTime)
 * @param {Object} permissions - Permission flags from useEditOrderPermissions
 * @param {Function} onSave - Callback when order is saved
 * @param {Function} onClose - Callback when modal closes
 * @param {Function} fetchAndUpdateOrders - Function to refetch orders
 * @param {Function} setCarOrders - Optional function to update car orders
 * @returns {Object} State and handlers
 */
export function useEditOrderState({
  order,
  cars,
  company,
  permissions,
  onSave,
  onClose,
  fetchAndUpdateOrders,
  setCarOrders,
}) {
  // ============================================================
  // STATE
  // ============================================================

  // Main edited order state
  const [editedOrder, setEditedOrder] = useState(null);
  
  // Time picker state (Athens timezone)
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  
  // Price calculation state
  const [isManualTotalPrice, setIsManualTotalPrice] = useState(false);
  const isFirstOpen = useRef(true);
  const [calcLoading, setCalcLoading] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  
  // Race condition protection
  const priceCalcRequestId = useRef(0);
  const priceCalcAbortController = useRef(null);

  // ============================================================
  // INITIALIZATION (Fix: Athens timezone for dates)
  // ============================================================

  useEffect(() => {
    if (!order) {
      setEditedOrder(null);
      setStartTime(null);
      setEndTime(null);
      setLoading(false);
      return;
    }

    // 🔧 FIX ДЫРКА A: rentalStartDate/rentalEndDate инициализируются в Athens
    // Используем fromServerUTC для правильной конвертации UTC → Athens
    const rentalStartDateAthens = fromServerUTC(order.rentalStartDate);
    const rentalEndDateAthens = fromServerUTC(order.rentalEndDate);
    
    // Создаём date-only в Athens (startOf("day"))
    const startDateAthens = athensStartOfDay(formatDateYYYYMMDD(rentalStartDateAthens));
    const endDateAthens = athensStartOfDay(formatDateYYYYMMDD(rentalEndDateAthens));

    const adjustedOrder = {
      ...order,
      secondDriver: Boolean(order.secondDriver),
      // ✅ Dates are now Athens dayjs objects (date-only)
      rentalStartDate: startDateAthens,
      rentalEndDate: endDateAthens,
      // Time fields are kept as-is (will be used for display)
      timeIn: fromServerUTC(order.timeIn),
      timeOut: fromServerUTC(order.timeOut),
      // 🔧 PRICE ARCHITECTURE: Preserve OverridePrice if it exists
      // OverridePrice is copied from order via spread operator above
      // Explicitly ensure it's preserved (null or number)
      OverridePrice: order.OverridePrice !== undefined ? order.OverridePrice : null,
    };

    setEditedOrder(adjustedOrder);
    setIsManualTotalPrice(false);
    
    // ✅ Times are Athens dayjs objects
    setStartTime(fromServerUTC(order.timeIn));
    setEndTime(fromServerUTC(order.timeOut));
    
    isFirstOpen.current = true;
    setLoading(false);
  }, [order]);

  // ============================================================
  // SELECTED CAR
  // ============================================================

  const selectedCar = useMemo(() => {
    if (!editedOrder?.car || !cars) return null;
    // Normalize car ID: handle both object and string formats
    const carId = editedOrder.car?._id ?? editedOrder.car;
    if (!carId) return null;
    return cars.find((c) => {
      const cId = c._id?._id ?? c._id;
      return cId?.toString() === carId.toString();
    }) || null;
  }, [cars, editedOrder?.car]);

  // ============================================================
  // PRICE CALCULATION (with race condition protection)
  // ============================================================

  // 🔧 FIX: Normalize pricing inputs (memoized for dependency tracking)
  const normalizedInsurance = useMemo(() => {
    return editedOrder?.insurance || "TPL";
  }, [editedOrder?.insurance]);

  const normalizedChildSeats = useMemo(() => {
    return Number(editedOrder?.ChildSeats ?? 0);
  }, [editedOrder?.ChildSeats]);

  const normalizedSecondDriver = useMemo(() => {
    return Boolean(editedOrder?.secondDriver);
  }, [editedOrder?.secondDriver]);

  useEffect(() => {
    // 🔧 FIX: Calculate price on first open if totalPrice is missing or zero
    // This allows admin to see the price even if order.totalPrice is 0 or null
    const shouldCalculateOnFirstOpen = isFirstOpen.current && (
      !editedOrder?.totalPrice || 
      editedOrder.totalPrice === 0 || 
      editedOrder.totalPrice === null
    );
    
    // 🔧 PRICE ARCHITECTURE: ALWAYS recalculate when pricing-affecting fields change
    // - Recalculation happens REGARDLESS of priceMode (MANUAL or AUTO)
    // - Manual override ONLY controls which price is USED, NOT whether auto price is recalculated
    // - totalPrice MUST ALWAYS reflect the latest calculated price
    
    // Skip calculation on first open (unless price is missing/zero)
    // BUT: Always allow recalculation if insurance/ChildSeats/secondDriver changed
    // (they reset isFirstOpen in updateField)
    if (isFirstOpen.current && !shouldCalculateOnFirstOpen) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useEditOrderState] Price calc skipped: isFirstOpen=true and price exists");
      }
      return;
    }
    
    // Skip if viewOnly mode
    if (permissions.viewOnly) return;
    
    // Skip if required fields are missing
    if (!selectedCar?.carNumber || !editedOrder?.rentalStartDate || !editedOrder?.rentalEndDate) {
      return;
    }
    
    // 🔧 FIX: Ensure we have valid insurance and ChildSeats values
    if (!normalizedInsurance || normalizedChildSeats === undefined) {
      return;
    }

    // Abort previous request
    if (priceCalcAbortController.current) {
      priceCalcAbortController.current.abort();
    }

    // Create new request
    const requestId = ++priceCalcRequestId.current;
    const abortController = new AbortController();
    priceCalcAbortController.current = abortController;

    setCalcLoading(true);

    const fetchTotalPrice = async () => {
      try {
        // Format dates as YYYY-MM-DD strings (Athens dates)
        const startDateStr = formatDateYYYYMMDD(editedOrder.rentalStartDate);
        const endDateStr = formatDateYYYYMMDD(editedOrder.rentalEndDate);

        // DEV log request
        if (process.env.NODE_ENV === "development") {
          console.log(`[useEditOrderState] Price calc request (requestId: ${requestId}):`, {
            carNumber: selectedCar.carNumber,
            rentalStartDate: startDateStr,
            rentalEndDate: endDateStr,
            insurance: normalizedInsurance,
            childSeats: normalizedChildSeats,
            secondDriver: normalizedSecondDriver,
          });
        }

        const data = await calculateTotalPrice(
          selectedCar.carNumber,
          startDateStr,
          endDateStr,
          normalizedInsurance, // API expects "kacko"
          normalizedChildSeats, // API expects "childSeats" (lowercase)
          {
            signal: abortController.signal,
            secondDriver: normalizedSecondDriver,
          }
        );

        if (data.ok) {
          
          // Race condition check: only update if this is the latest request
          if (requestId === priceCalcRequestId.current && !abortController.signal.aborted) {
            const safeTotalPrice = typeof data.totalPrice === "number" ? data.totalPrice : 0;
            const safeDays = typeof data.days === "number" ? data.days : 0;

            // 🔧 PRICE ARCHITECTURE: Always update totalPrice (it's the calculated price)
            // OverridePrice is preserved (not cleared) - UI will show effectivePrice
            // This ensures totalPrice always reflects the actual calculated price
            // Use updateField with source: "recalculate" to ensure consistency
            setEditedOrder((prev) => {
              if (!prev) return prev;
              
              // Check if values actually changed to avoid unnecessary updates
              const daysChanged = prev.numberOfDays !== safeDays;
              const priceChanged = prev.totalPrice !== safeTotalPrice;
              
              if (!daysChanged && !priceChanged) {
                return prev; // No changes, avoid update
              }
              
              // Always update totalPrice (calculated price)
              // OverridePrice stays as-is (preserved) - UI will show effectivePrice
              return {
                ...prev,
                numberOfDays: safeDays,
                totalPrice: safeTotalPrice,
                // OverridePrice is NOT touched - it remains if it was set manually
              };
            });
            
            // 🔧 FIX: Reset isFirstOpen after successful calculation
            // This allows subsequent changes (insurance/ChildSeats/secondDriver)
            // to trigger recalculation
            if (isFirstOpen.current) {
              isFirstOpen.current = false;
            }
            
            // DEV log
            if (process.env.NODE_ENV === "development") {
              console.log(`[useEditOrderState] Price calc response (requestId: ${requestId}):`, {
                days: safeDays,
                totalPrice: safeTotalPrice,
                isManualMode: isManualTotalPrice,
              });
            }
          }
        }
      } catch (error) {
        if (error.name !== "AbortError" && requestId === priceCalcRequestId.current) {
          console.error("Error calculating price:", error);
        }
      } finally {
        if (requestId === priceCalcRequestId.current) {
          setCalcLoading(false);
        }
      }
    };

    fetchTotalPrice();

    return () => {
      abortController.abort();
    };
    // 🔧 PRICE ARCHITECTURE: Dependencies are intentionally limited to pricing inputs
    // We don't want to recalculate when OverridePrice changes (that's manual mode)
    // We don't want to recalculate when totalPrice changes (that's the result, not input)
    // isManualTotalPrice is checked inside the effect, not needed as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCar?.carNumber,
    editedOrder?.rentalStartDate,
    editedOrder?.rentalEndDate,
    normalizedInsurance, // Memoized normalized insurance
    normalizedChildSeats, // Memoized normalized ChildSeats
    normalizedSecondDriver, // Memoized normalized secondDriver
    permissions.viewOnly, // Respect viewOnly mode
  ]);

  // ============================================================
  // RESET MANUAL MODE ON KEY FIELD CHANGES
  // ============================================================

  useEffect(() => {
    if (!order || !editedOrder) return;

    // Check if key fields changed compared to original order
    const isCarChanged = editedOrder.car !== order.car;
    const isStartChanged =
      formatDateYYYYMMDD(editedOrder.rentalStartDate) !==
      formatDateYYYYMMDD(fromServerUTC(order.rentalStartDate));
    const isEndChanged =
      formatDateYYYYMMDD(editedOrder.rentalEndDate) !==
      formatDateYYYYMMDD(fromServerUTC(order.rentalEndDate));
    const isInsuranceChanged = editedOrder.insurance !== order.insurance;
    const isChildSeatsChanged = editedOrder.ChildSeats !== order.ChildSeats;
    const isSecondDriverChanged =
      Boolean(editedOrder.secondDriver) !== Boolean(order.secondDriver);

    if (
      isCarChanged ||
      isStartChanged ||
      isEndChanged ||
      isInsuranceChanged ||
      isChildSeatsChanged ||
      isSecondDriverChanged
    ) {
      setIsManualTotalPrice(false);
      isFirstOpen.current = false;
    }
    // Note: We only need specific fields from editedOrder, not the whole object
    // order is used for comparison, not as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editedOrder?.car,
    editedOrder?.rentalStartDate,
    editedOrder?.rentalEndDate,
    editedOrder?.insurance,
    editedOrder?.ChildSeats,
    editedOrder?.secondDriver,
    order,
  ]);

  // ============================================================
  // FIELD UPDATERS
  // ============================================================

  /**
   * Update a field in editedOrder
   */
  /**
   * Update a field in editedOrder
   * 
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @param {Object} options - Options object
   * @param {string} options.source - Source of update: "manual" | "auto" | "recalculate" | undefined
   * @param {boolean} options.clearOverride - If true, clear OverridePrice when source is "auto"
   */
  const updateField = useCallback((field, value, options = {}) => {
    if (permissions.viewOnly) return;

    // ⛔ HARD PERMISSION GUARD: state layer must reject forbidden fields even if UI fires (e.g. MUI Autocomplete onInputChange when disabled)
    if (
      permissions.fieldPermissions &&
      permissions.fieldPermissions[field] === false
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[PERMISSION BLOCKED] Attempt to edit forbidden field "${field}"`,
          { value }
        );
      }
      return;
    }

    // 🔧 PRICE ARCHITECTURE: Handle totalPrice field based on source
    // - manual input → set OverridePrice in local state (priceMode: "MANUAL")
    // - auto → update totalPrice, optionally clear OverridePrice (if clearOverride: true)
    // - recalculate → update totalPrice only, preserve OverridePrice
    if (field === "totalPrice") {
      if (options.source === "manual") {
        // Manual input: save to OverridePrice in local state
        setEditedOrder((prev) => {
          if (!prev) return prev;
          return { ...prev, OverridePrice: value };
        });
        setIsManualTotalPrice(true);
        return; // Early return - don't update totalPrice field
      } else if (options.source === "auto") {
        // Auto mode: update totalPrice
        // If clearOverride is true, also clear OverridePrice (used by "Return automatic price" button)
        // If clearOverride is false/undefined, preserve OverridePrice (used by regular recalculation)
        setEditedOrder((prev) => {
          if (!prev) return prev;
          if (options.clearOverride === true) {
            // "Return automatic price" button: clear OverridePrice and use latest totalPrice
            return { ...prev, totalPrice: value, OverridePrice: null };
          } else {
            // Regular auto recalculation: update totalPrice, preserve OverridePrice
            return { ...prev, totalPrice: value };
          }
        });
        if (options.clearOverride === true) {
          setIsManualTotalPrice(false);
        }
        // Don't change isManualTotalPrice if clearOverride is false (preserve current mode)
        return; // Early return - already updated
      } else if (options.source === "recalculate") {
        // Recalculate: update totalPrice only, preserve OverridePrice (if MANUAL mode)
        setEditedOrder((prev) => {
          if (!prev) return prev;
          // Only update totalPrice, keep OverridePrice as-is
          return { ...prev, totalPrice: value };
        });
        // Don't change isManualTotalPrice - preserve current mode
        return; // Early return - already updated
      } else {
        // Default (backward compatibility): treat as manual input
        setEditedOrder((prev) => {
          if (!prev) return prev;
          return { ...prev, OverridePrice: value };
        });
        setIsManualTotalPrice(true);
        return; // Early return - don't update totalPrice field
      }
    }

    // For all other fields, update normally
    setEditedOrder((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
    
    // 🔧 PRICE ARCHITECTURE: Handle price-affecting fields
      // - In AUTO mode: trigger recalculation by resetting isFirstOpen
      // - In MANUAL mode: preserve OverridePrice, but still allow background recalculation
    if (
      field === "insurance" ||
      field === "ChildSeats" ||
      field === "car" ||
      field === "secondDriver"
    ) {
        // Always reset isFirstOpen to allow recalculation
        // The effect will check priceMode and decide whether to recalculate
        isFirstOpen.current = false;
        setIsManualTotalPrice(false);
        
        // DEV log
        if (process.env.NODE_ENV === "development") {
          const priceMode = prev?.OverridePrice !== null && prev?.OverridePrice !== undefined ? "MANUAL" : "AUTO";
          console.log(`[useEditOrderState] updateField(${field}): ${priceMode} mode - reset isFirstOpen, will recalculate if AUTO`);
        }
      }
      
      return updated;
    });
  }, [permissions.viewOnly, permissions.fieldPermissions]);

  /**
   * Update start date (Athens timezone)
   * 🔧 FIX ДЫРКА B: DatePicker парсит как Athens дату
   * Access is enforced by fieldPermissions.rentalStartDate (SSOT from orderAccessPolicy)
   */
  const updateStartDate = useCallback((dateStr) => {
    if (!canUpdateStartDate(permissions)) return;
    
    // Create Athens date from YYYY-MM-DD string
    const newStartDate = athensStartOfDay(dateStr);
    
    // Validate: cannot set past date
    const todayAthens = athensStartOfDay(formatDateYYYYMMDD(athensNow()));
    if (newStartDate.isBefore(todayAthens, "day")) {
      return; // Ignore invalid selection
    }

    setEditedOrder((prev) => {
      if (!prev) return prev;
      const currentEnd = prev.rentalEndDate;
      
      // Validate: end date must be after start date
      if (currentEnd && !currentEnd.isAfter(newStartDate, "day")) {
        return prev; // Keep previous value
      }
      
      return { ...prev, rentalStartDate: newStartDate };
    });
    
    setIsManualTotalPrice(false);
    isFirstOpen.current = false;
  }, [permissions]);

  /**
   * Update end date (Athens timezone)
   */
  const updateEndDate = useCallback((dateStr) => {
    if (permissions.viewOnly) return;
    
    // Create Athens date from YYYY-MM-DD string
    const newEndDate = athensStartOfDay(dateStr);
    
    // Validate: for current order, cannot set past date
    if (permissions.isCurrentOrder) {
      const todayAthens = athensStartOfDay(formatDateYYYYMMDD(athensNow()));
      if (newEndDate.isBefore(todayAthens, "day")) {
        return; // Ignore invalid selection
      }
    }

    setEditedOrder((prev) => {
      if (!prev) return prev;
      const currentStart = prev.rentalStartDate;
      
      // Validate: end date must be after start date
      if (currentStart && !newEndDate.isAfter(currentStart, "day")) {
        return prev; // Keep previous value
      }
      
      return { ...prev, rentalEndDate: newEndDate };
    });
    
    setIsManualTotalPrice(false);
    isFirstOpen.current = false;
  }, [permissions.viewOnly, permissions.isCurrentOrder]);

  /**
   * Update start time (Athens timezone)
   * 🔧 FIX ДЫРКА C: TimePicker даёт dayjs в локальной TZ, переинтерпретируем как Athens
   */
  const updateStartTime = useCallback((localDayjs) => {
    if (permissions.viewOnly) return;
    
    if (!localDayjs || !dayjs.isDayjs(localDayjs)) return;
    
    // Get date string from editedOrder
    const dateStr = formatDateYYYYMMDD(editedOrder?.rentalStartDate);
    if (!dateStr) return;
    
    // Reinterpret as Athens (extract HH:mm, create new Athens datetime)
    const athensTime = reinterpretAsAthens(localDayjs, dateStr);
    if (athensTime) {
      setStartTime(athensTime);
      setIsManualTotalPrice(false);
      isFirstOpen.current = false;
    }
  }, [permissions.viewOnly, editedOrder?.rentalStartDate]);

  /**
   * Update end time (Athens timezone)
   */
  const updateEndTime = useCallback((localDayjs) => {
    if (permissions.viewOnly) return;
    
    if (!localDayjs || !dayjs.isDayjs(localDayjs)) return;
    
    // Get date string from editedOrder
    const dateStr = formatDateYYYYMMDD(editedOrder?.rentalEndDate);
    if (!dateStr) return;
    
    // Reinterpret as Athens (extract HH:mm, create new Athens datetime)
    const athensTime = reinterpretAsAthens(localDayjs, dateStr);
    if (athensTime) {
      setEndTime(athensTime);
      setIsManualTotalPrice(false);
      isFirstOpen.current = false;
    }
  }, [permissions.viewOnly, editedOrder?.rentalEndDate]);

  // ============================================================
  // HANDLERS
  // ============================================================

  /**
   * Handle save (unified update)
   */
  const handleSave = useCallback(async () => {
    if (permissions.viewOnly) return;
    
    setAttemptedSave(true);
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      if (!editedOrder) {
        throw new Error("No order to save");
      }

      // Use memoized selectedCar from hook (already normalized)
      if (!selectedCar) {
        throw new Error("Car not found");
      }

      // Build payload with only allowed fields
      const payload = {};
      const { fieldPermissions } = permissions;

      // Date/time fields
      if (fieldPermissions.rentalStartDate) {
        // Convert Athens date to Date (for server)
        payload.rentalStartDate = editedOrder.rentalStartDate.toDate();
      }
      if (fieldPermissions.rentalEndDate) {
        payload.rentalEndDate = editedOrder.rentalEndDate.toDate();
      }
      if (fieldPermissions.timeIn && startTime) {
        const startDateStr = formatDateYYYYMMDD(editedOrder.rentalStartDate);
        const timeInAthens = createAthensDateTime(
          startDateStr,
          formatTimeHHMM(startTime)
        );
        payload.timeIn = toServerUTC(timeInAthens);
      }
      if (fieldPermissions.timeOut && endTime) {
        const endDateStr = formatDateYYYYMMDD(editedOrder.rentalEndDate);
        const timeOutAthens = createAthensDateTime(
          endDateStr,
          formatTimeHHMM(endTime)
        );
        payload.timeOut = toServerUTC(timeOutAthens);
      }

      // Other fields
      if (fieldPermissions.car) payload.car = editedOrder.car;
      if (fieldPermissions.placeIn) payload.placeIn = editedOrder.placeIn;
      if (fieldPermissions.placeOut) payload.placeOut = editedOrder.placeOut;
      // 🔧 FIX: Check for true (allowed) instead of !== undefined
      // fieldPermissions returns boolean (true/false), not undefined
      if (fieldPermissions.ChildSeats === true) {
        payload.ChildSeats = editedOrder.ChildSeats;
      }
      if (fieldPermissions.insurance === true) {
        payload.insurance = editedOrder.insurance;
      }
      if (fieldPermissions.franchiseOrder === true) {
        payload.franchiseOrder = editedOrder.franchiseOrder;
      }
      // 🔧 PRICE ARCHITECTURE: Handle price in payload
      // - If OverridePrice is set → send it as totalPrice with isOverridePrice: true
      // - Otherwise → send totalPrice with isOverridePrice: false
      // - Always send price in AUTO mode to ensure backend has latest calculated value
      if (fieldPermissions.totalPrice === true) {
        if (editedOrder.OverridePrice !== null && editedOrder.OverridePrice !== undefined) {
          // MANUAL mode: send OverridePrice
          payload.totalPrice = Number(editedOrder.OverridePrice);
          payload.isOverridePrice = true;
        } else {
          // AUTO mode: send calculated totalPrice (always send, even if 0, to ensure backend has latest)
          const calculatedPrice = Number(editedOrder.totalPrice) || 0;
          payload.totalPrice = calculatedPrice;
          payload.isOverridePrice = false;
        }
      }
      if (editedOrder.numberOfDays !== undefined) {
        payload.numberOfDays = Number(editedOrder.numberOfDays);
      }

      // 🔧 FIX: Customer fields - always include if permission allows AND field exists in editedOrder
      // Include even if empty string (for email) or if value changed
      if (fieldPermissions.customerName !== false) {
        // Always include customerName if permission allows (required field)
        if (editedOrder.customerName !== undefined) {
          payload.customerName = editedOrder.customerName || "";
        }
      }
      if (fieldPermissions.phone !== false) {
        // Always include phone if permission allows (required field)
        if (editedOrder.phone !== undefined) {
          payload.phone = editedOrder.phone || "";
        }
      }
      if (fieldPermissions.email !== false) {
        // Always include email if permission allows (optional field, can be empty)
        // Use ?? to handle null/undefined as empty string
        payload.email = editedOrder.email ?? "";
      }
      if (fieldPermissions.secondDriver !== false) {
        payload.secondDriver = Boolean(editedOrder.secondDriver);
      }
      if (fieldPermissions.Viber !== false) {
        payload.Viber = Boolean(editedOrder.Viber);
      }
      if (fieldPermissions.Whatsapp !== false) {
        payload.Whatsapp = Boolean(editedOrder.Whatsapp);
      }
      if (fieldPermissions.Telegram !== false) {
        payload.Telegram = Boolean(editedOrder.Telegram);
      }
      if (fieldPermissions.flightNumber !== false) {
        // Always include flightNumber if permission allows (optional field)
        payload.flightNumber = editedOrder.flightNumber ?? "";
      }

      // Check if we have any changes
      if (Object.keys(payload).length === 0) {
        setUpdateMessage("⛔ Нет прав на изменение полей этого заказа");
        return;
      }

      // Validation
      if (fieldPermissions.rentalStartDate) {
        const originalStart = fromServerUTC(order.rentalStartDate);
        const todayAthens = athensNow();
        if (
          editedOrder.rentalStartDate.isBefore(todayAthens, "day") &&
          !originalStart.isSame(editedOrder.rentalStartDate, "day")
        ) {
          setUpdateMessage(
            "Нельзя устанавливать новую дату начала раньше сегодняшнего дня"
          );
          return;
        }
      }

      if (fieldPermissions.rentalEndDate && permissions.isCurrentOrder) {
        const todayAthens = athensNow();
        if (editedOrder.rentalEndDate.isBefore(todayAthens, "day")) {
          setUpdateMessage(
            "Для текущего заказа дата окончания не может быть раньше сегодняшнего дня"
          );
          return;
        }
      }

      if (
        fieldPermissions.timeOut &&
        permissions.isCurrentOrder &&
        editedOrder.rentalEndDate.isSame(athensNow(), "day")
      ) {
        const endDateStr = formatDateYYYYMMDD(editedOrder.rentalEndDate);
        const attemptedEndTime = createAthensDateTime(
          endDateStr,
          formatTimeHHMM(endTime)
        );
        const nowAthens = athensNow();
        if (attemptedEndTime.isBefore(nowAthens, "minute")) {
          setUpdateMessage(
            "Для текущего заказа время окончания не может быть в прошлом"
          );
          return;
        }
      }

      // DEV log payload - verify customer fields are included
      if (process.env.NODE_ENV === "development") {
        console.log("[useEditOrderState] Save payload:", {
          customerName: payload.customerName,
            phone: payload.phone,
            email: payload.email,
            secondDriver: payload.secondDriver,
            Viber: payload.Viber,
            Whatsapp: payload.Whatsapp,
            Telegram: payload.Telegram,
          flightNumber: payload.flightNumber,
          totalPrice: payload.totalPrice,
          numberOfDays: payload.numberOfDays,
          allFields: Object.keys(payload),
          customerFieldsIncluded: {
            customerName: "customerName" in payload,
            phone: "phone" in payload,
            email: "email" in payload,
            secondDriver: "secondDriver" in payload,
            Viber: "Viber" in payload,
            Whatsapp: "Whatsapp" in payload,
            Telegram: "Telegram" in payload,
            flightNumber: "flightNumber" in payload,
          },
          fieldPermissions: {
            customerName: fieldPermissions.customerName,
            phone: fieldPermissions.phone,
            email: fieldPermissions.email,
            secondDriver: fieldPermissions.secondDriver,
            Viber: fieldPermissions.Viber,
            Whatsapp: fieldPermissions.Whatsapp,
            Telegram: fieldPermissions.Telegram,
            flightNumber: fieldPermissions.flightNumber,
          },
          editedOrderValues: {
            customerName: editedOrder.customerName,
            phone: editedOrder.phone,
            email: editedOrder.email,
            secondDriver: editedOrder.secondDriver,
            Viber: editedOrder.Viber,
            Whatsapp: editedOrder.Whatsapp,
            Telegram: editedOrder.Telegram,
            flightNumber: editedOrder.flightNumber,
          },
        });
      }

      // Call unified API
      const response = await updateOrder(editedOrder._id, payload);

      // Handle response
      if (response.status === 201 || response.status === 202) {
        // 🔧 FIX: Sync editedOrder with server response to prevent stale data
        if (response.updatedOrder) {
          // Convert server dates to Athens timezone
          // 🔧 PRICE ARCHITECTURE: Preserve OverridePrice from server response
          const updatedOrder = {
            ...response.updatedOrder,
            rentalStartDate: athensStartOfDay(formatDateYYYYMMDD(fromServerUTC(response.updatedOrder.rentalStartDate))),
            rentalEndDate: athensStartOfDay(formatDateYYYYMMDD(fromServerUTC(response.updatedOrder.rentalEndDate))),
            timeIn: fromServerUTC(response.updatedOrder.timeIn),
            timeOut: fromServerUTC(response.updatedOrder.timeOut),
            // Preserve OverridePrice if server returned it (or null if cleared)
            OverridePrice: response.updatedOrder.OverridePrice !== undefined 
              ? response.updatedOrder.OverridePrice 
              : editedOrder?.OverridePrice, // Fallback to current value if server didn't return it
          };
          
          setEditedOrder(updatedOrder);
          
          // DEV log response - verify customer fields were saved
          if (process.env.NODE_ENV === "development") {
            console.log("[useEditOrderState] Save response:", {
              customerName: updatedOrder.customerName,
              phone: updatedOrder.phone,
              email: updatedOrder.email,
              secondDriver: updatedOrder.secondDriver,
              Viber: updatedOrder.Viber,
              Whatsapp: updatedOrder.Whatsapp,
              Telegram: updatedOrder.Telegram,
              flightNumber: updatedOrder.flightNumber,
              totalPrice: updatedOrder.totalPrice,
              numberOfDays: updatedOrder.numberOfDays,
              customerFieldsMatch: {
                customerName: updatedOrder.customerName === (payload.customerName ?? order.customerName),
                phone: updatedOrder.phone === (payload.phone ?? order.phone),
                email: updatedOrder.email === (payload.email ?? order.email),
                secondDriver:
                  updatedOrder.secondDriver ===
                  (payload.secondDriver ?? order.secondDriver),
                Viber: updatedOrder.Viber === (payload.Viber ?? order.Viber),
                Whatsapp: updatedOrder.Whatsapp === (payload.Whatsapp ?? order.Whatsapp),
                Telegram: updatedOrder.Telegram === (payload.Telegram ?? order.Telegram),
                flightNumber: updatedOrder.flightNumber === (payload.flightNumber ?? order.flightNumber),
              },
            });
          }
        }
        
        onSave(response.updatedOrder);
        setUpdateMessage("Order updated successfully");
        setAttemptedSave(false);
      } else if (response.status === 408 || response.status === 409) {
        setUpdateMessage(response.message || "Conflict detected");
      } else {
        setUpdateMessage(response.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      setUpdateMessage(error?.message || "Failed to update order");
    } finally {
      setIsUpdating(false);
    }
  }, [
    permissions,
    editedOrder,
    startTime,
    endTime,
    selectedCar, // Use memoized selectedCar instead of cars
    order,
    onSave,
    // Note: isManualTotalPrice is checked inside callback, not needed in deps
    // Note: cars removed from deps - we use memoized selectedCar instead
  ]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback(async () => {
    if (permissions.viewOnly || !permissions.canDelete) return;

    // Check if current order (admin cannot delete)
    if (
      permissions.isCurrentOrder &&
      !permissions.canDelete // This already checks superadmin
    ) {
      setUpdateMessage("Текущий заказ нельзя удалить");
      return;
    }

    const isConfirmed = window.confirm("Are you sure you want to delete this order?");
    if (!isConfirmed) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const result = await deleteOrder(editedOrder._id);

      if (!result.success) {
        throw new Error(result.message || "Failed to delete order");
      }

      if (setCarOrders) {
        setCarOrders((prevOrders) =>
          prevOrders.filter((o) => o._id !== editedOrder._id)
        );
      }

      await fetchAndUpdateOrders();
      setUpdateMessage("Order deleted successfully");
      onClose();
    } catch (error) {
      console.error("Error deleting order:", error);
      setUpdateMessage("Failed to delete order. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }, [
    permissions,
    editedOrder,
    setCarOrders,
    fetchAndUpdateOrders,
    onClose,
  ]);

  // Reset attemptedSave when time/date changes
  useEffect(() => {
    setAttemptedSave(false);
  }, [startTime, endTime, editedOrder?.rentalStartDate, editedOrder?.rentalEndDate]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // State
    editedOrder,
    setEditedOrder, // ⬅️ Экспортируем для полной замены после refetch
    startTime,
    endTime,
    loading,
    isUpdating,
    setIsUpdating,
    updateMessage,
    attemptedSave,
    setAttemptedSave,
    calcLoading,
    
    // Derived
    selectedCar,
    
    // Updaters
    updateField,
    updateStartDate,
    updateEndDate,
    updateStartTime,
    updateEndTime,
    
    // Handlers
    handleSave,
    handleDelete,
    setUpdateMessage,
  };
}

export default useEditOrderState;
