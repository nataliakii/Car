// Генерация номера заказа: ГГГГММДДЧЧММСС (год, месяц, день, час, минуты, секунды)
function generateOrderNumber() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}
import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ConfirmButton,
  CancelButton,
  BookingEditableDateField,
  BookingTimeField,
  BookingTextField,
  BookingLocationAutocomplete,
  BookingFlightField,
} from "@/app/components/ui";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useMainContext } from "@app/Context";
import { returnHoursToParseToDayjs } from "@utils/functions";
import {
  addOrderNew,
  calculateTotalPrice,
} from "@utils/action";
import { getSecondDriverPriceLabelValue } from "@utils/secondDriverPricing";
import { useTranslation } from "react-i18next";
// 🎯 Athens timezone utilities — ЕДИНСТВЕННЫЙ источник правды для времени
import {
  createAthensDateTime,
  toServerUTC,
  formatTimeHHMM,
} from "@/domain/time/athensTime";
import {
  LOCATION_DIVIDER_BEFORE,
  ORDERED_LOCATION_OPTIONS,
} from "@/domain/orders/locationOptions";
import { getBusinessRentalDaysByMinutes } from "@/domain/orders/numberOfDays";
import { RenderTextField } from "@/app/components/ui/inputs/Fields";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const AddOrder = ({ open, onClose, car, date, setUpdateStatus }) => {
  const { fetchAndUpdateOrders, company } =
    useMainContext();
  const { t } = useTranslation();
  const secondDriverPriceLabelValue = getSecondDriverPriceLabelValue();
  const carApiIdentifier = car?.regNumber || car?.carNumber || "";

  const locations = ORDERED_LOCATION_OPTIONS;
  // const locations = company.locations.map((loc) => loc.name);

  const {
    defaultStartHour,
    defaultStartMinute,
    defaultEndHour,
    defaultEndMinute,
  } = returnHoursToParseToDayjs(company);

  const [bookDates, setBookedDates] = useState({ start: null, end: null });
  const [orderDetails, setOrderDetails] = useState({
    placeIn: "Nea Kallikratia",
    placeOut: "Nea Kallikratia",
    customerName: "",
    phone: "",
    email: "",
    secondDriver: false,
    Viber: false,
    Whatsapp: false,
    Telegram: false,
    totalPrice: 0,
    numberOfDays: 0,
    confirmed: false,
    my_order: false,
    ChildSeats: 0,
    insurance: "",
    franchiseOrder: undefined,
    orderNumber: "",
    flightNumber: "",
  });
  // Состояние для расчета стоимости
  const [daysAndTotal, setDaysAndTotal] = useState({ days: 0, totalPrice: 0 });
  const [calcLoading, setCalcLoading] = useState(false);
  const [startTime, setStartTime] = useState(
    dayjs().hour(defaultStartHour).minute(defaultStartMinute)
  );
  const [endTime, setEndTime] = useState(
    dayjs().hour(defaultEndHour).minute(defaultEndMinute)
  );

  // Получение количества дней и общей стоимости через calculateTotalPrice из utils/action
  useEffect(() => {
    const abortController = new AbortController();

    const fetchTotalPrice = async () => {
      if (!carApiIdentifier || !bookDates?.start || !bookDates?.end) {
        setDaysAndTotal({ days: 0, totalPrice: 0 });
        return;
      }
      setCalcLoading(true);
      try {
        const timeInAthens =
          startTime && bookDates.start
            ? createAthensDateTime(
                bookDates.start,
                formatTimeHHMM(dayjs(startTime))
              )
            : null;
        const timeOutAthens =
          endTime && bookDates.end
            ? createAthensDateTime(
                bookDates.end,
                formatTimeHHMM(dayjs(endTime))
              )
            : null;
        const timeInServer = timeInAthens ? toServerUTC(timeInAthens) : undefined;
        const timeOutServer = timeOutAthens ? toServerUTC(timeOutAthens) : undefined;
        const result = await calculateTotalPrice(
          carApiIdentifier,
          bookDates.start,
          bookDates.end,
          orderDetails.insurance,
          orderDetails.ChildSeats,
          {
            signal: abortController.signal,
            secondDriver: Boolean(orderDetails.secondDriver),
            timeIn: timeInServer,
            timeOut: timeOutServer,
          }
        );
        if (abortController.signal.aborted) return;
        setDaysAndTotal({ days: result.days, totalPrice: result.totalPrice });
      } catch (error) {
        if (error?.name === "AbortError" || abortController.signal.aborted) return;
        setDaysAndTotal({ days: 0, totalPrice: 0 });
      } finally {
        if (!abortController.signal.aborted) {
          setCalcLoading(false);
        }
      }
    };
    fetchTotalPrice();

    return () => {
      abortController.abort();
    };
  }, [
    carApiIdentifier,
    bookDates?.start,
    bookDates?.end,
    orderDetails.insurance,
    orderDetails.ChildSeats,
    orderDetails.secondDriver,
    startTime,
    endTime,
  ]);

  // Автоматически подставлять вычисленную стоимость в поле totalPrice
  useEffect(() => {
    if (daysAndTotal.totalPrice !== orderDetails.totalPrice) {
      setOrderDetails((prev) => ({
        ...prev,
        totalPrice: daysAndTotal.totalPrice,
      }));
    }
  }, [daysAndTotal.totalPrice, orderDetails.totalPrice]);
  // Хелпер для нормализации дат (аналогично BookingModal)
  function normalizeDate(date) {
    return date ? dayjs(date).format("YYYY-MM-DD") : null;
  }
  const [loadingState, setLoadingState] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    type: null,
    message: "",
  });

  // --- ВАЖНО: автоматическое заполнение даты и franchiseOrder при открытии модального окна ---
  const getInitialBookDates = useCallback(() => {
    if (!date) return { start: null, end: null };

    let startDate = null;
    let endDate = null;
    if (Array.isArray(date) && date.length === 2) {
      startDate = normalizeDate(date[0]);
      endDate = normalizeDate(date[1]);
    } else {
      startDate = normalizeDate(date);
      endDate = normalizeDate(dayjs(date).add(1, "day"));
    }

    const todayStr = dayjs().format("YYYY-MM-DD");
    if (startDate && dayjs(startDate).isBefore(dayjs(), "day")) {
      startDate = todayStr;
      if (!endDate || dayjs(endDate).isSameOrBefore(dayjs(startDate), "day")) {
        endDate = dayjs(startDate).add(1, "day").format("YYYY-MM-DD");
      }
    }

    return {
      start: startDate,
      end: endDate,
    };
  }, [date]);

  useEffect(() => {
    if (!open || !date) return;
    setBookedDates(getInitialBookDates());
  }, [open, date, getInitialBookDates]);

  useEffect(() => {
    if (!open || !car) return;

    setOrderDetails((prev) => {
      if (
        prev.franchiseOrder !== undefined &&
        prev.franchiseOrder !== null &&
        prev.franchiseOrder !== ""
      ) {
        return prev;
      }
      return {
        ...prev,
        franchiseOrder: car.franchise ?? 0,
      };
    });
  }, [open, car]);

  useEffect(() => {
    if (!open) return;

    setOrderDetails((prev) => {
      if (
        prev.insurance !== undefined &&
        prev.insurance !== null &&
        prev.insurance !== ""
      ) {
        return prev;
      }
      return {
        ...prev,
        insurance: "TPL",
      };
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setOrderDetails((prev) => {
      if (prev.orderNumber && prev.orderNumber !== "") {
        return prev;
      }
      return {
        ...prev,
        orderNumber: generateOrderNumber(),
      };
    });
  }, [open]);

  // Оптимизированный обработчик изменения полей
  const handleFieldChange = useCallback((field, value) => {
    setOrderDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const toggleConfirmedStatus = useCallback(() => {
    setOrderDetails((prev) => ({
      ...prev,
      confirmed: !prev.confirmed,
    }));
  }, []);

  const parseTimeInput = useCallback((value, baseDate, fallbackTime) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
    if (!match) return fallbackTime;

    const [, hourStr, minuteStr] = match;
    const base = baseDate ? dayjs(baseDate) : dayjs();
    return base
      .hour(Number(hourStr))
      .minute(Number(minuteStr))
      .second(0)
      .millisecond(0);
  }, []);

  const handleStartTimeChange = useCallback(
    (value) => {
      setStartTime((prev) => parseTimeInput(value, bookDates.start, prev));
    },
    [bookDates.start, parseTimeInput]
  );

  const handleEndTimeChange = useCallback(
    (value) => {
      setEndTime((prev) => parseTimeInput(value, bookDates.end, prev));
    },
    [bookDates.end, parseTimeInput]
  );


  const handleBookingComplete = async () => {
    setLoadingState(true);
    setStatusMessage({ type: null, message: "" });
    
    // Валидация: цена должна быть рассчитана
    if (calcLoading) {
      setStatusMessage({
        type: "error",
        message: "Дождитесь расчёта стоимости",
      });
      setLoadingState(false);
      return;
    }
    
    // Валидация: начало не раньше сегодняшнего дня
    if (bookDates.start && dayjs(bookDates.start).isBefore(dayjs(), "day")) {
      setStatusMessage({
        type: "error",
        message: "Дата начала аренды не может быть раньше сегодняшнего дня",
      });
      setLoadingState(false);
      return;
    }

    // 🎯 Используем athensTime utilities для timezone-корректного создания времени
    // Извлекаем HH:mm и создаём заново в Athens БЕЗ конвертации из таймзоны браузера
    const timeInAthens = createAthensDateTime(
      bookDates.start,
      formatTimeHHMM(dayjs(startTime))
    );
    const timeOutAthens = createAthensDateTime(
      bookDates.end,
      formatTimeHHMM(dayjs(endTime))
    );

    // Конвертируем в UTC для сохранения в БД
    const timeInUTC = toServerUTC(timeInAthens);
    const timeOutUTC = toServerUTC(timeOutAthens);

    // Используем daysAndTotal.totalPrice если orderDetails.totalPrice ещё не обновился (race condition)
    const finalTotalPrice = orderDetails.totalPrice > 0 
      ? orderDetails.totalPrice 
      : daysAndTotal.totalPrice;
    
    const data = {
      carId: car?._id?.toString?.() || "",
      regNumber: car?.regNumber,
      carNumber: car?.carNumber,
      customerName: orderDetails.customerName,
      phone: orderDetails.phone,
      email: orderDetails.email,
      secondDriver: Boolean(orderDetails.secondDriver),
      Viber: orderDetails.Viber,
      Whatsapp: orderDetails.Whatsapp,
      Telegram: orderDetails.Telegram,
      timeIn: timeInUTC,
      timeOut: timeOutUTC,
      rentalStartDate: dayjs(bookDates.start).toDate(), // Дата без времени
      rentalEndDate: dayjs(bookDates.end).toDate(), // Дата без времени
      placeIn: orderDetails.placeIn,
      placeOut: orderDetails.placeOut,
      confirmed: orderDetails.confirmed,
      my_order: orderDetails.my_order,
      ChildSeats: orderDetails.ChildSeats,
      insurance: orderDetails.insurance,
      franchiseOrder: orderDetails.franchiseOrder,
      orderNumber: orderDetails.orderNumber,
      totalPrice: finalTotalPrice,
      flightNumber: orderDetails.flightNumber,
    };

    try {
      const response = await addOrderNew(data);

      // Унифицированная обработка ответов addOrderNew
      if (response.status === "success") {
        const msg = response?.data?.message || "Заказ успешно добавлен";
        setStatusMessage({ type: "success", message: msg });
        setUpdateStatus({ type: 200, message: msg }); // type: 200 для обновления календаря
        // Явный вызов обновления заказов для BigCalendar
        if (typeof fetchAndUpdateOrders === "function") {
          fetchAndUpdateOrders();
        }
        setTimeout(() => {
          setStatusMessage({ type: null, message: "" });
          onClose();
        }, 4000);
        return;
      }

      if (response.status === "startEndConflict") {
        const msg = response?.message || "Конфликт старт/финиш дат";
        setStatusMessage({ type: "warning", message: msg });
        setUpdateStatus({ type: 200, message: msg });
        return;
      }

      if (response.status === "pending") {
        const msg = response?.message || "Есть неподтвержденные пересечения";
        setStatusMessage({ type: "warning", message: msg });
        setUpdateStatus({ type: 202, message: msg });
        return;
      }

      if (response.status === "conflict") {
        const msg = response?.message || "Даты уже заняты и недоступны";
        setStatusMessage({ type: "error", message: msg });
        setUpdateStatus({ type: 409, message: msg });
        return;
      }

      // status === 'error' или неожиданный статус
      {
        const msg = response?.message || "Не удалось добавить заказ";
        setStatusMessage({ type: "error", message: msg });
        setUpdateStatus({ type: 400, message: msg });
        return;
      }
    } catch (error) {
      console.error("Ошибка при отправке данных:", error);

      setStatusMessage({
        type: "error",
        message:
          error?.message ||
          "Не удалось добавить заказ. Пожалуйста, проверьте данные.",
      });

      setUpdateStatus({
        type: 400,
        message: error?.message || "Ошибка сервера",
      });
    } finally {
      setLoadingState(false);
    }
  };

  // Отрисовка статусного сообщения
  const renderStatusMessage = () => {
    if (!statusMessage.message) return null;

    const colorMap = {
      success: "success.main",
      error: "error.main",
      warning: "warning.main",
    };

    return (
      <Typography
        variant="body2"
        sx={{
          color: colorMap[statusMessage.type] || "inherit",
          textAlign: "center",
          mt: 2,
        }}
      >
        {statusMessage.message}
      </Typography>
    );
  };

  const renderDateTimeSection = () => {
    // Handle pickup date change with validation
    const handlePickupDateChange = (newStart) => {
      const normalized = normalizeDate(newStart);
      // Запрет выбора прошлой даты
      if (normalized && dayjs(normalized).isBefore(dayjs(), "day")) {
        return; // игнорируем недопустимый выбор
      }
      setBookedDates((dates) => {
        if (!normalized) return { ...dates, start: normalized };
        if (
          dates.end &&
          dayjs(dates.end).isSameOrBefore(dayjs(normalized), "day")
        ) {
          return {
            start: normalized,
            end: dayjs(normalized).add(1, "day").format("YYYY-MM-DD"),
          };
        }
        return { ...dates, start: normalized };
      });
    };

    // Handle return date change with validation
    const handleReturnDateChange = (newEnd) => {
      const normalized = normalizeDate(newEnd);
      if (
        bookDates.start &&
        normalized &&
        dayjs(normalized).isSameOrBefore(dayjs(bookDates.start), "day")
      ) {
        return;
      }
      setBookedDates((dates) => ({ ...dates, end: normalized }));
    };

    return (
      <Box sx={{ mb: 2 }}>
        {/* Date fields */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 },
            mb: 1,
          }}
        >
          <BookingEditableDateField
            label={t("order.pickupDate")}
            value={bookDates.start || ""}
            onChange={(e) => handlePickupDateChange(e.target.value)}
            sx={{ flex: 1 }}
            inputProps={{ min: dayjs().format("YYYY-MM-DD") }}
          />
          <BookingEditableDateField
            label={t("order.returnDate")}
            value={bookDates.end || ""}
            onChange={(e) => handleReturnDateChange(e.target.value)}
            sx={{ flex: 1 }}
            inputProps={{
              min: bookDates.start
                ? dayjs(bookDates.start).add(1, "day").format("YYYY-MM-DD")
                : dayjs().format("YYYY-MM-DD"),
            }}
          />
        </Box>
        {/* Time fields */}
        <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
          <BookingTimeField
            label={t("order.pickupTime")}
            value={startTime.format("HH:mm")}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            sx={{ flex: 1 }}
          />
          <BookingTimeField
            label={t("order.returnTime")}
            value={endTime.format("HH:mm")}
            onChange={(e) => handleEndTimeChange(e.target.value)}
            sx={{ flex: 1 }}
          />
        </Box>
        {/* Location fields */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 },
            mb: 1,
          }}
        >
          <BookingLocationAutocomplete
            label={t("order.pickupLocation")}
            options={locations}
            dividerBeforeOption={LOCATION_DIVIDER_BEFORE}
            value={orderDetails.placeIn || ""}
            onChange={(_, newValue) =>
              handleFieldChange("placeIn", newValue || "")
            }
            onInputChange={(_, newInputValue) =>
              handleFieldChange("placeIn", newInputValue)
            }
            sx={{ flex: 1 }}
          />
          <BookingLocationAutocomplete
            label={t("order.returnLocation")}
            options={locations}
            dividerBeforeOption={LOCATION_DIVIDER_BEFORE}
            value={orderDetails.placeOut || ""}
            onChange={(_, newValue) =>
              handleFieldChange("placeOut", newValue || "")
            }
            onInputChange={(_, newInputValue) =>
              handleFieldChange("placeOut", newInputValue)
            }
            sx={{ flex: 1 }}
          />
        </Box>
        {/* Flight number - conditional */}
        {orderDetails.placeIn &&
          orderDetails.placeIn.toLowerCase() === "airport" && (
            <BookingFlightField
              label={t("order.flightNumber")}
              value={orderDetails.flightNumber || ""}
              onChange={(e) => handleFieldChange("flightNumber", e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
          )}
      </Box>
    );
  };

  const renderCustomerSection = () => {
    const insuranceOptions =
      t("order.insuranceOptions", { returnObjects: true }) || [];

    return (
      <Box sx={{ mb: 2, mt: 0 }}>
        {/* Страховка и детские кресла — адаптивно */}
        <Box sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 2 }, 
          mb: 1
        }}>
          <FormControl
            fullWidth
            sx={{
              width: { 
                xs: "100%", 
                sm: orderDetails.insurance === "TPL" ? "49%" : "30%" 
              },
            }}
          >
            <InputLabel>{t("order.insurance")}</InputLabel>
            <Select
              label={t("order.insurance")}
              value={orderDetails.insurance || ""}
              onChange={(e) => handleFieldChange("insurance", e.target.value)}
            >
              {(() => {
                const kaskoPrice = car?.PriceKacko ?? 0;
                return (t("order.insuranceOptions", { returnObjects: true }) || []).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.value === "CDW"
                      ? `${option.label} ${kaskoPrice}€/${t("order.perDay")}`
                      : option.label}
                  </MenuItem>
                ));
              })()}
            </Select>
          </FormControl>
          {orderDetails.insurance === "CDW" && (
            <Box sx={{ width: "16%" }}>
              <RenderTextField
                name="franchiseOrder"
                label={t("car.franchise") || "Франшиза заказа"}
                type="number"
                updatedCar={orderDetails}
                handleChange={(e) =>
                  handleFieldChange("franchiseOrder", Number(e.target.value))
                }
                isLoading={false}
                sx={{ mb: 0 }}
              />
            </Box>
          )}
          <FormControl fullWidth sx={{ width: { xs: "100%", sm: "49%" } }}>
            <InputLabel>
              {t("order.childSeats")}{" "}
              {car?.PriceChildSeats ?? 0}
              €/{t("order.perDay")}
            </InputLabel>
            <Select
              label={`${t("order.childSeats")} ${car?.PriceChildSeats ?? 0}€/${t("order.perDay")}`}
              value={
                typeof orderDetails.ChildSeats === "number"
                  ? orderDetails.ChildSeats
                  : 0
              }
              onChange={(e) =>
                handleFieldChange("ChildSeats", Number(e.target.value))
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
        {/* Customer fields */}
         <Box sx={{ mb: 0 }}>
        <BookingTextField
          label={t("order.name")}
          value={orderDetails.customerName || ""}
          onChange={(e) => handleFieldChange("customerName", e.target.value)}
          required
          sx={{ mb: 1 }}
        />
        <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 0.5, sm: 2 }, 
              mb: 0 
            }}>
        <BookingTextField
          label={t("order.phone")}
          value={orderDetails.phone || ""}
          onChange={(e) => handleFieldChange("phone", e.target.value)}
          required
          sx={{ mb: 1, flex: 1, minHeight: 36  }}

        />
        <BookingTextField
          label={t("order.email")}
          value={orderDetails.email || ""}
          onChange={(e) => handleFieldChange("email", e.target.value)}
          type="email"
          sx={{ mb: 1, flex: 1, minHeight: 36}}
        />
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mt: 0.25,
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
                  checked={Boolean(orderDetails.Viber)}
                  onChange={(e) => handleFieldChange("Viber", e.target.checked)}
                />
              }
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
              label="Viber"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(orderDetails.Whatsapp)}
                  onChange={(e) => handleFieldChange("Whatsapp", e.target.checked)}
                />
              }
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
              label="WhatsApp"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(orderDetails.Telegram)}
                  onChange={(e) => handleFieldChange("Telegram", e.target.checked)}
                />
              }
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
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
                  checked={Boolean(orderDetails.secondDriver)}
                  onChange={(e) =>
                    handleFieldChange("secondDriver", e.target.checked)
                  }
                />
              }
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
              label={t("order.secondDriver", {
                price: secondDriverPriceLabelValue,
              })}
            />
          </Box>
        </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          padding: 2,
          margin: "auto",
          bgcolor: "background.paper",
          maxWidth: 700,
          minWidth: { xs: 0, sm: 600 }, // xs — для телефонов, sm и выше — minWidth: 600
          borderRadius: 2,
          // Вертикальный скроллинг и ограничение высоты только для xs (телефонов)
          // Вертикальный скроллинг и ограничение высоты для всех мобильных и планшетов (md и меньше)
          maxHeight: { xs: "90vh", sm: "90vh", md: "90vh", lg: "none" },
          overflowY: { xs: "auto", sm: "auto", md: "auto", lg: "visible" },
        }}
      >
        {loadingState && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              bgcolor: "rgba(0, 0, 0, 0.5)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                textAlign: "center",
                color: "white",
              }}
            >
              <CircularProgress color="inherit" />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Отправка заказа...
              </Typography>
            </Box>
          </Box>
        )}
        <Typography
          variant="h6"
          color="primary.main"
          sx={{ letterSpacing: "-0.5px", fontSize: "1.1rem" }}
        >
          {t("order.addOrder")}
          {orderDetails.orderNumber && orderDetails.orderNumber.length > 4 && (
            <>
              {" №"}
              {orderDetails.orderNumber.slice(2, -2)}
            </>
          )}
          {car?.model && (
            <>
              {" "}
              {t("basic.for")} {car.model}
              {car.regNumber ? ` (${car.regNumber})` : ""}
            </>
          )}
        </Typography>

        {/* Количество дней и общая стоимость */}
        <Box
          sx={{
            mb: 2,
            mt: 1,
            fontWeight: 400,
            fontSize: "1.05rem",
            color: "text.primary",
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          {calcLoading ? (
            t("order.calculating")
          ) : (
            <>
              <Typography
                variant="body1"
                component="span"
                sx={{ fontWeight: 400, color: "black" }}
              >
                {(() => {
                  let days = daysAndTotal.days;
                  if (bookDates.start && bookDates.end) {
                    const fallbackStart = createAthensDateTime(
                      bookDates.start,
                      formatTimeHHMM(dayjs(startTime))
                    );
                    const fallbackEnd = createAthensDateTime(
                      bookDates.end,
                      formatTimeHHMM(dayjs(endTime))
                    );
                    days = getBusinessRentalDaysByMinutes(
                      fallbackStart,
                      fallbackEnd
                    );
                  }
                  return (
                    <>
                      {t("order.daysNumber", { count: days })}
                      <Box
                        component="span"
                        sx={{
                          fontWeight: "bold",
                          color: "primary.main",
                          mx: 0.5,
                        }}
                      >
                        {days}
                      </Box>
                      | {t("order.price")}
                    </>
                  );
                })()}
              </Typography>
              <TextField
                value={orderDetails.totalPrice}
                onChange={(e) =>
                  handleFieldChange("totalPrice", Number(e.target.value))
                }
                type="number"
                variant="outlined"
                margin="dense"
                inputProps={{
                  style: {
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "right",
                    letterSpacing: 1,
                    color: "error.main",
                    paddingRight: 0,
                  },
                  maxLength: 4,
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  size: 6,
                }}
                sx={{
                  ml: 1,
                  mt: 0,
                  mb: 1,
                  width: "115px",
                  "& .MuiInputBase-input": {
                    padding: "8px 8px 8px 12px",
                    width: "6ch",
                    boxSizing: "content-box",
                    color: "error.main",
                    fontSize: 18,
                  },
                  "& .MuiInputAdornment-root": {
                    marginLeft: 0,
                    marginRight: 0,
                  },
                }}
                placeholder="0"
                InputProps={{
                  endAdornment: (
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        marginLeft: 0,
                        marginRight: "-8px",
                        paddingLeft: 0,
                        paddingRight: 0,
                        letterSpacing: 0,
                        color: "error.main",
                        display: "inline-block",
                      }}
                    >
                      €
                    </span>
                  ),
                }}
              />
            </>
          )}
        </Box>
        {renderDateTimeSection()}
        {renderCustomerSection()}

        {renderStatusMessage()}

        <Box sx={{ mt: 2, display: "flex", gap: 2, justifyContent: "center" }}>
          <CancelButton
            onClick={onClose}
            disabled={loadingState}
            label={t("basic.cancel")}
          />
          <ConfirmButton
            onClick={handleBookingComplete}
            loading={loadingState}
            disabled={
              !bookDates.start ||
              !bookDates.end ||
              !startTime ||
              !endTime ||
              !orderDetails.customerName ||
              !orderDetails.phone
            }
            label={t("order.CompleteBook")}
          />
        </Box>
      </Box>
    </Modal>
  );
};

export default AddOrder;
