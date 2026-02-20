"use client";
import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography } from "@mui/material";
import { mapOrderToCarsDataGridRow } from "@/app/admin/features/shared/orderRows";

function DataGridCars({ session, cars, orders }) {
  const [carData, setCarData] = useState(
    cars.map((car, index) => ({
      id: index + 1, // unique identifier for DataGrid
      carNumber: car.carNumber,
      model: car.model,
      class: car.class,
      transmission: car.transmission,
      seats: car.seats,
      registration: car.registration,
      numberOfDoors: car.numberOfDoors,
      enginePower: car.enginePower,
    }))
  );

  const [orderData, setOrderData] = useState(
    orders.map((order, index) => mapOrderToCarsDataGridRow(order, index))
  );

  const [selectionModel, setSelectionModel] = useState(() => {
    const lastId = localStorage.getItem("lastCarId");
    console.log("[DataGridCars] lastCarId from localStorage:", lastId);
    return lastId ? [lastId] : [];
  });

  React.useEffect(() => {
    console.log("[DataGridCars] carData:", carData);
    console.log("[DataGridCars] selectionModel:", selectionModel);
  }, [carData, selectionModel]);

  // Handle the edit process for car data
  const processCarRowUpdate = (newRow) => {
    const updatedCarData = carData.map((row) =>
      row.id === newRow.id ? newRow : row
    );
    setCarData(updatedCarData);
    return newRow; // Required to reflect changes in the UI
  };

  // Handle the edit process for order data
  const processOrderRowUpdate = (newRow) => {
    const updatedOrderData = orderData.map((row) =>
      row.id === newRow.id ? newRow : row
    );
    setOrderData(updatedOrderData);
    return newRow; // Required to reflect changes in the UI
  };

  // Define the columns for the cars data with editable fields
  const carColumns = [
    { field: "id", headerName: "ID", width: 90 },
    {
      field: "carNumber",
      headerName: "Car Number",
      width: 150,
      editable: true,
    },
    { field: "model", headerName: "Model", width: 150, editable: true },
    { field: "class", headerName: "Class", width: 130, editable: true },
    {
      field: "transmission",
      headerName: "Transmission",
      width: 130,
      editable: true,
    },
    { field: "seats", headerName: "Seats", width: 100, editable: true },
    { field: "registration", headerName: "Year", width: 100, editable: true },
    { field: "numberOfDoors", headerName: "Doors", width: 120, editable: true },
    {
      field: "enginePower",
      headerName: "Engine Power (hp)",
      width: 150,
      editable: true,
    },
  ];

  // Define the columns for the orders data with editable fields
  const orderColumns = [
    { field: "id", headerName: "ID", width: 90 },
    {
      field: "customerName",
      headerName: "Customer",
      width: 200,
      editable: true,
    },
    { field: "phone", headerName: "Phone", width: 150, editable: true },
    { field: "email", headerName: "Email", width: 200, editable: true },
    {
      field: "rentalStartDate",
      headerName: "Rental Start",
      width: 160,
      editable: true,
    },
    {
      field: "rentalEndDate",
      headerName: "Rental End",
      width: 160,
      editable: true,
    },
    { field: "numberOfDays", headerName: "Days", width: 120, editable: true },
    {
      field: "totalPrice",
      headerName: "Total Price",
      width: 130,
      editable: true,
    },
    { field: "carModel", headerName: "Car Model", width: 150, editable: true },
    {
      field: "confirmed",
      headerName: "Confirmed",
      width: 130,
      editable: true,
      type: "boolean",
    },
  ];

  return (
    <Box>
      <Box mt={3} style={{ height: "100%", width: "100%" }}>
        <Typography variant="h6">Cars</Typography>
        <DataGrid
          rows={carData}
          columns={carColumns}
          pageSize={5}
          processRowUpdate={processCarRowUpdate}
          experimentalFeatures={{ newEditingApi: true }} // Required for editing functionality
          selectionModel={selectionModel}
          onSelectionModelChange={(newSelection) => {
            setSelectionModel(newSelection);
            console.log(
              "[DataGridCars] onSelectionModelChange newSelection:",
              newSelection
            );
            if (newSelection.length > 0) {
              localStorage.setItem("lastCarId", newSelection[0]);
              console.log("[DataGridCars] Saved lastCarId:", newSelection[0]);
            }
          }}
        />
      </Box>
    </Box>
  );
}

export default DataGridCars;
