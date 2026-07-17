const MAX_BODY_BYTES = 8_000;
import { commerceConfiguration } from "../server/commerce.js";

function respond(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

function requestOrigin(request) {
  const configured = process.env.PUBLIC_STORE_URL || process.env.ALLOWED_ORIGIN;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return "";
    }
  }

  const protocol = String(request.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "");
  if (!host) return "";
  return `${protocol}://${host}`;
}

function hasValidOrigin(request, storeOrigin) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).origin === storeOrigin;
  } catch {
    return false;
  }
}

async function readPayload(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) throw Object.assign(new Error("Payload is too large."), { status: 413 });
  if (request.body && typeof request.body === "object") return request.body;

  let raw = typeof request.body === "string" ? request.body : "";
  if (!raw) {
    for await (const chunk of request) {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        throw Object.assign(new Error("Payload is too large."), { status: 413 });
      }
    }
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

function normalizedItems(input, configuration) {
  if (!Array.isArray(input)) return [];
  const quantities = new Map();
  for (const item of input) {
    const id = typeof item?.id === "string" ? item.id : "";
    const quantity = Number(item?.quantity);
    if (
      !configuration.productPriceKeys[id] ||
      !configuration.availableProducts.includes(id) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return [];
    }
    quantities.set(id, Math.min(20, (quantities.get(id) || 0) + quantity));
  }
  const items = [...quantities].map(([id, quantity]) => ({ id, quantity }));
  return items.reduce((total, item) => total + item.quantity, 0) <= 50 ? items : [];
}

export default async function checkoutHandler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.setHeader("Allow", "POST, OPTIONS");
    response.end();
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    respond(response, 405, { ok: false, message: "Method not allowed." });
    return;
  }
  if (!String(request.headers["content-type"] || "").includes("application/json")) {
    respond(response, 415, { ok: false, message: "Content-Type must be application/json." });
    return;
  }

  const storeOrigin = requestOrigin(request);
  if (!storeOrigin || !hasValidOrigin(request, storeOrigin)) {
    respond(response, 403, { ok: false, message: "Request origin is not allowed." });
    return;
  }

  const configuration = commerceConfiguration();
  if (!configuration.ready) {
    respond(response, 503, {
      ok: false,
      code: "commerce_not_ready",
      message: "Online payment is not active yet. Please use the bulk brief or contact the sales team.",
      action: { label: "Send this selection", href: "/bulk" },
    });
    return;
  }

  try {
    const payload = await readPayload(request);
    const items = normalizedItems(payload.items, configuration);
    if (!items.length) {
      respond(response, 422, { ok: false, message: "Your cart does not contain valid products." });
      return;
    }

    const stripePayload = new URLSearchParams({
      mode: "payment",
      success_url: `${storeOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeOrigin}/checkout`,
      billing_address_collection: "required",
      "phone_number_collection[enabled]": String(process.env.STRIPE_COLLECT_PHONE === "true"),
      allow_promotion_codes: String(process.env.STRIPE_ALLOW_PROMOTION_CODES === "true"),
      customer_creation: process.env.STRIPE_CREATE_CUSTOMER === "false" ? "if_required" : "always",
      "metadata[store]": "coffendi-instant",
      "metadata[shipping_mode]": configuration.shippingMode,
    });
    if (process.env.STRIPE_REQUIRE_TERMS === "true") {
      stripePayload.set("consent_collection[terms_of_service]", "required");
    }
    if (process.env.STRIPE_AUTOMATIC_TAX === "true") {
      stripePayload.set("automatic_tax[enabled]", "true");
    }
    configuration.countries.forEach((country, index) => {
      stripePayload.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
    if (configuration.shippingMode === "rates") {
      configuration.shippingRateIds.forEach((rateId, index) => {
        stripePayload.set(`shipping_options[${index}][shipping_rate]`, rateId);
      });
    }
    items.forEach((item, index) => {
      stripePayload.set(`line_items[${index}][price]`, process.env[configuration.productPriceKeys[item.id]]);
      stripePayload.set(`line_items[${index}][quantity]`, String(item.quantity));
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripePayload,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session.url) {
      console.error("Stripe checkout session creation failed", {
        status: stripeResponse.status,
        type: session.error?.type,
        code: session.error?.code,
      });
      respond(response, 502, {
        ok: false,
        message: "Secure checkout is temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    respond(response, 201, { ok: true, url: session.url });
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error("Checkout initialization failed", error);
    respond(response, status, {
      ok: false,
      message: status >= 500 ? "Secure checkout is temporarily unavailable." : error.message,
    });
  }
}
