import Stripe from "stripe";

function respond(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
}

export default async function checkoutSessionHandler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    respond(response, 405, { ok: false, message: "Method not allowed." });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    respond(response, 503, { ok: false, message: "Checkout verification is not configured." });
    return;
  }

  const requestUrl = new URL(request.url || "/api/checkout-session", "https://coffendi.invalid");
  const sessionId = requestUrl.searchParams.get("session_id") || request.query?.session_id || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    respond(response, 400, { ok: false, message: "Checkout session is invalid." });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    respond(response, 200, {
      ok: true,
      paid: session.payment_status === "paid" || session.payment_status === "no_payment_required",
      paymentStatus: session.payment_status,
      reference: session.id,
    });
  } catch (error) {
    console.error("Checkout session verification failed", { type: error.type, code: error.code });
    respond(response, 502, { ok: false, message: "We could not verify this checkout session." });
  }
}
