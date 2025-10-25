"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import { useMainContext } from "@app/Context";
import CarTableRow from "./Row";
import {
  extractArraysOfStartEndConfPending,
  returnOverlapOrdersObjects,
} from "@utils/functions";
import EditOrderModal from "@app/components/Admin/Order/EditOrderModal";
import AddOrderModal from "@app/components/Admin/Order/AddOrderModal";
import { useSnackbar } from "notistack";
import { changeRentalDates } from "@utils/action";
import EditCarModal from "@app/components/Admin/Car/EditCarModal";

export default function BigCalendar({ cars }) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  // Состояние для хранения ключа последнего снэка
  const snackKeyRef = useRef(0);
  // Обёртка для enqueueSnackbar, чтобы всегда показывался только один снэк
  const showSingleSnackbar = (message, options = {}) => {
    snackKeyRef.current += 1;
    enqueueSnackbar(message, { key: snackKeyRef.current, ...options });
    if (snackKeyRef.current > 1) closeSnackbar(snackKeyRef.current - 1);
  };
  const { ordersByCarId, fetchAndUpdateOrders, allOrders, updateCarInContext } =
    useMainContext();

  const getOrderNumber = (order) => {
    if (!order) return "Не указан";
    console.log("Full order object:", order);
    if (order.orderNumber) return order.orderNumber;
    if (order.id) return order.id;
    if (order.number) return order.number;
    if (order.orderNo) return order.orderNo;
    if (order._id) {
      const shortId = order._id.slice(-6).toUpperCase();
      return `ORD-${shortId}`;
    }
    return "Не указан";
  };

  // const [month, setMonth] = useState(dayjs().month());
  // const [year, setYear] = useState(dayjs().year());

  const [month, setMonth] = useState(() => {
    // Проверяем localStorage при первой загрузке
    const savedMonth = localStorage.getItem("bigCalendar_month");
    return savedMonth !== null ? parseInt(savedMonth, 10) : dayjs().month();
  });

  const [year, setYear] = useState(() => {
    // Проверяем localStorage при первой загрузке
    const savedYear = localStorage.getItem("bigCalendar_year");
    return savedYear !== null ? parseInt(savedYear, 10) : dayjs().year();
  });

  // useEffect для сохранения в localStorage:
  useEffect(() => {
    localStorage.setItem("bigCalendar_month", month.toString());
  }, [month]);

  useEffect(() => {
    localStorage.setItem("bigCalendar_year", year.toString());
  }, [year]);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [startEndDates, setStartEndDates] = useState([]);
  const [isConflictOrder, setIsConflictOrder] = useState(false);
  const [open, setOpen] = useState(false);
  const [headerOrdersModal, setHeaderOrdersModal] = useState({
    open: false,
    date: null,
    orders: [],
  });

  // Для AddOrderModal
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedCarForAdd, setSelectedCarForAdd] = useState(null);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedMoveOrder, setSelectedMoveOrder] = useState(null);

  const handleClose = () => setOpen(false);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    newCar: null,
  });
  // Состояния для режима редактирования авто
  const [selectedCarForEdit, setSelectedCarForEdit] = useState(null);
  const [isEditCarOpen, setIsEditCarOpen] = useState(false);

  // Состояния для режима перемещения
  const [moveMode, setMoveMode] = useState(false);
  const [orderToMove, setOrderToMove] = useState(null);

  const daysInMonth = useMemo(
    () => dayjs().year(year).month(month).daysInMonth(),
    [month, year]
  );

  const days = useMemo(() => {
    const totalDays = daysInMonth;
    return Array.from({ length: totalDays }, (_, index) => {
      const date = dayjs().year(year).month(month).date(1).add(index, "day");
      return {
        dayjs: date,
        date: date.date(),
        weekday: date.format("dd"),
        isSunday: date.day() === 0,
      };
    });
  }, [month, year, daysInMonth]);

  const today = dayjs();
  const todayIndex = days.findIndex((d) => d.dayjs.isSame(today, "day"));

  // On phones, when the calendar mounts, scroll horizontally so today's
  // column is the first visible day column (accounting for the sticky first column).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // treat phones as portrait phones OR small landscape phones
    const isPhonePortrait = window.matchMedia(
      "(max-width: 600px) and (orientation: portrait)"
    ).matches;
    const isSmallLandscape = window.matchMedia(
      "(max-width: 900px) and (orientation: landscape)"
    ).matches;
    const isPhone = isPhonePortrait || isSmallLandscape;
    if (!isPhone) return;

    const container =
      document.querySelector(".bigcalendar-root .MuiTableContainer-root") ||
      document.querySelector(".bigcalendar-root");
    if (!container) return;

    const scrollToToday = () => {
      try {
        const table =
          container.querySelector(".MuiTable-root") ||
          container.querySelector("table");
        if (!table) return;
        const headerCells = table.querySelectorAll("thead .MuiTableCell-root");
        if (!headerCells || headerCells.length === 0) return;
        // headerCells[0] is the fixed first column (car), days start at index 1
        const targetIndex = 1 + todayIndex;
        if (targetIndex < 1 || targetIndex >= headerCells.length) return;
        const targetCell = headerCells[targetIndex];
        const firstCell = headerCells[0];

        const tableRect = table.getBoundingClientRect();
        const cellRect = targetCell.getBoundingClientRect();
        const firstRect = firstCell
          ? firstCell.getBoundingClientRect()
          : { width: 0 };

        // offset of the target cell relative to the table left
        const offset = cellRect.left - tableRect.left;
        // aim to place the target cell right after the sticky first column
        const scrollLeft = Math.max(0, offset - firstRect.width - 4); // small gap
        // prefer smooth scroll when available, fallback to direct assignment
        if (typeof container.scrollTo === "function") {
          try {
            container.scrollTo({ left: scrollLeft, behavior: "smooth" });
          } catch (e) {
            container.scrollLeft = scrollLeft;
          }
        } else {
          container.scrollLeft = scrollLeft;
        }
      } catch (e) {
        // ignore
      }
    };

    // run shortly after mount so layout is ready
    const t = setTimeout(scrollToToday, 50);

    const onResize = () => setTimeout(scrollToToday, 50);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [todayIndex, days]);

  const handleEditCar = (car) => {
    setSelectedCarForEdit(car);
    setIsEditCarOpen(true);
  };

  // const handleSelectMonth = (e) => setMonth(e.target.value);
  // const handleSelectYear = (e) => setYear(e.target.value);

  const handleSelectMonth = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    console.log(
      `Выбран месяц: ${dayjs().month(newMonth).format("MMMM")} (${newMonth})`
    );
  };

  const handleSelectYear = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    console.log(`Выбран год: ${newYear}`);
  };

  const ordersByCarIdWithAllorders = useCallback((carId, orders) => {
    return orders?.filter((order) => order.car === carId);
  }, []);

  // ИСПРАВЛЕННАЯ функция handleLongPress - только активирует режим перемещения
  const handleLongPress = (order) => {
    if (!order?._id) return;

    // Устанавливаем заказ для перемещения и включаем режим перемещения
    setSelectedMoveOrder(order);
    setOrderToMove(order);
    setMoveMode(true);

    // Показываем уведомление
    showSingleSnackbar(
      "Выберите другой автомобиль для перемещения заказа. Доступные автомобили выделены желтым цветом",
      {
        variant: "info",
        autoHideDuration: 8000,
      }
    );

    // НЕ открываем модальное окно редактирования!
  };

  useEffect(() => {
    const { startEnd } = extractArraysOfStartEndConfPending(allOrders);
    setStartEndDates(startEnd);
  }, [allOrders]);

  // Toggle a body class when on small screens in landscape to hide Navbar/legend
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(
      "(max-width: 900px) and (orientation: landscape)"
    );

    const handleChange = () => {
      try {
        if (mql.matches) {
          document.body.classList.add("hide-navbar-on-landscape-sm");
        } else {
          document.body.classList.remove("hide-navbar-on-landscape-sm");
        }
      } catch (e) {
        // ignore in SSR or restricted environments
      }
    };

    // initial check
    handleChange();

    // add listener (support older browsers that use addListener)
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else if (mql.addListener) {
      mql.addListener(handleChange);
    }

    return () => {
      try {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", handleChange);
        } else if (mql.removeListener) {
          mql.removeListener(handleChange);
        }
      } catch (e) {}
      // ensure cleanup class removed on unmount
      try {
        document.body.classList.remove("hide-navbar-on-landscape-sm");
      } catch (e) {}
    };
  }, []);

  const handleSaveOrder = async (updatedOrder) => {
    setSelectedOrders((prevSelectedOrders) =>
      prevSelectedOrders.map((order) =>
        order._id === updatedOrder._id ? updatedOrder : order
      )
    );
    await fetchAndUpdateOrders();
  };

  const filteredStartEndDates = allOrders
    ? allOrders.map((order) => ({
        startStr: order.startDateISO || order.start,
        endStr: order.endDateISO || order.end,
        orderId: order._id,
      }))
    : [];

  const sortedCars = useMemo(() => {
    return [...cars].sort((a, b) => a.model.localeCompare(b.model));
  }, [cars]);

  // Генерируем массив дат для выбранного заказа в режиме перемещения
  const selectedOrderDates = useMemo(() => {
    if (!moveMode || !selectedMoveOrder) return [];

    const startDate = dayjs(selectedMoveOrder.rentalStartDate);
    const endDate = dayjs(selectedMoveOrder.rentalEndDate);
    const dates = [];

    let currentDate = startDate;
    while (currentDate.isSameOrBefore(endDate, "day")) {
      dates.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }

    return dates;
  }, [moveMode, selectedMoveOrder]);

  // Функция проверки совместимости автомобиля для перемещения
  const isCarCompatibleForMove = useCallback(
    (carId) => {
      if (!moveMode || !selectedMoveOrder) return true;

      // Исключаем автомобиль с текущим заказом
      if (selectedMoveOrder.car === carId) return false;

      // Получаем заказы целевого автомобиля
      const carOrders = ordersByCarId(carId);

      // Проверяем конфликты по времени
      const start = dayjs(selectedMoveOrder.rentalStartDate);
      const end = dayjs(selectedMoveOrder.rentalEndDate);

      const hasConflict = carOrders.some((order) => {
        if (order._id === selectedMoveOrder._id) return false; // Исключаем сам перемещаемый заказ

        const orderStart = dayjs(order.rentalStartDate);
        const orderEnd = dayjs(order.rentalEndDate);

        // Проверяем пересечение периодов
        return orderStart.isSameOrBefore(end) && orderEnd.isSameOrAfter(start);
      });

      return !hasConflict;
    },
    [moveMode, selectedMoveOrder, ordersByCarId]
  );

  const handleAddOrderClick = (car, dateStr) => {
    // Если в режиме перемещения - не открываем AddOrderModal
    if (moveMode) return;

    setSelectedCarForAdd(car);
    setSelectedDateForAdd(dateStr);
    setIsAddOrderOpen(true);
  };

  const selectedDate =
    headerOrdersModal.date &&
    dayjs(headerOrdersModal.date).format("YYYY-MM-DD");

  const startedOrders = headerOrdersModal.orders.filter((order) => {
    const start = dayjs(order.rentalStartDate).format("YYYY-MM-DD");
    return start === selectedDate;
  });

  const endedOrders = headerOrdersModal.orders.filter((order) => {
    const end = dayjs(order.rentalEndDate).format("YYYY-MM-DD");
    return end === selectedDate;
  });

  const getRegNumberByCarNumber = (carNumber) => {
    const car = cars.find((c) => c.carNumber === carNumber);
    return car ? car.regNumber : carNumber;
  };

  // ИСПРАВЛЕННАЯ функция обработки выбора автомобиля для перемещения
  const handleCarSelectForMove = (selectedCar) => {
    if (!moveMode || !selectedMoveOrder) return;

    // Находим информацию о старом автомобиле
    const oldCar = cars.find((car) => car._id === selectedMoveOrder.car);

    // Проверяем, что выбран другой автомобиль
    // if (selectedMoveOrder.car === selectedCar._id) {
    //   enqueueSnackbar("Заказ уже на этом автомобиле", { variant: "warning" });
    //   return;
    // }

    // Показываем модальное окно подтверждения с правильными данными
    setConfirmModal({
      open: true,
      newCar: selectedCar,
      oldCar: oldCar, // Добавляем информацию о старом автомобиле
    });
  };

  // Функция для выхода из режима перемещения
  const exitMoveMode = () => {
    setMoveMode(false);
    setSelectedMoveOrder(null);
    setOrderToMove(null);
    showSingleSnackbar("Режим перемещения отключён", { variant: "info" });
  };

  const updateOrder = async (orderData) => {
    console.log("🔄 Updating order with data:", orderData);

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
    <Box
      className="bigcalendar-root"
      sx={{
        overflowX: "auto",
        overflowY: "hidden",
        // on small (portrait) phones give a small top gap so the table header doesn't touch the navbar
        pt: { xs: "26px", sm: 10 },
        maxWidth: "100vw",
        zIndex: 100,
        height: "calc(100vh - 10px)",
      }}
    >
      <style>
        {`
          .today-column-bg {
            background-color: #ffe082 !important;
          }
        `}
      </style>
      <TableContainer
        sx={{
          maxHeight: "calc(100vh - 80px)",
          border: "1px solid #ddd",
          overflowX: "auto", // горизонтальный скролл всегда
          overflowY: "auto",
          // enable smooth scrolling where supported
          scrollBehavior: "smooth",
        }}
      >
        {/* minWidth для таблицы, чтобы на телефоне был скролл */}
        <Table
          stickyHeader
          sx={{ width: "auto", minWidth: { xs: 700, sm: 0 } }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                title="Выберите месяц и год для просмотра календаря"
                sx={{
                  position: "sticky",
                  left: 0,
                  backgroundColor: "white",
                  zIndex: 5,
                  fontWeight: "bold",
                  minWidth: 120,
                }}
              >
                <Select
                  className="bigcalendar-month-select"
                  value={month}
                  onChange={handleSelectMonth}
                  size="small"
                  sx={{ mx: 1 }}
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <MenuItem key={index} value={index}>
                      {dayjs().month(index).format("MMMM")}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  className="bigcalendar-year-select"
                  value={year}
                  onChange={handleSelectYear}
                  size="small"
                  sx={{ mx: 1 }}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <MenuItem key={index} value={year - 2 + index}>
                      {year - 2 + index}
                    </MenuItem>
                  ))}
                </Select>
              </TableCell>
              {days.map((day, idx) => (
                <TableCell
                  key={day.dayjs}
                  align="center"
                  title="Нажмите для просмотра всех начинающихся и заканчивающихся заказов на эту дату"
                  className={idx === todayIndex ? "today-column-bg" : undefined}
                  sx={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: idx === todayIndex ? "#ffe082" : "white",
                    zIndex: 4,
                    fontSize: "16px",
                    padding: "6px",
                    minWidth: 40,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    console.log("orders in header click:", allOrders);
                    setHeaderOrdersModal({
                      open: true,
                      date: day.dayjs,
                      orders: allOrders,
                    });
                  }}
                >
                  <div style={{ color: day.isSunday ? "red" : "inherit" }}>
                    {day.date}
                  </div>
                  <div style={{ color: day.isSunday ? "red" : "inherit" }}>
                    {day.weekday}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCars.map((car) => (
              <TableRow key={car._id}>
                <TableCell
                  onClick={() => handleEditCar(car)}
                  title="Нажмите для редактирования информации об автомобиле"
                  sx={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "primary.main1",
                    color: "#fff",
                    zIndex: 3,
                    padding: 0,
                    minWidth: 120,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "primary.main",
                    },
                  }}
                >
                  {car.model} {car.regNumber}
                </TableCell>

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
      </TableContainer>

      {/* Модальное окно редактирования заказов - открывается только при обычном клике */}
      <Modal
        open={open}
        onClose={handleClose}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Grid
          container
          spacing={1}
          justifyContent="center"
          sx={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
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
          {selectedOrders.map((order, index) => (
            <Grid
              item
              key={order._id}
              xs={12}
              sm={selectedOrders.length === 1 ? 12 : 6}
              md={
                selectedOrders.length === 1
                  ? 12
                  : selectedOrders.length === 2
                  ? 6
                  : selectedOrders.length >= 3 && selectedOrders.length <= 4
                  ? 3
                  : 2
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
              />
            </Grid>
          ))}
        </Grid>
      </Modal>

      {/* AddOrderModal для создания нового заказа */}
      {isAddOrderOpen && selectedCarForAdd && (
        <AddOrderModal
          open={isAddOrderOpen}
          onClose={() => setIsAddOrderOpen(false)}
          car={selectedCarForAdd}
          date={selectedDateForAdd}
          setUpdateStatus={(status) => {
            console.log("Update status:", status);
            if (status?.type === 200) {
              fetchAndUpdateOrders();
            }
          }}
        />
      )}

      {/* Модальное окно для заказов по дате в шапке */}
      <Modal
        open={headerOrdersModal.open}
        onClose={() =>
          setHeaderOrdersModal({ ...headerOrdersModal, open: false })
        }
      >
        <Box
          id="print-orders-modal"
          sx={{
            background: "white",
            p: 3,
            borderRadius: 2,
            minWidth: 800,
            maxWidth: 1000,
            width: "fit-content",
            mx: "auto",
            my: "10vh",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  align="center"
                  sx={{ color: "black" }}
                >
                  Заказы, начинающиеся{" "}
                  {headerOrdersModal.date &&
                    headerOrdersModal.date.format("DD.MM.YY")}
                </Typography>
                {startedOrders.length === 0 ? (
                  <Typography align="center" sx={{ color: "black" }}>
                    Нет заказов, начинающихся в эту дату
                  </Typography>
                ) : (
                  <Table size="small" sx={{ mb: 4 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            width: 220,
                            minWidth: 220,
                            maxWidth: 220,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Машина
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 120,
                            minWidth: 120,
                            maxWidth: 120,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Госномер
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 160,
                            minWidth: 160,
                            maxWidth: 160,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Срок
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 160,
                            minWidth: 160,
                            maxWidth: 160,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Клиент
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 140,
                            minWidth: 140,
                            maxWidth: 140,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Телефон
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {startedOrders.map((order, idx) => (
                        <TableRow key={order._id || idx}>
                          <TableCell
                            sx={{
                              width: 220,
                              minWidth: 220,
                              maxWidth: 220,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.carModel}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 120,
                              minWidth: 120,
                              maxWidth: 120,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getRegNumberByCarNumber(order.carNumber)}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 160,
                              minWidth: 160,
                              maxWidth: 160,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.rentalStartDate
                              ? `${dayjs(order.rentalStartDate).format(
                                  "DD.MM.YY"
                                )}-${dayjs(order.rentalEndDate).format(
                                  "DD.MM.YY"
                                )}`
                              : ""}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 160,
                              minWidth: 160,
                              maxWidth: 160,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.customerName}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 140,
                              minWidth: 140,
                              maxWidth: 140,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.phone}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>

              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  align="center"
                  sx={{ color: "black" }}
                >
                  Заказы, заканчивающиеся{" "}
                  {headerOrdersModal.date &&
                    headerOrdersModal.date.format("DD.MM.YY")}
                </Typography>
                {endedOrders.length === 0 ? (
                  <Typography align="center" sx={{ color: "black" }}>
                    Нет заказов, заканчивающихся в эту дату
                  </Typography>
                ) : (
                  <Table size="small" sx={{ mb: 4 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            width: 220,
                            minWidth: 220,
                            maxWidth: 220,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Машина
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 120,
                            minWidth: 120,
                            maxWidth: 120,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Госномер
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 160,
                            minWidth: 160,
                            maxWidth: 160,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Срок
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 160,
                            minWidth: 160,
                            maxWidth: 160,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Клиент
                        </TableCell>
                        <TableCell
                          sx={{
                            width: 140,
                            minWidth: 140,
                            maxWidth: 140,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Телефон
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {endedOrders.map((order, idx) => (
                        <TableRow key={order._id || idx}>
                          <TableCell
                            sx={{
                              width: 220,
                              minWidth: 220,
                              maxWidth: 220,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.carModel}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 120,
                              minWidth: 120,
                              maxWidth: 120,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getRegNumberByCarNumber(order.carNumber)}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 160,
                              minWidth: 160,
                              maxWidth: 160,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.rentalStartDate
                              ? `${dayjs(order.rentalStartDate).format(
                                  "DD.MM.YY"
                                )}-${dayjs(order.rentalEndDate).format(
                                  "DD.MM.YY"
                                )}`
                              : ""}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 160,
                              minWidth: 160,
                              maxWidth: 160,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.customerName}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 140,
                              minWidth: 140,
                              maxWidth: 140,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {order.phone}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Grid>
          </Grid>

          <Button
            className="no-print"
            onClick={() => window.print()}
            variant="outlined"
            sx={{ mt: 2, mr: 2 }}
          >
            Печать
          </Button>
          <Button
            className="no-print"
            onClick={() =>
              setHeaderOrdersModal({ ...headerOrdersModal, open: false })
            }
            variant="contained"
            sx={{ mt: 2 }}
          >
            Закрыть
          </Button>
        </Box>
      </Modal>

      {/* ИСПРАВЛЕННОЕ модальное окно подтверждения перемещения */}
      <Modal
        open={confirmModal.open}
        onClose={() => {
          setConfirmModal({ open: false, newCar: null, oldCar: null });
          exitMoveMode();
        }}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "10vh", // отступ сверху, регулируй по вкусу
        }}
      >
        <Box
          sx={{
            backgroundColor: "background.paper",
            boxShadow: 24,
            p: 3,
            minWidth: 400,
            borderRadius: 1,
            maxWidth: "90vw",
          }}
        >
          <Typography sx={{ mb: 3, color: "black" }}>
            Вы хотите сдвинуть заказ с автомобиля {confirmModal.oldCar?.model} (
            {confirmModal.oldCar?.regNumber}) на автомобиль{" "}
            {confirmModal.newCar?.model} ({confirmModal.newCar?.regNumber})?
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setConfirmModal({ open: false, newCar: null, oldCar: null });
                exitMoveMode();
                //enqueueSnackbar("Перемещение отменено", { variant: "info" });
              }}
            >
              НЕТ
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                setConfirmModal({ open: false, newCar: null, oldCar: null });
                let success = false;
                try {
                  const result = await changeRentalDates(
                    selectedMoveOrder._id,
                    new Date(selectedMoveOrder.rentalStartDate),
                    new Date(selectedMoveOrder.rentalEndDate),
                    new Date(
                      selectedMoveOrder.timeIn ||
                        selectedMoveOrder.rentalStartDate
                    ),
                    new Date(
                      selectedMoveOrder.timeOut ||
                        selectedMoveOrder.rentalEndDate
                    ),
                    selectedMoveOrder.placeIn || "",
                    selectedMoveOrder.placeOut || "",
                    confirmModal.newCar._id,
                    confirmModal.newCar.carNumber
                  );

                  if (result?.status === 201 || result?.status === 202) {
                    await fetchAndUpdateOrders();
                    showSingleSnackbar(
                      `Заказ сдвинут на ${confirmModal.newCar.model}`,
                      {
                        variant: "success",
                      }
                    );
                    success = true;
                  }
                } catch (error) {
                  showSingleSnackbar(`Ошибка перемещения: ${error.message}`, {
                    variant: "error",
                  });
                } finally {
                  if (!success) exitMoveMode();
                }
              }}
            >
              ДА
            </Button>
          </Box>
        </Box>
      </Modal>

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
    </Box>
  );
}
