"use client";
import React from "react";
import { Box } from "@mui/material";

import Feed from "@app/components/Feed";
import { fetchAllCars, reFetchAllOrders } from "@utils/action";
import DataGridOrders from "@app/components/Admin/DataGridOrders";
import Admin from "@app/components/Admin/Admin";

async function pageOrders() {
  const carsData = await fetchAllCars();
  const ordersData = await reFetchAllOrders();

  return (
    <Feed cars={carsData} orders={ordersData} isAdmin={true} isMain={false}>
      <Box sx={{ my: 3 }}>
        <Admin isOrdersCalendars={true} />
      </Box>
    </Feed>
  );
}

export default pageOrders;
