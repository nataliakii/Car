import dayjs from "dayjs";

export const processOrders = (orders) => {
  const unavailableDates = [];
  const confirmedDates = [];

  orders.forEach((order) => {
    const startDate = dayjs(order.rentalStartDate);
    const endDate = dayjs(order.rentalEndDate);

    let currentDate = startDate;
    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, "day")
    ) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      unavailableDates.push(dateStr);
      if (order.confirmed) {
        confirmedDates.push(dateStr);
      }
      currentDate = currentDate.add(1, "day");
    }
  });

  return { unavailableDates, confirmedDates };
};
