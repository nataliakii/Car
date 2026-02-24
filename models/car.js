import { Schema, model, models } from "mongoose";
import { seasons } from "@utils/companyData";
import { CAR_CLASSES, TRANSMISSION_TYPES, FUEL_TYPES } from "./enums";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  getBusinessRentalDaysByMinutes,
  toBusinessDateTime,
} from "@/domain/orders/numberOfDays";
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

const BUSINESS_TZ = "Europe/Athens";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_SECOND_DRIVER_PRICE_PER_DAY = 5;

function getSecondDriverPricePerDay() {
  const raw = process.env.SECOND_DRIVER_PRICE_PER_DAY;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return DEFAULT_SECOND_DRIVER_PRICE_PER_DAY;
}

function parseDateInBusinessTz(value) {
  if (value == null) return null;

  if (dayjs.isDayjs(value)) {
    return value.tz(BUSINESS_TZ);
  }

  if (value instanceof Date) {
    return dayjs(value).tz(BUSINESS_TZ);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      return dayjs.tz(trimmed, "YYYY-MM-DD", BUSINESS_TZ);
    }
    return dayjs(trimmed).tz(BUSINESS_TZ);
  }

  return dayjs(value).tz(BUSINESS_TZ);
}

function toBusinessStartOfDay(value) {
  const parsed = parseDateInBusinessTz(value);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.startOf("day");
}

const pricingTierSchema = new Schema({
  days: {
    type: Map,
    of: Number,
    required: true,
  },
});

const createEnumValidator = (enumObject) => ({
  values: Object.values(enumObject),
  message: `{VALUE} is not a valid option. Valid options are: ${Object.values(
    enumObject
  ).join(", ")}`,
  validate: {
    validator: function (v) {
      return Object.values(enumObject)
        .map((val) => val.toLowerCase())
        .includes(v.toLowerCase());
    },
    message: (props) => `${props.value} is not a valid option`,
  },
});

