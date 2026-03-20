/**
 * Order service — direct DB access for server and API routes.
 * Use from server components and API routes; do not call internal API via fetch.
 * Applies order visibility (PII) based on session when provided.
 */

import { connectToDB } from "@lib/database";
import { Order } from "@models/order";
import { applyVisibilityToOrders } from "@/domain/orders/orderVisibility";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const ATHENS_TZ = "Europe/Athens";
const ORDER_SELECT =
  "rentalStartDate rentalEndDate timeIn timeOut car carNumber regNumber confirmed customerName phone email secondDriver Viber Whatsapp Telegram numberOfDays totalPrice OverridePrice carModel date my_order placeIn placeOut flightNumber ChildSeats insurance franchiseOrder orderNumber clientLang clientIP clientCountry clientRegion clientCity";

function getTodayAthensStartUTC() {
  const nowAthens = dayjs().tz(ATHENS_TZ);
  const startOfDayAthens = nowAthens.startOf("day");
  return startOfDayAthens.utc().toDate();
}

/**
 * Get active orders (rentalEndDate >= today Athens). Applies visibility when session provided.
 * @param {{ session?: Object }} [options]
 * @returns {Promise<Array>} Orders (plain objects)
 */
export async function getActiveOrders(options = {}) {
  await connectToDB();
  const todayStartUTC = getTodayAthensStartUTC();
  const orders = await Order.find({
    rentalEndDate: { $gte: todayStartUTC },
  })
    .select(ORDER_SELECT)
    .lean();
  const user = options?.session?.user ?? null;
  return applyVisibilityToOrders(orders ?? [], user);
}

/**
 * Get all orders (e.g. for admin). Applies visibility when session provided.
 * @param {{ session?: Object }} [options]
 * @returns {Promise<Array>} Orders (plain objects)
 */
export async function getAllOrders(options = {}) {
  await connectToDB();
  const orders = await Order.find().select(ORDER_SELECT).lean();
  const user = options?.session?.user ?? null;
  return applyVisibilityToOrders(orders ?? [], user);
}
