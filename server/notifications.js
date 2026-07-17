const NOTIFICATION_TIMEOUT_MS = 5_000;

function configuredUrl(key, environment = process.env) {
  try {
    const url = new URL(environment[key] || "");
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function notificationStatus(environment = process.env) {
  return configuredUrl("SUBMISSION_NOTIFICATION_WEBHOOK_URL", environment) ? "configured" : "unavailable";
}

export function acknowledgmentStatus(environment = process.env) {
  return configuredUrl("CUSTOMER_ACKNOWLEDGMENT_WEBHOOK_URL", environment) ? "configured" : "unavailable";
}

function notificationSummary(record) {
  const payload = record.payload || {};
  return {
    event: record.type === "stripe-order" ? "coffendi.order.updated" : "coffendi.submission.received",
    reference: record.reference || record.stripeSessionId || "",
    type: record.type || "unknown",
    receivedAt: record.receivedAt || record.recordedAt || new Date().toISOString(),
    status: record.fulfillmentStatus || "received",
    contact: {
      name: payload.name || record.customer?.name || "",
      company: payload.company || "",
      email: payload.email || record.customer?.email || "",
    },
    routing: {
      topic: payload.topic || "",
      country: payload.country || "",
      volume: payload.volume || "",
    },
  };
}

export async function sendOperationsNotification(record, environment = process.env) {
  if (!configuredUrl("SUBMISSION_NOTIFICATION_WEBHOOK_URL", environment)) return { attempted: false, delivered: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    if (environment.SUBMISSION_NOTIFICATION_BEARER_TOKEN) {
      headers.Authorization = `Bearer ${environment.SUBMISSION_NOTIFICATION_BEARER_TOKEN}`;
    }
    const response = await fetch(environment.SUBMISSION_NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(notificationSummary(record)),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Notification provider returned ${response.status}.`);
    return { attempted: true, delivered: true };
  } catch (error) {
    console.error("Operations notification failed", {
      type: record.type || "unknown",
      reason: error.name === "AbortError" ? "timeout" : "provider-error",
    });
    return { attempted: true, delivered: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendBuyerAcknowledgment(record, environment = process.env) {
  if (!configuredUrl("CUSTOMER_ACKNOWLEDGMENT_WEBHOOK_URL", environment)) {
    return { attempted: false, delivered: false };
  }
  if (!record.payload?.email || !["inquiry", "contact"].includes(record.type)) {
    return { attempted: false, delivered: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    if (environment.CUSTOMER_ACKNOWLEDGMENT_BEARER_TOKEN) {
      headers.Authorization = `Bearer ${environment.CUSTOMER_ACKNOWLEDGMENT_BEARER_TOKEN}`;
    }
    const response = await fetch(environment.CUSTOMER_ACKNOWLEDGMENT_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "coffendi.customer.acknowledgment-requested",
        template: record.type === "inquiry" ? "bulk-brief-received" : "contact-message-received",
        reference: record.reference,
        recipient: record.payload.email,
        name: record.payload.name,
        receivedAt: record.receivedAt,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Acknowledgment provider returned ${response.status}.`);
    return { attempted: true, delivered: true };
  } catch (error) {
    console.error("Buyer acknowledgment failed", {
      type: record.type || "unknown",
      reason: error.name === "AbortError" ? "timeout" : "provider-error",
    });
    return { attempted: true, delivered: false };
  } finally {
    clearTimeout(timeout);
  }
}
