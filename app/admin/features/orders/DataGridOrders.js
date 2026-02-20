"use client";
import React, { useState, useMemo, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, Stack } from "@mui/material";
import { ActionButton } from "@/app/components/ui";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { mapOrderToOrdersDataGridRow } from "@/app/admin/features/shared/orderRows";

dayjs.extend(utc);
dayjs.extend(timezone);

const BUSINESS_TZ = "Europe/Athens";

// Функция для вычисления ширины столбца по максимальной длине данных
function getMaxColumnWidth(rows, field, headerName) {
  const maxContentLength = Math.max(
    headerName.length,
    ...rows.map((row) => (row[field] ? String(row[field]).length : 0))
  );
  // Примерная ширина: 10px на символ + запас
  return Math.max(80, Math.min(maxContentLength * 10 + 30, 400));
}

function DataGridOrders({ cars, orders }) {
  const [orderData, setOrderData] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const { t } = useTranslation();

  useEffect(() => {
    const formattedOrders = orders.map((order, index) =>
      mapOrderToOrdersDataGridRow(order, index, cars)
    );

    setOrderData(formattedOrders);
  }, [orders, cars]);

  const processOrderRowUpdate = (newRow) => {
    const updatedOrderData = orderData.map((row) =>
      row.id === newRow.id ? newRow : row
    );
    setOrderData(updatedOrderData);
    return newRow;
  };

  // Формируем orderColumns с вычислением ширины для каждого столбца (мемоизируем)
  const orderColumns = useMemo(() => [
    {
      field: "id",
      headerName: t("table.number"),
      width: getMaxColumnWidth(orderData, "id", t("table.number")),
    },
    {
      field: "carModel",
      headerName: t("table.carModel"),
      width: getMaxColumnWidth(orderData, "carModel", t("table.carModel")),
      editable: true,
    },
    {
      field: "regNumber",
      headerName: t("table.carNumber"),
      width: getMaxColumnWidth(orderData, "regNumber", t("table.carNumber")),
      editable: false,
    },
    {
      field: "customerName",
      headerName: t("table.customer"),
      width: getMaxColumnWidth(orderData, "customerName", t("table.customer")),
      editable: true,
    },
    {
      field: "phone",
      headerName: t("table.phone"),
      width: getMaxColumnWidth(orderData, "phone", t("table.phone")),
      editable: true,
    },
    {
      field: "email",
      headerName: t("table.email"),
      width: getMaxColumnWidth(orderData, "email", t("table.email")),
      editable: true,
    },
    {
      field: "rentalStartDate",
      headerName: t("table.rentStart"),
      width: getMaxColumnWidth(
        orderData,
        "rentalStartDate",
        t("table.rentStart")
      ),
      editable: true,
    },
    {
      field: "rentalEndDate",
      headerName: t("table.rentEnd"),
      width: getMaxColumnWidth(orderData, "rentalEndDate", t("table.rentEnd")),
      editable: true,
    },
    {
      field: "numberOfDays",
      headerName: t("table.days"),
      width: getMaxColumnWidth(orderData, "numberOfDays", t("table.days")),
      editable: true,
    },
    {
      field: "totalPrice",
      headerName: t("table.price"),
      width: getMaxColumnWidth(orderData, "totalPrice", t("table.price")),
      editable: true,
    },
    {
      field: "confirmed",
      headerName: t("table.confirm"),
      width: getMaxColumnWidth(orderData, "confirmed", t("table.confirm")),
      editable: true,
      type: "boolean",
    },
  ], [orderData, t]);

  const filterTitles = {
    all: t("print.allOrders"),
    activeToday: t("print.activOrders"),
    startingToday: t("print.startToday"),
    startingTomorrow: t("print.startTomorrow"),
    endingToday: t("print.endToday"),
    endingTomorrow: t("print.endTomorrow"),
  };

  const filteredOrderData = useMemo(() => {
    const today = dayjs().tz(BUSINESS_TZ).format("YYYY-MM-DD");
    const tomorrow = dayjs().tz(BUSINESS_TZ).add(1, "day").format("YYYY-MM-DD");

    switch (filterType) {
      case "activeToday":
        return orderData.filter((order) => {
          try {
            return (
              order.originalStartDate <= today && order.originalEndDate >= today
            );
          } catch (error) {
            console.error("Error filtering active today:", error, order);
            return false;
          }
        });
      case "startingToday":
        return orderData.filter((order) => {
          try {
            return (
              order.originalStartDate &&
              order.originalStartDate === today
            );
          } catch (error) {
            console.error("Error filtering starting today:", error, order);
            return false;
          }
        });
      case "startingTomorrow":
        return orderData.filter((order) => {
          try {
            return (
              order.originalStartDate &&
              order.originalStartDate === tomorrow
            );
          } catch (error) {
            console.error("Error filtering starting tomorrow:", error, order);
            return false;
          }
        });
      case "endingToday":
        return orderData.filter((order) => {
          try {
            return (
              order.originalEndDate &&
              order.originalEndDate === today
            );
          } catch (error) {
            console.error("Error filtering ending today:", error, order);
            return false;
          }
        });
      case "endingTomorrow":
        return orderData.filter((order) => {
          try {
            return (
              order.originalEndDate &&
              order.originalEndDate === tomorrow
            );
          } catch (error) {
            console.error("Error filtering ending tomorrow:", error, order);
            return false;
          }
        });
      default:
        return orderData;
    }
  }, [orderData, filterType]);

  return (
    <Box pt={6}>
      <Stack
        direction="row"
        spacing={2}
        pb={0}
        sx={{
          flexWrap: "wrap",
          gap: 1,
          justifyContent: "center",
        }}
        className="no-print"
      >
        <ActionButton
          variant={filterType === "all" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("all")}
          label={t("table.allOrders")}
        />
        <ActionButton
          variant={filterType === "activeToday" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("activeToday")}
          label={t("table.activOrders")}
        />
        <ActionButton
          variant={filterType === "startingToday" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("startingToday")}
          label={t("table.startToday")}
        />
        <ActionButton
          variant={filterType === "startingTomorrow" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("startingTomorrow")}
          label={t("table.startTomorrow")}
        />
        <ActionButton
          variant={filterType === "endingToday" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("endingToday")}
          label={t("table.endToday")}
        />
        <ActionButton
          variant={filterType === "endingTomorrow" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setFilterType("endingTomorrow")}
          label={t("table.endTomorrow")}
        />
      </Stack>
      <Box mb={2} className="no-print" sx={{ textAlign: "right" }}>
        <ActionButton
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() => window.print()}
          label={t("table.print") || "Печать"}
        />
      </Box>
      <Box m={0} style={{ height: "100vh", width: "100%" }}>
        <Typography variant="h6">
          {filterTitles[filterType] || t("table.orders")}
        </Typography>
        <DataGrid
          rows={filterType === "all" ? orderData : filteredOrderData}
          columns={orderColumns}
          pageSize={20}
          processRowUpdate={processOrderRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
        />
      </Box>
    </Box>
  );
}

export default DataGridOrders;
