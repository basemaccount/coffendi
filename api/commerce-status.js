import { publicCommerceStatus } from "../server/commerce.js";

export default function commerceStatusHandler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.statusCode = 405;
    response.end(JSON.stringify({ ok: false, message: "Method not allowed." }));
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(request.method === "HEAD" ? "" : JSON.stringify(publicCommerceStatus()));
}
