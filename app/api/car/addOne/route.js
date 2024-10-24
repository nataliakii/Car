import { NextResponse } from "next/server";
import { Car } from "@models/car";
import { connectToDB } from "@utils/database";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import fs from "fs/promises";
import path from "path";
import cloudinary from "@utils/cloudinary";

dayjs.extend(isBetween);

export async function POST(req) {
  await connectToDB();

  try {
    const formData = await req.formData();

    // Extract file and carData
    const file = formData.get("image");
    const carData = {
      carNumber: formData.get("carNumber"),
      model: formData.get("model"),
      class: formData.get("class"),
      transmission: formData.get("transmission"),
      seats: formData.get("seats"),
      numberOfDoors: formData.get("numberOfDoors"),
      airConditioning: formData.get("airConditioning"),
      enginePower: formData.get("enginePower"),
      pricingTiers: JSON.parse(formData.get("pricingTiers")),
    };

    console.log("Received file:", file);

    if (file) {
      const allowedMimeTypes = ["image/jpeg", "image/png"];
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid file type. Only JPEG and PNG are allowed",
          },
          { status: 400 }
        );
      }
    }

    try {
      const pricingTiersString = formData.get("pricingTiers");
      if (pricingTiersString) {
        carData.pricingTiers = JSON.parse(pricingTiersString);
      } else {
        carData.pricingTiers = {
          NoSeason: { days: {} },
          LowSeason: { days: {} },
          LowUpSeason: { days: {} },
          MiddleSeason: { days: {} },
          HighSeason: { days: {} },
        };
      }
    } catch (error) {
      console.error("Error parsing pricingTiers:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid pricing tiers format",
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      "carNumber",
      "model",
      "class",
      "transmission",
      "seats",
      "numberOfDoors",
      "airConditioning",
      "enginePower",
      "pricingTiers",
    ];
    for (const field of requiredFields) {
      if (!carData[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate enum fields
    const enumFields = {
      class: [
        "Economy",
        "Premium",
        "MiniBus",
        "Crossover",
        "Limousine",
        "Compact",
        "Convertible",
      ],
      transmission: ["Automatic", "Manual"],
      fueltype: [
        "Diesel",
        "Petrol",
        "Natural Gas",
        "Hybrid Diesel",
        "Hybrid Petrol",
      ],
    };

    for (const [field, allowedValues] of Object.entries(enumFields)) {
      if (carData[field] && !allowedValues.includes(carData[field])) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid value for ${field}. Allowed values are: ${allowedValues.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate number ranges
    if (carData.numberOfDoors < 2 || carData.numberOfDoors > 6) {
      return NextResponse.json(
        { success: false, message: "Number of doors must be between 2 and 6" },
        { status: 400 }
      );
    }

    // Validate pricingTiers
    const seasons = [
      "NoSeason",
      "LowSeason",
      "LowUpSeason",
      "MiddleSeason",
      "HighSeason",
    ];

    for (const season of seasons) {
      if (
        !carData.pricingTiers[season] ||
        !carData.pricingTiers[season].days ||
        Object.keys(carData.pricingTiers[season].days).length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Missing pricing information for ${season}`,
          },
          { status: 400 }
        );
      }
    }

    // Process image file upload if file is provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadToCloudinary = () =>
        new Promise((resolve, reject) => {
          const stream = require("stream");
          const passthrough = new stream.PassThrough();
          passthrough.end(buffer);

          // Cloudinary upload
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) {
                console.error("Error uploading to Cloudinary:", error);
                reject(error); // Reject the promise on error
              } else {
                console.log("Upload result:", result);
                resolve(result.public_id); // Resolve the promise with the image URL
              }
            })
            .end(passthrough.read()); // Pipe the file to the Cloudinary uploader
        });

      try {
        // Wait for the Cloudinary upload to complete and get the secure URL
        const secureUrl = await uploadToCloudinary();
        carData.photoUrl = secureUrl;
        console.log("Cloudinary URL:", carData.photoUrl);
      } catch (uploadError) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to upload image to Cloudinary",
            error: uploadError.message,
          },
          { status: 500 }
        );
      }
    }

    // Create new car
    console.log("carData", carData);
    const newCar = new Car(carData);
    await newCar.save();

    return NextResponse.json(
      {
        success: true,
        message: `Машина ${newCar.carNumber} добавлена`,
        data: newCar,
        status: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding car:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A car with this car number already exists",
          status: 409,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to add car", error: error.message },
      { status: 500 }
    );
  }
}

async function generateUniqueFilename(basePath, originalFilename) {
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  let filename = originalFilename;
  let counter = 1;

  while (
    await fs
      .access(path.join(basePath, filename))
      .then(() => true)
      .catch(() => false)
  ) {
    filename = `${nameWithoutExt}_${counter}${ext}`;
    counter++;
  }

  return filename;
}
