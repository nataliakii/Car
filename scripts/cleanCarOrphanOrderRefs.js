/**
 * Очистка Car.orders[] от ссылок на несуществующие заказы.
 *
 * Проходит по всем машинам, проверяет каждый ObjectId в orders[] —
 * если заказа с таким _id нет в коллекции orders, удаляет ссылку.
 * Сами заказы не трогает — только массив orders в модели Car.
 *
 * Usage:
 *   npm run clean:car-order-refs
 *   MONGODB_URI="mongodb://..." npm run clean:car-order-refs
 *   MONGODB_DB_NAME="Car" npm run clean:car-order-refs   # если БД не в URI
 *   npm run clean:car-order-refs -- --dry-run   # только показать, без изменений
 */

const { MongoClient, ObjectId } = require("mongodb");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/natalicar";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "Car";
const DRY_RUN = process.argv.includes("--dry-run");

function isValidObjectId(v) {
  if (!v) return false;
  if (v instanceof ObjectId) return true;
  if (typeof v === "string" && v.length === 24 && /^[a-fA-F0-9]{24}$/.test(v)) return true;
  return false;
}

function toObjectId(v) {
  if (v instanceof ObjectId) return v;
  return new ObjectId(String(v));
}

async function cleanCarOrphanOrderRefs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    if (DRY_RUN) console.log("(dry-run: no changes will be made)\n");

    const db = client.db(MONGODB_DB_NAME);
    const carsCollection = db.collection("cars");
    console.log(`Using database: "${MONGODB_DB_NAME}", collections: cars, orders`);
    const ordersCollection = db.collection("orders");

    const cars = await carsCollection.find({}).toArray();
    console.log(`Total cars: ${cars.length}`);

    let carsUpdated = 0;
    let totalOrphansRemoved = 0;

    for (const car of cars) {
      const orders = car.orders;
      if (!Array.isArray(orders) || orders.length === 0) continue;

      const validIds = orders.filter(isValidObjectId).map(toObjectId);
      const invalidCount = orders.length - validIds.length;

      if (validIds.length === 0) {
        if (invalidCount > 0) {
          console.log(`  Car ${car.carNumber || car._id}: ${invalidCount} invalid refs (not ObjectId) — would clear orders[]`);
          totalOrphansRemoved += invalidCount;
          if (!DRY_RUN) {
            await carsCollection.updateOne(
              { _id: car._id },
              { $set: { orders: [] } }
            );
            carsUpdated++;
          }
        }
        continue;
      }

      const existingIds = await ordersCollection
        .find({ _id: { $in: validIds } })
        .project({ _id: 1 })
        .toArray();
      const existingSet = new Set(existingIds.map((o) => o._id.toString()));

      const keptIds = validIds.filter((id) => existingSet.has(id.toString()));
      const orphanIds = validIds.filter((id) => !existingSet.has(id.toString()));
      const toRemove = orphanIds.length + invalidCount;

      if (toRemove === 0) continue;

      totalOrphansRemoved += toRemove;
      const parts = [];
      if (orphanIds.length) parts.push(`${orphanIds.length} non-existent`);
      if (invalidCount) parts.push(`${invalidCount} invalid format`);
      console.log(
        `  Car ${car.carNumber || car._id}: removing ${parts.join(", ")} ref(s)${orphanIds.length ? `: ${orphanIds.map((id) => id.toString()).join(", ")}` : ""}`
      );

      if (!DRY_RUN) {
        await carsCollection.updateOne(
          { _id: car._id },
          { $set: { orders: keptIds } }
        );
        carsUpdated++;
      }
    }

    console.log("\n--- Summary ---");
    console.log(`Orphan refs found: ${totalOrphansRemoved}`);
    if (DRY_RUN) {
      console.log("(dry-run: run without --dry-run to apply changes)");
    } else {
      console.log(`Cars updated: ${carsUpdated}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

if (require.main === module) {
  cleanCarOrphanOrderRefs()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}

module.exports = { cleanCarOrphanOrderRefs };
