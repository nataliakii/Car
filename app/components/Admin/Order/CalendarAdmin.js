import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Modal,
  Paper,
  Grid,
} from "@mui/material";
import { Calendar } from "antd";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import LegendCalendarAdmin from "@app/components/common/LegendCalendarAdmin";
import EditOrderModal from "./EditOrderModal";

import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

const CalendarAdmin = ({
  isLoading = false,
  orders,
  handleOrderUpdate,
  setCarOrders,
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [confirmedDates, setConfirmedDates] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [isConflictOrder, setIsConflictOrder] = useState(false);

  useEffect(() => {
    const unavailable = [];
    const confirmed = [];

    orders.forEach((order) => {
      const startDate = dayjs(order.rentalStartDate);
      const endDate = dayjs(order.rentalEndDate);

      let currentDate = startDate;
      while (
        currentDate.isBefore(endDate) ||
        currentDate.isSame(endDate, "day")
      ) {
        const dateStr = currentDate.format("YYYY-MM-DD");
        unavailable.push(dateStr);
        if (order.confirmed) {
          confirmed.push(dateStr);
        }
        currentDate = currentDate.add(1, "day");
      }
    });

    setUnavailableDates(unavailable);
    setConfirmedDates(confirmed);
  }, [orders]);

  const disabledDate = (current) => {
    const dateStr = current.format("YYYY-MM-DD");

    return (
      (current && current.isBefore(dayjs().startOf("day"))) ||
      (current &&
        current.isBefore(dayjs().startOf("day")) &&
        !isStartOrEnd &&
        confirmedDates?.includes(dateStr))
    );
  };
  const renderDateCell = useCallback(
    (date) => {
      const dateStr = date.format("YYYY-MM-DD");

      const isConfirmed = confirmedDates.includes(dateStr);
      const isUnavailable = unavailableDates.includes(dateStr);

      let isStartDate = false;
      let isEndDate = false;
      let overlapOrders = [];
      let startDates = [];
      let endDates = [];

      // Check each order and collect overlaps
      orders.forEach((order) => {
        const rentalStart = dayjs(order.rentalStartDate).format("YYYY-MM-DD");
        const rentalEnd = dayjs(order.rentalEndDate).format("YYYY-MM-DD");

        if (rentalStart === dateStr) {
          isStartDate = true;
          startDates.push(order);
        }
        if (rentalEnd === dateStr) {
          isEndDate = true;
          endDates.push(order);
        }

        if (dayjs(dateStr).isBetween(rentalStart, rentalEnd, "day", "[]")) {
          overlapOrders.push(order);
        }
      });

      const isOverlapDate = overlapOrders.length > 1;
      const isStartEndOverlap = startDates.length > 0 && endDates.length > 0;

      let backgroundColor = "transparent";
      let color = "inherit";
      let borderRadius = "1px";
      let width = "100%";
      let border = "1px solid green";

      if (isConfirmed) {
        backgroundColor = "primary.red";
        color = "common.white";
      }
      if (isUnavailable && !isConfirmed) {
        backgroundColor = "primary.green";
        color = "common.black";
      }

      // Single order date styling
      if (isStartDate && !isEndDate) {
        borderRadius = "50% 0 0 50%";
        width = "50%";
        backgroundColor = "primary.green";
        color = "common.black";
      }
      if (!isStartDate && isEndDate) {
        borderRadius = "0 50% 50% 0";
        width = "50%";
        backgroundColor = "primary.green";
        color = "common.black";
      }

      const handleDateClick = () => {
        const relevantOrders = orders.filter((order) => {
          const rentalStart = dayjs(order.rentalStartDate).format("YYYY-MM-DD");
          const rentalEnd = dayjs(order.rentalEndDate).format("YYYY-MM-DD");

          return dayjs(dateStr).isBetween(rentalStart, rentalEnd, "day", "[]");
        });

        if (relevantOrders.length > 0) {
          setSelectedOrders(relevantOrders);
          setOpen(true);
        }
      };
      //only start date
      if (isStartDate && !isEndDate)
        return (
          <Box
            onClick={handleDateClick}
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
            <Box
              sx={{
                width: "50%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              {date.date()}
            </Box>
            <Box
              sx={{
                width: "50%",
                height: "100%",
                borderRadius: "50% 0 0 50%",
                backgroundColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color,
              }}
            >
              {date.date()}
            </Box>
          </Box>
        );

      if (!isStartDate && isEndDate)
        return (
          <Box
            onClick={handleDateClick}
            sx={{
              border: border,
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "row",
              cursor: "pointer",
              // alignItems: "center",
              // justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: "50%",
                height: "100%",
                borderRadius: "0 50% 50% 0",
                backgroundColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color,
              }}
            >
              {" "}
              {date.date()}
            </Box>
            <Box
              sx={{
                width: "50%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              {date.date()}
            </Box>
          </Box>
        );

      // For overlapping start/end dates
      if (isStartEndOverlap) {
        return (
          <Box
            onClick={handleDateClick}
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
            {/* Start Date Box - Left half */}
            <Box
              sx={{
                width: "50%",
                height: "100%",
                backgroundColor: "text.green",
                borderRadius: "0 50% 50% 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "common.white",
              }}
            >
              {date.date()}
            </Box>

            {/* End Date Box - Right half */}
            <Box
              sx={{
                width: "50%",
                height: "100%",
                backgroundColor: "text.green",
                borderRadius: "0 50% 50% 0",
                borderRadius: "50% 0 0 50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "common.white",
              }}
            >
              {date.date()}
            </Box>
          </Box>
        );
      }

      if (isOverlapDate)
        return (
          <Box
            onClick={handleDateClick}
            sx={{
              border: border,
              position: "relative",
              height: "120%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.red",
              backgroundColor: "text.green",
              cursor: "pointer",
            }}
          >
            {date.date()}
          </Box>
        );
      // Regular cell rendering
      return (
        <Box
          onClick={handleDateClick}
          sx={{
            position: "relative",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor,
            borderRadius,
            color,
            cursor: "pointer",
            border: border,
          }}
        >
          {date.date()}
        </Box>
      );
    },
    [confirmedDates, unavailableDates, orders]
  );

  const handleClose = () => setOpen(false);

  // Memoize order save handler
  const handleSaveOrder = (updatedOrder) => {
    // handleOrderUpdate();
    setSelectedOrders((prevSelectedOrders) =>
      prevSelectedOrders.map((order) =>
        order._id === updatedOrder._id ? updatedOrder : order
      )
    );

    const updatedOrders = orders.map((order) =>
      order._id === updatedOrder._id ? updatedOrder : order
    );
    setCarOrders(updatedOrders);
  };

  const headerRender = ({ value }) => {
    const current = value.clone();
    const month = current.format("MMMM");
    const year = current.year();

    const goToNextMonth = () => {
      setCurrentDate(currentDate.add(1, "month"));
    };

    const goToPreviousMonth = () => {
      setCurrentDate(currentDate.subtract(1, "month"));
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
        <IconButton onClick={goToNextMonth} color="inherit">
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", p: "20px" }}>
      {/* <LegendCalendarAdmin /> */}
      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <Calendar
            fullscreen={false}
            disabledDate={disabledDate}
            fullCellRender={renderDateCell}
            headerRender={headerRender}
            value={currentDate}
          />
        </>
      )}

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
                setCarOrders={setCarOrders}
                isConflictOrder={selectedOrders.length > 1 ? true : false}
                setIsConflictOrder={setIsConflictOrder}
              />
            </Grid>
          ))}
        </Grid>
      </Modal>
    </Box>
  );
};

export default CalendarAdmin;
