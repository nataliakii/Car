import { Car } from "@models/car";
import { connectToDB } from "@utils/database";
import { revalidatePath, revalidateTag } from "next/cache";

export const DELETE = async (request, { params }) => {
  try {
    await connectToDB();
    const { carId } = params;

    // Delete the car
    await Car.findByIdAndDelete(carId);

    // Инвалидируем кеш для списка машин
    revalidateTag("cars");
    revalidatePath("/api/car/all");
    revalidatePath("/api/car/models");
    revalidatePath(`/api/car/${carId}`);

    return new Response(
      JSON.stringify({ message: `Car with id ${carId} deleted successfully` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting car:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
