import { Car } from "@models/car";
import { connectToDB } from "@utils/database";
import { revalidatePath, revalidateTag } from "next/cache";
import dayjs from "dayjs";

export const PUT = async (req) => {
  try {
    await connectToDB();

    const { _id, ...updateFields } = await req.json();

    updateFields.dateLastModified = dayjs().toDate();

    const updatedCar = await Car.findByIdAndUpdate(_id, updateFields, {
      new: true,
    });

    if (!updatedCar) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Car not found",
        }),
        { status: 404 }
      );
    }
    
    // Инвалидируем кеш для списка машин и конкретной машины
    revalidateTag("cars");
    revalidatePath("/api/car/all");
    revalidatePath(`/api/car/${_id}`);
    
    return new Response(JSON.stringify(updatedCar), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Failed to update car", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
