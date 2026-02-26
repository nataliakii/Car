"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  TableContainer,
  Select,
  MenuItem,
  Modal,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ActionButton,
  CancelButton,
  ConfirmModal,
  OrdersByDateModal,
  ModalLayout,
  CalendarNavButton,
  CalendarFirstColumn,
  CalendarDayCell,
} from "../ui";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);
dayjs.extend(timezone);

import { useMainContext } from "@app/Context";
import { formatDate, isPast } from "@utils/businessTime";
import CarTableRow from "./CalendarRow";
import {
  extractArraysOfStartEndConfPending,
  returnOverlapOrdersObjects,
} from "@utils/functions";
import EditOrderModal from "@/app/admin/features/orders/modals/EditOrderModal";
import AddOrderModal from "@/app/admin/features/orders/modals/AddOrderModal";
import { useSnackbar } from "notistack";
import { changeRentalDates } from "@utils/action";
import EditCarModal from "@/app/admin/features/cars/modals/EditCarModal";
import LegendCalendarAdmin from "./LegendCalendarAdmin";
import { calendarStyles } from "@/theme";
import {
  useCalendarDays,
  useMobileCalendarScroll,
  useCalendarMoveMode,
} from "@/app/admin/features/calendar/hooks";
import { useFirstColumnWidth } from "@/hooks/useFirstColumnWidth";

// ============================================
// BigCalendarLayout — визуальный каркас (без state/effects)
// ============================================
function BigCalendarLayout({
  showLegend,
  borderStyle,
  calendarRef,
  children,
  firstColumnWidth,
}) {
  return (
    <Box
      ref={calendarRef}
      className="bigcalendar-root" // Оставляем для media queries в globals.css
      sx={{
        ...calendarStyles.root,
        ...(firstColumnWidth && {
          "--resource-col-width": `${firstColumnWidth}px`,
        }),
      }}
    >
      {/* Легенда календаря */}
      {showLegend && (
        <Box sx={calendarStyles.legend}>
          <LegendCalendarAdmin />
        </Box>
      )}

      {/* TableContainer */}
      <TableContainer
        sx={{
          ...calendarStyles.tableContainer,
          border: borderStyle,
        }}
      >
        {children}
      </TableContainer>
    </Box>
  );
}

