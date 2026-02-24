/**
 * POST /api/order/refetch-active
 *
 * CLIENT-SAFE endpoint — returns orders that are still "active" for the calendar:
 * rentalEndDate >= today (Athens). Includes current (ongoing) and future orders;
 * excludes only orders that have already ended.
 */

import { connectToDB } from "@utils/database";
import { Order } from "@models/order";
import { withOrderVisibility } from "@/middleware/withOrderVisibility";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const ATHENS_TZ = "Europe/Athens";

function getTodayAthensStartUTC() {
  const nowAthens = dayjs().tz(ATHENS_TZ);
  const startOfDayAthens = nowAthens.startOf("day");
  return startOfDayAthens.utc().toDate();
}

async function handler(request) {
  try {
    await connectToDB();

    const todayStartUTC = getTodayAthensStartUTC();

    const orders = await Order.find({
      rentalEndDate: { $gte: todayStartUTC },
    })
      .select(
        "rentalStartDate rentalEndDate timeIn timeOut car carNumber regNumber confirmed customerName phone email secondDriver Viber Whatsapp Telegram numberOfDays totalPrice OverridePrice carModel date my_order placeIn placeOut flightNumber ChildSeats insurance franchiseOrder orderNumber"
      )
      .lean();

    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching active orders:", error);
    return new Response(`Failed to fetch active orders: ${error.message}`, {
      status: 500,
    });
  }
}

export const POST = withOrderVisibility(handler);
