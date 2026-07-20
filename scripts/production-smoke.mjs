import assert from "node:assert/strict";

const baseUrl = String(process.env.COFFENDI_BASE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const canonicalUrl = String(process.env.COFFENDI_CANONICAL_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const routes = [
  "/", "/coffees", "/coffees/ethiopia-washed", "/coffees/colombia-balanced", "/coffees/brazil-classic",
  "/coffees/guatemala-structured", "/coffees/kenya-vivid", "/coffees/rwanda-sweet", "/origins", "/compare",
  "/approach", "/contact", "/privacy",
];
async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow", signal: AbortSignal.timeout(12_000) });
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response;
}
for (const route of routes) assert.match(await (await request(route)).text(), /<div id="root"><\/div>/, `${route} did not return the application shell`);
const home = await request("/");
assert.match(home.headers.get("content-security-policy") || "", /default-src 'self'/);
assert.match(home.headers.get("strict-transport-security") || "", /max-age=31536000/);
assert.equal(home.headers.get("x-content-type-options"), "nosniff");
assert.equal(home.headers.get("x-frame-options"), "DENY");
const sitemap = await (await request("/sitemap.xml")).text();
assert.ok(sitemap.includes(`<loc>${canonicalUrl}/compare</loc>`), "Sitemap is missing the comparison route");
assert.ok(sitemap.includes(`<loc>${canonicalUrl}/contact</loc>`), "Sitemap is missing the contact route");
const robots = await (await request("/robots.txt")).text();
assert.ok(robots.includes(`Sitemap: ${canonicalUrl}/sitemap.xml`), "Robots does not reference the canonical sitemap");
console.log(`Production smoke checks passed for ${routes.length} informational routes, security headers, sitemap and robots at ${baseUrl}.`);
