import { connectToDB } from "@utils/database";
import { Car } from "@models/car";
import { toBusinessDateTime } from "@/domain/orders/numberOfDays";

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
      timeIn,
      timeOut,
      kacko = "TPL",
      childSeats = 0,
      secondDriver = false,
    } = debugBody;
    const calculationStartSource = timeIn ?? rentalStartDate;
    const calculationEndSource = timeOut ?? rentalEndDate;
    const normalizedStartDate = toBusinessDateTime(calculationStartSource);
    const normalizedEndDate = toBusinessDateTime(calculationEndSource);
    const normalizedSecondDriver = toBooleanField(secondDriver, false);
    console.log("[API calcTotalPrice] Получены параметры:", {
      carNumber,
      regNumber,
      rentalStartDate,
      rentalEndDate,
      timeIn,
      timeOut,
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
      !normalizedEndDate ||
      !normalizedStartDate.isValid() ||
      !normalizedEndDate.isValid()
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
