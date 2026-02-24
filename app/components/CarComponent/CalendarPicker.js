import React, { useState, useEffect, useRef, useCallback, startTransition } from "react";
import {
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Grid,
} from "@mui/material";
import { Calendar, DatePicker } from "antd";
import dayjs from "dayjs";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DefaultButton from "@/app/components/ui/buttons/DefaultButton";
import GradientBookButton from "@/app/components/ui/buttons/GradientBookButton";
import {
  functionToretunrStartEndOverlap,
  getConfirmedAndUnavailableStartEndDates,
  extractArraysOfStartEndConfPending,
  returnTime,
  calculateAvailableTimes,
} from "@utils/functions";
import { calculateTotalPrice } from "@utils/action";
import { getBusinessRentalDaysByMinutes } from "@/domain/orders/numberOfDays";
import { analyzeDates } from "@utils/analyzeDates";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import ClearIcon from "@mui/icons-material/Clear";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/ru";
import "dayjs/locale/el";
// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set the default timezone
dayjs.tz.setDefault("Europe/Athens");

// DEBUG: укажите дату вида 'YYYY-MM-DD' и при необходимости конкретный carId,
// чтобы включить точечные логи только для выбранной машины и даты.
// Пример: const DEBUG_DATE = '2025-07-14'; const DEBUG_CAR_ID = '670bb226223dd911f0595287';
// По умолчанию логирование отключено (оба null)
const DEBUG_DATE = null;
const DEBUG_CAR_ID = null;