// ============================================
// BigCalendarHeader — UI-компонент шапки таблицы
// ============================================
function BigCalendarHeader({
  days,
  month,
  year,
  todayIndex,
  viewMode,
  rangeDirection,
  monthNames,
  weekday2,
  currentLang,
  isPortraitPhone,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
  onDayClick,
  headerStyles,
  calendarRef,
}) {
  return (
    <TableHead>
      <TableRow>
        {/* Первая ячейка — выбор года/месяца */}
        <TableCell
          sx={{
            ...calendarStyles.headerFirstCell,
            backgroundColor: headerStyles.baseBg,
            // Use CSS variable for width to match body first column
            width: "var(--resource-col-width, auto)",
            minWidth: "var(--resource-col-width, auto)",
            maxWidth: "var(--resource-col-width, auto)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              height: "100%",
              pb: 0.9,
            }}
          >
            {/* Верхняя строка: год */}
            <Box sx={calendarStyles.yearRow}>
              <Select
                className="bigcalendar-year-select" // Для globals.css
                value={year}
                onChange={onYearChange}
                size="small"
                sx={calendarStyles.yearSelect}
                renderValue={() => {
                  if (viewMode === "range15") {
                    const start =
                      rangeDirection === "forward"
                        ? dayjs().year(year).month(month).date(15)
                        : dayjs()
                            .year(year)
                            .month(month)
                            .subtract(1, "month")
                            .date(15);
                    const end =
                      rangeDirection === "forward"
                        ? start.add(1, "month").date(15)
                        : dayjs().year(year).month(month).date(15);
                    const y1 = start.year();
                    const y2 = end.year();
                    return y1 === y2 ? `${y1}` : `${y1}-${y2}`;
                  }
                  return `${year}`;
                }}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <MenuItem
                    key={index}
                    value={year - 2 + index}
                    sx={{ fontSize: 13, py: 0.2 }}
                  >
                    {year - 2 + index}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Нижняя строка: стрелки + месяц */}
            <Box
              sx={{
                ...calendarStyles.monthRow,
                width: "100%",
                display: "grid",
                gridTemplateColumns:
                  "minmax(24px, 10%) minmax(0, 80%) minmax(24px, 10%)",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarNavButton
                  direction="prev"
                  onClick={onPrevMonth}
                  color={headerStyles.weekdayText}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Select
                  className="bigcalendar-month-select" // ??? globals.css
                  value={month}
                  onChange={onMonthChange}
                  size="small"
                  sx={{
                    ...calendarStyles.monthSelect,
                    width: "100%",
                    minWidth: 0,
                    "& .MuiSelect-select": {
                      ...(calendarStyles.monthSelect["& .MuiSelect-select"] ||
                        {}),
                      textAlign: "center",
                    },
                  }}
                  renderValue={() => {
                    const months = monthNames[currentLang] || monthNames.en;
                    const abbr = (name) =>
                      isPortraitPhone && viewMode === "range15"
                        ? name.slice(0, 3)
                        : name;
                    if (viewMode === "range15") {
                      if (rangeDirection === "forward") {
                        const currentLabel = months[month];
                        const nextLabel = months[(month + 1) % 12];
                        return `${abbr(currentLabel)}-${abbr(nextLabel)}`;
                      } else {
                        const prevLabel = months[(month + 11) % 12];
                        const currentLabel = months[month];
                        return `${abbr(prevLabel)}-${abbr(currentLabel)}`;
                      }
                    }
                    return months[month];
                  }}
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <MenuItem
                      key={index}
                      value={index}
                      sx={{ fontSize: 13, py: 0.2 }}
                    >
                      {(monthNames[currentLang] || monthNames.en)[index]}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarNavButton
                  direction="next"
                  onClick={onNextMonth}
                  color={headerStyles.weekdayText}
                />
              </Box>
            </Box>
          </Box>
        </TableCell>

        {/* Ячейки дней */}
        {days.map((day, idx) => (
          <CalendarDayCell
            key={day.dayjs.valueOf()}
            colIndex={idx}
            isToday={idx === todayIndex}
            backgroundColor={
              idx === todayIndex ? headerStyles.todayBg : headerStyles.baseBg
            }
            onClick={() => onDayClick(day)}
            onMouseEnter={() =>
              calendarRef?.current?.setAttribute("data-hover-col", idx)
            }
            onMouseLeave={() =>
              calendarRef?.current?.removeAttribute("data-hover-col")
            }
            title="Нажмите для просмотра всех начинающихся и заканчивающихся заказов на эту дату"
          >
            <div
              style={{
                color: day.isSunday ? headerStyles.sundayText : "inherit",
              }}
            >
              {day.date}
            </div>
            <div
              style={{
                color: day.isSunday ? headerStyles.sundayText : "inherit",
              }}
            >
              {(weekday2[currentLang] || weekday2.en)[day.dayjs.day()]}
            </div>
          </CalendarDayCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// ============================================
// BigCalendar — основной компонент
// ============================================
export default function BigCalendar({ cars, showLegend = true }) {
  // ─────────────────────────────────────────
  // 🔍 DEV INSTRUMENTATION (removed in production build)
  // ─────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    // Track render count to detect render storms
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    // Log every 10th render to avoid spam
    if (renderCountRef.current % 10 === 0) {
      console.log(`[BigCalendar] Render count: ${renderCountRef.current}`);
    }
  }

  // ─────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────
  const calendarRef = useRef(null);
  // 🔧 PERF FIX: Track timeout to prevent memory leak if component unmounts
  const addOrderTimeoutRef = useRef(null);

  // ─────────────────────────────────────────
  // Тема и цвета
  // ─────────────────────────────────────────
  const theme = useTheme();

  // Централизованные стили для header
  const calendarHeaderStyles = useMemo(() => {
    const calendarColors = theme.palette.calendar || {};
    return {
      baseBg: "background.default" || "#121212",
      todayBg: calendarColors.today || "calendar.today",
      sundayText: calendarColors.sunday || theme.palette.primary.main,
      weekdayText: "text.primary",
      border: calendarColors.border || theme.palette.divider,
    };
  }, [
    theme.palette.primary.main,
    theme.palette.divider,
    theme.palette.calendar,
  ]);

  // i18n для динамического перевода месяцев и дней недели
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  // Названия месяцев (полные) по языкам проекта
  const monthNames = useMemo(
    () => ({
      en: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      ru: [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
      ],
      el: [
        "Ιανουάριος",
        "Φεβρουάριος",
        "Μάρτιος",
        "Απρίλιος",
        "Μάιος",
        "Ιούνιος",
        "Ιούλιος",
        "Αύγουστος",
        "Σεπτέμβριος",
        "Οκτώβριος",
        "Νοέμβριος",
        "Δεκέμβριος",
      ],
    }),
    []
  );

  // Двухсимвольные сокращения дней недели (индекс 0 = Sunday) по языкам
  const weekday2 = useMemo(
    () => ({
      en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
      el: ["Κυ", "Δε", "Τρ", "Τε", "Πέ", "Πα", "Σά"],
    }),
    []
  );
  // ─────────────────────────────────────────
  // Notifications (snackbar)
  // ─────────────────────────────────────────
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const snackKeyRef = useRef(0);
  const showSingleSnackbar = (message, options = {}) => {
    snackKeyRef.current += 1;
    enqueueSnackbar(message, { key: snackKeyRef.current, ...options });
    if (snackKeyRef.current > 1) closeSnackbar(snackKeyRef.current - 1);
  };

  // ─────────────────────────────────────────
  // Context
  // ─────────────────────────────────────────
  const { ordersByCarId, fetchAndUpdateOrders, allOrders, updateCarInContext } =
    useMainContext();

  // =======================
  // 📅 Calendar navigation
  // =======================
  const [month, setMonth] = useState(() => {
    const savedMonth = localStorage.getItem("bigCalendar_month");
    return savedMonth !== null ? parseInt(savedMonth, 10) : dayjs().month();
  });
  const [year, setYear] = useState(() => {
    const savedYear = localStorage.getItem("bigCalendar_year");
    return savedYear !== null ? parseInt(savedYear, 10) : dayjs().year();
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bigCalendar_viewMode");
      if (saved === "range15" || saved === "full") return saved;
    }
    return "full";
  }); // 'full' | 'range15'
  const [rangeDirection, setRangeDirection] = useState("forward"); // 'forward' | 'backward'
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);

  // =======================
  // 📦 Orders & selection
  // =======================
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [startEndDates, setStartEndDates] = useState([]);
  const [isConflictOrder, setIsConflictOrder] = useState(false);
  const [headerOrdersModal, setHeaderOrdersModal] = useState({
    open: false,
    date: null,
    orders: [],
  });
  const [forceUpdateKey, setForceUpdateKey] = useState(0);

  // =======================
  // 🚚 Move order mode (via hook)
  // =======================
  const moveModeHook = useCalendarMoveMode({
    cars,
    ordersByCarId,
    fetchAndUpdateOrders,
    showSingleSnackbar,
  });

  // =======================
  // 🧩 UI modals
  // =======================
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedCarForAdd, setSelectedCarForAdd] = useState(null);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState(null);
  const [selectedCarForEdit, setSelectedCarForEdit] = useState(null);
  const [isEditCarOpen, setIsEditCarOpen] = useState(false);

  // =======================
  // 💾 Persistence (localStorage)
  // =======================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(
      "(max-width: 600px) and (orientation: portrait)"
    );
    const handler = () => setIsPortraitPhone(mq.matches);
    handler();
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("bigCalendar_month", month.toString());
  }, [month]);

  useEffect(() => {
    localStorage.setItem("bigCalendar_year", year.toString());
  }, [year]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bigCalendar_viewMode", viewMode);
      } catch (e) {}
    }
  }, [viewMode]);

  // 🔧 PERF FIX: Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (addOrderTimeoutRef.current) {
        clearTimeout(addOrderTimeoutRef.current);
      }
    };
  }, []);

  // Дни календаря и индекс текущего дня
  const { days, todayIndex } = useCalendarDays({
    month,
    year,
    viewMode,
    rangeDirection,
  });

  // Автоматический скролл к текущему дню на мобильных устройствах
  useMobileCalendarScroll({ days, todayIndex });

  // =======================
  // 🎮 Navigation handlers
  // =======================
  const handleSelectMonth = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    setViewMode("full");
  };

  const handleSelectYear = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    setViewMode("full");
  };

  const handlePrevMonth = () => {
    if (viewMode === "full") {
      setRangeDirection("backward");
      setViewMode("range15");
    } else {
      setViewMode("full");
      const base = dayjs().year(year).month(month).subtract(1, "month");
      setMonth(base.month());
      setYear(base.year());
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "full") {
      setRangeDirection("forward");
      setViewMode("range15");
    } else {
      setViewMode("full");
      const base = dayjs().year(year).month(month).add(1, "month");
      setMonth(base.month());
      setYear(base.year());
    }
  };

  // =======================
  // 🚚 Move mode handlers (from hook)
  // =======================
  const {
    moveMode,
    selectedMoveOrder,
    orderToMove,
    confirmModal,
    selectedOrderDates,
    isCarCompatibleForMove,
    handleLongPress,
    handleCarSelectForMove,
    exitMoveMode,
    handleConfirmMove,
    handleCloseConfirmModal,
  } = moveModeHook;

  // =======================
  // 📦 Orders handlers
  // =======================
  const ordersByCarIdWithAllorders = useCallback((carId, orders) => {
    return orders?.filter((order) => order.car === carId);
  }, []);

  const handleSaveOrder = async (updatedOrder) => {
    setSelectedOrders((prevSelectedOrders) =>
      prevSelectedOrders.map((order) =>
        order._id === updatedOrder._id ? updatedOrder : order
      )
    );
    await fetchAndUpdateOrders();
  };

  // =======================
  // 🚗 Car handlers
  // =======================
  const handleEditCar = (car) => {
    setSelectedCarForEdit(car);
    setIsEditCarOpen(true);
  };

  // =======================
  // 📊 Derived state (orders)
  // =======================
  useEffect(() => {
    const { startEnd } = extractArraysOfStartEndConfPending(allOrders);
    setStartEndDates(startEnd);
  }, [allOrders]);

  // 🔧 PERF FIX: Memoize derived array to prevent recalculation on every render
  // Previously computed on every render, causing O(n) operations each time
  const filteredStartEndDates = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.map((order) => ({
      startStr: order.startDateISO || order.start,
      endStr: order.endDateISO || order.end,
      orderId: order._id,
    }));
  }, [allOrders]);

  const sortedCars = useMemo(() => {
    return [...cars].sort((a, b) => a.model.localeCompare(b.model));
  }, [cars]);

  // Calculate first column width based on longest vehicle name
  // Uses computed styles from actual DOM for accurate measurement
  const { width: firstColumnWidth, setMeasurementRef } = useFirstColumnWidth(
    cars,
    {
      minWidth: 160,
      maxWidth: 400,
      debounceMs: 150,
    }
  );

  const handleAddOrderClick = (car, dateStr) => {
    // Если в режиме перемещения - не открываем AddOrderModal
    if (moveMode) return;

    setSelectedCarForAdd(car);
    setSelectedDateForAdd(dateStr);
    setIsAddOrderOpen(true);
  };

  // 🔧 PERF FIX: Memoize handler to prevent re-creating function on every render
  // Inline functions in props cause unnecessary re-renders of child components
  const handleDayClick = useCallback(
    (day) => {
      setHeaderOrdersModal({
        open: true,
        date: day.dayjs,
        orders: allOrders,
      });
    },
    [allOrders]
  );

  // 🔧 PERF FIX: Memoize selectedDate to prevent dayjs re-parsing every render
  const selectedDate = useMemo(() => {
    return headerOrdersModal.date
      ? dayjs(headerOrdersModal.date).format("YYYY-MM-DD")
      : null;
  }, [headerOrdersModal.date]);

  // 🔧 PERF FIX: Memoize filtered orders - previously running formatDate (dayjs)
  // on every order for every render, even when modal was closed
  const startedOrders = useMemo(() => {
    if (!selectedDate || !headerOrdersModal.orders) return [];
    return headerOrdersModal.orders.filter((order) => {
      // Используем бизнес-таймзону для корректного сравнения
      const start = formatDate(order.rentalStartDate, "YYYY-MM-DD");
      return start === selectedDate;
    });
  }, [headerOrdersModal.orders, selectedDate]);

  const endedOrders = useMemo(() => {
    if (!selectedDate || !headerOrdersModal.orders) return [];
    return headerOrdersModal.orders.filter((order) => {
      const end = formatDate(order.rentalEndDate, "YYYY-MM-DD");
      return end === selectedDate;
    });
  }, [headerOrdersModal.orders, selectedDate]);

  const getRegNumberByCarNumber = (carNumber) => {
    const car = cars.find((c) => c.carNumber === carNumber);
    return car ? car.regNumber : carNumber;
  };

  const updateOrder = async (orderData) => {
    try {
      const result = await changeRentalDates(
        orderData._id,
        new Date(orderData.rentalStartDate),
        new Date(orderData.rentalEndDate),
        new Date(orderData.timeIn || orderData.rentalStartDate),
        new Date(orderData.timeOut || orderData.rentalEndDate),
        orderData.placeIn || "",
        orderData.placeOut || "",
        orderData.car,
        orderData.carNumber
      );

      if (result?.status === 201 || result?.status === 202) {
        console.log("✅ Заказ успешно обновлён:", result.updatedOrder);
      } else if (result?.status === 408) {
        console.warn("⚠️ Конфликт по времени:", result.conflicts);
        alert(
          "Конфликт по времени аренды:\n" +
            JSON.stringify(result.conflicts, null, 2)
        );
      } else {
        console.error("❌ Ошибка при обновлении заказа", result);
        alert("Не удалось обновить заказ");
      }
    } catch (error) {
      console.error("🔥 Ошибка в updateOrder:", error);
      alert("Произошла ошибка при обновлении заказа");
    }
  };

  return (
    <>
      <BigCalendarLayout
        showLegend={showLegend}
        borderStyle={`1px solid ${calendarHeaderStyles.border}`}
        calendarRef={calendarRef}
        firstColumnWidth={firstColumnWidth}
      >
        {/* Table с sticky header */}
        <Table
          stickyHeader
          sx={{ width: "auto", minWidth: { xs: 700, sm: 0 } }}
        >
          {/* Шапка таблицы — вынесена в отдельный компонент */}
          <BigCalendarHeader
            days={days}
            month={month}
            year={year}
            todayIndex={todayIndex}
            viewMode={viewMode}
            rangeDirection={rangeDirection}
            monthNames={monthNames}
            weekday2={weekday2}
            currentLang={currentLang}
            isPortraitPhone={isPortraitPhone}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onMonthChange={handleSelectMonth}
            onYearChange={handleSelectYear}
            onDayClick={handleDayClick}
            headerStyles={calendarHeaderStyles}
            calendarRef={calendarRef}
          />
          <TableBody>
            {sortedCars.map((car, index) => (
              <TableRow key={car._id}>
                <CalendarFirstColumn
                  ref={index === 0 ? setMeasurementRef : null}
                  onClick={() => handleEditCar(car)}
                  title="Нажмите для редактирования информации об автомобиле"
                >
                  {car.model} {car.regNumber}
                </CalendarFirstColumn>

                <CarTableRow
                  key={car._id}
                  car={car}
                  orders={ordersByCarIdWithAllorders(car._id, allOrders)}
                  days={days}
                  ordersByCarId={ordersByCarId}
                  setSelectedOrders={setSelectedOrders}
                  setOpen={setOpen}
                  onAddOrderClick={handleAddOrderClick}
                  todayIndex={todayIndex}
                  onLongPress={handleLongPress}
                  filteredStartEndDates={filteredStartEndDates}
                  moveMode={moveMode}
                  onCarSelectForMove={handleCarSelectForMove}
                  orderToMove={orderToMove}
                  selectedMoveOrder={selectedMoveOrder}
                  onExitMoveMode={exitMoveMode}
                  selectedOrderDates={selectedOrderDates}
                  isCarCompatibleForMove={isCarCompatibleForMove(car._id)}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BigCalendarLayout>

      {/* Модальные окна — вне BigCalendarLayout */}

      {/* Модальное окно редактирования заказов - открывается только при обычном клике */}
      <Modal
        open={open}
        onClose={handleClose}
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "center",
          overflowY: { xs: "auto", sm: "hidden" },
        }}
      >
        <Box
          onClick={(e) => {
            // Закрываем модал при клике на backdrop (вне контента)
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: { xs: "flex-start", sm: "center" },
            width: "100%",
            minHeight: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            p: { xs: 0.75, sm: 2 },
          }}
        >
          <Grid
            container
            spacing={selectedOrders.length > 1 ? 2 : 0}
            justifyContent="center"
            alignItems="flex-start"
            onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на контент
            sx={{
              width: "100%",
              maxWidth: { xs: "95vw", sm: "92vw", md: "1100px" },
              maxHeight: { xs: "none", sm: "100%" },
              overflowY: {
                xs: "visible",
                sm: selectedOrders.length > 1 ? "auto" : "visible",
              },
              overflowX: "hidden",
              my: { xs: 0.5, sm: 0 },
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "primary.main",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "background.paper",
              },
            }}
          >
            {/* Сортировка: сначала ранние, затем поздние */}
            {[...selectedOrders]
              .sort(
                (a, b) =>
                  dayjs(a.rentalStartDate).valueOf() -
                  dayjs(b.rentalStartDate).valueOf()
              )
              .map((order, index) => (
                <Grid
                  item
                  key={order._id}
                  xs={12}
                  sm={selectedOrders.length > 1 ? 6 : 12}
                  md={
                    selectedOrders.length === 1
                      ? 12
                      : selectedOrders.length === 2
                      ? 6
                      : selectedOrders.length === 3
                      ? 4
                      : 3
                  }
                >
                  <EditOrderModal
                    order={order}
                    open={open}
                    onClose={handleClose}
                    onSave={handleSaveOrder}
                    isConflictOrder={selectedOrders.length > 1 ? true : false}
                    setIsConflictOrder={setIsConflictOrder}
                    startEndDates={startEndDates}
                    cars={cars}
                    isViewOnly={isPast(order.rentalEndDate)}
                    ordersInBatch={selectedOrders.length}
                  />
                </Grid>
              ))}
          </Grid>
        </Box>
      </Modal>

      {/* AddOrderModal для создания нового заказа */}
      {isAddOrderOpen && selectedCarForAdd && (
        <AddOrderModal
          open={isAddOrderOpen}
          onClose={() => setIsAddOrderOpen(false)}
          car={selectedCarForAdd}
          date={selectedDateForAdd}
          setUpdateStatus={(status) => {
            if (status?.type === 200) {
              fetchAndUpdateOrders();
              setForceUpdateKey((prev) => prev + 1); // триггер перерисовки
              // 🔧 PERF FIX: Track timeout with ref to prevent memory leak
              // Автоматически закрываем модальное окно после успешного создания
              if (addOrderTimeoutRef.current) {
                clearTimeout(addOrderTimeoutRef.current);
              }
              addOrderTimeoutRef.current = setTimeout(() => {
                setIsAddOrderOpen(false);
                addOrderTimeoutRef.current = null;
              }, 1500);
            }
          }}
        />
      )}

      {/* Модальное окно для заказов по дате в шапке */}
      <OrdersByDateModal
        open={headerOrdersModal.open}
        onClose={() =>
          setHeaderOrdersModal({ ...headerOrdersModal, open: false })
        }
        date={headerOrdersModal.date}
        startedOrders={startedOrders}
        endedOrders={endedOrders}
        getRegNumberByCarNumber={getRegNumberByCarNumber}
      />

      {/* Модальное окно подтверждения перемещения */}
      <ModalLayout
        open={confirmModal.open}
        onClose={handleCloseConfirmModal}
        title="Подтверждение перемещения"
        size="small"
        centerVertically={false}
      >
        <Typography sx={{ mb: 3, color: "text.primary" }}>
          Вы хотите сдвинуть заказ с автомобиля{" "}
          <strong>{confirmModal.oldCar?.model}</strong> (
          {confirmModal.oldCar?.regNumber}) на автомобиль{" "}
          <strong>{confirmModal.newCar?.model}</strong> (
          {confirmModal.newCar?.regNumber})?
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <CancelButton onClick={handleCloseConfirmModal} label="НЕТ" />
          <ActionButton
            color="success"
            onClick={handleConfirmMove}
            label="ДА"
          />
        </Box>
      </ModalLayout>

      {isEditCarOpen && selectedCarForEdit && (
        <EditCarModal
          open={isEditCarOpen}
          onClose={() => {
            setIsEditCarOpen(false);
            setSelectedCarForEdit(null);
          }}
          updatedCar={selectedCarForEdit}
          setUpdatedCar={setSelectedCarForEdit}
          updateCarInContext={updateCarInContext}
          handleChange={(e) =>
            setSelectedCarForEdit((prev) => ({
              ...prev,
              [e.target.name]: e.target.value,
            }))
          }
          handleCheckboxChange={(e) =>
            setSelectedCarForEdit((prev) => ({
              ...prev,
              [e.target.name]: e.target.checked,
            }))
          }
          handleUpdate={async () => {
            const response = await updateCarInContext(selectedCarForEdit);
            if (response?.type === 200) {
              enqueueSnackbar("Машина обновлена", { variant: "success" });
              fetchAndUpdateOrders();
              setIsEditCarOpen(false);
            } else {
              enqueueSnackbar("Ошибка обновления", { variant: "error" });
            }
          }}
        />
      )}
    </>
  );
}
