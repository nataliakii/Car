const DEFAULT_SECOND_DRIVER_PRICE_PER_DAY = 5;

function parseSecondDriverPrice(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function getSecondDriverPricePerDay() {
  const serverPrice = parseSecondDriverPrice(
    process.env.SECOND_DRIVER_PRICE_PER_DAY
  );
  if (serverPrice !== null) {
    return serverPrice;
  }

  const publicPrice = parseSecondDriverPrice(
    process.env.NEXT_PUBLIC_SECOND_DRIVER_PRICE_PER_DAY
  );
  if (publicPrice !== null) {
    return publicPrice;
  }

  return DEFAULT_SECOND_DRIVER_PRICE_PER_DAY;
}

export function getSecondDriverPriceLabelValue() {
  const price = getSecondDriverPricePerDay();
  return Number.isInteger(price) ? String(price) : String(price);
}