const CalendarPicker = ({
  isLoading,
  setBookedDates,
  onBookingComplete,
  orders,
  carId,
  car, // Добавляем объект car для получения regNumber/carNumber
  setSelectedTimes,
  selectedTimes,
  onDateChange, // ⬅️ новый проп
  onCurrentDateChange, // ДОБАВИТЬ ЭТОТ PROP
  discount,
  discountStart,
  discountEnd,
  onPriceCalculated, // Callback для передачи просчитанной цены
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isSmallLandscape = useMediaQuery(
    "(max-width:900px) and (orientation: landscape)"
  );
  //console.log(t("order.chooseDates"));
  const [selectedRange, setSelectedRange] = useState([null, null]);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [confirmedDates, setConfirmedDates] = useState([]);
  const [startEndDates, setStartEndDates] = useState([]);
  const [showBookButton, setShowBookButton] = useState(false);
  const [startEndOverlapDates, setStartEndOverlapDates] = useState(null);
  // Add refs for the calendar container and tracking clicks
  const lastClickTimeRef = useRef(0);
  const clickCountRef = useRef(0);
  const bookButtonRef = useRef(null);
  // DEBUG: чтобы не спамить логами для одной и той же даты
  const loggedCellsRef = useRef(new Set());
  // Состояние для расчета суммы заказа
  const [totalPrice, setTotalPrice] = useState(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const carApiIdentifier = car?.regNumber || car?.carNumber || "";

  // Расчет суммы заказа через action
  const fetchTotalPrice = useCallback(async () => {
    if (!carApiIdentifier || !selectedRange[0] || !selectedRange[1]) {
      setTotalPrice(0);
      return;
    }
    setCalcLoading(true);
    try {
      const result = await calculateTotalPrice(
        carApiIdentifier,
        selectedRange[0].toDate(),
        selectedRange[1].toDate(),
        "TPL", // Дефолтное значение
        0 // Дефолтное значение
      );
      setTotalPrice(result.totalPrice || 0);
    } catch {
      setTotalPrice(0);
    } finally {
      setCalcLoading(false);
    }
  }, [carApiIdentifier, selectedRange]);

  useEffect(() => {
    if (showBookButton && selectedRange[0] && selectedRange[1]) {
      fetchTotalPrice();
    } else {
      setTotalPrice(0);
      if (onPriceCalculated) {
        onPriceCalculated(null); // Сбрасываем цену при сбросе выбора
      }
    }
  }, [showBookButton, selectedRange, fetchTotalPrice, onPriceCalculated]);

  // Передаем просчитанную цену родителю
  useEffect(() => {
    if (onPriceCalculated && totalPrice > 0 && !calcLoading && selectedRange[0] && selectedRange[1]) {
      const days = getBusinessRentalDaysByMinutes(
        selectedRange[0],
        selectedRange[1]
      );
      onPriceCalculated({ totalPrice, days });
    }
  }, [totalPrice, calcLoading, selectedRange, onPriceCalculated]);

  // --- useEffect для вертикального скроллинга всей страницы CarGrid ---
  useEffect(() => {
    if (showBookButton && bookButtonRef.current) {
      const button = bookButtonRef.current;
      const buttonRect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const scrollY =
        window.scrollY +
        buttonRect.top +
        buttonRect.height / 2 -
        viewportHeight / 2;
      window.scrollTo({
        top: scrollY,
        behavior: "smooth",
      });
    }
  }, [showBookButton]);

  // Modified onSelect to handle double clicks
  // const onSelect = (date) => {
  //   const now = Date.now();
  //   const timeSinceLastClick = now - lastClickTimeRef.current;

  //   // Reset click count if it's been too long since the last click
  //   if (timeSinceLastClick > 300) {
  //     clickCountRef.current = 0;
  //   }

  //   clickCountRef.current += 1;
  //   lastClickTimeRef.current = now;

  //   // Handle double click
  //   if (clickCountRef.current === 2 && timeSinceLastClick < 300) {
  //     handleClearSelection();
  //     clickCountRef.current = 0;
  //     return;
  //   }

  //   // Regular single click handling
  //   const [start, end] = selectedRange;
  //   const dateStr = date.format("YYYY-MM-DD");

  //   if (!date.isSame(currentDate, "month")) {
  //     setCurrentDate(date.startOf("month"));
  //   }

  //   if (!start || (start && end)) {
  //     setSelectedRange([date, null]);
  //     setShowBookButton(false);
  //   } else {
  //     if (date.isBefore(start)) {
  //       setSelectedRange([date, null]);
  //       setShowBookButton(false);
  //     } else if (date.isSame(start, "day")) {
  //       setSelectedRange([start, null]);
  //       setShowBookButton(false);
  //     } else {
  //       const range = [start, date];
  //       const startStr = range[0];
  //       const endStr = range[1];
  //       setSelectedRange(range);

  //       const {
  //         availableStart,
  //         availableEnd,
  //         hourStart,
  //         minuteStart,
  //         hourEnd,
  //         minuteEnd,
  //       } = calculateAvailableTimes(startEndDates, startStr, endStr);

  //       setSelectedTimes({
  //         start: availableStart,
  //         end: availableEnd,
  //       });
  //       setBookedDates({
  //         start: dayjs.utc(range[0].hour(hourStart).minute(minuteStart)),
  //         end: dayjs.utc(range[1].hour(hourEnd).minute(minuteEnd)),
  //       });
  //       setShowBookButton(true);
  //     }
  //   }
  // };

  // Add a clear selection handler
  const handleClearSelection = () => {
    setSelectedRange([null, null]);
    setShowBookButton(false);
    setSelectedTimes({ start: null, end: null });
    setBookedDates({ start: null, end: null });
  };

  useEffect(() => {
    // функция которая возвращает 4 массива дат для удобного рендеринга клиентского календаря
    const { unavailable, confirmed, startEnd, transformedStartEndOverlap } =
      extractArraysOfStartEndConfPending(orders);
    // задаем єти 4 массива в стейт
    setStartEndOverlapDates(transformedStartEndOverlap);
    setUnavailableDates(unavailable);
    setConfirmedDates(confirmed);
    setStartEndDates(startEnd);

  }, [orders, carId]);

  // ДОБАВИТЬ ЭТОТ useEffect ЗДЕСЬ:
  useEffect(() => {
    //console.log("Текущий месяц:", currentDate.format("MMMM YYYY"));

    if (onCurrentDateChange) {
      onCurrentDateChange(currentDate);
    }
    // Сброс накопленных логов при смене текущего месяца
    loggedCellsRef.current.clear();
  }, [currentDate, onCurrentDateChange]);

  // Также сбрасываем накопленные логи при изменении источников дат
  useEffect(() => {
    loggedCellsRef.current.clear();
  }, [confirmedDates, unavailableDates, startEndDates, startEndOverlapDates]);

  const renderDateCell = (date) => {
    // выбранные даты
    const [start, end] = selectedRange;
    const isSelected =
      (date >= start && date <= end) ||
      date.isSame(start, "day") ||
      date.isSame(end, "day");
    // текущая дата вокруг которой будет рендер и которая будет сравниваться
    const dateStr = date.format("YYYY-MM-DD");

    const isDisabled = disabledDate(date);

    // If the date is disabled, return it with no styles (transparent background)
    if (isDisabled) {
      return (
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {date.date()}
        </Box>
      );
    }

    // проверяем подтвержденная ли єто дата
    const isConfirmed = confirmedDates?.includes(dateStr);
    // проверяем ожидающая ли єто дата (еще не подтвердженная)
    const isUnavailable = unavailableDates?.includes(dateStr);
    // проверяем начальная или конечная ли єто дата
    const startEndInfo = startEndDates.find((d) => d.date === dateStr);
    // проверяем начальная ли єто дата
    const isStartDate = startEndInfo?.type === "start";
    // проверяем конечная ли єто дата
    const isEndDate = startEndInfo?.type === "end";

    // проверяем чтобы эта дата не была одновременно начальной и конечной для разных броинрований
    const isStartAndEndDateOverlapInfo = startEndOverlapDates?.find(
      (dateObj) => dateObj.date === dateStr
    );
    // если предыдущая функция нашла что-то, то эта вернет тру, и если нет таких дат, которые начальные и конечные тогда это будет фолс
    const isStartAndEndDateOverlap = Boolean(isStartAndEndDateOverlapInfo);

    // тест в консоли для конкретной машины
    // if (carId === "670bb226223dd911f0595287" && isStartAndEndDateOverlap) {
    //   console.log("isStartAndEndDateOverlapInfo", isStartAndEndDateOverlapInfo);
    // }

    // ДАЛЬШЕ КОД ВНЕДРЯЕТ СТИЛИ для каждого типа

    const getTooltipMessage = () => {
      if (isConfirmed) return t("order.unavailableDate");
      if (isUnavailable) return t("order.not100Date");
      if (isStartDate && startEndInfo.type == "confirmed")
        return `Car needs to be returned after ${startEndInfo.time} `;
      if (isEndDate && startEndInfo.type == "confirmed")
        return `Car is availabe after ${startEndInfo.time} `;
      return null;
    };

    const tooltipMessage = getTooltipMessage();

    // здесь задаем базовые значения для - бекграунд цвета ячейки, цвета таекста, рамки, радиуса рамки
    // Rest of your existing conditions
    let backgroundColor = "transparent";
    let color = "inherit";
    let border = "1px solid grey";
    let borderRadius;

    // Общие стили
    const baseStyles = {
      height: "100%",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    //если мы тыкаем в ячейку то все предыдущие стили переписываются
    // If selected, these styles will override everything else
    if (isSelected) {
      return (
        <Box
          sx={{
            ...baseStyles,
            backgroundColor: "secondary.main", // Бирюзовый из темы
            color: "#ffffff",
            borderRadius: "4px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(0, 137, 137, 0.4)",
          }}
        >
          {date.date()}
        </Box>
      );
    }

    if (
      isConfirmed ||
      isStartAndEndDateOverlapInfo?.endConfirmed ||
      isStartAndEndDateOverlapInfo?.startConfirmed
    ) {
      backgroundColor = "primary.main";
      color = "common.white";
    } else if (
      isUnavailable ||
      isStartAndEndDateOverlapInfo?.endPending ||
      isStartAndEndDateOverlapInfo?.startPending
    ) {
      backgroundColor = "neutral.gray200"; // Ожидающие заказы - очень светло-серый
      color = "text.primary";
    }

    if (isConfirmed || isUnavailable) {
      return (
        <Tooltip title={tooltipMessage || ""} placement="top" arrow>
          <Box
            sx={{
              ...baseStyles,
              backgroundColor,
              borderRadius: "1px",
              color,
              border,
            }}
          >
            {date.date()}
          </Box>
        </Tooltip>
      );
    }

    if (isStartDate && !isEndDate && !isStartAndEndDateOverlap) {
      return (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            cursor: "pointer",
            border,
          }}
        >
          <Box
            sx={{
              width: "50%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {date.date()}
          </Box>

          <Tooltip title={tooltipMessage || ""} placement="top" arrow>
            <Box
              sx={{
                width: "50%",
                height: "100%",
                borderRadius: "50% 0 0 50%",
                backgroundColor: startEndInfo.confirmed
                  ? "primary.main"
                  : "neutral.gray200", // Ожидающие заказы - очень светло-серый
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: startEndInfo.confirmed ? "common.white" : "common.black",
              }}
            >
              {date.date()}
            </Box>
          </Tooltip>
        </Box>
      );
    }

    if (!isStartDate && isEndDate && !isStartAndEndDateOverlap) {
      return (
        <Box
          sx={{
            border,
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Tooltip title={tooltipMessage || ""} placement="top" arrow>
            <Box
              sx={{
                width: "50%",
                height: "100%",
                borderRadius: "0 50% 50% 0",
                backgroundColor: startEndInfo.confirmed
                  ? "primary.main"
                  : "neutral.gray200", // Ожидающие заказы - очень светло-серый
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: startEndInfo.confirmed ? "common.white" : "common.black",
              }}
            >
              {date.date()}
            </Box>
          </Tooltip>
          <Box
            sx={{
              width: "50%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {date.date()}
          </Box>
        </Box>
      );
    }

    // For overlapping start/end dates
    if (isStartAndEndDateOverlap) {
      return (
        <Box
          sx={{
            border: border,
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            cursor: "pointer",
          }}
        >
          {/* End Date Box - Left half */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              backgroundColor: isStartAndEndDateOverlapInfo.endConfirmed
                ? "primary.main"
                : "neutral.gray200", // Ожидающие заказы - очень светло-серый
              borderRadius: "0 50% 50% 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isStartAndEndDateOverlapInfo.endConfirmed
                ? "common.white"
                : "common.white",
            }}
          >
            {date.date()}
          </Box>

          {/* Start Date Box - Right half */}
          <Box
            sx={{
              width: "50%",
              height: "100%",
              backgroundColor: isStartAndEndDateOverlapInfo.startConfirmed
                ? "primary.main"
                : "neutral.gray200", // Ожидающие заказы - очень светло-серый
              borderRadius: "0 50% 50% 0",
              borderRadius: "50% 0 0 50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isStartAndEndDateOverlapInfo.startConfirmed
                ? "common.white"
                : "common.white",
            }}
          >
            {date.date()}
          </Box>
        </Box>
      );
    }
    //если ничего из меречисленного не работает то рендерить прозрачно
    //const { t } = useTranslation();
    return (
      <Box
        sx={{
          ...baseStyles,
          backgroundColor,
          borderRadius,
          color,
          border,
        }}
      >
        {date.date()}
      </Box>
    );
  };

  const handleBooking = () => {
    // Открываем модальное окно немедленно (приоритетное обновление)
    onBookingComplete();
    // Скрываем кнопку через CSS display: none (неблокирующее обновление)
    // Используем startTransition для того, чтобы скрытие кнопки не блокировало открытие модального окна
    startTransition(() => {
    setShowBookButton(false);
    });
  };

  const onSelect = (date) => {
    // --- ДОБАВЛЕНЫ ПРОВЕРКИ ДЛЯ ЗАПРЕТА КЛИКА ПО ПОДТВЕРЖДЁННЫМ ДАТАМ ---
    const dateStr = date.format("YYYY-MM-DD");
    const isConfirmed = confirmedDates?.includes(dateStr);
    const [start, end] = selectedRange;
    // 1. Если дата подтверждённая — просто выйти
    // 1. Если дата подтверждённая — показать снэк и выйти
    if (isConfirmed) {
      // if (onDateChange) {
      //   onDateChange({ type: "error", message: t("order.unavailableDate") });
      // }
      return;
    }
    // 2. Первый клик: если дата — начало подтверждённого заказа
    // 1.1. Первый клик: если дата одновременно confirmed start и confirmed end
    if (
      (!start || (start && end)) &&
      startEndDates.some(
        (d) => d.date === dateStr && d.type === "start" && d.confirmed
      ) &&
      startEndDates.some(
        (d) => d.date === dateStr && d.type === "end" && d.confirmed
      )
    ) {
      // if (onDateChange) {
      //   onDateChange({ type: "error", message: t("order.unavailableDate") });
      // }
      return;
    }
    if (
      (!start || (start && end)) &&
      startEndDates.some(
        (d) => d.date === dateStr && d.type === "start" && d.confirmed
      )
    ) {
      // if (onDateChange) {
      //   onDateChange({ type: "error", message: t("order.unavailableDate") });
      // }
      return;
    }
    // 3. Второй клик: если дата — конец подтверждённого заказа
    if (
      start &&
      !end &&
      startEndDates.some(
        (d) => d.date === dateStr && d.type === "end" && d.confirmed
      )
    ) {
      // if (onDateChange) {
      //   onDateChange({ type: "error", message: t("order.unavailableDate") });
      // }
      return;
    }
    // 4. Второй клик: если в диапазоне есть подтверждённые даты
    // 2. Второй клик: если в выбранном диапазоне есть подтверждённые даты
    if (start && !end && date.isAfter(start, "day")) {
      // Собираем все даты между start и date (включительно)
      const rangeDates = [];
      let cur = start.clone();
      while (cur.isSameOrBefore(date, "day")) {
        rangeDates.push(cur.format("YYYY-MM-DD"));
        cur = cur.add(1, "day");
      }
      const hasConfirmedInRange = rangeDates.some((d) =>
        confirmedDates.includes(d)
      );
      if (hasConfirmedInRange) {
        // if (onDateChange) {
        //   onDateChange({ type: "error", message: t("order.unavailableDates") });
        // }
        setSelectedRange([null, null]); // сбросить выбор
        setShowBookButton(false);
        return;
      }
    }
    // if (start && !end && date.isAfter(start, "day")) {
    //   // Собираем все даты между start и date (включительно)
    //   const rangeDates = [];
    //   let cur = start.clone();
    //   while (cur.isSameOrBefore(date, "day")) {
    //     rangeDates.push(cur.format("YYYY-MM-DD"));
    //     cur = cur.add(1, "day");
    //   }
    //   const hasConfirmedInRange = rangeDates.some((d) =>
    //     confirmedDates.includes(d)
    //   );
    //   if (hasConfirmedInRange) {
    //     // Можно заменить на ваш snackbar
    //     if (onDateChange) {
    //       onDateChange({
    //         type: "error",
    //         message: "В выбранном диапазоне есть занятые даты!",
    //       });
    //     }
    //     // if (typeof window !== "undefined") {
    //     //   window.alert && window.alert("В выбранном диапазоне есть занятые даты!");
    //     // }
    //     return;
    //   }
    // }
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // Reset click count if it's been too long since the last click
    if (timeSinceLastClick > 300) {
      clickCountRef.current = 0;
    }

    clickCountRef.current += 1;
    lastClickTimeRef.current = now;

    // Handle double click
    if (clickCountRef.current === 2 && timeSinceLastClick < 300) {
      handleClearSelection();
      clickCountRef.current = 0;
      return;
    }

    if (!date.isSame(currentDate, "month")) {
      setCurrentDate(date.startOf("month"));
    }

    if (!start || (start && end)) {
      // First click or resetting the range
      setSelectedRange([date, null]);
      setShowBookButton(false);
      // После первого клика или любого сброса диапазона показать снэк
      // if (onDateChange) {
      //   onDateChange({ type: "info", message: t("order.enterEndDate") });
      // }
    } else {
      if (date.isBefore(start)) {
        // If the second date is before the first, make it the new start
        setSelectedRange([date, null]);
        setShowBookButton(false);
        // if (onDateChange) {
        //   onDateChange({ type: "info", message: t("order.enterEndDate") });
        // }
      } else if (date.isSame(start, "day")) {
        // Повторный клик по дате начала: отменяем выбор и ждём новый первый клик
        setSelectedRange([null, null]);
        setShowBookButton(false);
        setSelectedTimes({ start: null, end: null });
        setBookedDates({ start: null, end: null });
        // if (onDateChange) {
        //   onDateChange({ type: "info", message: t("order.chooseStartDate") });
        // }
      } else {
        // Regular behavior: set range with start and end dates
        const range = [start, date];
        const startStr = range[0];
        const endStr = range[1];
        setSelectedRange(range);

        const {
          availableStart,
          availableEnd,
          hourStart,
          minuteStart,
          hourEnd,
          minuteEnd,
        } = calculateAvailableTimes(startEndDates, startStr, endStr);

        // отдельно время забора и отдачи хранится в стринге "hh:mm"
        setSelectedTimes({
          start: availableStart,
          end: availableEnd,
        });
        setBookedDates({
          // FIX: убран преждевременный перевод в UTC, храним локальные (Europe/Athens) даты
          start: range[0].hour(hourStart).minute(minuteStart),
          end: range[1].hour(hourEnd).minute(minuteEnd),
        });
        setShowBookButton(true);
      }
    }
  };

  const disabledDate = (current) => {
    const dateStr = current.format("YYYY-MM-DD");

    // Проверяем, является ли дата началом или концом существующего бронирования
    const isStartOrEnd = startEndDates.some((d) => d.date === dateStr);
    const isConfirmed = confirmedDates?.includes(dateStr);
    // Проверяем, есть ли пересечения бронирований
    // const hasOverlappingBookings =
    //   orders.filter((order) => {
    //     const start = dayjs(order.rentalStartDate);
    //     const end = dayjs(order.rentalEndDate);
    //     return current.isBetween(start, end, "day", "[]");
    //   }).length > 1;
    return current.isBefore(dayjs().startOf("day"));
  };

  const headerRender = ({ value }) => {
    const current = value.clone();
    // Получаем текущий язык из i18n
    const currentLang = i18n.language || "en";
    // Локализуем название месяца и делаем первую букву заглавной
    let month = current.locale(currentLang).format("MMMM");
    month = month.charAt(0).toUpperCase() + month.slice(1);
    const year = current.year();

    // const goToNextMonth = () => {
    //   setCurrentDate((prev) => prev.add(1, "month"));
    // };

    // const goToPreviousMonth = () => {
    //   setCurrentDate((prev) => prev.subtract(1, "month"));
    // };
    // В headerRender обновите функции навигации:
    const goToNextMonth = () => {
      setCurrentDate((prev) => prev.add(1, "month"));
    };

    const goToPreviousMonth = () => {
      setCurrentDate((prev) => prev.subtract(1, "month"));
    };

    return (
      <Box
        sx={{
          padding: 1,
          display: "flex",
          color: "common.black",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <IconButton onClick={goToPreviousMonth} color="inherit">
          <ArrowBackIosNewIcon />
        </IconButton>
        <Typography variant="h6" sx={{ margin: 0 }}>
          {`${month} ${year}`}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {selectedRange[0] && (
            <IconButton
              onClick={handleClearSelection}
              color="inherit"
              size="small"
              sx={{
                backgroundColor: "rgba(0,0,0,0.05)",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.1)" },
              }}
            >
              <ClearIcon />
            </IconButton>
          )}
          <IconButton onClick={goToNextMonth} color="inherit">
            <ArrowForwardIosIcon />
          </IconButton>
        </Box>
        {/* <IconButton onClick={goToNextMonth} color="inherit">
          <ArrowForwardIosIcon />
        </IconButton> */}
      </Box>
    );
  };

  // Проверяем, действует ли скидка в текущем месяце
  let showDiscountInfo = false;
  let discountText = "";
  if (
    discount > 0 &&
    discountStart &&
    discountEnd &&
    dayjs(currentDate)
      .endOf("month")
      .isSameOrAfter(dayjs(discountStart), "day") &&
    dayjs(currentDate)
      .startOf("month")
      .isSameOrBefore(dayjs(discountEnd), "day")
  ) {
    showDiscountInfo = true;
    //   discountText = `Скидка ${discount}% с ${dayjs(discountStart).format(
    //     "DD.MM.YYYY"
    //   )} по ${dayjs(discountEnd).format("DD.MM.YYYY")}`;
    // }

    discountText =
      t("order.discount") +
      ` ${discount}% ` +
      t("basic.from") +
      `${dayjs(discountStart).format("DD.MM")} ` +
      t("basic.to") +
      `${dayjs(discountEnd).format("DD.MM")} `;
  }
  // compute header spacing depending on device
  const headerSx = {
    lineHeight: "1.3rem",
    letterSpacing: "0.1rem",
    textTransform: "uppercase",
    marginBottom: showDiscountInfo
      ? isSmallLandscape
        ? "6px"
        : "8px"
      : isSmallLandscape
      ? "12px"
      : "20px",
    marginTop: isSmallLandscape ? "4px" : undefined,
    color: "primary.main",
  };

  return (
    <Box
      sx={{
        width: "100%",
        p: { xs: "10px 10px 10px 10px", sm: "10px 10px 10px 10px" },
      }}
    >
      {" "}
      {/* Уменьшили верхний padding */}
      <Typography variant="h6" sx={headerSx}>
        {t("order.chooseDates")}
      </Typography>
      {/* {showDiscountInfo && (
        <Typography
          variant="body2"
          sx={{ color: "error.main", fontWeight: 600, mb: 2 }}
        >
          {discountText}
        </Typography>
      )} */}
      {/* Убран CircularProgress для isLoading:
          - isLoading = background refresh заказов из Context
          - Не должен блокировать UI — календарь остаётся функциональным
          - Данные обновятся автоматически после refresh */}
            <Box
              sx={{
          display: showBookButton ? "flex" : "none",
                justifyContent: "center",
                mb: 2,
                mt: 1,
              }}
            >
              <GradientBookButton
                ref={bookButtonRef}
                onClick={handleBooking}
                sx={{
                  fontSize: "1.2rem",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    whiteSpace: "pre-line",
                  }}
                >
                  <Box component="span">
                    {`${t("order.bookShort")}\n${selectedRange[0]
                      ?.locale(i18n.language)
                      .format("DD MMM")
                      .replace(/\./g, "")} - ${selectedRange[1]
                      ?.locale(i18n.language)
                      .format("DD MMM")
                      .replace(/\./g, "")}`}
                  </Box>
                  {calcLoading ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        gap: 0.3,
                        alignItems: "center",
                        "& span": {
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          display: "inline-block",
                          animation: "dotPulse 1.4s ease-in-out infinite",
                          "&:nth-of-type(1)": {
                            animationDelay: "0s",
                          },
                          "&:nth-of-type(2)": {
                            animationDelay: "0.2s",
                          },
                          "&:nth-of-type(3)": {
                            animationDelay: "0.4s",
                          },
                          "@keyframes dotPulse": {
                            "0%, 60%, 100%": {
                              opacity: 0.3,
                              transform: "scale(0.8)",
                            },
                            "30%": {
                              opacity: 1,
                              transform: "scale(1.2)",
                            },
                          },
                        },
                      }}
                    >
                      <Box component="span" />
                      <Box component="span" />
                      <Box component="span" />
                    </Box>
                  ) : totalPrice > 0 ? (
                    <Box component="span">{`${totalPrice}€`}</Box>
                  ) : null}
                </Box>
              </GradientBookButton>
            </Box>

          <Calendar
            fullscreen={false}
            onSelect={onSelect}
            fullCellRender={renderDateCell}
            headerRender={headerRender}
            value={currentDate}
            disabledDate={disabledDate}
          />
    </Box>
  );
};

export default CalendarPicker;
