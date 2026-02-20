import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { companyData } from "@utils/companyData";

dayjs.extend(utc);
dayjs.extend(timezone);
const TIMEZONE = "Europe/Athens";

const defaultStartHour = companyData.defaultStart.slice(0, 2);
const defaultStartMinute = companyData.defaultStart.slice(-2);

const defaultEndHour = companyData.defaultEnd.slice(0, 2);
const defaultEndMinute = companyData.defaultEnd.slice(-2);

const diffStart = companyData.hoursDiffForStart;
const diffEnd = companyData.hoursDiffForEnd;

// DEBUG: точечное логирование формирования confirmed для конкретной даты/машины
// Пример: const DEBUG_DATE = '2025-11-30'; const DEBUG_CAR_ID = '670bb226223dd911f0595286';
// По умолчанию отключено (оба null)
// const DEBUG_DATE = null;
// const DEBUG_CAR_ID = null;
const DEBUG_DATE = "2025-11-30";
const DEBUG_CAR_ID = "670bb226223dd911f0595286";

export function returnHoursToParseToDayjs(company) {
  const defaultStartHour = company?.defaultStart?.slice(0, 2);
  const defaultStartMinute = company?.defaultStart?.slice(-2);
  const defaultEndHour = company?.defaultEnd?.slice(0, 2);
  const defaultEndMinute = company?.defaultEnd?.slice(-2);
  return {
    defaultStartHour,
    defaultStartMinute,
    defaultEndHour,
    defaultEndMinute,
  };
}

