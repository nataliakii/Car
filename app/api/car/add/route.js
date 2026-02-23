import { Car } from "@models/car";
import { connectToDB } from "@utils/database";
import { carsData as initialCarsData } from "@utils/initialData";
import { revalidatePath, revalidateTag } from "next/cache";

export const POST = async (request) => {
  try {
    await connectToDB();

    // Assuming the cars data is sent in the request body
    const incomingCarsData = await request.json();
    const existingCars = [];

    for (const carData of incomingCarsData) {
      const { carNumber } = carData;

      const existingCar = await Car.findOne({ carNumber });

      if (existingCar) {
        existingCars.push(existingCar);
      }
    }

    // Add cars to the database
    const newCars = await Car.create(incomingCarsData);
    
    // Инвалидируем кеш для списка машин
    revalidateTag("cars");
    revalidatePath("/api/car/all");
    revalidatePath("/api/car/models");
    
    return new Response(
      JSON.stringify({ success: true, data: newCars, existing: existingCars }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error adding new cars:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to add new cars",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

//this endpoint delete all old cars and create new ones
export const GET = async (request) => {
  try {
    // Safety guard: disable destructive reseed in production unless explicitly allowed
    if (process.env.NODE_ENV !== "development") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Reseed endpoint is disabled in production",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    await connectToDB();

    // const carsData = await request.json(); // Assuming the cars data is sent in the request body

    // Delete all existing cars
    await Car.deleteMany({});

    // Add new cars to the database
    const newCars = await Car.create(initialCarsData);

    // Инвалидируем кеш для списка машин
    revalidateTag("cars");
    revalidatePath("/api/car/all");
    revalidatePath("/api/car/models");

    return new Response(JSON.stringify({ success: true, data: newCars }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error rewriting cars:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to rewrite cars",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
