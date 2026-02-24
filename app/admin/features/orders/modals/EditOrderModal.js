import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  useTheme,
} from "@mui/material";
import {
  ConfirmButton,
  CancelButton,
  DeleteButton,
  ActionButton,
} from "@/app/components/ui";
import { RenderTextField } from "@/app/components/ui/inputs/Fields";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import Snackbar from "@/app/components/ui/feedback/Snackbar";
import { useMainContext } from "@app/Context";
import TimePicker from "@/app/components/calendar-ui/MuiTimePicker";
import { BufferSettingsLinkifiedText } from "@/app/components/ui";
import { useEditOrderConflicts } from "../hooks/useEditOrderConflicts";
import { useEditOrderPermissions } from "../hooks/useEditOrderPermissions";
import { useEditOrderState } from "../hooks/useEditOrderState";
import { useOrderAccess } from "../hooks/useOrderAccess";
import { useSession } from "next-auth/react";
// 🎯 Athens timezone utilities — ЕДИНСТВЕННЫЙ источник правды для времени
import {
  ATHENS_TZ,
  fromServerUTC,
  createAthensDateTime,
  toServerUTC,
  formatTimeHHMM,
  formatDateYYYYMMDD,
  athensStartOfDay,
  athensNow,
} from "@/domain/time/athensTime";
// 🎯 Утилита для проверки возможности подтверждения заказа; формат сообщения (UI строит текст из данных)
import { canPendingOrderBeConfirmed } from "@/domain/booking/analyzeConfirmationConflicts";
// 🎯 Модальное окно настройки буфера
import BufferSettingsModal from "@/app/admin/features/settings/BufferSettingsModal";
import { ORDER_COLORS } from "@/config/orderColors";
import { getSecondDriverPriceLabelValue } from "@utils/secondDriverPricing";

import { toggleConfirmedStatus, getConfirmedOrders } from "@utils/action";
import { RenderSelectField } from "@/app/components/ui/inputs/Fields";
import { useTranslation } from "react-i18next";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// ⚠️ УДАЛЁН: timeZone константа и dayjs.tz.setDefault()
// Теперь используем athensTime.js для всей работы с таймзонами

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

