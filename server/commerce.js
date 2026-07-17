const PRODUCT_PRICE_KEYS = Object.freeze({
  "spray-dried": "STRIPE_PRICE_SPRAY_DRIED",
  agglomerated: "STRIPE_PRICE_AGGLOMERATED",
  "freeze-dried": "STRIPE_PRICE_FREEZE_DRIED",
});

export const PRODUCT_IDS = Object.freeze(Object.keys(PRODUCT_PRICE_KEYS));

export function commaSeparatedValues(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function commerceConfiguration(environment = process.env) {
  const countryValues = commaSeparatedValues(environment.STRIPE_ALLOWED_COUNTRIES);
  const countries = countryValues
    .map((country) => country.toUpperCase())
    .filter((country) => /^[A-Z]{2}$/.test(country));
  const shippingMode = String(environment.STRIPE_SHIPPING_MODE || "").trim().toLowerCase();
  const shippingRateValues = commaSeparatedValues(environment.STRIPE_SHIPPING_RATE_IDS);
  const shippingRateIds = shippingRateValues.filter((rateId) => /^shr_[A-Za-z0-9]+$/.test(rateId));
  const availableProducts = commaSeparatedValues(environment.COMMERCE_AVAILABLE_PRODUCTS)
    .filter((id) => PRODUCT_IDS.includes(id));

  const checks = Object.freeze({
    payments: Boolean(environment.STRIPE_SECRET_KEY),
    webhook: Boolean(environment.STRIPE_WEBHOOK_SECRET),
    orderStorage: Boolean(environment.BLOB_READ_WRITE_TOKEN),
    productPrices: PRODUCT_IDS.every((id) => Boolean(environment[PRODUCT_PRICE_KEYS[id]])),
    publicCatalog: environment.COMMERCE_PUBLIC_CATALOG_READY === "true",
    countries: countries.length > 0 && countries.length === countryValues.length,
    shipping: shippingMode === "included" || (
      shippingMode === "rates" &&
      shippingRateIds.length > 0 &&
      shippingRateIds.length === shippingRateValues.length
    ),
    legal: environment.COMMERCE_LEGAL_READY === "true",
    inventory: environment.COMMERCE_INVENTORY_READY === "true" && availableProducts.length > 0,
    fulfillment: environment.COMMERCE_FULFILLMENT_READY === "true",
    support: environment.COMMERCE_SUPPORT_READY === "true",
  });

  return Object.freeze({
    ready: Object.values(checks).every(Boolean),
    checks,
    countries,
    shippingMode,
    shippingRateIds,
    availableProducts,
    productPriceKeys: PRODUCT_PRICE_KEYS,
  });
}

export function publicCommerceStatus(environment = process.env) {
  const configuration = commerceConfiguration(environment);
  return {
    ok: true,
    ready: configuration.ready,
    purchasePath: configuration.ready ? "checkout" : "inquiry",
    message: configuration.ready
      ? "Secure online checkout is available."
      : "Online checkout is being prepared. Your selection can still be sent to the Coffendi team.",
  };
}