export const processOrders = (orders) => {
  const unavailableDates = [];
  const confirmedDates = [];

  orders.forEach((order) => {
    const startDate = dayjs.utc(order.rentalStartDate).tz(TIMEZONE).startOf("day");
    const endDate = dayjs.utc(order.rentalEndDate).tz(TIMEZONE).startOf("day");

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

export const functionToCheckDuplicates = (
  conflictMessage1 = [],
  conflictMessage2 = [],
  conflictMessage3 = []
) => {
  const combinedSet = new Set([...conflictMessage1, ...conflictMessage2]);

  const filteredConflictMessage3 = conflictMessage3.filter(
    (message) => !combinedSet.has(message)
  );

  return filteredConflictMessage3;
};

// эта функция возвращает все подтвержденные и неподтвержденные даты бронирования а также их начальные и финальные дни НЕ РАБОТАЕТ ПОКА
export function getConfirmedAndUnavailableStartEndDates(
  startEnd,
  confirmedDates,
  unavailableDates
) {
  const confirmedAndStartEnd = [];
  const unavailableAndStartEnd = [];

  startEnd.forEach((date) => {
    if (confirmedDates.includes(date.date)) {
      confirmedAndStartEnd.push(date.date);
    } else if (unavailableDates.includes(date.date)) {
      unavailableAndStartEnd.push(date.date);
    }
  });

  return {
    confirmedAndStartEnd,
    unavailableAndStartEnd,
  };
}

// ЄТА ФУНКЦИЯ ВОЗВРАЩАЕТ ТОЛЬКО ТЕ ДНИ, В КОТОРЫЕ ПЕРЕСЕЧЕНИЕ НАЧАЛА ОЖНОГО БРОНИРОВАНИЯ И КОНЦА ДРУГОГО БРОНИРОВАНИЯ
// ДОРАБОТАТЬ : ЧТОБЫ ФУНКЦИЯ ВОЗРАЩАЛА ТАКЖЕ ОБЬЕКТ  C ЭТИМИ ДВУМЯ ДАТАМИ И С обозначение старт или енд каждой из них
export const functionToretunrStartEndOverlap = (startEnd) => {
  const startEndOverlap = [];

  startEnd.forEach((date) => {
    if (date.type === "start") {
      const overlappingEndDates = startEnd.filter(
        (d) => d.date === date.date && d.type === "end"
      );
      if (overlappingEndDates.length > 0) {
        startEndOverlap.push(date.date);
      }
    }
  });

  return startEndOverlap;
};

// функция которая возвращает 4 массива - 1. только старт и енд даты (внутри они обьекты, чтобы выделить отдельно подтвержденные и неподтвержденные) 2. только подтвержденные внутренние даты 3. только неподтвержденные внутренние даты 4. только те стартовые и конечные даты, которые случаются в одни дни
export function extractArraysOfStartEndConfPending(orders) {
  const unavailable = [];
  const confirmed = [];
  const startEnd = [];

  orders?.forEach((order) => {
    // Нормализуем границы в зоне Афин для работы на уровне дней
    const startDate = dayjs(order.rentalStartDate).tz(TIMEZONE);
    const endDate = dayjs(order.rentalEndDate).tz(TIMEZONE);

    // Формируем время строго в зоне Афин из UTC-значений БД
    const timeStart = dayjs.utc(order.timeIn).tz(TIMEZONE).format("HH:mm");
    const timeEnd = dayjs.utc(order.timeOut).tz(TIMEZONE).format("HH:mm");

    // DEBUG: диапазон заказа и в каких представлениях находятся даты
    if (DEBUG_DATE) {
      const resolvedCarId = order?.carId || order?.car?._id || null;
      if (!DEBUG_CAR_ID || DEBUG_CAR_ID === resolvedCarId) {
        const dbgDate = dayjs(DEBUG_DATE);
        const startDay = startDate.startOf("day");
        const endDay = endDate.startOf("day");
        const includesInclusive = dbgDate.isBetween(
          startDay,
          endDay,
          "day",
          "[]"
        );
        const includesExclusiveInner =
          dbgDate.isAfter(startDay, "day") && dbgDate.isBefore(endDay, "day");
        // Список внутренних дат по дневной логике (исключая start и end)
        const innerDays = [];
        let d = startDay.add(1, "day");
        while (d.isBefore(endDay, "day")) {
          innerDays.push(d.format("YYYY-MM-DD"));
          d = d.add(1, "day");
        }

        console.log(
          `[extractArraysOfStartEndConfPending][DEBUG RANGE ${DEBUG_DATE}]`,
          {
            orderId: order?._id,
            carId: resolvedCarId,
            rentalStartDate_raw: order?.rentalStartDate,
            rentalEndDate_raw: order?.rentalEndDate,
            start_local: dayjs(order.rentalStartDate).format(),
            end_local: dayjs(order.rentalEndDate).format(),
            start_utc: dayjs(order.rentalStartDate).utc().format(),
            end_utc: dayjs(order.rentalEndDate).utc().format(),
            start_TZ: dayjs(order.rentalStartDate).tz(TIMEZONE).format(),
            end_TZ: dayjs(order.rentalEndDate).tz(TIMEZONE).format(),
            computed_start_for_loop: startDate
              .startOf("day")
              .format("YYYY-MM-DD"),
            computed_end_for_loop: endDate.startOf("day").format("YYYY-MM-DD"),
            timeStart,
            timeEnd,
            includes_DEBUG_DATE_inclusive: includesInclusive,
            includes_DEBUG_DATE_as_inner_exclusive: includesExclusiveInner,
            innerDays,
          }
        );
      }
    }

    // Add start and end dates to special handling array
    startEnd.push({
      date: startDate.format("YYYY-MM-DD"),
      type: "start",
      time: timeStart,
      confirmed: order.confirmed,
      orderId: order._id,
    });
    startEnd.push({
      date: endDate.format("YYYY-MM-DD"),
      type: "end",
      time: timeEnd,
      confirmed: order.confirmed,
      orderId: order._id,
    });

    // Handle middle dates (на уровне дней, игнорируя время в последний день)
    let currentDate = startDate.startOf("day").add(1, "day");
    const lastInnerDay = endDate.startOf("day");
    while (currentDate.isBefore(lastInnerDay, "day")) {
      const dateStr = currentDate.format("YYYY-MM-DD");

      if (order.confirmed) {
        confirmed.push(dateStr);
        // Точечный лог: кто положил дату в confirmed
        if (DEBUG_DATE && dateStr === DEBUG_DATE) {
          const resolvedCarId = order?.carId || order?.car?._id || null;
          if (!DEBUG_CAR_ID || DEBUG_CAR_ID === resolvedCarId) {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${dateStr}] add to confirmed by order`,
              {
                orderId: order?._id,
                carId: resolvedCarId,
                rentalStartDate: dayjs(order.rentalStartDate).format(),
                rentalEndDate: dayjs(order.rentalEndDate).format(),
                timeIn: order?.timeIn,
                timeOut: order?.timeOut,
                confirmed: order?.confirmed,
              }
            );
          } else {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${dateStr}] skipped by car filter`,
              {
                orderId: order?._id,
                resolvedCarId,
                expectedCarId: DEBUG_CAR_ID,
                rentalStartDate: dayjs(order.rentalStartDate).format(),
                rentalEndDate: dayjs(order.rentalEndDate).format(),
                confirmed: order?.confirmed,
              }
            );
          }
        }
      } else {
        unavailable.push(dateStr);
      }
      currentDate = currentDate.add(1, "day");
    }

    // RULE: Окрашивать полным красным конечный день подтвержденного заказа,
    // если время окончания + |hoursDiffForEnd| >= 24:00 (учёт знака diffEnd)
    try {
      const endDayStr = endDate.format("YYYY-MM-DD");
      const endHour = Number(timeEnd?.slice(0, 2)) || 0;
      const endMinute = Number(timeEnd?.slice(-2)) || 0;
      const absDiffEnd = Math.abs(Number(diffEnd) || 0);
      const totalMinutes = endHour * 60 + endMinute + absDiffEnd * 60;
      const meetsFullRedCondition = order.confirmed && totalMinutes >= 24 * 60;

      if (meetsFullRedCondition) {
        confirmed.push(endDayStr);
        if (DEBUG_DATE && endDayStr === DEBUG_DATE) {
          const resolvedCarId = order?.carId || order?.car?._id || null;
          if (!DEBUG_CAR_ID || DEBUG_CAR_ID === resolvedCarId) {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${endDayStr}] [RULE] end day marked confirmed (timeEnd + diffStart >= 24h)`,
              {
                orderId: order?._id,
                carId: resolvedCarId,
                timeEnd,
                diffEnd,
                effectiveDiffHours: absDiffEnd,
                totalMinutes,
                thresholdMinutes: 24 * 60,
              }
            );
          } else {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${endDayStr}] [RULE] skipped by car filter for end-day full-red`,
              {
                orderId: order?._id,
                resolvedCarId,
                expectedCarId: DEBUG_CAR_ID,
                timeEnd,
                diffEnd,
                effectiveDiffHours: absDiffEnd,
                totalMinutes,
                thresholdMinutes: 24 * 60,
              }
            );
          }
        }

        // Доп. правило: если на следующий день начинается другой заказ той же машины,
        // то следующий день тоже полностью красный
        try {
          const nextDayStr = endDate
            .startOf("day")
            .add(1, "day")
            .format("YYYY-MM-DD");
          const resolvedCarId = order?.carId || order?.car?._id || null;
          const isSameCar = (o) => {
            const id1 = resolvedCarId;
            const id2 = o?.carId || o?.car?._id || null;
            if (id1 && id2) return id1 === id2;
            if (!id1 && !id2) return true; // нет id у обоих — считаем тот же набор
            return false;
          };
          const hasNextDayStart = orders?.some((o) => {
            if (!isSameCar(o)) return false;
            const oStart = dayjs(o?.rentalStartDate)
              .tz(TIMEZONE)
              .startOf("day");
            return oStart.isSame(endDate.startOf("day").add(1, "day"), "day");
          });
          if (hasNextDayStart) {
            confirmed.push(nextDayStr);
            if (!DEBUG_DATE || DEBUG_DATE === nextDayStr) {
              if (
                !DEBUG_CAR_ID ||
                !resolvedCarId ||
                DEBUG_CAR_ID === resolvedCarId
              ) {
                console.log(
                  `[extractArraysOfStartEndConfPending][DEBUG ${nextDayStr}] [RULE] next day marked confirmed due to adjacent start`,
                  {
                    baseOrderId: order?._id,
                    carId: resolvedCarId,
                    nextDayStr,
                  }
                );
              } else {
                console.log(
                  `[extractArraysOfStartEndConfPending][DEBUG ${nextDayStr}] [RULE] next-day confirm skipped by car filter`,
                  {
                    baseOrderId: order?._id,
                    resolvedCarId,
                    expectedCarId: DEBUG_CAR_ID,
                    nextDayStr,
                  }
                );
              }
            }
          }
        } catch (e2) {
          if (DEBUG_DATE) {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG RULE ERROR next-day]`,
              { message: e2?.message }
            );
          }
        }
      }
    } catch (e) {
      // Безопасный фолбэк: не ломаем поток при ошибке парсинга времени
      if (DEBUG_DATE) {
        console.log(`[extractArraysOfStartEndConfPending][DEBUG RULE ERROR]`, {
          message: e?.message,
        });
      }
    }

    // RULE: Окрашивать полным красным стартовый день подтвержденного заказа,
    // если время начала - hoursDiffForStart <= 00:00 (используем diffStart)
    try {
      const startDayStr = startDate.format("YYYY-MM-DD");
      const startHour = Number(timeStart?.slice(0, 2)) || 0;
      const startMinute = Number(timeStart?.slice(-2)) || 0;
      const totalMinutesStart =
        startHour * 60 + startMinute - (Number(diffStart) || 0) * 60;
      const meetsFullRedStartCondition =
        order.confirmed && totalMinutesStart <= 0;

      if (meetsFullRedStartCondition) {
        confirmed.push(startDayStr);
        if (DEBUG_DATE && startDayStr === DEBUG_DATE) {
          const resolvedCarId = order?.carId || order?.car?._id || null;
          if (!DEBUG_CAR_ID || DEBUG_CAR_ID === resolvedCarId) {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${startDayStr}] [RULE] start day marked confirmed (timeStart - diffEnd <= 00:00)`,
              {
                orderId: order?._id,
                carId: resolvedCarId,
                timeStart,
                diffStart,
                totalMinutesStart,
                thresholdMinutes: 0,
              }
            );
          } else {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG ${startDayStr}] [RULE] skipped by car filter for start-day full-red`,
              {
                orderId: order?._id,
                resolvedCarId,
                expectedCarId: DEBUG_CAR_ID,
                timeStart,
                diffStart,
                totalMinutesStart,
                thresholdMinutes: 0,
              }
            );
          }
        }

        // Доп. правило: если в предыдущий день заканчивается другой заказ той же машины,
        // то предыдущий день тоже полностью красный
        try {
          const prevDayStr = startDate
            .startOf("day")
            .subtract(1, "day")
            .format("YYYY-MM-DD");
          const resolvedCarId = order?.carId || order?.car?._id || null;
          const isSameCar = (o) => {
            const id1 = resolvedCarId;
            const id2 = o?.carId || o?.car?._id || null;
            if (id1 && id2) return id1 === id2;
            if (!id1 && !id2) return true;
            return false;
          };
          const hasPrevDayEnd = orders?.some((o) => {
            if (!isSameCar(o)) return false;
            const oEnd = dayjs(o?.rentalEndDate).tz(TIMEZONE).startOf("day");
            return oEnd.isSame(
              startDate.startOf("day").subtract(1, "day"),
              "day"
            );
          });
          if (hasPrevDayEnd) {
            confirmed.push(prevDayStr);
            if (!DEBUG_DATE || DEBUG_DATE === prevDayStr) {
              if (
                !DEBUG_CAR_ID ||
                !resolvedCarId ||
                DEBUG_CAR_ID === resolvedCarId
              ) {
                console.log(
                  `[extractArraysOfStartEndConfPending][DEBUG ${prevDayStr}] [RULE] previous day marked confirmed due to adjacent end`,
                  {
                    baseOrderId: order?._id,
                    carId: resolvedCarId,
                    prevDayStr,
                  }
                );
              } else {
                console.log(
                  `[extractArraysOfStartEndConfPending][DEBUG ${prevDayStr}] [RULE] prev-day confirm skipped by car filter`,
                  {
                    baseOrderId: order?._id,
                    resolvedCarId,
                    expectedCarId: DEBUG_CAR_ID,
                    prevDayStr,
                  }
                );
              }
            }
          }
        } catch (e3) {
          if (DEBUG_DATE) {
            console.log(
              `[extractArraysOfStartEndConfPending][DEBUG RULE ERROR prev-day]`,
              { message: e3?.message }
            );
          }
        }
      }
    } catch (eStart) {
      if (DEBUG_DATE) {
        console.log(
          `[extractArraysOfStartEndConfPending][DEBUG RULE ERROR start-day]`,
          { message: eStart?.message }
        );
      }
    }
  });

  // Transform startEnd into the required structure
  const transformedStartEndOverlap = startEnd
    .reduce((acc, date) => {
      // Найти запись для текущей даты
      let entry = acc.find((item) => item.date === date.date);

      if (!entry) {
        // Создаем новую запись, если ее еще нет

        entry = {
          date: date.date,
          startConfirmed: false,
          startPending: false,
          endConfirmed: false,
          endPending: false,
          startExists: false, // Для проверки наличия типа "start"
          endExists: false, // Для проверки наличия типа "end"
        };
        acc.push(entry);
      }

      // Обновляем статус на основе типа и подтверждения
      if (date.type === "start") {
        if (date.confirmed) {
          entry.startConfirmed = true;
        } else {
          entry.startPending = true;
        }
        entry.startExists = true;
      } else if (date.type === "end") {
        if (date.confirmed) {
          entry.endConfirmed = true;
        } else {
          entry.endPending = true;
        }
        entry.endExists = true;
      }

      // console.log("ENTRY of dates in reduce function", entry);

      return acc;
    }, [])
    // Фильтруем, чтобы оставить только те даты, где есть и "start", и "end"
    .filter((entry) => entry.startExists && entry.endExists)
    .reduce((acc, cur) => {
      acc.push({
        date: cur.date,
        startConfirmed: cur.startConfirmed,
        endConfirmed: cur.endConfirmed,
        startPending: cur.startPending,
        endPending: cur.endPending,
      });
      return acc;
    }, []);

  return {
    unavailable,
    confirmed,
    startEnd,
    transformedStartEndOverlap,
  };
}

export function returnOverlapOrders(orders, dateStr) {
  let overlapOrders = [];
  orders?.forEach((order) => {
    const rentalStart = dayjs
      .utc(order.rentalStartDate)
      .tz(TIMEZONE)
      .format("YYYY-MM-DD");
    const rentalEnd = dayjs
      .utc(order.rentalEndDate)
      .tz(TIMEZONE)
      .format("YYYY-MM-DD");
    const targetDate = dayjs.tz(dateStr, "YYYY-MM-DD", TIMEZONE);

    if (targetDate.isBetween(rentalStart, rentalEnd, "day", "[]")) {
      overlapOrders.push(order);
    }
  });

  return overlapOrders;
}

export function returnOverlapOrdersObjects(
  orders,
  transformedStartEndOverlap = []
) {
  // Создаем Map для отслеживания повторений дат
  const dateOccurrences = new Map();

  // Первый проход: собираем все даты и подсчитываем их повторения
  orders?.forEach((order) => {
    const rentalStart = dayjs
      .utc(order.rentalStartDate)
      .tz(TIMEZONE)
      .startOf("day");
    const rentalEnd = dayjs
      .utc(order.rentalEndDate)
      .tz(TIMEZONE)
      .startOf("day");
    let currentDate = rentalStart;

    while (currentDate.isBetween(rentalStart, rentalEnd, "day", "[]")) {
      const dateStr = currentDate.format("YYYY-MM-DD");

      // Получаем или инициализируем объект для этой даты
      const counts = dateOccurrences.get(dateStr) || {
        confirmed: 0,
        pending: 0,
      };

      // Увеличиваем соответствующий счетчик
      if (order.confirmed) {
        counts.confirmed += 1;
      } else {
        counts.pending += 1;
      }

      // Обновляем Map
      dateOccurrences.set(dateStr, counts);

      // Переходим к следующему дню
      currentDate = currentDate.add(1, "day");
    }
  });

  // Преобразуем Map в массив объектов
  const result = Array.from(dateOccurrences.entries())
    .map(([date, counts]) => ({
      date,
      ...counts,
    }))
    .filter(
      ({ confirmed, pending }) =>
        (confirmed > 0 && pending > 0) || confirmed > 1 || pending > 1
    ) // Дополнительный фильтр для исключения дат из transformedStartEndOverlap
    .filter(
      ({ date }) =>
        !transformedStartEndOverlap?.some((overlap) => overlap.date === date)
    );

  return result;
}

// function to return available start and available end if end  confirmed and start confirmed exist on the date
export function returnTime(startEndDates, date) {
  const dateFormat = dayjs(date).format("YYYY-MM-DD");
  const dateInrange = startEndDates?.find(
    (el) => el.date == dateFormat && el.confirmed
  );

  if (dateInrange) {
    return dateInrange;
  }
  return;
}

// пушает фремя в существующий datejs обьект
export function setTimeToDatejs(date, time, isStart = false) {
  // console.log("DATE", date);
  // console.log("time", time);
  if (time) {
    const hour = Number(time?.slice(0, 2));
    const minute = Number(time?.slice(-2));
    const newDateWithTime = dayjs(date)
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    return newDateWithTime;
  } else if (isStart) {
    // console.log("???? day to retunr for START", dayjs(date).hour(15).minute(0));
    return dayjs(date)
      .hour(defaultStartHour)
      .minute(defaultStartMinute)
      .second(0)
      .millisecond(0);
  } else
    return dayjs(date)
      .hour(defaultEndHour)
      .minute(defaultEndMinute)
      .second(0)
      .millisecond(0);
}

// returns time is start time of the orders == end time of anothjer order
//or
// end time of the orders == start time of anothjer order
export function calculateAvailableTimes(
  startEndDates,
  startStr,
  endStr,
  orderId
) {
  let availableStart = null;
  let availableEnd = null;

  console.log("!startStr", startStr);
  console.log("!endStr", endStr);
  const filteredStartEndDates = startEndDates?.filter((dateObj) => {
    return dateObj.orderId != orderId;
  });

  console.log("filteredStartEndDates", filteredStartEndDates);

  // Retrieve time info for start and end dates
  const timeStart = returnTime(startEndDates, startStr);
  console.log("!timeStart", timeStart);
  if (timeStart && timeStart.type === "end" && timeStart.confirmed) {
    availableStart = timeStart.time;
  }

  const timeEnd = returnTime(startEndDates, endStr);
  console.log("!timeEnd", timeEnd);
  if (timeEnd && timeEnd.type === "start" && timeEnd.confirmed) {
    availableEnd = timeEnd.time;
  }

  console.log("availableStart", availableStart);
  console.log("availableEnd", availableEnd);

  console.log("timeStart", timeStart);
  console.log("timeEnd", timeEnd);

  // Parse hours and minutes from the available times
  const hourStart = Number(timeStart?.time.slice(0, 2)) || defaultStartHour; // Default hour is 15
  const minuteStart =
    Number(timeStart?.time.slice(-2)) || defaultStartMinute || 0; // Default minute is 0

  const hourEnd = Number(timeEnd?.time.slice(0, 2)) || defaultEndHour; // Default hour is 10
  const minuteEnd = Number(timeEnd?.time.slice(-2)) || defaultEndMinute || 0; // Default minute is 0

  return {
    availableStart,
    availableEnd,
    hourStart,
    minuteStart,
    hourEnd,
    minuteEnd,
  };
}
export function toParseTime(rentalDate, day) {
  const hour = day.hour();
  const minute = day.minute();

  return dayjs(rentalDate).hour(hour).minute(minute);
}
