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
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  ConfirmButton,
  CancelButton,
  BookingDateField,
  BookingTimeField,
  BookingTextField,
  BookingLocationAutocomplete,
  BookingFlightField,
} from "../ui";
import { useTranslation } from "react-i18next";
import { addOrderNew } from "@utils/action";
import SuccessMessage from "@/app/components/ui/feedback/SuccessMessage";
import { setTimeToDatejs } from "@utils/functions";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useMainContext } from "../../Context";
import { useSnackbar } from "notistack";
import { calculateTotalPrice } from "@utils/action";
import { getSecondDriverPriceLabelValue } from "@utils/secondDriverPricing";
// 🎯 Athens timezone utilities — ЕДИНСТВЕННЫЙ источник правды для времени
import {
  ATHENS_TZ,
  createAthensDateTime,
  toServerUTC,
  fromServerUTC,
  formatTimeHHMM,
} from "@/domain/time/athensTime";
import "@/styles/animations.css";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
const TIME_ZONE = ATHENS_TZ; // Для обратной совместимости
// DEBUG: ограничение логов по машине и дате (YYYY-MM-DD)
// Пример: const DEBUG_CAR_ID = "670bb226223dd911f0595286"; const DEBUG_DATE = "2025-11-30";
const DEBUG_CAR_ID = null;
const DEBUG_DATE = null;

