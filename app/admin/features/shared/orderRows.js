import { formatDate } from "@utils/businessTime";
import { getOrderNumberOfDays } from "@/domain/orders/numberOfDays";

/**
 * Maps API order to Orders DataGrid row.
 *
 * @param {Object} order
 * @param {number} index
 * @param {Array} cars
 * @returns {Object}
 */
export function mapOrderToOrdersDataGridRow(order, index, cars = []) {
  const startDay = order.rentalStartDate
    ? formatDate(order.rentalStartDate, "YYYY-MM-DD")
    : "";
  const endDay = order.rentalEndDate
    ? formatDate(order.rentalEndDate, "YYYY-MM-DD")
    : "";

  const car = cars.find((c) => c.carNumber === order.carNumber);
  const hideContacts = order._visibility?.hideClientContacts === true;

  return {
    id: index + 1,
    customerName: hideContacts ? "—" : order.customerName,
    phone: hideContacts ? "—" : order.phone,
    carNumber: order.carNumber,
    regNumber: car ? car.regNumber : "",
    email: hideContacts ? "—" : order.email,
    rentalStartDate: order.rentalStartDate
      ? formatDate(order.rentalStartDate, "DD.MM.YYYY")
      : "",
    rentalEndDate: order.rentalEndDate
      ? formatDate(order.rentalEndDate, "DD.MM.YYYY")
      : "",
    originalStartDate: startDay,
    originalEndDate: endDay,
    numberOfDays: getOrderNumberOfDays(order),
    totalPrice: order.totalPrice,
    carModel: order.carModel,
    confirmed: order.confirmed,
  };
}

/**
 * Maps API order to Cars page order row.
 *
 * @param {Object} order
 * @param {number} index
 * @returns {Object}
 */
export function mapOrderToCarsDataGridRow(order, index) {
  const hideContacts = order._visibility?.hideClientContacts === true;

  return {
    id: index + 1,
    customerName: hideContacts ? "—" : order.customerName,
    phone: hideContacts ? "—" : order.phone,
    email: hideContacts ? "—" : order.email,
    rentalStartDate: order.rentalStartDate
      ? formatDate(order.rentalStartDate, "DD.MM.YYYY")
      : "",
    rentalEndDate: order.rentalEndDate
      ? formatDate(order.rentalEndDate, "DD.MM.YYYY")
      : "",
    numberOfDays: getOrderNumberOfDays(order),
    totalPrice: order.totalPrice,
    carModel: order.carModel,
    confirmed: order.confirmed,
  };
}

