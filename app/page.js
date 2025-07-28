import React, { Suspense } from "react";
import Feed from "@app/components/Feed";

import { unstable_noStore } from "next/cache";
import Loading from "@app/loading";
import { fetchAllCars, reFetchAllOrders, fetchCompany } from "@utils/action";
import CarGrid from "./components/CarGrid";
import { companyData } from "@utils/companyData";

export default async function Home() {
  unstable_noStore();
  const carsData = await fetchAllCars();
  const ordersData = await reFetchAllOrders();
  // const companyId = "679903bd10e6c8a8c0f027bc";
  // const company = await fetchCompany(companyId);
  const company = companyData;

  return (
    <Suspense fallback={<Loading />}>
      {/* <CarGrid carsData={carsData} ordersData={ordersData} /> */}
      <Feed cars={carsData} orders={ordersData} isMain={true} company={company}>
        <CarGrid />
      </Feed>
    </Suspense>
  );
}
