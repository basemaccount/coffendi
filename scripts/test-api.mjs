import assert from "node:assert/strict";
import inquiryHandler from "../api/inquiries.js";
import sampleHandler from "../api/sample-requests.js";
import subscriptionHandler from "../api/subscriptions.js";
import healthHandler from "../api/health.js";
import contactHandler from "../api/contact.js";

let requestSequence = 1;

function createRequest({ method = "POST", body = {}, origin = "http://localhost:4174" } = {}) {
  const current = requestSequence;
  requestSequence += 1;
  return {
    method,
    body,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(JSON.stringify(body))),
      origin,
      host: "localhost:4174",
      "user-agent": "coffendi-api-test",
      referer: "http://localhost:4174/test",
      "x-forwarded-for": `127.0.0.${current}`,
    },
    socket: { remoteAddress: `127.0.0.${current}` },
    async *[Symbol.asyncIterator]() {},
  };
}

function createResponse() {
  let resolve;
  const completed = new Promise((done) => {
    resolve = done;
  });
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = "") {
      this.body = value;
      resolve();
    },
    completed,
  };
}

async function invoke(handler, options) {
  const request = createRequest(options);
  const response = createResponse();
  await handler(request, response);
  await response.completed;
  return {
    status: response.statusCode,
    headers: response.headers,
    body: response.body ? JSON.parse(response.body) : null,
  };
}

assert.ok(process.env.BLOB_READ_WRITE_TOKEN, "BLOB_READ_WRITE_TOKEN is required for API tests");

const health = await invoke(healthHandler, { method: "GET" });
assert.equal(health.status, 200);
assert.equal(health.body.storage, "configured");

const invalid = await invoke(inquiryHandler, {
  body: {
    name: "A",
    company: "",
    email: "not-an-email",
    audience: "roaster",
    message: "short",
  },
});
assert.equal(invalid.status, 422);
assert.equal(invalid.body.ok, false);

const blockedOrigin = await invoke(inquiryHandler, {
  origin: "https://example.invalid",
  body: {
    name: "API Test",
    company: "Coffendi QA",
    email: "qa@example.com",
    audience: "roaster",
    message: "This request should be blocked before persistence.",
  },
});
assert.equal(blockedOrigin.status, 403);

const inquiry = await invoke(inquiryHandler, {
  body: {
    name: "API Test Inquiry",
    company: "Coffendi QA",
    email: "qa@example.com",
    audience: "roaster",
    volume: "10–30 bags",
    message: "Automated persistence verification for the Coffendi inquiry endpoint.",
    source: "automated-test",
    consent: true,
  },
});
assert.equal(inquiry.status, 201);
assert.match(inquiry.body.reference, /^CFI-/);

const invalidContact = await invoke(contactHandler, {
  body: {
    name: "A",
    email: "invalid",
    topic: "unknown",
    message: "short",
  },
});
assert.equal(invalidContact.status, 422);

const contact = await invoke(contactHandler, {
  body: {
    name: "API Test Contact",
    company: "Coffendi QA",
    email: "qa@example.com",
    topic: "general",
    message: "Automated persistence verification for the Coffendi contact endpoint.",
    source: "automated-test",
    consent: true,
  },
});
assert.equal(contact.status, 201);
assert.match(contact.body.reference, /^CFC-/);

const sample = await invoke(sampleHandler, {
  body: {
    name: "API Test Sample",
    company: "Coffendi QA",
    email: "qa@example.com",
    country: "Türkiye",
    message: "Automated sample request persistence verification.",
    source: "automated-test",
    recommendationSource: "coffendi-sourcing-desk",
    brief: "Live lot: Bensa Bombe\nAtlas profile: Santos NY2",
    coffeeIds: ["ethiopia-bensa", "colombia-el-vergel"],
    coffeeNames: ["Bensa Bombe", "El Vergel Java"],
    coffeeKinds: ["Live lot", "Atlas profile"],
  },
});
assert.equal(sample.status, 201);
assert.match(sample.body.reference, /^CFS-/);

const subscription = await invoke(subscriptionHandler, {
  body: {
    email: "qa@example.com",
    consent: true,
    source: "automated-test",
  },
});
assert.equal(subscription.status, 201);
assert.match(subscription.body.reference, /^CFN-/);

console.log("API validation, origin protection, health, and private persistence tests passed.");
