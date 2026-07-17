import { put } from "@vercel/blob";
import Stripe from "stripe";
import { sendOperationsNotification } from "../server/notifications.js";

const MAX_WEBHOOK_BYTES = 1_000_000;
const FULFILLMENT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);

function respond(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
}

async function rawRequestBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_WEBHOOK_BYTES) throw Object.assign(new Error("Webhook is too large."), { status: 413 });
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function orderRecordFromSession(event, session) {
  const failed = event.type === "checkout.session.async_payment_failed";
  return {
    stripeSessionId: session.id,
    stripeEventId: event.id,
    eventType: event.type,
    eventCreatedAt: new Date(event.created * 1000).toISOString(),
    recordedAt: new Date().toISOString(),
    fulfillmentStatus: failed ? "payment-failed" : "payment-confirmed-awaiting-operations",
    paymentStatus: session.payment_status,
    amountSubtotal: session.amount_subtotal,
    amountTotal: session.amount_total,
    currency: session.currency,
    customer: {
      id: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
      email: session.customer_details?.email || "",
      name: session.customer_details?.name || "",
      phone: session.customer_details?.phone || "",
    },
    shipping: session.shipping_details || null,
    lineItems: (session.line_items?.data || []).map((item) => ({
      priceId: item.price?.id || "",
      productId: typeof item.price?.product === "string" ? item.price.product : item.price?.product?.id || "",
      description: item.description,
      quantity: item.quantity,
      amountSubtotal: item.amount_subtotal,
      amountTotal: item.amount_total,
      currency: item.currency,
    })),
  };
}

export default async function stripeWebhookHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    respond(response, 405, { ok: false, message: "Method not allowed." });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.BLOB_READ_WRITE_TOKEN) {
    respond(response, 503, { ok: false, message: "Payment fulfillment is not configured." });
    return;
  }

  const signature = request.headers["stripe-signature"];
  if (!signature) {
    respond(response, 400, { ok: false, message: "Missing Stripe signature." });
    return;
  }

  try {
    const rawBody = await rawRequestBody(request);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (!FULFILLMENT_EVENTS.has(event.type)) {
      respond(response, 200, { ok: true, received: true, handled: false });
      return;
    }

    const incomingSession = event.data.object;
    const session = await stripe.checkout.sessions.retrieve(incomingSession.id, {
      expand: ["line_items.data.price.product"],
    });
    const failed = event.type === "checkout.session.async_payment_failed";
    if (!failed && session.payment_status === "unpaid") {
      respond(response, 202, { ok: true, received: true, handled: false });
      return;
    }

    const record = orderRecordFromSession(event, session);
    record.type = "stripe-order";
    await put(`orders/stripe/${session.id}.json`, JSON.stringify(record, null, 2), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    await sendOperationsNotification(record);
    respond(response, 200, { ok: true, received: true, handled: true });
  } catch (error) {
    const status = Number(error.status) || (error.type === "StripeSignatureVerificationError" ? 400 : 500);
    if (status >= 500) console.error("Stripe webhook processing failed", error);
    respond(response, status, {
      ok: false,
      message: status === 400 ? "Webhook signature or payload is invalid." : "Payment event processing failed.",
    });
  }
}
