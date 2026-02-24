import { getServerSession } from "next-auth/next";
import { authOptions } from "@lib/authOptions";
import { Order } from "@models/order";
import { connectToDB } from "@utils/database";
import { withOrderVisibility } from "@/middleware/withOrderVisibility";

/**
 * GET /api/admin/orders
 * 
 * Returns all orders for admin table view.
 * Requires admin authentication.
 * Visibility filtering applied via middleware.
 */
async function handler(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.isAdmin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Unauthorized: Admin access required" 
        }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    await connectToDB();
    
    const adminRole = session.user?.role ?? 0;

    const orders = await Order.find({})
      .populate({
        path: "car",
        select: "_id model regNumber carNumber",
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      car: order.car
        ? {
            _id: order.car._id,
            model: order.car.model,
            regNumber: order.car.regNumber,
            carNumber: order.car.carNumber,
          }
        : null,
      carModel: order.carModel,
      carNumber: order.carNumber,
      regNumber: order.regNumber || order.car?.regNumber || "",
      customerName: order.customerName,
      phone: order.phone,
      email: order.email || "",
      secondDriver: order.secondDriver ?? false,
      Viber: order.Viber ?? false,
      Whatsapp: order.Whatsapp ?? false,
      Telegram: order.Telegram ?? false,
      rentalStartDate: order.rentalStartDate,
      rentalEndDate: order.rentalEndDate,
      timeIn: order.timeIn,
      timeOut: order.timeOut,
      confirmed: order.confirmed,
      my_order: order.my_order,
      createdByRole: order.createdByRole ?? 0,
      createdByAdminId: order.createdByAdminId || null,
      totalPrice: order.totalPrice,
      numberOfDays: order.numberOfDays,
      placeIn: order.placeIn,
      placeOut: order.placeOut,
      createdAt: order.createdAt || order.date,
      updatedAt: order.updatedAt,
      hasConflictDates: order.hasConflictDates || [],
      IsConfirmedEmailSent: order.IsConfirmedEmailSent ?? false,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedOrders,
        count: formattedOrders.length,
        adminRole,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export const GET = withOrderVisibility(handler);
