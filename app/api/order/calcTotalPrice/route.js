import { connectToDB } from "@utils/database";
import { Car } from "@models/car";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const BUSINESS_TZ = "Europe/Athens";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeToBusinessDate(value) {
  if (value == null) return null;

  if (dayjs.isDayjs(value)) {
    return value.tz(BUSINESS_TZ).format("YYYY-MM-DD");
  }

  if (value instanceof Date) {
    return dayjs(value).tz(BUSINESS_TZ).format("YYYY-MM-DD");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (DATE_ONLY_PATTERN.test(trimmed)) return trimmed;
    const parsed = dayjs(trimmed).tz(BUSINESS_TZ);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }

  const parsed = dayjs(value).tz(BUSINESS_TZ);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

function toBooleanField(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0" || normalized === "") return false;
  }
  return Boolean(value);
}

export async function POST(request) {
  // Логируем параметры для диагностики
  let debugBody;
  try {
    await connectToDB();
    debugBody = await request.json();
    const {
      carNumber,
      regNumber,
      rentalStartDate,
      rentalEndDate,
      kacko = "TPL",
      childSeats = 0,
      secondDriver = false,
    } = debugBody;
    const normalizedStartDate = normalizeToBusinessDate(rentalStartDate);
    const normalizedEndDate = normalizeToBusinessDate(rentalEndDate);
    const normalizedSecondDriver = toBooleanField(secondDriver, false);
    console.log("[API calcTotalPrice] Получены параметры:", {
      carNumber,
      regNumber,
      rentalStartDate,
      rentalEndDate,
      normalizedStartDate,
      normalizedEndDate,
      kacko,
      childSeats,
      secondDriver: normalizedSecondDriver,
    });
    const normalizedCarNumber =
      typeof carNumber === "string" ? carNumber.trim() : "";
    const normalizedRegNumber =
      typeof regNumber === "string" ? regNumber.trim() : "";
    if (
      (!normalizedRegNumber && !normalizedCarNumber) ||
      !normalizedStartDate ||
      !normalizedEndDate
    ) {
      return new Response(JSON.stringify({ message: "Missing parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let car = null;
    if (normalizedRegNumber) {
      car = await Car.findOne({ regNumber: normalizedRegNumber });
    }
    if (!car && normalizedCarNumber) {
      car = await Car.findOne({ carNumber: normalizedCarNumber });
    }

    if (!car) {
      return new Response(JSON.stringify({ message: "Car not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log("API calcTotalPrice params:", {
      kacko,
      childSeats,
      secondDriver: normalizedSecondDriver,
    });
    const { total, days } = await car.calculateTotalRentalPricePerDay(
      normalizedStartDate,
      normalizedEndDate,
      kacko,
      childSeats,
      normalizedSecondDriver
    );
    return new Response(JSON.stringify({ totalPrice: total, days }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