const EditOrderModal = ({
  open,
  onClose,
  order,
  onSave,
  setCarOrders,
  isConflictOrder,
  setIsConflictOrder,
  startEndDates,
  cars, // <-- список автомобилей
  isViewOnly, // <-- режим просмотра (передаётся из BigCalendar для завершённых заказов)
}) => {
  const { allOrders, fetchAndUpdateOrders, company } = useMainContext();
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();
  const secondDriverPriceLabelValue = getSecondDriverPriceLabelValue();

  // Get current user for permission checks
  const currentUser = useMemo(() => {
    if (!session?.user?.isAdmin) return null;
    return {
      isAdmin: true,
      role: session.user.role,
      roleId: session.user.roleId,
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  }, [session]);
  const isCurrentUserSuperAdmin = useMemo(() => {
    if (!currentUser?.isAdmin) return false;

    const rawRole =
      currentUser?.role ??
      currentUser?.roleId ??
      session?.user?.role ??
      session?.user?.roleId;

    if (rawRole === null || rawRole === undefined) return false;

    const normalizedRole = String(rawRole).trim().toUpperCase();
    return (
      normalizedRole === "2" ||
      normalizedRole === "SUPERADMIN" ||
      normalizedRole === "SUPER_ADMIN"
    );
  }, [
    currentUser?.isAdmin,
    currentUser?.role,
    currentUser?.roleId,
    session?.user?.role,
    session?.user?.roleId,
  ]);

  // 🎯 LAYER 1.5: Access Policy (Single Source of Truth)
  // orderForAccess: order on open, updated on refetch so access (canSeeClientPII etc.) stays correct
  const [orderForAccess, setOrderForAccess] = useState(order);
  useEffect(() => {
    setOrderForAccess((prev) => (prev?._id === order?._id ? order : prev));
  }, [order]);
  const access = useOrderAccess(orderForAccess || order, {
    forceViewOnly: isViewOnly,
  });

  // 🎯 LAYER 1: Permissions (Domain/Logic Layer) — client PII from access.canEditClientPII only
  const permissions = useEditOrderPermissions(
    order,
    currentUser,
    isViewOnly,
    access
  );

  // 🎯 LAYER 2: State & Data Orchestration Layer
  const {
    editedOrder,
    setEditedOrder, // ⬅️ Для полной замены после refetch
    startTime,
    endTime,
    loading,
    isUpdating,
    setIsUpdating,
    updateMessage,
    attemptedSave,
    setAttemptedSave,
    calcLoading,
    selectedCar,
    updateField,
    updateStartDate,
    updateEndDate,
    updateStartTime,
    updateEndTime,
    handleSave,
    handleDelete,
    setUpdateMessage,
  } = useEditOrderState({
    order,
    cars,
    company,
    permissions,
    onSave,
    onClose,
    fetchAndUpdateOrders,
    setCarOrders,
  });

  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Сегодня (Athens timezone) для ограничения выбора начала аренды
  const todayStr = athensNow().format("YYYY-MM-DD");
  const locations = company.locations.map((loc) => loc.name);

  // Conflict check for conflict order badge
  useEffect(() => {
    if (order?.hasConflictDates) {
      const ordersIdSet = new Set(order?.hasConflictDates);
      const checkConflicts = async () => {
        const isConflict = await getConfirmedOrders([...ordersIdSet]);
        if (isConflict) {
          setIsConflictOrder(true);
        }
      };
      checkConflicts();
    }
  }, [order, setIsConflictOrder]);

  // ============================================================
  // ✅ MANDATORY DETAIL REFETCH
  // ============================================================
  // Список/календарь может содержать stale данные (подтверждение, PII, история отправок email).
  // При открытии модалки всегда запрашиваем актуальный заказ.
  useEffect(() => {
    if (!open || !order?._id) return;

    const refetchOrderDetails = async () => {
      try {
        const res = await fetch(`/api/order/refetch/${order._id}`);
        if (!res.ok) return;

        const freshOrder = await res.json();
        if (!freshOrder?._id) return;

        // Трансформируем даты как в useEditOrderState
        const { fromServerUTC, athensStartOfDay, formatDateYYYYMMDD } =
          await import("@/domain/time/athensTime");

        const rentalStartDateAthens = fromServerUTC(freshOrder.rentalStartDate);
        const rentalEndDateAthens = fromServerUTC(freshOrder.rentalEndDate);
        const startDateAthens = athensStartOfDay(
          formatDateYYYYMMDD(rentalStartDateAthens)
        );
        const endDateAthens = athensStartOfDay(
          formatDateYYYYMMDD(rentalEndDateAthens)
        );

        const transformedOrder = {
          ...freshOrder,
          rentalStartDate: startDateAthens,
          rentalEndDate: endDateAthens,
          timeIn: fromServerUTC(freshOrder.timeIn),
          timeOut: fromServerUTC(freshOrder.timeOut),
          OverridePrice:
            freshOrder.OverridePrice !== undefined
              ? freshOrder.OverridePrice
              : null,
        };

        // Обновляем editedOrder и orderForAccess свежими данными (для access.canSeeClientPII и т.д.)
        setEditedOrder(transformedOrder);
        setOrderForAccess(transformedOrder);
      } catch (err) {
        console.warn("Failed to refetch order details:", err);
      }
    };

    refetchOrderDetails();
  }, [open, order?._id, setEditedOrder]);

  // handleDelete is now provided by useEditOrderState hook

  // --- Централизованный анализ конфликтов времени ---

  const { pickupSummary, returnSummary, hasBlockingConflict } =
    useEditOrderConflicts({
      allOrders,
      editingOrder: order,
      carId: editedOrder?.car,
      pickupDate: editedOrder?.rentalStartDate,
      pickupTime: startTime,
      returnDate: editedOrder?.rentalEndDate,
      returnTime: endTime,
      company,
    });

  // State для модального окна настройки буфера
  const [bufferModalOpen, setBufferModalOpen] = useState(false);

  const onCloseModalEdit = () => {
    onClose();
    // ⚠️ УДАЛЕНЫ: setConflictMessage1/2, setAvailableTimes
  };
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setUpdateMessage(null);
  };

  const showMessage = (message, isError = false) => {
    setUpdateMessage(message);
    setSnackbarOpen(true);
    if (!isError) {
      setTimeout(() => {
        setSnackbarOpen(false);
        setUpdateMessage(null);
      }, 3000);
    }
  };

  // Local state for confirmation toggle (separate from save operation)
  const [confirmToggleUpdating, setConfirmToggleUpdating] = useState(false);
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const handleConfirmationToggle = async () => {
    if (permissions.viewOnly || !permissions.canConfirm) return;

    // 🔧 FIX: Check for unsaved time changes before confirmation
    // Confirmation toggle ONLY changes confirmed status, NOT time fields
    // If user changed time and clicks Confirm, those changes would be lost
    const hasUnsavedTimeChanges = (() => {
      if (!order || !startTime || !endTime) return false;
      const origTimeIn = fromServerUTC(order.timeIn);
      const origTimeOut = fromServerUTC(order.timeOut);
      const timeInChanged =
        startTime.format("HH:mm") !== origTimeIn?.format("HH:mm");
      const timeOutChanged =
        endTime.format("HH:mm") !== origTimeOut?.format("HH:mm");
      return timeInChanged || timeOutChanged;
    })();

    if (hasUnsavedTimeChanges) {
      const proceed = window.confirm(
        'Есть несохранённые изменения времени. Нажмите "Сохранить" чтобы сохранить изменения, или "ОК" чтобы продолжить подтверждение без сохранения.'
      );
      if (!proceed) return;
    }

    setConfirmToggleUpdating(true);
    setUpdateMessage(null);
    try {
      const result = await toggleConfirmedStatus(editedOrder._id);

      if (!result.success) {
        setUpdateMessage(result.message);
        return;
      }

      // ============================================
      // BUG FIX: После подтверждения нужно перезагрузить заказ,
      // чтобы получить данные клиента (visibility применяется на сервере)
      // ============================================
      let freshOrder = result.updatedOrder;
      try {
        const refetchRes = await fetch(`/api/order/refetch/${editedOrder._id}`);
        if (refetchRes.ok) {
          freshOrder = await refetchRes.json();
        }
      } catch (refetchError) {
        console.warn(
          "Failed to refetch order after confirmation:",
          refetchError
        );
        // Fallback to result.updatedOrder if refetch fails
      }

      // ✅ ПРАВИЛЬНЫЙ ФИКС: Полностью заменяем editedOrder свежими данными
      // Трансформируем даты в Athens timezone как это делает useEditOrderState
      if (freshOrder) {
        const transformedOrder = {
          ...freshOrder,
          rentalStartDate: athensStartOfDay(
            formatDateYYYYMMDD(fromServerUTC(freshOrder.rentalStartDate))
          ),
          rentalEndDate: athensStartOfDay(
            formatDateYYYYMMDD(fromServerUTC(freshOrder.rentalEndDate))
          ),
          timeIn: fromServerUTC(freshOrder.timeIn),
          timeOut: fromServerUTC(freshOrder.timeOut),
          OverridePrice:
            freshOrder.OverridePrice !== undefined
              ? freshOrder.OverridePrice
              : null,
        };
        setEditedOrder(transformedOrder);
      }

      // Show message
      const isWarning = result.level === "warning";
      setUpdateMessage(result.message);
      onSave(freshOrder);

      // Close modal
      setTimeout(
        () => {
          onClose();
        },
        isWarning ? 3000 : 1500
      );
    } catch (error) {
      console.error("Error toggling confirmation status:", error);
      setUpdateMessage(error.message || "Статус не обновлен. Ошибка сервера.");
    } finally {
      setConfirmToggleUpdating(false);
    }
  };

  const handleSendConfirmationEmail = async () => {
    if (isSendingConfirmation) return;
    if (!isCurrentUserSuperAdmin) return;
    if (!canSendConfirmationEmail) return;

    const orderId = editedOrder?._id || order?._id;
    if (!orderId) {
      setUpdateMessage(t("order.confirmationEmailFailed"));
      setSnackbarOpen(true);
      return;
    }

    const locale = String(
      i18n?.resolvedLanguage || i18n?.language || "en"
    )
      .split("-")[0]
      .toLowerCase();

    setIsSendingConfirmation(true);
    setUpdateMessage(null);

    try {
      const response = await fetch("/api/admin/orders/send-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, locale }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      setEditedOrder((prev) => {
        if (!prev) return prev;
        const prevHistory = Array.isArray(prev.confirmationEmailHistory)
          ? prev.confirmationEmailHistory
          : [];
        const nextHistory = data?.confirmationEmailEvent
          ? [...prevHistory, data.confirmationEmailEvent]
          : prevHistory;
        return {
          ...prev,
          IsConfirmedEmailSent: true,
          confirmationEmailHistory: nextHistory,
        };
      });
      showMessage(
        data?.sentTo
          ? `${t("order.confirmationEmailSent")}: ${data.sentTo}`
          : t("order.confirmationEmailSent")
      );
    } catch (error) {
      setUpdateMessage(
        `${t("order.confirmationEmailFailed")}: ${
          error?.message || t("basic.error")
        }`
      );
      setSnackbarOpen(true);
    } finally {
      setIsSendingConfirmation(false);
    }
  };

  // handleOrderUpdate is now handleSave from useEditOrderState hook
  // 🔴 SAFETY PATCH: Block save if there's a blocking conflict
  // This prevents UI from auto-mutating time when conflicts exist
  const handleOrderUpdate = useCallback(async () => {
    // 🔴 CRITICAL: Early return if blocking conflict exists
    // This is the primary defense against "auto-fix" side effects
    // hasBlockingConflict comes from useEditOrderConflicts and covers conflicts with confirmed orders
    if (hasBlockingConflict) {
      setUpdateMessage(
        "⛔ Невозможно сохранить: есть конфликт с подтверждённым заказом. Измените время или отмените изменения."
      );
      return;
    }

    await handleSave();
  }, [handleSave, hasBlockingConflict, setUpdateMessage]);

  // Dev-only: Permission audit log
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && order && currentUser) {
      console.table(permissions.fieldPermissions);
    }
  }, [order, currentUser, permissions]);

  // Стили для отключенных элементов
  const disabledStyles = {
    opacity: 0.6,
    cursor: "not-allowed",
  };

  const enabledStyles = {
    opacity: 1,
    cursor: "pointer",
  };

  // 🎯 Проверяем, может ли pending заказ быть подтверждён
  // Всегда считаем по текущим данным (editedOrder + startTime/endTime + allOrders), чтобы при сдвиге
  // подтверждённого заказа или обновлении списка сообщение было актуальным (не из кеша).
  const confirmationCheck = useMemo(() => {
    if (editedOrder?.confirmed) {
      return { canConfirm: true, message: null, isBlocked: false };
    }

    const sameCarOrders = allOrders.filter((o) => {
      const oCarId = o.car?._id || o.car;
      return oCarId?.toString() === editedOrder?.car?.toString();
    });

    // Текущие времена из формы (startTime/endTime) или из editedOrder при первом открытии/после refetch
    const timeIn =
      startTime && editedOrder?.rentalStartDate
        ? toServerUTC(
            createAthensDateTime(
              formatDateYYYYMMDD(editedOrder.rentalStartDate),
              formatTimeHHMM(startTime)
            )
          )
        : editedOrder?.timeIn;
    const timeOut =
      endTime && editedOrder?.rentalEndDate
        ? toServerUTC(
            createAthensDateTime(
              formatDateYYYYMMDD(editedOrder.rentalEndDate),
              formatTimeHHMM(endTime)
            )
          )
        : editedOrder?.timeOut;
    const effectivePendingOrder = { ...editedOrder, timeIn, timeOut };

    const result = canPendingOrderBeConfirmed({
      pendingOrder: effectivePendingOrder,
      allOrders: sameCarOrders,
      bufferHours: company?.bufferTime,
    });

    if (!result.canConfirm && result.message && !access?.canSeeClientPII) {
      result.message = result.message.replace(/«[^»]*»/, "«Клиент»");
    }

    return {
      ...result,
      isBlocked: !result.canConfirm,
    };
  }, [
    editedOrder,
    allOrders,
    company,
    startTime,
    endTime,
    access?.canSeeClientPII,
  ]);

  // Создаём summary для конфликта подтверждения (для подсветки времени)
  const confirmationConflictSummary = useMemo(() => {
    if (!confirmationCheck || confirmationCheck.canConfirm) {
      return null;
    }

    // Если есть информация о времени конфликта, создаём summary
    if (confirmationCheck.conflictTime) {
      return {
        level: "block", // Всегда block для конфликтов подтверждения
        message: confirmationCheck.message,
        conflictTime: confirmationCheck.conflictTime, // "return" или "pickup"
      };
    }

    // Fallback: если нет conflictTime, но есть message, создаём summary без указания времени
    return {
      level: "block",
      message: confirmationCheck.message,
    };
  }, [confirmationCheck]);

  // Объединяем конфликт подтверждения с summary для подсветки времени
  const finalPickupSummary = useMemo(() => {
    if (confirmationConflictSummary?.conflictTime === "pickup") {
      // Если конфликт подтверждения относится к pickup времени, объединяем
      return confirmationConflictSummary;
    }
    return pickupSummary;
  }, [confirmationConflictSummary, pickupSummary]);

  const finalReturnSummary = useMemo(() => {
    if (confirmationConflictSummary?.conflictTime === "return") {
      // Если конфликт подтверждения относится к return времени, объединяем
      return confirmationConflictSummary;
    }
    return returnSummary;
  }, [confirmationConflictSummary, returnSummary]);

  // PII-safe display for confirmation conflict messages: domain returns full data; mask client label only at render by access
  const maskConfirmationConflictPII = useCallback(
    (msg) => {
      if (!msg) return msg;
      if (access?.canSeeClientPII) return msg;
      return msg.replace(/«[^»]*»/, "«Клиент»");
    },
    [access?.canSeeClientPII]
  );

  // Проверка, заблокирована ли кнопка подтверждения
  // Unconfirm (true→false): суперадмин может снять подтверждение с любых заказов; блокируем только для админа + клиентский текущий подтверждённый
  const isClientOrder = order?.my_order === true;
  const isConfirmationDisabled =
    permissions.viewOnly ||
    !permissions.canConfirm ||
    (permissions.isCurrentOrder &&
      editedOrder?.confirmed &&
      isClientOrder &&
      !isCurrentUserSuperAdmin) ||
    (!editedOrder?.confirmed && !confirmationCheck.canConfirm);
  const hasCustomerEmail = Boolean(
    String(editedOrder?.email || order?.email || "").trim()
  );
  const confirmationEmailHistory = useMemo(() => {
    const history = Array.isArray(editedOrder?.confirmationEmailHistory)
      ? editedOrder.confirmationEmailHistory
      : Array.isArray(order?.confirmationEmailHistory)
        ? order.confirmationEmailHistory
        : [];
    return [...history].sort((a, b) => {
      const aTime = a?.sentAt ? new Date(a.sentAt).getTime() : 0;
      const bTime = b?.sentAt ? new Date(b.sentAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [editedOrder?.confirmationEmailHistory, order?.confirmationEmailHistory]);
  const resendState = useMemo(() => {
    const normalizeNumber = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };
    const dateKey = (value) => {
      if (!value) return "";
      const athensValue = fromServerUTC(value);
      if (athensValue && athensValue.isValid()) {
        return formatDateYYYYMMDD(athensValue);
      }
      const fallback = dayjs(value);
      return fallback.isValid() ? fallback.format("YYYY-MM-DD") : "";
    };
    const timeKey = (value) => {
      if (!value) return "";
      const athensValue = fromServerUTC(value);
      if (athensValue && athensValue.isValid()) {
        return formatTimeHHMM(athensValue);
      }
      const fallback = dayjs(value);
      return fallback.isValid() ? fallback.format("HH:mm") : "";
    };

    const lastSnapshot = confirmationEmailHistory[0]?.snapshot;
    if (!lastSnapshot) {
      return {
        hasPrevious: false,
        hasChanges: true,
      };
    }

    const currentEffectivePrice = normalizeNumber(getEffectivePrice(editedOrder));
    const lastEffectivePrice = normalizeNumber(lastSnapshot?.effectiveTotalPrice);
    const priceChanged = currentEffectivePrice !== lastEffectivePrice;

    const datesChanged =
      dateKey(editedOrder?.rentalStartDate) !== dateKey(lastSnapshot?.rentalStartDate) ||
      dateKey(editedOrder?.rentalEndDate) !== dateKey(lastSnapshot?.rentalEndDate);

    const timesChanged =
      timeKey(editedOrder?.timeIn) !== timeKey(lastSnapshot?.timeIn) ||
      timeKey(editedOrder?.timeOut) !== timeKey(lastSnapshot?.timeOut);

    return {
      hasPrevious: true,
      hasChanges: priceChanged || datesChanged || timesChanged,
    };
  }, [confirmationEmailHistory, editedOrder]);
  const canSendConfirmationEmail =
    Boolean(editedOrder?._id) &&
    hasCustomerEmail &&
    (!resendState.hasPrevious || resendState.hasChanges);
  const sendConfirmationEmailDisabledReason = !hasCustomerEmail
    ? t("order.sendConfirmationEmailNoEmail")
    : resendState.hasPrevious && !resendState.hasChanges
      ? t("order.sendConfirmationEmailNoChanges")
      : "";

  const formatHistoryDateTime = useCallback((value) => {
    if (!value) return "—";
    const athensValue = fromServerUTC(value);
    if (!athensValue || !athensValue.isValid()) return "—";
    return athensValue.format("DD.MM.YYYY HH:mm");
  }, []);

  const formatHistoryDate = useCallback((value) => {
    if (!value) return "—";
    const athensValue = fromServerUTC(value);
    if (!athensValue || !athensValue.isValid()) return "—";
    return athensValue.format("DD.MM.YYYY");
  }, []);

  const formatHistoryTime = useCallback((value) => {
    if (!value) return "—";
    const athensValue = fromServerUTC(value);
    if (!athensValue || !athensValue.isValid()) return "—";
    return formatTimeHHMM(athensValue);
  }, []);

  return (
    <>
      <Paper
        sx={{
          // Адаптивная ширина для разных экранов
          width: { xs: "100%", sm: 560, md: 760, lg: 920 },
          maxWidth: { xs: "95vw", sm: "92vw", lg: "1000px" },
          // Адаптивные отступы
          p: { xs: 1.5, sm: 2, md: 3 },
          pt: { xs: 1, sm: 1.5, md: 1.5 },
          // Центрирование модального окна
          mx: "auto",
          // Ограничение высоты с учётом мобильных устройств
          maxHeight: { xs: "95vh", sm: "calc(100vh - 24px)" },
          overflow: { xs: "auto", sm: "hidden" },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          // Стили для конфликтных заказов
          border: isConflictOrder ? "4px solid" : "none",
          borderColor: isConflictOrder ? "error.main" : "transparent",
          animation: isConflictOrder ? "pulse 2s infinite" : "none",
          // Скругление углов для мобильных
          borderRadius: { xs: 2, sm: 1 },
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ flexShrink: 0 }}>
            <Typography
              variant="h6"
              color="primary.main"
              sx={{
                letterSpacing: "-0.5px",
                fontSize: { xs: "1rem", sm: "1.15rem", md: "1.3rem" },
                textAlign: { xs: "center", sm: "left" },
                mb: { xs: 0.5, sm: 0 },
              }}
            >
              {permissions.viewOnly
                ? "Просмотреть заказ"
                : t("order.editOrder")}{" "}
              №{order?.orderNumber ? order.orderNumber.slice(2, -2) : ""}
              {(() => {
                // Найти автомобиль по id заказа
                const carObj = cars?.find(
                  (c) => c._id === (order?.car || editedOrder?.car)
                );
                if (carObj) {
                  return ` (${carObj.model} ${carObj.regNumber})`;
                }
                return "";
              })()}
            </Typography>
            {/* Количество дней и стоимость */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent={{ xs: "center", sm: "flex-start" }}
              flexWrap="wrap"
              sx={{ mb: 1, gap: { xs: 0.5, sm: 0 } }}
            >
              <Typography variant="body1">
                {t("order.daysNumber")}{" "}
                <Box
                  component="span"
                  sx={{ color: "primary.dark", fontWeight: 700 }}
                >
                  {editedOrder?.numberOfDays}
                </Box>{" "}
                | {t("order.price")}
              </Typography>
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
                const effectivePrice = getEffectivePrice(editedOrder);
                const hasManualOverride =
                  editedOrder?.OverridePrice !== null &&
                  editedOrder?.OverridePrice !== undefined;

                return (
                  <>
                    <TextField
                      value={
                        effectivePrice !== undefined && effectivePrice !== null
                          ? effectivePrice
                          : ""
                      }
                      onChange={(e) => {
                        if (
                          permissions.viewOnly ||
                          !permissions.fieldPermissions.totalPrice
                        )
                          return;
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        // 🔧 PRICE ARCHITECTURE: Manual input sets OverridePrice
                        updateField("totalPrice", val ? Number(val) : 0, {
                          source: "manual",
                        });
                      }}
                      variant="outlined"
                      size="small"
                      inputProps={{
                        maxLength: 4,
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                      }}
                      InputProps={{
                        endAdornment: (
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: 18,
                              ml: 0,
                              mr: "-8px",
                              color: "primary.dark",
                            }}
                          >
                            €
                          </Box>
                        ),
                      }}
                      sx={{
                        ml: 1,
                        width: "90px",
                        "& .MuiInputBase-input": {
                          fontWeight: 700,
                          fontSize: 18,
                          textAlign: "right",
                          letterSpacing: 1,
                          width: "5ch",
                          padding: "8px 8px 8px 12px",
                          boxSizing: "content-box",
                          color: "primary.dark",
                        },
                      }}
                      disabled={
                        permissions.viewOnly ||
                        !permissions.fieldPermissions.totalPrice
                      }
                    />
                    {/* Visual marker for manual override + button to return to auto */}
                    {hasManualOverride && (
                      <Box sx={{ ml: 1, mt: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "warning.main",
                            fontSize: "0.7rem",
                            display: "block",
                            mb: 0.5,
                          }}
                        >
                          ✏️ Manual price (auto: €
                          {editedOrder.totalPrice?.toFixed(2) || "0"})
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            if (
                              permissions.viewOnly ||
                              !permissions.fieldPermissions.totalPrice
                            )
                              return;
                            // Return to auto price: use CURRENT totalPrice and clear OverridePrice
                            // This ensures we use the latest calculated price, not a stale one
                            updateField("totalPrice", editedOrder.totalPrice, {
                              source: "auto",
                              clearOverride: true,
                            });
                          }}
                          sx={{
                            fontSize: "0.65rem",
                            py: 0.25,
                            px: 1,
                            minWidth: "auto",
                          }}
                        >
                          Вернуть автоматическую цену
                        </Button>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>

            <Divider
              sx={{
                my: { xs: 1.5, md: 1 },
                borderColor: editedOrder?.my_order
                  ? ORDER_COLORS.CONFIRMED_CLIENT.main
                  : ORDER_COLORS.CONFIRMED_ADMIN.main,
                borderWidth: 2,
              }}
            />
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: { xs: "visible", sm: "auto" },
                pr: { xs: 0, sm: 0.5 },
              }}
            >
            <Box sx={{ mb: { xs: 2, sm: 1.5, md: 1.25 } }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <ActionButton
                  fullWidth
                  onClick={handleConfirmationToggle}
                  disabled={confirmToggleUpdating || isConfirmationDisabled}
                  color={editedOrder?.confirmed ? "success" : "primary"}
                  label={
                    editedOrder?.confirmed
                      ? t("order.orderConfirmed")
                      : t("order.orderNotConfirmed")
                  }
                  title={
                    permissions.isCurrentOrder &&
                    editedOrder?.confirmed &&
                    isClientOrder &&
                    !isCurrentUserSuperAdmin
                      ? "Нельзя снять подтверждение у текущего заказа"
                      : maskConfirmationConflictPII(confirmationCheck.message) ||
                        ""
                  }
                  sx={{
                    ...(isConfirmationDisabled ? disabledStyles : enabledStyles),
                    flex: 1,
                  }}
                />
                {isCurrentUserSuperAdmin && (
                  <ActionButton
                    fullWidth
                    onClick={handleSendConfirmationEmail}
                    loading={isSendingConfirmation}
                    disabled={isSendingConfirmation || !canSendConfirmationEmail}
                    color="secondary"
                    label={t("order.sendConfirmationEmail")}
                    title={sendConfirmationEmailDisabledReason}
                    sx={{ flex: 1 }}
                  />
                )}
              </Box>
              {/* 🔴 BLOCK: показываем сообщение о блокировке подтверждения (только если canConfirm === false) */}
              {!editedOrder?.confirmed &&
                confirmationCheck.message &&
                !confirmationCheck.canConfirm && (
                  <Box
                    sx={{
                      mt: 1,
                      mb: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "error.lighter",
                      border: "1px solid",
                      borderColor: "error.main",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "error.main", fontWeight: 500 }}
                    >
                      🔴 Невозможно подтвердить заказ
                    </Typography>
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ color: "error.dark", fontSize: 12, mt: 0.5 }}
                    >
                      <BufferSettingsLinkifiedText
                        text={maskConfirmationConflictPII(
                          confirmationCheck.message
                        )}
                        onOpen={() => setBufferModalOpen(true)}
                      />
                    </Typography>
                  </Box>
                )}
              {isCurrentUserSuperAdmin && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600 }}
                    >
                      {t("order.confirmationEmailHistoryTitle")}
                    </Typography>
                    {confirmationEmailHistory.length > 0 && (
                      <Button
                        size="small"
                        onClick={() => setIsHistoryExpanded((prev) => !prev)}
                        sx={{
                          minWidth: "auto",
                          px: 1,
                          py: 0.25,
                          fontSize: "0.72rem",
                          textTransform: "none",
                        }}
                      >
                        {isHistoryExpanded
                          ? t("order.confirmationEmailHistoryHide")
                          : t("order.confirmationEmailHistoryShow")}
                      </Button>
                    )}
                  </Box>
                  {confirmationEmailHistory.length === 0 ? (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                    >
                      {t("order.confirmationEmailHistoryEmpty")}
                    </Typography>
                  ) : !isHistoryExpanded ? (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                    >
                      {t("order.confirmationEmailHistoryCollapsed", {
                        count: confirmationEmailHistory.length,
                      })}
                    </Typography>
                  ) : (
                    <Box sx={{ mt: 0.75, maxHeight: 180, overflowY: "auto", pr: 0.5 }}>
                      {confirmationEmailHistory.map((entry, index) => {
                        const snapshot = entry?.snapshot || {};
                        const changes = entry?.changesSincePrevious || {};
                        const hasChanges = changes?.hasChanges === true;
                        const priceChanged = changes?.price?.changed === true;
                        const datesChanged = changes?.dates?.changed === true;
                        const timesChanged = changes?.times?.changed === true;

                        return (
                          <Box
                            key={`${entry?.sentAt || "entry"}-${index}`}
                            sx={{
                              mb: 0.75,
                              p: 0.75,
                              borderRadius: 0.75,
                              bgcolor: "background.paper",
                              border: "1px dashed",
                              borderColor: "divider",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "text.primary",
                                fontWeight: 600,
                              }}
                            >
                              #{confirmationEmailHistory.length - index}{" "}
                              {formatHistoryDateTime(entry?.sentAt)} ·{" "}
                              {entry?.sentTo || "—"} ·{" "}
                              {String(entry?.locale || "en").toUpperCase()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: "block", color: "text.secondary" }}
                            >
                              {`${t("order.price")}: €${
                                snapshot?.effectiveTotalPrice ?? "—"
                              } · ${t("order.pickupDate")}: ${formatHistoryDate(
                                snapshot?.rentalStartDate
                              )} ${formatHistoryTime(
                                snapshot?.timeIn
                              )} · ${t("order.returnDate")}: ${formatHistoryDate(
                                snapshot?.rentalEndDate
                              )} ${formatHistoryTime(snapshot?.timeOut)}`}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: hasChanges ? "warning.dark" : "text.disabled",
                              }}
                            >
                              {hasChanges
                                ? t("order.confirmationEmailHistoryHasChanges")
                                : t("order.confirmationEmailHistoryNoChanges")}
                              {priceChanged
                                ? ` ${t("order.price")}: €${
                                    changes?.price?.old ?? "—"
                                  } → €${changes?.price?.new ?? "—"};`
                                : ""}
                              {datesChanged
                                ? ` ${t("order.pickupDate")}/${t(
                                    "order.returnDate"
                                  )}: ${formatHistoryDate(
                                    changes?.dates?.oldStartDate
                                  )} - ${formatHistoryDate(
                                    changes?.dates?.oldEndDate
                                  )} → ${formatHistoryDate(
                                    changes?.dates?.newStartDate
                                  )} - ${formatHistoryDate(
                                    changes?.dates?.newEndDate
                                  )};`
                                : ""}
                              {timesChanged
                                ? ` ${t("order.pickupTime")}/${t(
                                    "order.returnTime"
                                  )}: ${formatHistoryTime(
                                    changes?.times?.oldTimeIn
                                  )} - ${formatHistoryTime(
                                    changes?.times?.oldTimeOut
                                  )} → ${formatHistoryTime(
                                    changes?.times?.newTimeIn
                                  )} - ${formatHistoryTime(
                                    changes?.times?.newTimeOut
                                  )};`
                                : ""}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: "block", color: "text.disabled" }}
                            >
                              {`${t("order.name")}: ${
                                entry?.sentBy?.name || "—"
                              } (${entry?.sentBy?.email || "—"})`}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 0 }}>
              {/* Даты — вертикально на мобильных */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, sm: 1.5, md: 1 },
                  mb: { xs: 1, sm: 0.75, md: 0.5 },
                  alignItems: { xs: "stretch", sm: "flex-start" },
                }}
              >
                <TextField
                  label={t("order.pickupDate")}
                  type="date"
                  value={
                    editedOrder?.rentalStartDate
                      ? formatDateYYYYMMDD(editedOrder.rentalStartDate)
                      : ""
                  }
                  onChange={(e) => {
                    if (
                      permissions.viewOnly ||
                      permissions.isCurrentOrder ||
                      !permissions.fieldPermissions.rentalStartDate
                    )
                      return;
                    updateStartDate(e.target.value);
                  }}
                  sx={{
                    flex: 1,
                    minHeight: { xs: 48, md: 44 },
                    "& .MuiInputBase-root": {
                      minHeight: { xs: 48, md: 44 },
                    },
                  }}
                  size="medium"
                  disabled={
                    permissions.viewOnly ||
                    permissions.isCurrentOrder ||
                    !permissions.fieldPermissions.rentalStartDate
                  }
                  inputProps={{ min: todayStr }}
                />
                <TextField
                  label={t("order.returnDate")}
                  type="date"
                  value={
                    editedOrder?.rentalEndDate
                      ? formatDateYYYYMMDD(editedOrder.rentalEndDate)
                      : ""
                  }
                  onChange={(e) => {
                    if (
                      permissions.viewOnly ||
                      !permissions.fieldPermissions.rentalEndDate
                    )
                      return;
                    updateEndDate(e.target.value);
                  }}
                  disabled={
                    permissions.viewOnly ||
                    !permissions.fieldPermissions.rentalEndDate
                  }
                  sx={{
                    flex: 1,
                    minHeight: { xs: 48, md: 44 },
                    "& .MuiInputBase-root": {
                      minHeight: { xs: 48, md: 44 },
                    },
                  }}
                  size="medium"
                  inputProps={{
                    min: permissions.isCurrentOrder
                      ? athensNow().format("YYYY-MM-DD")
                      : editedOrder?.rentalStartDate
                      ? formatDateYYYYMMDD(editedOrder.rentalStartDate)
                      : undefined,
                  }}
                />
              </Box>
              {/* Время — TimePicker читает conflicts, не думает */}
              {/* Время — упрощённый TimePicker (НИКОГДА не блокирует ввод) */}
              <TimePicker
                startTime={startTime}
                endTime={endTime}
                setStartTime={updateStartTime}
                setEndTime={updateEndTime}
                disabled={
                  permissions.viewOnly ||
                  (!permissions.fieldPermissions.timeIn &&
                    !permissions.fieldPermissions.timeOut)
                }
                pickupDisabled={
                  permissions.viewOnly || !permissions.fieldPermissions.timeIn
                }
                returnDisabled={
                  permissions.viewOnly || !permissions.fieldPermissions.timeOut
                }
                pickupSummary={finalPickupSummary}
                returnSummary={finalReturnSummary}
                onOpenBufferSettings={() => setBufferModalOpen(true)}
              />

              {/* 🔴 Block-сообщение — ТОЛЬКО после попытки сохранения */}
              {attemptedSave && hasBlockingConflict && (
                <Box
                  sx={{
                    mb: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "error.lighter",
                    border: "1px solid",
                    borderColor: "error.main",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "error.main", fontWeight: 500 }}
                  >
                    🔴 Невозможно сохранить изменения
                  </Typography>
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ color: "error.dark", fontSize: 12, mt: 0.5 }}
                  >
                    <BufferSettingsLinkifiedText
                      text={maskConfirmationConflictPII(
                        pickupSummary?.level === "block"
                          ? pickupSummary.message
                          : returnSummary?.message
                      )}
                      onOpen={() => setBufferModalOpen(true)}
                    />
                  </Typography>
                </Box>
              )}

              {/* Место получения и возврата — вертикально на мобильных */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, sm: 1.5, md: 1 },
                  mb: { xs: 1, sm: 0.75, md: 0.5 },
                }}
              >
                <Autocomplete
                  freeSolo
                  options={locations}
                  value={editedOrder.placeIn || ""}
                  onChange={(_, newValue) => {
                    if (!permissions.fieldPermissions.placeIn) return;
                    updateField("placeIn", newValue || "");
                  }}
                  onInputChange={(_, newInputValue) => {
                    if (!permissions.fieldPermissions.placeIn) return;
                    updateField("placeIn", newInputValue);
                  }}
                  disabled={
                    permissions.viewOnly ||
                    !permissions.fieldPermissions.placeIn
                  }
                  PaperProps={{
                    sx: {
                      border: "2px solid",
                      borderColor: "text.primary",
                      borderRadius: 1,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                      backgroundColor: "background.paper",
                    },
                  }}
                  slotProps={{
                    popper: {
                      style: { zIndex: 1400 },
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("order.pickupLocation")}
                      size="medium"
                      required
                      sx={{
                        "& .MuiInputBase-root": {
                          minHeight: { xs: 48, md: 44 },
                        },
                      }}
                    />
                  )}
                  sx={{
                    flex: 1,
                    minHeight: { xs: 48, md: 44 },
                  }}
                />
                {editedOrder.placeIn &&
                  editedOrder.placeIn.toLowerCase() === "airport" && (
                    <TextField
                      label={t("order.flightNumber") || "Номер рейса"}
                      value={editedOrder.flightNumber || ""}
                      onChange={(e) =>
                        updateField("flightNumber", e.target.value)
                      }
                      size="medium"
                      sx={{
                        width: "25%",
                        alignSelf: "stretch",
                        "& .MuiInputBase-root": {
                          minHeight: { xs: 48, md: 44 },
                        },
                      }}
                      InputLabelProps={{ shrink: true }}
                      disabled={
                        permissions.viewOnly ||
                        !permissions.fieldPermissions.flightNumber
                      }
                    />
                  )}
                <Autocomplete
                  freeSolo
                  options={locations}
                  value={editedOrder.placeOut || ""}
                  onChange={(_, newValue) =>
                    updateField("placeOut", newValue || "")
                  }
                  onInputChange={(_, newInputValue) =>
                    updateField("placeOut", newInputValue)
                  }
                  disabled={
                    permissions.viewOnly ||
                    !permissions.fieldPermissions.placeOut
                  }
                  PaperProps={{
                    sx: {
                      border: "2px solid",
                      borderColor: "text.primary",
                      borderRadius: 1,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                      backgroundColor: "background.paper",
                    },
                  }}
                  slotProps={{
                    popper: {
                      style: { zIndex: 1400 },
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("order.returnLocation")}
                      size="medium"
                      required
                      sx={{
                        "& .MuiInputBase-root": {
                          minHeight: { xs: 48, md: 44 },
                        },
                      }}
                    />
                  )}
                  sx={{
                    flex: 1,
                    minHeight: { xs: 48, md: 44 },
                  }}
                />
              </Box>
              {/* Страховка и детские кресла — адаптивно */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, sm: 1.5, md: 1 },
                  mb: 0,
                }}
              >
                <FormControl
                  fullWidth
                  sx={{
                    width: {
                      xs: "100%",
                      sm: editedOrder.insurance === "TPL" ? "49%" : "30%",
                    },
                  }}
                >
                  <InputLabel>{t("order.insurance")}</InputLabel>
                  <Select
                    label={t("order.insurance")}
                    value={editedOrder.insurance || ""}
                    onChange={(e) =>
                      !permissions.viewOnly &&
                      permissions.fieldPermissions.insurance &&
                      updateField("insurance", e.target.value)
                    }
                    disabled={
                      permissions.viewOnly ||
                      !permissions.fieldPermissions.insurance
                    }
                  >
                    {(() => {
                      // 🔧 FIX: Use selectedCar from hook (single source of truth)
                      const kaskoPrice = selectedCar?.PriceKacko ?? 0;
                      return (
                        t("order.insuranceOptions", { returnObjects: true }) ||
                        []
                      ).map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.value === "CDW"
                            ? `${option.label} ${kaskoPrice}€/${t(
                                "order.perDay"
                              )}`
                            : option.label}
                        </MenuItem>
                      ));
                    })()}
                  </Select>
                </FormControl>
                {editedOrder.insurance === "CDW" && (
                  <Box sx={{ width: "16%" }}>
                    <RenderTextField
                      name="franchiseOrder"
                      label={t("car.franchise") || "Франшиза заказа"}
                      type="number"
                      updatedCar={editedOrder}
                      handleChange={(e) =>
                        !permissions.viewOnly &&
                        permissions.fieldPermissions.franchiseOrder &&
                        updateField("franchiseOrder", Number(e.target.value))
                      }
                      isLoading={loading}
                      disabled={
                        permissions.viewOnly ||
                        !permissions.fieldPermissions.franchiseOrder
                      }
                    />
                  </Box>
                )}
                <FormControl
                  fullWidth
                  sx={{ width: { xs: "100%", sm: "49%" } }}
                >
                  <InputLabel>
                    {t("order.childSeats")} {selectedCar?.PriceChildSeats ?? 0}
                    €/{t("order.perDay")}
                  </InputLabel>
                  <Select
                    label={`${t("order.childSeats")} ${
                      selectedCar?.PriceChildSeats ?? 0
                    }€/${t("order.perDay")}`}
                    value={
                      typeof editedOrder.ChildSeats === "number"
                        ? editedOrder.ChildSeats
                        : 0
                    }
                    onChange={(e) =>
                      !permissions.viewOnly &&
                      permissions.fieldPermissions.ChildSeats &&
                      updateField("ChildSeats", Number(e.target.value))
                    }
                    disabled={
                      permissions.viewOnly ||
                      !permissions.fieldPermissions.ChildSeats
                    }
                  >
                    <MenuItem value={0}>{t("order.childSeatsNone")}</MenuItem>
                    {[1, 2, 3, 4].map((num) => (
                      <MenuItem key={num} value={num}>
                        {num}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Блок данных клиента: visibility = canSeeClientPII, editability = canEditClientPII (orderAccessPolicy only) */}
            {access?.canSeeClientPII && (
              <Box sx={{ mb: 0 }}>
                <FormControl fullWidth margin="dense" sx={{ mt: 0, mb: 0 }}>
                  <TextField
                    fullWidth
                    margin="dense"
                    label={
                      <>
                        <span>{t("order.clientName")}</span>
                        <Box component="span" sx={{ color: "primary.dark" }}>
                          *
                        </Box>
                      </>
                    }
                    value={editedOrder.customerName || ""}
                    onChange={(e) => {
                      if (permissions.viewOnly || !access?.canEditClientPII)
                        return;
                      updateField("customerName", e.target.value);
                    }}
                    disabled={permissions.viewOnly || !access?.canEditClientPII}
                    helperText={
                      !access?.canEditClientPII
                        ? access?.reasons?.clientPII
                        : undefined
                    }
                  />
                </FormControl>
                {/* Телефон и email — вертикально на мобильных */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 0.5, sm: 1.5, md: 1 },
                    mb: 0,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <FormControl
                      fullWidth
                      margin="dense"
                      sx={{ minHeight: 36 }}
                    >
                      <TextField
                        fullWidth
                        margin="dense"
                        size="small"
                        label={
                          <>
                            <span>{t("order.phone")}</span>
                            <Box
                              component="span"
                              sx={{ color: "primary.dark" }}
                            >
                              *
                            </Box>
                          </>
                        }
                        value={editedOrder.phone || ""}
                        onChange={(e) => {
                          if (permissions.viewOnly || !access?.canEditClientPII)
                            return;
                          updateField("phone", e.target.value);
                        }}
                        disabled={
                          permissions.viewOnly || !access?.canEditClientPII
                        }
                        helperText={
                          !access?.canEditClientPII
                            ? access?.reasons?.clientPII
                            : undefined
                        }
                      />
                    </FormControl>
                  </Box>
                  <FormControl
                    fullWidth
                    margin="dense"
                    sx={{ flex: 1, minHeight: 36 }}
                  >
                    <TextField
                      fullWidth
                      margin="dense"
                      size="small"
                      label={
                        <>
                          {t("order.email")}
                          <Box
                            component="span"
                            sx={{
                              color: "success.main",
                              fontWeight: 500,
                              ml: 1,
                            }}
                          >
                            {t("basic.optional")}
                          </Box>
                        </>
                      }
                      value={editedOrder.email || ""}
                      onChange={(e) => {
                        if (permissions.viewOnly || !access?.canEditClientPII)
                          return;
                        updateField("email", e.target.value);
                      }}
                      disabled={
                        permissions.viewOnly || !access?.canEditClientPII
                      }
                      helperText={
                        !access?.canEditClientPII
                          ? access?.reasons?.clientPII
                          : undefined
                      }
                    />
                  </FormControl>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    mt: { xs: 0.25, md: 0 },
                    mb: 0.5,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: "fit-content",
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      flexWrap: "nowrap",
                      "& .MuiFormControlLabel-root": {
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        m: 0,
                        mr: 0.125,
                        columnGap: 0,
                      },
                      "& .MuiCheckbox-root": {
                        p: "1px",
                      },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(editedOrder.Viber)}
                          onChange={(e) => {
                            if (
                              permissions.viewOnly ||
                              !access?.canEditClientPII
                            )
                              return;
                            updateField("Viber", e.target.checked);
                          }}
                          disabled={
                            permissions.viewOnly || !access?.canEditClientPII
                          }
                        />
                      }
                      sx={{
                        "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                      }}
                      label="Viber"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(editedOrder.Whatsapp)}
                          onChange={(e) => {
                            if (
                              permissions.viewOnly ||
                              !access?.canEditClientPII
                            )
                              return;
                            updateField("Whatsapp", e.target.checked);
                          }}
                          disabled={
                            permissions.viewOnly || !access?.canEditClientPII
                          }
                        />
                      }
                      sx={{
                        "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                      }}
                      label="WhatsApp"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(editedOrder.Telegram)}
                          onChange={(e) => {
                            if (
                              permissions.viewOnly ||
                              !access?.canEditClientPII
                            )
                              return;
                            updateField("Telegram", e.target.checked);
                          }}
                          disabled={
                            permissions.viewOnly || !access?.canEditClientPII
                          }
                        />
                      }
                      sx={{
                        "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                      }}
                      label="Telegram"
                    />
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: "fit-content",
                      display: "flex",
                      alignItems: "center",
                      "& .MuiFormControlLabel-root": {
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        m: 0,
                        columnGap: 0,
                      },
                      "& .MuiCheckbox-root": {
                        p: "1px",
                      },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(editedOrder.secondDriver)}
                          onChange={(e) => {
                            if (
                              permissions.viewOnly ||
                              !permissions.fieldPermissions.secondDriver
                            )
                              return;
                            updateField("secondDriver", e.target.checked);
                          }}
                          disabled={
                            permissions.viewOnly ||
                            !permissions.fieldPermissions.secondDriver
                          }
                        />
                      }
                      sx={{
                        "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                      }}
                      label={t("order.secondDriver", {
                        price: secondDriverPriceLabelValue,
                      })}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {!access?.canSeeClientPII && (
              <Box sx={{ mb: 0.5, mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(editedOrder.secondDriver)}
                      onChange={(e) => {
                        if (
                          permissions.viewOnly ||
                          !permissions.fieldPermissions.secondDriver
                        )
                          return;
                        updateField("secondDriver", e.target.checked);
                      }}
                      disabled={
                        permissions.viewOnly ||
                        !permissions.fieldPermissions.secondDriver
                      }
                    />
                  }
                  sx={{
                    m: 0,
                    "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                  }}
                  label={t("order.secondDriver", {
                    price: secondDriverPriceLabelValue,
                  })}
                />
              </Box>
            )}
            </Box>

            {/* Кнопки действий — адаптивное расположение */}
            <Box
              sx={{
                flexShrink: 0,
                mt: { xs: 2, sm: 1 },
                pt: { xs: 0, sm: 1 },
                borderTop: { xs: "none", sm: "1px solid" },
                borderColor: { sm: "divider" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: { xs: "center", sm: "space-between" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: { xs: 1, sm: 0 },
                }}
              >
                <CancelButton
                  onClick={onCloseModalEdit}
                  label={t("basic.cancel")}
                  sx={{
                    order: { xs: 3, sm: 1 },
                    width: { xs: "100%", sm: "auto" },
                  }}
                />
                <ConfirmButton
                  loading={isUpdating}
                  disabled={permissions.viewOnly}
                  sx={{
                    mx: { xs: 0, sm: 2 },
                    width: { xs: "100%", sm: "40%" },
                    order: { xs: 1, sm: 2 },
                  }}
                  onClick={async () => {
                    if (permissions.viewOnly) return;

                    // Отмечаем попытку сохранения
                    setAttemptedSave(true);

                    // ❌ БЛОК: Не сохраняем если есть блокирующие конфликты
                    if (hasBlockingConflict) {
                      // Сообщение покажется через attemptedSave + hasBlockingConflict
                      return;
                    }

                    // Restored from pre-refactor logic: Управление isUpdating централизовано в onClick
                    setIsUpdating(true);
                    try {
                      // ✅ Warnings разрешены — сохраняем без подтверждения
                      // Single unified update call
                      await handleOrderUpdate();
                      showMessage(t("order.orderUpdated"));
                      setAttemptedSave(false); // Сбрасываем после успешного сохранения
                    } catch (error) {
                      setUpdateMessage(
                        error?.message || "Ошибка обновления заказа"
                      );
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  label={t("order.updateOrder")}
                />
                <DeleteButton
                  onClick={handleDelete}
                  loading={isUpdating}
                  disabled={permissions.viewOnly || !permissions.canDelete}
                  label={t("order.deleteOrder")}
                  sx={{
                    width: { xs: "100%", sm: "30%" },
                    order: { xs: 2, sm: 3 },
                    opacity: !permissions.canDelete ? 0.5 : 1,
                    cursor: !permissions.canDelete ? "not-allowed" : "pointer",
                  }}
                  title={
                    !permissions.canDelete
                      ? "You don't have permission to delete this order"
                      : t("order.deleteOrder")
                  }
                />
              </Box>
            </Box>
          </>
        )}
      </Paper>

      <Snackbar
        open={snackbarOpen}
        message={updateMessage}
        closeFunc={handleSnackbarClose}
        isError={
          updateMessage && updateMessage.toLowerCase().includes("failed")
        }
      />

      {/* Модальное окно настройки буфера */}
      <BufferSettingsModal
        open={bufferModalOpen}
        onClose={() => setBufferModalOpen(false)}
      />
    </>
  );
};
export default EditOrderModal;
