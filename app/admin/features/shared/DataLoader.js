import { unstable_noStore } from "next/cache";
import { cookies } from "next/headers";
import AdminView from "./AdminView";
import { fetchAllCars, fetchCompany, getApiUrl } from "@utils/action";
import { COMPANY_ID } from "@/config/company";

async function fetchOrdersForCurrentSession() {
  const cookieHeader = cookies().toString();

  const response = await fetch(getApiUrl("/api/order/refetch"), {
    method: "POST",
    cache: "no-store",
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  return response.json();
}
/**
 * DataLoader — Server Component для загрузки данных админки
 * 
 * Загрузка происходит на сервере через await Promise.all(),
 * поэтому Suspense здесь не нужен — данные уже готовы.
 * 
 * Lazy-loading секций происходит в AdminView через dynamic().
 */
export default async function DataLoader({ viewType }) {
  unstable_noStore(); // Отключаем кеширование для админки
  
  // ⚡ Запускаем ВСЕ загрузки параллельно с Promise.all
  // skipCache: true для компании — чтобы после изменения буфера при перезагрузке подтягивались свежие данные из БД
  const [company, cars, orders] = await Promise.all([
    fetchCompany(COMPANY_ID, { skipCache: true }),
    fetchAllCars(),
    fetchOrdersForCurrentSession(),
  ]);

  // Данные уже загружены — передаём в AdminView без Suspense
  return (
    <AdminView
      company={company}
      cars={cars}
      orders={orders}
      viewType={viewType}
    />
  );
}
