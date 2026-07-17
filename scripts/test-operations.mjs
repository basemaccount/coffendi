import assert from "node:assert/strict";
import contactHandler from "../api/contact.js";
import commerceStatusHandler from "../api/commerce-status.js";
import { commerceConfiguration, publicCommerceStatus } from "../server/commerce.js";
import {
  acknowledgmentStatus,
  notificationStatus,
  sendBuyerAcknowledgment,
  sendOperationsNotification,
} from "../server/notifications.js";

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = "") { this.body = value ? JSON.parse(value) : null; },
  };
}

async function invoke(handler, request) {
  const response = responseRecorder();
  await handler(request, response);
  return response;
}

const configuredEnvironment = {
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_placeholder",
  STRIPE_PRICE_SPRAY_DRIED: "price_spray",
  STRIPE_PRICE_AGGLOMERATED: "price_agglomerated",
  STRIPE_PRICE_FREEZE_DRIED: "price_freeze",
  STRIPE_ALLOWED_COUNTRIES: "US,GB",
  STRIPE_SHIPPING_MODE: "rates",
  STRIPE_SHIPPING_RATE_IDS: "shr_standard",
  COMMERCE_LEGAL_READY: "true",
  COMMERCE_PUBLIC_CATALOG_READY: "true",
  COMMERCE_INVENTORY_READY: "true",
  COMMERCE_FULFILLMENT_READY: "true",
  COMMERCE_SUPPORT_READY: "true",
  COMMERCE_AVAILABLE_PRODUCTS: "spray-dried,agglomerated,freeze-dried",
};

const ready = commerceConfiguration(configuredEnvironment);
assert.equal(ready.ready, true);
assert.equal(publicCommerceStatus(configuredEnvironment).purchasePath, "checkout");

const missingInventory = commerceConfiguration({ ...configuredEnvironment, COMMERCE_INVENTORY_READY: "false" });
assert.equal(missingInventory.ready, false);
assert.equal(missingInventory.checks.inventory, false);

const invalidCountries = commerceConfiguration({ ...configuredEnvironment, STRIPE_ALLOWED_COUNTRIES: "USA,GB" });
assert.equal(invalidCountries.ready, false);
assert.equal(invalidCountries.checks.countries, false);

const publicStatusResponse = await invoke(commerceStatusHandler, { method: "GET", headers: {} });
assert.equal(publicStatusResponse.statusCode, 200);
assert.deepEqual(Object.keys(publicStatusResponse.body).sort(), ["message", "ok", "purchasePath", "ready"]);

const invalidContactResponse = await invoke(contactHandler, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://coffendi.test",
    host: "coffendi.test",
    "x-forwarded-for": "127.0.0.210",
  },
  socket: { remoteAddress: "127.0.0.210" },
  body: {
    name: "Test Buyer",
    email: "buyer@example.com",
    topic: "unknown",
    message: "This message is long enough but has an invalid support topic.",
    consent: true,
  },
});
assert.equal(invalidContactResponse.statusCode, 422);
assert.equal(invalidContactResponse.body.errors.topic, "Select a valid support topic.");

assert.equal(notificationStatus({}), "unavailable");
assert.equal(notificationStatus({ SUBMISSION_NOTIFICATION_WEBHOOK_URL: "http://insecure.example" }), "unavailable");
assert.equal(notificationStatus({ SUBMISSION_NOTIFICATION_WEBHOOK_URL: "https://operations.example/hook" }), "configured");
assert.equal(acknowledgmentStatus({}), "unavailable");
assert.equal(acknowledgmentStatus({ CUSTOMER_ACKNOWLEDGMENT_WEBHOOK_URL: "https://email.example/hook" }), "configured");

const originalFetch = globalThis.fetch;
let notificationRequest;
globalThis.fetch = async (url, options) => {
  notificationRequest = { url, options };
  return { ok: true, status: 204 };
};
const notification = await sendOperationsNotification({
  reference: "CFC-TEST",
  type: "contact",
  receivedAt: "2026-07-17T00:00:00.000Z",
  payload: {
    name: "Test Buyer",
    email: "buyer@example.com",
    topic: "retail",
    message: "This full buyer message must not be copied into the notification payload.",
  },
}, {
  SUBMISSION_NOTIFICATION_WEBHOOK_URL: "https://operations.example/hook",
  SUBMISSION_NOTIFICATION_BEARER_TOKEN: "test-token",
});
assert.deepEqual(notification, { attempted: true, delivered: true });
assert.equal(notificationRequest.url, "https://operations.example/hook");
assert.equal(notificationRequest.options.headers.Authorization, "Bearer test-token");
assert.doesNotMatch(notificationRequest.options.body, /full buyer message/);
let acknowledgmentRequest;
globalThis.fetch = async (url, options) => {
  acknowledgmentRequest = { url, options };
  return { ok: true, status: 202 };
};
const acknowledgment = await sendBuyerAcknowledgment({
  reference: "CFI-TEST",
  type: "inquiry",
  receivedAt: "2026-07-17T00:00:00.000Z",
  payload: {
    name: "Test Buyer",
    email: "buyer@example.com",
    message: "The acknowledgment must not copy this message.",
  },
}, {
  CUSTOMER_ACKNOWLEDGMENT_WEBHOOK_URL: "https://email.example/hook",
  CUSTOMER_ACKNOWLEDGMENT_BEARER_TOKEN: "email-test-token",
});
assert.deepEqual(acknowledgment, { attempted: true, delivered: true });
assert.equal(acknowledgmentRequest.options.headers.Authorization, "Bearer email-test-token");
assert.match(acknowledgmentRequest.options.body, /bulk-brief-received/);
assert.doesNotMatch(acknowledgmentRequest.options.body, /must not copy/);
globalThis.fetch = originalFetch;

console.log("Commerce readiness, contact validation, safe public status, and operations notification tests passed.");