const CarSchema = new Schema({
  deposit: {
    type: Number,
    default: 0,
  },
  carNumber: {
    type: String,
    required: true,
    unique: true,
  },
  model: {
    type: String,
    required: true,
  },
  /** SEO-friendly URL segment. Unique (sparse: only indexed when set). Normalize in utility, not here. */
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  photoUrl: {
    type: String,
  },
  sort: {
    type: Number,
    default: 999,
  },
  class: {
    type: String,
    enum: createEnumValidator(CAR_CLASSES),
    required: true,
    set: (v) => v.toLowerCase(),
  },
  transmission: {
    type: String,
    enum: createEnumValidator(TRANSMISSION_TYPES),
    required: true,
    set: (v) => v.toLowerCase(),
  },
  fueltype: {
    type: String,
    enum: createEnumValidator(FUEL_TYPES),
    set: (v) => v.toLowerCase(),
  },
  seats: {
    type: Number,
    default: 5,
    required: true,
  },
  registration: {
    type: Number,
    default: 2016,
  },
  regNumber: {
    type: String,
    default: "NKT 123",
  },
  color: {
    type: String,
  },
  numberOfDoors: {
    type: Number,
    min: 2,
    max: 6,
    required: true,
  },
  airConditioning: {
    type: Boolean,
    required: true,
  },
  enginePower: {
    type: Number,
    required: true,
  },
  engine: {
    type: String,
    default: "1.500",
  },
  PriceChildSeats: {
    type: Number,
    default: 3,
  },
  PriceKacko: {
    type: Number,
    default: 5,
  },
  franchise: {
    type: Number,
    default: 300,
  },
  pricingTiers: {
    type: Map,
    of: pricingTierSchema,
    required: true,
  },
  orders: [
    {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  dateAddCar: {
    type: Date,
  },
  dateLastModified: {
    type: Date,
  },
});

CarSchema.methods.getSeason = function (date) {
  // Логгируем все сезоны и их даты из базы
  console.log("[SEASON] Сезоны из базы:");
  for (const [season, range] of Object.entries(seasons)) {
    console.log(`  ${season}: start = ${range.start}, end = ${range.end}`);
  }
  // Явно указываем формат даты заказа
  const today = dayjs(date, "MM/DD/YYYY", true);
  const currentYear = today.year();

  console.log(`\n[SEASON] Проверяем дату: ${today.format("MM/DD/YYYY")}`);
  // 1. Сначала проверяем обычные сезоны (не переливающиеся)
  for (const [season, range] of Object.entries(seasons)) {
    // Формируем строку для даты начала и конца сезона
    // Преобразуем 'DD/MM' -> 'MM/DD'
    const [startDay, startMonth] = range.start.split("/");
    const [endDay, endMonth] = range.end.split("/");
    let startString = `${startMonth}/${startDay}/${currentYear}`;
    let endString;
    // Универсальная логика переходящего сезона:
    // Если месяц начала > месяц конца, или месяц равен и день начала > день конца — сезон "перетекает" через год
    if (
      parseInt(startMonth) > parseInt(endMonth) ||
      (parseInt(startMonth) === parseInt(endMonth) &&
        parseInt(startDay) > parseInt(endDay))
    ) {
      endString = `${endMonth}/${endDay}/${currentYear + 1}`;
    } else {
      endString = `${endMonth}/${endDay}/${currentYear}`;
    }
    console.log(
      `[SEASON] ${season}: startString = ${startString}, endString = ${endString}`
    );
    // Преобразуем строки в даты dayjs с указанием формата
    const startDate = dayjs(startString, "MM/DD/YYYY", true);
    const endDate = dayjs(endString, "MM/DD/YYYY", true);

    console.log(
      `[SEASON] ${season}: startDate = ${startDate.format(
        "MM/DD/YYYY"
      )}, endDate = ${endDate.format("MM/DD/YYYY")}`
    );

    if (today.isBetween(startDate, endDate, "day", "[]")) {
      console.log(`[SEASON] Дата попала в сезон: ${season}`);
      return season;
    }
  }

  return "NoSeason"; // Default return if no season matches
};

// Method to calculate price based on days and current season
// СТАРЫЙ АЛГОРИТМ ЗАКОММЕНТИРОВАН
/*
CarSchema.methods.calculatePrice = function (days, date = dayjs()) {
  // ...старый алгоритм...
};
*/

// Новый алгоритм: расчёт по дням, с логгированием и скидкой
import DiscountSetting from "./DiscountSetting";

CarSchema.methods.calculateTotalRentalPricePerDay = async function (
  startDate,
  endDate,
  kacko = "TPL",
  childSeats = 0,
  secondDriver = false
) {
  console.log("[DEBUG] calculateTotalRentalPricePerDay called with:", {
    startDate,
    endDate,
    kacko,
    childSeats,
    secondDriver,
    PriceKacko: this.PriceKacko,
    PriceChildSeats: this.PriceChildSeats,
  });
  const dayjsStart = toBusinessDateTime(startDate);
  const dayjsEnd = toBusinessDateTime(endDate);
  if (!dayjsStart || !dayjsEnd) {
    throw new Error("Invalid rental start/end date for price calculation");
  }
  const days = getBusinessRentalDaysByMinutes(dayjsStart, dayjsEnd);
  if (days <= 0) {
    return { total: 0, days: 0 };
  }
  let total = 0;
  let logs = [];

  for (let i = 0; i < days; i++) {
    const currentDate = dayjsStart.add(i, "day");
    // 1. Определяем сезон для текущего дня
    const season = this.getSeason(currentDate);
    // 2. Определяем тариф
    let targetDays;
    if (days >= 1 && days <= 4) {
      targetDays = 4;
    } else if (days >= 5 && days <= 14) {
      targetDays = 7;
    } else {
      targetDays = 14;
    }
    // 3. Получаем цену за день
    const pricingTiers = this.pricingTiers.get(season);
    let price = pricingTiers?.days?.get(targetDays.toString()) || 0;

    // 4. Проверяем скидку
    let discount = 0;
    let discountActive = false;
    try {
      const discountSetting = await DiscountSetting.findOne();
      if (discountSetting) {
        const startDiscount = toBusinessStartOfDay(discountSetting.startDate);
        const endDiscount = toBusinessStartOfDay(discountSetting.endDate);
        if (startDiscount && endDiscount) {
          if (
            currentDate.isSame(startDiscount, "day") ||
            currentDate.isSame(endDiscount, "day") ||
            (currentDate.isAfter(startDiscount, "day") &&
              currentDate.isBefore(endDiscount, "day"))
          ) {
            discount = discountSetting.discount || 0;
            discountActive = true;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching discount settings:", err);
    }

    // 5. Применяем скидку
    let finalPrice = price;
    if (discountActive && discount > 0) {
      finalPrice = Math.round(price * (1 - discount / 100));
    }

    // 6. Логгируем расчёт по дню
    logs.push({
      day: i + 1,
      date: currentDate.format("MM/DD/YYYY"),
      season,
      targetDays,
      price,
      discount,
      discountActive,
      finalPrice,
    });
    total += finalPrice;
  }
  const baseRentalTotal = total;
  let kaskoTotal = 0;
  let childSeatsTotal = 0;
  let secondDriverTotal = 0;
  const secondDriverPricePerDay = getSecondDriverPricePerDay();

  // Добавляем стоимость КАСКО, если выбрано CDW
  if (kacko === "CDW") {
    const kaskoPerDay = this.PriceKacko || 0;
    kaskoTotal = kaskoPerDay * days;
    total += kaskoTotal;
    console.log(
      `[ALGO] КАСКО выбрано: Цена за день = ${kaskoPerDay}, дней = ${days}, всего за КАСКО = ${kaskoTotal}`
    );
  } else {
    console.log(`[ALGO] КАСКО не выбрано (тип страховки: ${kacko})`);
  }
  // Добавляем стоимость детских кресел, если выбрано больше 0
  console.log(
    "[DEBUG] childSeats перед проверкой:",
    childSeats,
    typeof childSeats
  );
  if (childSeats && childSeats > 0) {
    const childSeatPerDay = this.PriceChildSeats || 0;
    childSeatsTotal = childSeatPerDay * childSeats * days;
    total += childSeatsTotal;
    console.log(
      `[ALGO] Детские кресла: Цена за день = ${childSeatPerDay}, количество кресел = ${childSeats}, дней = ${days}, всего за кресла = ${childSeatsTotal}`
    );
  } else {
    console.log(
      `[ALGO] Детские кресла не выбраны (childSeats = ${childSeats})`
    );
  }
  const normalizedSecondDriver =
    typeof secondDriver === "string"
      ? secondDriver.trim().toLowerCase()
      : secondDriver;
  const secondDriverEnabled =
    normalizedSecondDriver === true ||
    normalizedSecondDriver === 1 ||
    normalizedSecondDriver === "true" ||
    normalizedSecondDriver === "1";
  if (secondDriverEnabled) {
    secondDriverTotal = secondDriverPricePerDay * days;
    total += secondDriverTotal;
    console.log(
      `[ALGO] Второй водитель: Цена за день = ${secondDriverPricePerDay}, дней = ${days}, всего = ${secondDriverTotal}`
    );
  } else {
    console.log("[ALGO] Второй водитель не выбран");
  }
  console.log("[ALGO] Breakdown расчёта:", {
    baseRentalTotal,
    kaskoTotal,
    childSeatsTotal,
    secondDriverTotal,
    total,
  });
  console.log(`[DEBUG] Итоговая цена после всех расчётов:`, total);
  console.log("[ALGO] Расчёт по дням:", logs);
  console.log("[ALGO] Итоговая цена заказа (с КАСКО и креслами):", total);
  return { total, days };
};

const Car = models?.Car || model("Car", CarSchema);

// HMR/cache safety: ensure latest pricing method is applied on cached model too.
if (Car?.schema?.methods) {
  Car.schema.methods.calculateTotalRentalPricePerDay =
    CarSchema.methods.calculateTotalRentalPricePerDay;
}

export { CarSchema, Car };