const BookingModal = ({
  open,
  onClose,
  car,
  presetDates = null,
  fetchAndUpdateOrders,
  isLoading,
  selectedTimes,
  initialPrice = null, // Просчитанная цена из календаря
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [daysAndTotal, setDaysAndTotal] = useState({ days: 0, totalPrice: 0 });
  const [calcLoading, setCalcLoading] = useState(false);
  const { t } = useTranslation();
  const secondDriverPriceLabelValue = getSecondDriverPriceLabelValue();
  const { company, companyLoading, companyError, lang } = useMainContext();
  const carApiIdentifier = car?.regNumber || car?.carNumber || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [secondDriver, setSecondDriver] = useState(false);
  const [viber, setViber] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [childSeats, setChildSeats] = useState(0);
  const [insurance, setInsurance] = useState("");
  const [franchiseOrder, setFranchiseOrder] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const [startTime, setStartTime] = useState(() =>
    setTimeToDatejs(presetDates?.startDate, null, true)
  );
  const [endTime, setEndTime] = useState(() =>
    setTimeToDatejs(presetDates?.endDate, null)
  );
  const [timeLimits, setTimeLimits] = useState({
    minStart: null,
    maxEnd: null,
  });
  const [timeErrors, setTimeErrors] = useState(null);
  const [orderNumber, setOrderNumber] = useState("");
  // Массив мест из базы (company.locations)
  const placeOptions = company?.locations?.map((loc) => loc.name) || [];
  const [placeIn, setPlaceIn] = useState("");
  const [placeOut, setPlaceOut] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Получение стоимости с сервера при изменении дат
  const fetchTotalPrice = useCallback(async (signal) => {
    if (!carApiIdentifier || !presetDates?.startDate || !presetDates?.endDate) {
      setDaysAndTotal({ days: 0, totalPrice: 0 });
      return;
    }
    const normalizedStartDate = dayjs(presetDates.startDate).tz(TIME_ZONE);
    const normalizedEndDate = dayjs(presetDates.endDate).tz(TIME_ZONE);
    if (!normalizedStartDate.isValid() || !normalizedEndDate.isValid()) {
      setDaysAndTotal({ days: 0, totalPrice: 0 });
      return;
    }
    setCalcLoading(true);
    try {
      const result = await calculateTotalPrice(
        carApiIdentifier,
        normalizedStartDate.format("YYYY-MM-DD"),
        normalizedEndDate.format("YYYY-MM-DD"),
        insurance,
        childSeats,
        { signal, secondDriver }
      );
      if (signal?.aborted) return;
      setDaysAndTotal({ days: result.days, totalPrice: result.totalPrice });
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) return;
      setDaysAndTotal({ days: 0, totalPrice: 0 });
    } finally {
      if (!signal?.aborted) {
        setCalcLoading(false);
      }
    }
  }, [
    carApiIdentifier,
    presetDates?.startDate,
    presetDates?.endDate,
    insurance,
    childSeats,
    secondDriver,
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchTotalPrice(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchTotalPrice]);

  // Лог: даты бронирования, отображаемые в BookingModal (start/end + времена)
  useEffect(() => {
    const carIdentifier = car?._id || car?.regNumber || car?.carNumber;
    // Базовые объекты (могут быть dayjs или Date)
    const rawStart = presetDates?.startDate
      ? dayjs(presetDates.startDate)
      : null;
    const rawEnd = presetDates?.endDate ? dayjs(presetDates.endDate) : null;
    // Локальные (Europe/Athens) календарные даты, скорректированные из UTC
    // FIX: убран повторный вызов utc(); интерпретируем сохранённые даты как локальные Athens
    const presetStartStr = rawStart
      ? rawStart.tz(TIME_ZONE).format("YYYY-MM-DD")
      : null;
    const presetEndStr = rawEnd
      ? rawEnd.tz(TIME_ZONE).format("YYYY-MM-DD")
      : null;
    // ISO строки для сравнения (сырье)
    const rawStartISO = rawStart ? rawStart.toISOString() : null;
    const rawEndISO = rawEnd ? rawEnd.toISOString() : null;
    // Диагностический пролог: покажем, почему лог мог быть подавлен
    try {
      const carMatch =
        !DEBUG_CAR_ID || [car?._id, car?.regNumber, car?.carNumber].includes(DEBUG_CAR_ID);
      const dateMatch =
        !DEBUG_DATE ||
        DEBUG_DATE === presetEndStr ||
        DEBUG_DATE === presetStartStr;
      // console.log("[BookingModal][DEBUG] log gate:", {
      //   carId: carIdentifier,
      //   car_id: car?._id,
      //   car_number: car?.carNumber,
      //   presetStartDate: presetStartStr,
      //   presetEndDate: presetEndStr,
      //   rawStartISO,
      //   rawEndISO,
      //   DEBUG_CAR_ID,
      //   DEBUG_DATE,
      //   carMatch,
      //   dateMatch,
      // });
    } catch {}
    if (
      (!DEBUG_CAR_ID || [car?._id, car?.regNumber, car?.carNumber].includes(DEBUG_CAR_ID)) &&
      (!DEBUG_DATE ||
        DEBUG_DATE === presetEndStr ||
        DEBUG_DATE === presetStartStr)
    ) {
      try {
        const startTimeStr = startTime
          ? dayjs(startTime).format("HH:mm")
          : null;
        const endTimeStr = endTime ? dayjs(endTime).format("HH:mm") : null;
        const localStartCombined =
          presetStartStr && startTimeStr
            ? dayjs.tz(
                `${presetStartStr} ${startTimeStr}`,
                "YYYY-MM-DD HH:mm",
                TIME_ZONE
              )
            : null;
        const localCombined =
          presetEndStr && endTimeStr
            ? dayjs.tz(
                `${presetEndStr} ${endTimeStr}`,
                "YYYY-MM-DD HH:mm",
                TIME_ZONE
              )
            : null;
        if (process.env.NODE_ENV === "development") {
          console.log("[BookingModal] Booking dates displayed:", {
          carId: carIdentifier,
          presetStartDate: presetStartStr,
          presetEndDate: presetEndStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          startLocal: localStartCombined
            ? localStartCombined.format("YYYY-MM-DD HH:mm")
            : null,
          startUTC: localStartCombined
            ? localStartCombined.utc().format("YYYY-MM-DD HH:mm")
            : null,
          dateLocal: localCombined
            ? localCombined.format("YYYY-MM-DD HH:mm")
            : null,
          dateUTC: localCombined
            ? localCombined.utc().format("YYYY-MM-DD HH:mm")
            : null,
          rawStartISO,
          rawEndISO,
          });
        }
      } catch (e) {
        // Error in date calculation
      }
    }
  }, [
    presetDates?.startDate,
    presetDates?.endDate,
    startTime,
    endTime,
    car?._id,
    car?.regNumber,
    car?.carNumber,
  ]);

  // Определение граничных заказов и установка дефолтных/смещённых времен
  useEffect(() => {
    if (!presetDates?.startDate || !presetDates?.endDate || !company) return;

    const diffStart = Number(company.hoursDiffForStart) || 0; // обычно >0
    const diffEnd = Number(company.hoursDiffForEnd) || 0; // может быть отрицательным

    // previous boundary: selectedTimes.start содержит время окончания предыдущего заказа если он заканчивается в день старта нового
    const prevEndRaw = selectedTimes?.start; // HH:mm или null
    // next boundary: selectedTimes.end содержит время начала следующего заказа если он начинается в день окончания нового
    const nextStartRaw = selectedTimes?.end; // HH:mm или null

    let minStart = null; // нижняя граница для старта
    let maxEnd = null; // верхняя граница для окончания
    let startDefault = company.defaultStart; // строка HH:mm
    let endDefault = company.defaultEnd; // строка HH:mm

    // Если есть предыдущий граничный заказ: старт = (конец предыдущего + diffStart часов)
    if (prevEndRaw) {
      const base = dayjs(prevEndRaw, "HH:mm").add(diffStart, "hour");
      startDefault = base.format("HH:mm");
      minStart = startDefault; // нельзя раньше этой границы
    }

    // Если есть следующий граничный заказ: окончание = (начало следующего + diffEnd часов)
    if (nextStartRaw) {
      const baseNext = dayjs(nextStartRaw, "HH:mm").add(diffEnd, "hour");
      endDefault = baseNext.format("HH:mm");
      maxEnd = endDefault; // нельзя позже этой границы
    }

    // Установка времен
    setStartTime(setTimeToDatejs(presetDates.startDate, startDefault, true));
    setEndTime(setTimeToDatejs(presetDates.endDate, endDefault));
    setTimeLimits({ minStart, maxEnd });

    // Валидация пересечения только если даты начала и окончания ОДИНАКОВЫЕ (same day)
    // Если даты разные, сравнение только по времени некорректно и не требуется.
    if (
      minStart &&
      maxEnd &&
      dayjs(presetDates.startDate).isSame(dayjs(presetDates.endDate), "day")
    ) {
      const startVal = dayjs(startDefault, "HH:mm");
      const endVal = dayjs(endDefault, "HH:mm");
      if (!startVal.isBefore(endVal)) {
        setTimeErrors(
          t("order.invalidBoundaryInterval", {
            defaultValue:
              "Недопустимый интервал между граничными заказами. Выберите другие даты.",
          })
        );
      } else setTimeErrors(null);
    } else setTimeErrors(null);
  }, [presetDates, selectedTimes, company, t]);

  // Клампинг ручного ввода времени старта
  const handleStartTimeChange = (value) => {
    const chosen = dayjs(value, "HH:mm");
    if (timeLimits.minStart) {
      const min = dayjs(timeLimits.minStart, "HH:mm");
      if (chosen.isBefore(min)) {
        setStartTime(
          setTimeToDatejs(presetDates.startDate, timeLimits.minStart, true)
        );
        return;
      }
    }
    setStartTime(setTimeToDatejs(presetDates.startDate, value, true));
  };

  // Клампинг ручного ввода времени окончания
  const handleEndTimeChange = (value) => {
    const chosen = dayjs(value, "HH:mm");
    if (timeLimits.maxEnd) {
      const max = dayjs(timeLimits.maxEnd, "HH:mm");
      if (chosen.isAfter(max)) {
        setEndTime(setTimeToDatejs(presetDates.endDate, timeLimits.maxEnd));
        return;
      }
    }
    setEndTime(setTimeToDatejs(presetDates.endDate, value));
  };

  // Проверка формата email происходит только на фронте, в функции validateEmail:
  const validateEmail = (email) => {
    if (!email) return true; // Email необязателен
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhone = (phone) => {
    const re = /^\+?[0-9]\d{1,14}$/;
    return re.test(phone);
  };

  const bookButtonRef = useRef(null);

  useEffect(() => {
    if (
      open &&
      !isSubmitted &&
      name &&
      email &&
      phone &&
      presetDates?.startDate &&
      presetDates?.endDate &&
      bookButtonRef.current
    ) {
      const timer = setTimeout(() => {
        bookButtonRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    open,
    isSubmitted,
    name,
    email,
    phone,
    presetDates?.startDate,
    presetDates?.endDate,
  ]);

  useEffect(() => {
    if (open) {
      resetForm(); // Сбросить форму при каждом открытии модального окна
      setInsurance("TPL"); // Всегда по умолчанию внутренний код ОСАГО
      setChildSeats(0); // Всегда по умолчанию 0
      setOrderNumber(generateOrderNumber());
      setPlaceIn("Halkidikí"); // Значение по умолчанию
      setPlaceOut("Halkidikí"); // Значение по умолчанию
      // Подтягиваем franchise из базы/prop автомобиля при открытии модалки
      // 1) если пришёл вместе с car — используем его
      if (car && typeof car.franchise !== "undefined") {
        setFranchiseOrder(Number(car.franchise) || 0);
      } else if (car && car._id) {
        // 2) иначе пробуем получить из API
        fetch(`/api/car/${car._id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.franchise !== "undefined") {
              setFranchiseOrder(Number(data.franchise) || 0);
            }
          })
          .catch(() => {
            // игнорируем, оставим 0 по умолчанию
          });
      } else {
        setFranchiseOrder(0);
      }
    }
  }, [open, car]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const newErrors = {};
    const requiredMsg = t("order.required") || "Required";
    if (!name?.trim()) newErrors.name = requiredMsg;
    if (email && !validateEmail(email))
      newErrors.email = "Invalid email address";
    if (!phone?.trim()) newErrors.phone = requiredMsg;
    if (phone?.trim() && !validatePhone(phone)) newErrors.phone = "Invalid phone number";
    // if (!termsAccepted) newErrors.terms = requiredMsg; // поле политики/условий пока закомментировано
    if (!presetDates?.startDate || !presetDates?.endDate) newErrors.dates = t("order.requiredDates") || "Pick-up and return dates";
    if (timeErrors) newErrors.time = timeErrors;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 🎯 Используем athensTime utilities для timezone-корректного создания времени
      const startDateStr = presetDates?.startDate
        ? dayjs(presetDates.startDate).tz(TIME_ZONE).format("YYYY-MM-DD")
        : null;
      const endDateStr = presetDates?.endDate
        ? dayjs(presetDates.endDate).tz(TIME_ZONE).format("YYYY-MM-DD")
        : null;

      // Извлекаем HH:mm и создаём заново в Athens БЕЗ конвертации из таймзоны браузера
      const timeInAthens = startDateStr
        ? createAthensDateTime(startDateStr, formatTimeHHMM(dayjs(startTime)))
        : null;
      const timeOutAthens = endDateStr
        ? createAthensDateTime(endDateStr, formatTimeHHMM(dayjs(endTime)))
        : null;

      // Конвертируем в UTC для сохранения в БД
      const timeInUTC = toServerUTC(timeInAthens);
      const timeOutUTC = toServerUTC(timeOutAthens);

      const orderData = {
        // regNumber is primary identifier for booking flows; carNumber kept as fallback.
        regNumber: car?.regNumber || "",
        carNumber: car?.carNumber || "",
        customerName: name || "",
        phone: phone || "",
        email: email ? email : "",
        secondDriver: Boolean(secondDriver),
        Viber: viber,
        Whatsapp: whatsapp,
        Telegram: telegram,
        timeIn: timeInUTC,
        timeOut: timeOutUTC,
        // Привязываем даты аренды к тем же суткам, что и timeIn/timeOut
        rentalStartDate: timeInUTC ? dayjs(timeInUTC).toDate() : "",
        rentalEndDate: timeOutUTC ? dayjs(timeOutUTC).toDate() : "",
        my_order: true,
        ChildSeats: childSeats,
        insurance: insurance,
        franchiseOrder: Number(franchiseOrder) || 0,
        orderNumber: orderNumber,
        placeIn: placeIn,
        placeOut: placeOut,
        flightNumber: flightNumber,
        locale: lang || "en",
      };

      const response = await addOrderNew(orderData);

      // Фронт только обрабатывает ответ бэка: успех/ошибка создания заказа
      switch (response.status) {
        case "success":
          setSubmittedOrder(response.data);
          setIsSubmitted(true);
          fetchAndUpdateOrders();
          break;
        case "pending": {
          setSubmittedOrder(response.data);
          if (response.messageCode && response.dates) {
            setMessage(
              t(response.messageCode, { dates: response.dates.join(", ") })
            );
          } else {
            setMessage(response.message);
          }
          setIsSubmitted(true);
          fetchAndUpdateOrders();
          break;
        }
        case "conflict":
          setErrors({ submit: response.message });
          break;
        case "error":
          throw new Error(response.message);
        default:
          throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("BookingModal: Ошибка при подтверждении заказа:", error);
      }
      setErrors({
        submit:
          error.message || "An error occurred while processing your request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSecondDriver(false);
    setViber(false);
    setWhatsapp(false);
    setTelegram(false);
    setTermsAccepted(false);
    setErrors({});
    setIsSubmitted(false);
    setIsSubmitting(false);
    setSubmittedOrder(null);
    setMessage(null);
    setPlaceIn("");
    setPlaceOut("");
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  // Unified close handler - only allow close button (not backdrop or Escape)
  // This matches the default behavior contract: transactional modals should not close accidentally
  const handleDialogClose = (event, reason) => {
    // Only close for button clicks and programmatic closes
    // Block backdrop clicks and Escape key (default: closeOnBackdropClick=false, closeOnEscape=false)
    if (reason !== "backdropClick" && reason !== "escapeKeyDown") {
      handleModalClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={true}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 2,
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: "95vh", sm: "90vh" },
        },
      }}
    >
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            p: 8,
            minHeight: 200,
          }}
        >
          <CircularProgress sx={{ color: "primary.main" }} />
          <CircularProgress sx={{ color: "secondary.main" }} />
          <CircularProgress sx={{ color: "triadic.green" }} />
        </Box>
      ) : (
        <React.Fragment>
          {/* Единый липкий блок: заголовок + период бронирования + дни/стоимость */}
          {!isSubmitted && (
            <Box
              sx={{
                position: { xs: "sticky", sm: "static" },
                top: { xs: 0 },
                zIndex: { xs: 40 },
                backgroundColor: "background.paper",
                borderBottom: "1px solid",
                borderColor: "divider",
                pt: { xs: 2.4, sm: 1.5 },
                pb: { xs: 1.3, sm: 1.5 },
                mb: { xs: 0.3, sm: 0 },
                position: "relative",
              }}
            >
              {/* Close button */}
              <IconButton
                onClick={handleModalClose}
                size="small"
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  color: "text.secondary",
                  "&:hover": { color: "primary.main" },
                }}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>

              <Typography
                variant="h6"
                align="center"
                sx={{
                  fontSize: { xs: "1.05rem", sm: "1.25rem" },
                  px: 4, // Добавляем padding чтобы текст не заходил под кнопку
                  m: 1,
                  lineHeight: 1.25,
                  fontWeight: 600,
                }}
              >
                {t("order.book", { model: car.model })}
              </Typography>
              {/* Строка периода бронирования (скрыта по просьбе клиента)
            <Typography
              variant="body2"
              align="center"
              sx={{
                mt: { xs: 0.15, sm: 0.4 },
                mb: { xs: 0, sm: 0.3 },
                lineHeight: 1.1,
                fontSize: { xs: "0.78rem", sm: "0.9rem" },
              }}
            >
              {t("basic.from")}
              <Box component="span" sx={{ fontWeight: 600, color: "primary.main", mx: 0.5 }}>
                {dayjs(presetDates?.startDate).format("DD.MM.YYYY")}
              </Box>
              {t("order.till")}
              <Box component="span" sx={{ fontWeight: 600, color: "primary.main", mx: 0.5 }}>
                {dayjs(presetDates?.endDate).format("DD.MM.YYYY")}
              </Box>
            </Typography>
            */}
              {/* Дни и стоимость – без промежутка, приклеено */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 0, sm: 2 },
                  alignItems: { xs: "center", sm: "center" },
                  justifyContent: "center",
                  mt: { xs: 0.15, sm: 0.4 },
                  lineHeight: 1.14,
                }}
              >
                <>
                  <Typography
                    component="div"
                    variant="body2"
                    sx={{
                      fontSize: { xs: "0.94rem", sm: "1.1rem" },
                      m: 0,
                      lineHeight: 1.14,
                    }}
                  >
                    {t("order.daysNumber", { count: daysAndTotal.days })}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: "bold",
                        color: "primary.main",
                        mx: 0.5,
                      }}
                    >
                      {daysAndTotal.days}
                    </Box>
                  </Typography>
                  <Typography
                    component="div"
                    variant="body2"
                    sx={{
                      fontSize: { xs: "0.94rem", sm: "1.1rem" },
                      m: 0,
                      lineHeight: 1.14,
                    }}
                  >
                    {t("order.price")}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: "bold",
                        color: "primary.main",
                        mx: 0.5,
                      }}
                    >
                      {calcLoading 
                        ? "" 
                        : `${daysAndTotal.totalPrice}€`}
                    </Box>
                  </Typography>
                </>
              </Box>
            </Box>
          )}
          <DialogContent
            sx={{
              pt: isSubmitted ? 3 : 2,
            }}
          >
            {isSubmitted ? (
              <Box sx={{ position: "relative", textAlign: "center" }}>
                {/* Close button for success state */}
                <IconButton
                  onClick={handleModalClose}
                  size="small"
                  sx={{
                    position: "absolute",
                    right: -16,
                    top: -16,
                    color: "text.secondary",
                    "&:hover": { color: "primary.main" },
                  }}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
                <SuccessMessage
                  submittedOrder={submittedOrder}
                  presetDates={presetDates}
                  onClose={onClose}
                  message={message}
                />
              </Box>
            ) : (
              <Box>
                {/* Удалён старый отдельный блок: теперь информация перенесена в липкий заголовок */}
                <Box
                  component="form"
                  sx={{ "& .MuiTextField-root": { my: { xs: 0.5, sm: 1 } } }}
                >
                  {/* Дата над временем, нередактируемые поля с видом выпадающих */}
                  <Box sx={{ display: "flex", gap: 2, mb: { xs: 1, sm: 1 } }}>
                    {/* Колонка получения */}
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <BookingDateField
                        label={t("order.pickupDate") || "Дата получения"}
                        value={
                          presetDates?.startDate
                            ? dayjs(presetDates.startDate).format("DD.MM.YYYY")
                            : ""
                        }
                      />
                      <BookingTimeField
                        label={t("order.pickupTime")}
                        value={startTime.format("HH:mm")}
                        inputProps={
                          timeLimits.minStart
                            ? { min: timeLimits.minStart }
                            : {}
                        }
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        error={Boolean(timeErrors || errors.time)}
                        helperText={
                          errors.time || timeErrors
                            ? (errors.time || timeErrors)
                            : timeLimits.minStart
                            ? `${t("order.minAllowed", {
                                defaultValue: "Не раньше: ",
                              })}${timeLimits.minStart}`
                            : ""
                        }
                        FormHelperTextProps={{
                          sx: { color: "error.main", fontWeight: 600 },
                        }}
                      />
                    </Box>
                    {/* Колонка возврата */}
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <BookingDateField
                        label={t("order.returnDate") || "Дата возврата"}
                        value={
                          presetDates?.endDate
                            ? dayjs(presetDates.endDate).format("DD.MM.YYYY")
                            : ""
                        }
                      />
                      <BookingTimeField
                        label={t("order.returnTime")}
                        value={endTime.format("HH:mm")}
                        inputProps={
                          timeLimits.maxEnd ? { max: timeLimits.maxEnd } : {}
                        }
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        error={Boolean(timeErrors)}
                        helperText={
                          timeErrors
                            ? timeErrors
                            : timeLimits.maxEnd
                            ? `${t("order.maxAllowed", {
                                defaultValue: "Не позже: ",
                              })}${timeLimits.maxEnd}`
                            : ""
                        }
                        FormHelperTextProps={{
                          sx: { color: "error.main", fontWeight: 600 },
                        }}
                      />
                    </Box>
                  </Box>
                  {/* Места получения/возврата — всегда в одну строку */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      gap: 2,
                      mb: { xs: 1, sm: 2 },
                      mt: 0,
                      width: "100%",
                      alignItems: "stretch",
                    }}
                  >
                    {/* Если выбран Airport — показываем placeIn и flight в одной строке (60/40) */}
                    {placeIn && placeIn.toLowerCase() === "airport" ? (
                      <Box
                        sx={{
                          display: "flex",
                          width: "50%",
                          gap: 2,
                          alignItems: "stretch",
                        }}
                      >
                        <BookingLocationAutocomplete
                          label={
                            t("order.pickupLocation") || "Место получения"
                          }
                          options={placeOptions}
                          value={placeIn}
                          onInputChange={(event, newInputValue) =>
                            setPlaceIn(newInputValue)
                          }
                          sx={{
                            width: "60%",
                            minWidth: 0,
                          }}
                        />
                        <BookingFlightField
                          label={t("order.flightNumber") || "Номер рейса"}
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          sx={{
                            width: "40%",
                            alignSelf: "stretch",
                          }}
                        />
                      </Box>
                    ) : (
                      <BookingLocationAutocomplete
                        label={t("order.pickupLocation") || "Место получения"}
                        options={placeOptions}
                        value={placeIn}
                        onInputChange={(event, newInputValue) =>
                          setPlaceIn(newInputValue)
                        }
                        sx={{
                          width: "50%",
                          minWidth: 0,
                        }}
                      />
                    )}
                    <BookingLocationAutocomplete
                      label={t("order.returnLocation") || "Место возврата"}
                      options={placeOptions}
                      value={placeOut}
                      onInputChange={(event, newInputValue) =>
                        setPlaceOut(newInputValue)
                      }
                      sx={{ width: "50%", minWidth: 0 }}
                    />
                  </Box>
                  {/* <TextField
                    label={t("order.name")}
                    variant="outlined"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    error={!!errors.name}
                    helperText={errors.name}
                  /> */}
                  {/* Страховка, франшиза (условно) и детское кресло */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mt: { xs: 1, sm: 1 },
                      mb: { xs: 1, sm: 3 },
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { sm: "center" },
                    }}
                  >
                    <FormControl 
                      size="small"
                      sx={{ 
                        flex: insurance === "TPL" ? 2 : 1, 
                        width: { xs: "100%" } 
                      }}
                    >
                      <InputLabel>{t("order.insurance")}</InputLabel>
                      <Select
                        label={t("order.insurance")}
                        value={insurance}
                        onChange={(e) => setInsurance(e.target.value)}
                        sx={{
                          height: { sm: "40px" },
                          // Используем правильный синтаксис MUI для кастомных media queries
                          "@media (max-width:600px) and (orientation: portrait)": {
                            height: "50px",
                          },
                        }}
                      >
                        {(
                          t("order.insuranceOptions", {
                            returnObjects: true,
                          }) || []
                        ).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.value === "CDW"
                              ? `${option.label} ${
                                  car.PriceKacko ? car.PriceKacko : 0
                                }€/${t("order.perDay")}`
                              : option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {insurance === "CDW" && (
                      <BookingTextField
                        label={t("order.franchise")}
                        type="number"
                        value={franchiseOrder || 0}
                        InputProps={{ readOnly: true }}
                        size="small"
                        sx={{ 
                          flex: 1,
                          // Используем правильный синтаксис MUI для кастомных media queries
                          "@media (max-width:600px) and (orientation: portrait)": {
                            "& .MuiInputBase-root": {
                              height: "50px !important",
                              minHeight: "50px !important",
                            },
                          },
                          "& .MuiInputBase-root": {
                            height: "40px !important",
                            minHeight: "40px !important",
                          },
                        }}
                      />
                    )}
                    <FormControl 
                      size="small" 
                      sx={{ flex: 1, width: { xs: "100%" } }}
                    >
                      <InputLabel>
                        {t("order.childSeats")}{" "}
                        {car.PriceChildSeats ? car.PriceChildSeats : 0}€/
                        {t("order.perDay")}
                      </InputLabel>
                      <Select
                        label={`${t("order.childSeats")} ${
                          car.PriceChildSeats ? car.PriceChildSeats : 0
                        }€/${t("order.perDay")}`}
                        value={childSeats}
                        onChange={(e) => setChildSeats(Number(e.target.value))}
                        sx={{
                          height: { sm: "40px" },
                          // Используем правильный синтаксис MUI для кастомных media queries
                          "@media (max-width:600px) and (orientation: portrait)": {
                            height: "50px",
                          },
                        }}
                      >
                        <MenuItem value={0}>
                          {t("order.childSeatsNone")}
                        </MenuItem>
                        {[1, 2, 3, 4].map((num) => (
                          <MenuItem key={num} value={num}>
                            {num}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {/* Поле Name: подсветка при ошибке + опциональное подергивание */}
                  <Box
                    className={errors.name ? "booking-field-shake" : ""}
                    sx={{ mt: 2 }}
                  >
                    <BookingTextField
                      label={
                        <>
                          <span>{t("order.yourName")}</span>
                          <span style={{ color: "red" }}>*</span>
                        </>
                      }
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      error={!!errors.name}
                      helperText={errors.name}
                      fullWidth
                    />
                  </Box>

                  {/* Phone и Email: всегда в одну строку */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      flexDirection: "row",
                    }}
                  >
                    <BookingTextField
                      label={
                        <>
                          <span>{t("order.phone")}</span>
                          <span style={{ color: "red" }}>*</span>
                        </>
                      }
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                    <BookingTextField
                      label={
                        <>
                          {t("order.email")}
                          <span
                            style={{
                              color: "green",
                              fontWeight: 500,
                              marginLeft: 8,
                            }}
                          >
                            {t("basic.optional")}
                          </span>
                        </>
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
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
                            checked={viber}
                            onChange={(e) => setViber(e.target.checked)}
                          />
                        }
                        sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
                        label="Viber"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.checked)}
                          />
                        }
                        sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
                        label="WhatsApp"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={telegram}
                            onChange={(e) => setTelegram(e.target.checked)}
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
                            checked={secondDriver}
                            onChange={(e) => setSecondDriver(e.target.checked)}
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
                {/* Поле «Согласие с условиями аренды» — пока закомментировано
                <Box
                  className={errors.terms ? "booking-field-shake" : ""}
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    border: "1px solid",
                    borderColor: errors.terms ? "error.main" : "divider",
                    borderRadius: 1,
                    bgcolor: errors.terms ? "error.lighter" : "action.hover",
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                        }}
                      />
                    }
                    sx={{
                      alignItems: "flex-start",
                      m: 0,
                      "& .MuiFormControlLabel-label": { fontSize: "0.85rem", lineHeight: 1.4 },
                      maxWidth: "100%",
                    }}
                    label={
                      <Typography component="span" variant="body2" sx={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                        {t("order.agreeToTerms")}{" "}
                        <Link
                          href="/rental-terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "underline" }}
                        >
                          {t("order.rentalTerms")}
                        </Link>
                      </Typography>
                    }
                  />
                  {errors.terms && (
                    <Typography color="error" variant="caption" sx={{ display: "block", mt: 0.5 }}>
                      {errors.terms}
                    </Typography>
                  )}
                </Box>
                */}
                {errors.submit && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {errors.submit}
                  </Typography>
                )}
                {/* Кнопки: Бронировать всегда активна, при ошибках подсвечиваются поля (Formik-стиль) */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 2,
                    mt: 3,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    "@media (max-width:600px) and (orientation: portrait)": {
                      width: "100%",
                      justifyContent: "space-between",
                      mt: 1,
                      pt: 1,
                    },
                  }}
                >
                  {isSubmitted ? (
                    <ConfirmButton
                      onClick={handleModalClose}
                      label="OK"
                      sx={{
                        "@media (max-width:600px) and (orientation: portrait)": {
                          flexBasis: 0,
                          flexGrow: 1,
                          minWidth: 0,
                          backgroundColor: "secondary.main",
                          color: "secondary.contrastText",
                        },
                      }}
                    />
                  ) : (
                    <>
                      <CancelButton
                        onClick={handleModalClose}
                        label={t("basic.cancel")}
                        sx={{
                          "@media (max-width:600px) and (orientation: portrait)": {
                            flexBasis: 0,
                            flexGrow: 0.7,
                            minWidth: 0,
                          },
                        }}
                      />
                      <ConfirmButton
                        ref={bookButtonRef}
                        onClick={handleSubmit}
                        loading={isSubmitting}
                        pulse={!isSubmitting}
                        label={
                          isSubmitting
                            ? t("order.processing") || "Processing..."
                            : t("order.confirmBooking")
                        }
                        sx={{
                          "@media (max-width:600px) and (orientation: portrait)": {
                            flexBasis: 0,
                            flexGrow: 1.3,
                            minWidth: 0,
                            padding: "12px 20px",
                          },
                        }}
                      />
                    </>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
        </React.Fragment>
      )}
    </Dialog>
  );
};

export default BookingModal;
