import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { originCatalogIndexUrl } from "../src/originCatalog.js";

const baseUrl = String(process.env.COFFENDI_BASE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const canonicalUrl = String(process.env.COFFENDI_CANONICAL_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const originCatalogCountries = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", originCatalogIndexUrl), "utf8"),
).countries;
const originRoutes = [
  "/origins/ethiopia",
  "/origins/colombia",
  "/origins/brazil",
  "/origins/guatemala",
  ...originCatalogCountries.map(({ slug }) => `/origins/${slug}`),
].filter((route, index, routes) => routes.indexOf(route) === index);
const routes = [
  "/", "/coffees", "/origins", ...originRoutes, "/compare", "/approach", "/contact", "/privacy",
];
async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow", signal: AbortSignal.timeout(12_000) });
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response;
}
for (const route of routes) {
  const shell = await (await request(route)).text();
  assert.match(shell, /<div id="root">/, `${route} did not return the application root`);
  assert.match(shell, /class="boot-shell"/, `${route} did not return the resilient loading shell`);
}
const home = await request("/");
assert.match(home.headers.get("content-security-policy") || "", /default-src 'self'/);
assert.match(home.headers.get("strict-transport-security") || "", /max-age=31536000/);
assert.equal(home.headers.get("x-content-type-options"), "nosniff");
assert.equal(home.headers.get("x-frame-options"), "DENY");
for (const endpoint of ["/api/health", "/api/commerce-status"]) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "HEAD",
    signal: AbortSignal.timeout(12_000),
  });
  assert.equal(response.ok, true, `${endpoint} HEAD returned ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /^application\/json/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
const sitemap = await (await request("/sitemap.xml")).text();
assert.ok(sitemap.includes(`<loc>${canonicalUrl}/compare</loc>`), "Sitemap is missing the comparison route");
assert.ok(sitemap.includes(`<loc>${canonicalUrl}/contact</loc>`), "Sitemap is missing the contact route");
for (const route of originRoutes) {
  assert.ok(sitemap.includes(`<loc>${canonicalUrl}${route}</loc>`), `Sitemap is missing ${route}`);
}
const robots = await (await request("/robots.txt")).text();
assert.ok(robots.includes(`Sitemap: ${canonicalUrl}/sitemap.xml`), "Robots does not reference the canonical sitemap");

const representativeSheet = originCatalogCountries[0].firstSheet;
const inlineDocument = await fetch(`${baseUrl}${representativeSheet.pdfUrl}`, {
  method: "HEAD",
  redirect: "follow",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(inlineDocument.ok, true, `Protected PDF endpoint returned ${inlineDocument.status}`);
assert.match(inlineDocument.headers.get("content-type") || "", /^application\/pdf/);
assert.match(inlineDocument.headers.get("content-disposition") || "", /^inline;/);
assert.ok(inlineDocument.headers.get("etag"), "Protected PDF endpoint did not publish an ETag");
assert.equal(inlineDocument.headers.get("content-language"), "en");
assert.ok(Number(inlineDocument.headers.get("content-length")) > 0, "Protected PDF endpoint did not publish its byte length");
assert.ok(inlineDocument.headers.get("last-modified"), "Protected PDF endpoint did not publish its modification time");
assert.equal(inlineDocument.headers.get("x-content-type-options"), "nosniff");

const downloadDocument = await fetch(`${baseUrl}${representativeSheet.downloadUrl}`, {
  method: "HEAD",
  redirect: "follow",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(downloadDocument.ok, true, `Protected PDF download returned ${downloadDocument.status}`);
assert.match(downloadDocument.headers.get("content-disposition") || "", /^attachment;/);

const turkishDocument = await fetch(`${baseUrl}${representativeSheet.turkishPdfUrl}`, {
  method: "HEAD",
  redirect: "follow",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(turkishDocument.ok, true, `Protected Turkish PDF endpoint returned ${turkishDocument.status}`);
assert.match(turkishDocument.headers.get("content-type") || "", /^application\/pdf/);
assert.match(turkishDocument.headers.get("content-disposition") || "", /^inline;/);
assert.ok(turkishDocument.headers.get("etag"), "Protected Turkish PDF endpoint did not publish an ETag");
assert.equal(turkishDocument.headers.get("content-language"), "tr");
assert.ok(Number(turkishDocument.headers.get("content-length")) > 0, "Protected Turkish PDF endpoint did not publish its byte length");
assert.ok(turkishDocument.headers.get("last-modified"), "Protected Turkish PDF endpoint did not publish its modification time");

const rejectedDocument = await fetch(`${baseUrl}/api/catalog-document?path=${encodeURIComponent("coffendi/origins/2026-07-27-full/../../secret.pdf")}`, {
  redirect: "manual",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(rejectedDocument.status, 404, "Protected PDF endpoint accepted a path outside the catalog allowlist");

const preview = await fetch(`${baseUrl}${representativeSheet.thumbnail}`, {
  method: "HEAD",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(preview.ok, true, `Catalog preview returned ${preview.status}`);
assert.match(preview.headers.get("cache-control") || "", /immutable/);

const highResolutionPreview = await fetch(`${baseUrl}${representativeSheet.fullPreview}`, {
  method: "HEAD",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(highResolutionPreview.ok, true, `High-resolution preview returned ${highResolutionPreview.status}`);
assert.match(highResolutionPreview.headers.get("cache-control") || "", /immutable/);

const turkishPreview = await fetch(`${baseUrl}${representativeSheet.turkishFullPreview}`, {
  method: "HEAD",
  signal: AbortSignal.timeout(12_000),
});
assert.equal(turkishPreview.ok, true, `Turkish high-resolution preview returned ${turkishPreview.status}`);
assert.match(turkishPreview.headers.get("cache-control") || "", /immutable/);

console.log(`Production smoke checks passed for ${routes.length} informational routes, all ${originRoutes.length} origin profiles, English and Turkish protected documents, high-resolution previews, security headers, sitemap and robots at ${baseUrl}.`);
