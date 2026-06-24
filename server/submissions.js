import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const MAX_BODY_BYTES = 24_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rateBuckets = globalThis.__coffendiRateBuckets || new Map();

globalThis.__coffendiRateBuckets = rateBuckets;

const schemas = {
  inquiry: {
    required: ["name", "company", "email", "message", "audience"],
    fields: {
      name: [2, 80],
      company: [2, 120],
      email: [5, 160],
      message: [10, 2_500],
      audience: [2, 30],
      volume: [0, 80],
      country: [0, 100],
      source: [0, 160],
      website: [0, 200],
    },
  },
  sample: {
    required: ["name", "company", "email", "country", "coffeeIds"],
    fields: {
      name: [2, 80],
      company: [2, 120],
      email: [5, 160],
      country: [2, 100],
      message: [0, 1_000],
      source: [0, 160],
      website: [0, 200],
    },
  },
  subscription: {
    required: ["email", "consent"],
    fields: {
      email: [5, 160],
      source: [0, 160],
      website: [0, 200],
    },
  },
};

function respond(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

function cleanText(value, preserveLines = false) {
  if (typeof value !== "string") return "";
  const controlPattern = preserveLines
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
    : /[\u0000-\u001f\u007f]/g;
  return value.replace(controlPattern, "").trim();
}

async function readPayload(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Payload is too large."), { status: 413 });
  }

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

function requestFingerprint(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "");
  const address = forwarded.split(",")[0].trim() || request.socket?.remoteAddress || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.VERCEL_PROJECT_ID || "coffendi";
  return createHash("sha256").update(`${salt}:${address}`).digest("hex").slice(0, 24);
}

function isRateLimited(request) {
  const key = requestFingerprint(request);
  const now = Date.now();
  const existing = rateBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  if (rateBuckets.size > 2_000) {
    for (const [entryKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(entryKey);
    }
  }
  return existing.count > RATE_LIMIT_MAX;
}

function hasValidOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost = String(
      request.headers["x-forwarded-host"] || request.headers.host || "",
    );
    const allowedHost = process.env.ALLOWED_ORIGIN
      ? new URL(process.env.ALLOWED_ORIGIN).host
      : "";
    return originHost === requestHost || originHost === allowedHost;
  } catch {
    return false;
  }
}

function validatePayload(kind, input) {
  const schema = schemas[kind];
  const errors = {};
  const payload = {};

  for (const [field, [min, max]] of Object.entries(schema.fields)) {
    const preserveLines = field === "message";
    const value = cleanText(input[field], preserveLines);
    if (value.length < min && schema.required.includes(field)) {
      errors[field] = "This field is required.";
    } else if (value.length > max) {
      errors[field] = `Keep this field under ${max} characters.`;
    }
    payload[field] = value;
  }

  if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (kind === "inquiry" && !["roaster", "producer", "partner"].includes(payload.audience)) {
    errors.audience = "Select a valid inquiry type.";
  }

  if (kind === "sample") {
    const coffeeIds = Array.isArray(input.coffeeIds)
      ? [...new Set(input.coffeeIds.map((value) => cleanText(value)).filter(Boolean))]
      : [];
    if (!coffeeIds.length || coffeeIds.length > 6) {
      errors.coffeeIds = "Select between one and six coffees.";
    }
    payload.coffeeIds = coffeeIds;
    payload.coffeeNames = Array.isArray(input.coffeeNames)
      ? input.coffeeNames.slice(0, 6).map((value) => cleanText(value).slice(0, 120))
      : [];
  }

  if (kind === "subscription") {
    payload.consent = input.consent === true;
    if (!payload.consent) errors.consent = "Consent is required.";
  }

  return { payload, errors };
}

function buildReference(kind) {
  const prefixes = { inquiry: "CFI", sample: "CFS", subscription: "CFN" };
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `${prefixes[kind]}-${date}-${suffix}`;
}

export function createSubmissionHandler(kind) {
  if (!schemas[kind]) throw new Error(`Unknown submission type: ${kind}`);

  return async function submissionHandler(request, response) {
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

    if (!hasValidOrigin(request)) {
      respond(response, 403, { ok: false, message: "Request origin is not allowed." });
      return;
    }

    if (isRateLimited(request)) {
      response.setHeader("Retry-After", "600");
      respond(response, 429, {
        ok: false,
        message: "Too many requests. Please wait before trying again.",
      });
      return;
    }

    try {
      const input = await readPayload(request);

      if (cleanText(input.website)) {
        respond(response, 202, { ok: true, reference: buildReference(kind) });
        return;
      }

      const { payload, errors } = validatePayload(kind, input);
      if (Object.keys(errors).length) {
        respond(response, 422, {
          ok: false,
          message: "Check the highlighted information and try again.",
          errors,
        });
        return;
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        respond(response, 503, {
          ok: false,
          message: "Submission storage is temporarily unavailable.",
        });
        return;
      }

      const id = randomUUID();
      const reference = buildReference(kind);
      const receivedAt = new Date().toISOString();
      const record = {
        id,
        reference,
        type: kind,
        receivedAt,
        payload,
        context: {
          userAgent: cleanText(String(request.headers["user-agent"] || "")).slice(0, 300),
          referrer: cleanText(String(request.headers.referer || "")).slice(0, 300),
          deployment: process.env.VERCEL_URL || "local",
        },
      };
      const [year, month, day] = receivedAt.slice(0, 10).split("-");
      const pathname = `submissions/${kind}/${year}/${month}/${day}/${receivedAt.replaceAll(":", "-")}-${id}.json`;

      await put(pathname, JSON.stringify(record, null, 2), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
      });

      respond(response, 201, {
        ok: true,
        reference,
        message: "Your request has been received.",
      });
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) console.error("Submission persistence failed", error);
      respond(response, status, {
        ok: false,
        message:
          status >= 500
            ? "We could not save your request. Please try again shortly."
            : error.message,
      });
    }
  };
}

export function healthHandler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    respond(response, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  respond(response, 200, {
    ok: true,
    service: "coffendi-submissions",
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "unavailable",
    timestamp: new Date().toISOString(),
  });
}
