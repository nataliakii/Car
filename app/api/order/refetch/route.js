import { connectToDB } from "@utils/database";
import { Order } from "@models/order";
import { withOrderVisibility } from "@/middleware/withOrderVisibility";

async function handler(request) {
  try {
    await connectToDB();

    const orders = await Order.find()
      .select("rentalStartDate rentalEndDate timeIn timeOut car carNumber regNumber confirmed customerName phone email secondDriver Viber Whatsapp Telegram numberOfDays totalPrice OverridePrice carModel date my_order placeIn placeOut flightNumber ChildSeats insurance franchiseOrder orderNumber")
      .lean();

    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return new Response(`Failed to fetch orders: ${error.message}`, {
      status: 500,
    });
  }
}

export const POST = withOrderVisibility(handler);
