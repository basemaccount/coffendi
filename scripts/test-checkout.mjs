import assert from "node:assert/strict";
import { Readable } from "node:stream";
import Stripe from "stripe";
import checkoutHandler from "../api/checkout.js";
import checkoutSessionHandler from "../api/checkout-session.js";
import stripeWebhookHandler, { orderRecordFromSession } from "../api/stripe-webhook.js";

function request(body) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:4173", origin: "https://localhost:4173", "x-forwarded-proto": "https" },
    body,
  };
}

async function invokeHandler(handler, inputRequest) {
  const result = { status: 0, headers: {}, body: null };
  const response = {
    set statusCode(value) { result.status = value; },
    get statusCode() { return result.status; },
    setHeader(name, value) { result.headers[name.toLowerCase()] = value; },
    end(value) { result.body = value ? JSON.parse(value) : null; },
  };
  await handler(inputRequest, response);
  return result;
}

const invoke = (body) => invokeHandler(checkoutHandler, request(body));

const keys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SPRAY_DRIED",
  "STRIPE_PRICE_AGGLOMERATED",
  "STRIPE_PRICE_FREEZE_DRIED",
  "STRIPE_ALLOWED_COUNTRIES",
  "STRIPE_SHIPPING_MODE",
  "STRIPE_SHIPPING_RATE_IDS",
  "STRIPE_ALLOW_PROMOTION_CODES",
  "STRIPE_COLLECT_PHONE",
  "STRIPE_CREATE_CUSTOMER",
  "STRIPE_REQUIRE_TERMS",
  "COMMERCE_LEGAL_READY",
  "BLOB_READ_WRITE_TOKEN",
];
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
keys.forEach((key) => delete process.env[key]);

const unavailable = await invoke({ items: [{ id: "spray-dried", quantity: 1 }] });
assert.equal(unavailable.status, 503);

process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
process.env.STRIPE_PRICE_SPRAY_DRIED = "price_spray";
process.env.STRIPE_PRICE_AGGLOMERATED = "price_agglomerated";
process.env.STRIPE_PRICE_FREEZE_DRIED = "price_freeze";
process.env.STRIPE_ALLOWED_COUNTRIES = "US,GB";
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_placeholder";

const legalNotReady = await invoke({ items: [{ id: "spray-dried", quantity: 1 }] });
assert.equal(legalNotReady.status, 503);
process.env.COMMERCE_LEGAL_READY = "true";

const shippingNotConfigured = await invoke({ items: [{ id: "spray-dried", quantity: 1 }] });
assert.equal(shippingNotConfigured.status, 503);
process.env.STRIPE_SHIPPING_MODE = "rates";

const rateNotConfigured = await invoke({ items: [{ id: "spray-dried", quantity: 1 }] });
assert.equal(rateNotConfigured.status, 503);
process.env.STRIPE_SHIPPING_RATE_IDS = "not-a-shipping-rate";
const invalidRateConfigured = await invoke({ items: [{ id: "spray-dried", quantity: 1 }] });
assert.equal(invalidRateConfigured.status, 503);
process.env.STRIPE_SHIPPING_RATE_IDS = "shr_standard,shr_express";
process.env.STRIPE_ALLOW_PROMOTION_CODES = "true";
process.env.STRIPE_COLLECT_PHONE = "true";
process.env.STRIPE_REQUIRE_TERMS = "true";

const invalid = await invoke({ items: [{ id: "not-a-product", quantity: 1 }] });
assert.equal(invalid.status, 422);
const invalidSession = await invokeHandler(checkoutSessionHandler, {
  method: "GET",
  url: "/api/checkout-session?session_id=not-a-session",
  headers: {},
});
assert.equal(invalidSession.status, 400);
const unsignedWebhook = await invokeHandler(stripeWebhookHandler, { method: "POST", headers: {} });
assert.equal(unsignedWebhook.status, 400);
const signedPayload = JSON.stringify({
  id: "evt_signed_boundary",
  object: "event",
  api_version: "2026-06-30.basil",
  created: 1_700_000_000,
  data: { object: { id: "cus_test", object: "customer" } },
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: "customer.created",
});
const signedRequest = Readable.from([Buffer.from(signedPayload)]);
signedRequest.method = "POST";
signedRequest.headers = {
  "stripe-signature": Stripe.webhooks.generateTestHeaderString({
    payload: signedPayload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  }),
};
const signedWebhook = await invokeHandler(stripeWebhookHandler, signedRequest);
assert.equal(signedWebhook.status, 200);
assert.equal(signedWebhook.body.handled, false);

const originalFetch = globalThis.fetch;
let stripeRequest;
globalThis.fetch = async (url, options) => {
  stripeRequest = { url, options };
  return { ok: true, status: 200, json: async () => ({ url: "https://checkout.stripe.com/test-session" }) };
};
const checkout = await invoke({ items: [{ id: "freeze-dried", quantity: 2 }] });
assert.equal(checkout.status, 201);
assert.equal(checkout.body.url, "https://checkout.stripe.com/test-session");
assert.equal(stripeRequest.url, "https://api.stripe.com/v1/checkout/sessions");
assert.match(String(stripeRequest.options.body), /price_freeze/);
assert.match(String(stripeRequest.options.body), /allowed_countries/);
assert.match(String(stripeRequest.options.body), /shipping_options%5B0%5D%5Bshipping_rate%5D=shr_standard/);
assert.match(String(stripeRequest.options.body), /allow_promotion_codes=true/);
assert.match(String(stripeRequest.options.body), /consent_collection%5Bterms_of_service%5D=required/);

const order = orderRecordFromSession(
  { id: "evt_test", type: "checkout.session.completed", created: 1_700_000_000 },
  {
    id: "cs_test_example",
    payment_status: "paid",
    amount_subtotal: 2998,
    amount_total: 3298,
    currency: "usd",
    customer: "cus_test",
    customer_details: { email: "buyer@example.com", name: "Buyer", phone: null },
    shipping_details: { name: "Buyer" },
    line_items: { data: [{ price: { id: "price_freeze", product: "prod_freeze" }, description: "Freeze dried coffee", quantity: 2, amount_subtotal: 2998, amount_total: 2998, currency: "usd" }] },
  },
);
assert.equal(order.fulfillmentStatus, "payment-confirmed-awaiting-operations");
assert.equal(order.lineItems[0].priceId, "price_freeze");
assert.equal(order.customer.email, "buyer@example.com");

globalThis.fetch = originalFetch;
for (const key of keys) {
  if (saved[key] === undefined) delete process.env[key];
  else process.env[key] = saved[key];
}
console.log("Checkout legal and shipping gates, product allowlist, quantity validation, success verification, signed webhook boundary, Stripe handoff, and fulfillment-record tests passed.");
