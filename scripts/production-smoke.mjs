import assert from "node:assert/strict";

const baseUrl = String(process.env.COFFENDI_BASE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const canonicalUrl = String(process.env.COFFENDI_CANONICAL_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const timeoutMs = 12_000;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    ...options,
  });
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response;
}

const routes = [
  "/",
  "/shop",
  "/products/spray-dried",
  "/products/agglomerated",
  "/products/freeze-dried",
  "/bulk",
  "/learn",
  "/sustainability",
  "/contact",
  "/privacy",
  "/terms",
  "/shipping-returns",
];

for (const route of routes) {
  const response = await request(route);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/, `${route} did not return the application shell`);
}

const home = await request("/");
assert.match(home.headers.get("content-security-policy") || "", /default-src 'self'/);
assert.match(home.headers.get("strict-transport-security") || "", /max-age=31536000/);
assert.equal(home.headers.get("x-content-type-options"), "nosniff");
assert.equal(home.headers.get("x-frame-options"), "DENY");

const commerceResponse = await request("/api/commerce-status", { headers: { Accept: "application/json" } });
const commerce = await commerceResponse.json();
assert.deepEqual(Object.keys(commerce).sort(), ["message", "ok", "purchasePath", "ready"]);
assert.equal(typeof commerce.ready, "boolean");
assert.ok(["checkout", "inquiry"].includes(commerce.purchasePath));

const healthResponse = await request("/api/health", { headers: { Accept: "application/json" } });
const health = await healthResponse.json();
assert.equal(health.ok, true);
assert.equal(health.storage, "configured");

const sitemapResponse = await request("/sitemap.xml");
const sitemap = await sitemapResponse.text();
assert.ok(sitemap.includes(`<loc>${canonicalUrl}/contact</loc>`), "Sitemap does not contain the canonical contact route");

const robotsResponse = await request("/robots.txt");
const robots = await robotsResponse.text();
assert.ok(robots.includes(`Sitemap: ${canonicalUrl}/sitemap.xml`), "Robots file does not point to the canonical sitemap");

console.log(`Production smoke checks passed for ${routes.length} storefront routes, commerce readiness, private-storage health, security headers, sitemap, and robots at ${baseUrl}.`);
