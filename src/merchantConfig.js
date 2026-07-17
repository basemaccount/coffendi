const environment = import.meta.env || {};

/**
 * @typedef {Object} MerchantProfile
 * @property {string} legalName
 * @property {string} tradingName
 * @property {string} registrationNumber
 * @property {string} taxNumber
 * @property {string} address
 * @property {string} country
 * @property {string} supportEmail
 * @property {string} supportPhone
 * @property {string} returnsAddress
 * @property {string} businessHours
 * @property {string} retailResponseTime
 * @property {string} bulkResponseTime
 * @property {string} policyEffectiveDate
 */

function text(key) {
  return typeof environment[key] === "string" ? environment[key].trim() : "";
}

function list(key) {
  return [...new Set(text(key).split(",").map((value) => value.trim()).filter(Boolean))];
}

function availability(value) {
  const normalized = String(value || "").toLowerCase();
  return ["available", "preorder", "unavailable"].includes(normalized) ? normalized : "unconfirmed";
}

function httpsUrl(key) {
  try {
    const value = new URL(text(key));
    return value.protocol === "https:" ? value.href : "";
  } catch {
    return "";
  }
}

function productConfiguration(prefix) {
  return {
    sku: text(`VITE_PRODUCT_${prefix}_SKU`),
    packSize: text(`VITE_PRODUCT_${prefix}_PACK_SIZE`),
    availability: availability(text(`VITE_PRODUCT_${prefix}_AVAILABILITY`)),
    ingredients: text(`VITE_PRODUCT_${prefix}_INGREDIENTS`),
    allergens: text(`VITE_PRODUCT_${prefix}_ALLERGENS`),
    preparation: text(`VITE_PRODUCT_${prefix}_PREPARATION`),
    storage: text(`VITE_PRODUCT_${prefix}_STORAGE`),
    shelfLife: text(`VITE_PRODUCT_${prefix}_SHELF_LIFE`),
    manufactureOrigin: text(`VITE_PRODUCT_${prefix}_ORIGIN`),
    certifications: list(`VITE_PRODUCT_${prefix}_CERTIFICATIONS`),
    evidenceUrl: httpsUrl(`VITE_PRODUCT_${prefix}_EVIDENCE_URL`),
  };
}

/** @type {MerchantProfile} */
export const merchantProfile = Object.freeze({
  legalName: text("VITE_MERCHANT_LEGAL_NAME"),
  tradingName: text("VITE_MERCHANT_TRADING_NAME") || "Coffendi",
  registrationNumber: text("VITE_MERCHANT_REGISTRATION_NUMBER"),
  taxNumber: text("VITE_MERCHANT_TAX_NUMBER"),
  address: text("VITE_MERCHANT_ADDRESS"),
  country: text("VITE_MERCHANT_COUNTRY"),
  supportEmail: text("VITE_SUPPORT_EMAIL"),
  supportPhone: text("VITE_SUPPORT_PHONE"),
  returnsAddress: text("VITE_RETURNS_ADDRESS"),
  businessHours: text("VITE_SUPPORT_BUSINESS_HOURS"),
  retailResponseTime: text("VITE_RETAIL_RESPONSE_TIME"),
  bulkResponseTime: text("VITE_BULK_RESPONSE_TIME"),
  policyEffectiveDate: text("VITE_POLICY_EFFECTIVE_DATE"),
});

export const productCommercialData = Object.freeze({
  "spray-dried": Object.freeze(productConfiguration("SPRAY_DRIED")),
  agglomerated: Object.freeze(productConfiguration("AGGLOMERATED")),
  "freeze-dried": Object.freeze(productConfiguration("FREEZE_DRIED")),
});

export const publicStoreConfiguration = Object.freeze({
  supportedCountries: list("VITE_SUPPORTED_COUNTRIES"),
  inventoryMode: text("VITE_INVENTORY_MODE") || "unconfirmed",
  policiesApproved: text("VITE_POLICIES_APPROVED") === "true",
  analyticsMode: ["disabled", "essential", "consented"].includes(text("VITE_ANALYTICS_MODE"))
    ? text("VITE_ANALYTICS_MODE")
    : "disabled",
});

export function publicCatalogReady(products) {
  return products.length > 0 && products.every((product) => (
    product.priceCents &&
    product.packSize &&
    product.availability === "available"
  ));
}

export function supportContactReady() {
  return Boolean(merchantProfile.legalName && merchantProfile.supportEmail);
}

export function availabilityLabel(value) {
  if (value === "available") return "Available to order";
  if (value === "preorder") return "Pre-order only";
  if (value === "unavailable") return "Currently unavailable";
  return "Availability confirmed before purchase";
}
