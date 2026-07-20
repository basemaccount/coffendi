import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const vercelConfig = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const globalHeaders = vercelConfig.headers.find((entry) => entry.source === "/(.*)")?.headers || [];
const headerMap = new Map(globalHeaders.map(({ key, value }) => [key.toLowerCase(), value]));
const csp = headerMap.get("content-security-policy");

assert.ok(csp, "A global Content-Security-Policy header is required");
assert.match(csp, /default-src 'self'/);
assert.match(csp, /object-src 'none'/);
assert.match(csp, /frame-ancestors 'none'/);
assert.equal(headerMap.get("x-frame-options"), "DENY");
assert.match(headerMap.get("strict-transport-security") || "", /max-age=31536000/);

const browser = await chromium.launch();
const failures = [];

for (const path of ["/", "/coffees/ethiopia-washed", "/compare", "/contact"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const policyErrors = [];

  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": csp },
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|refused to/i.test(message.text())) {
      policyErrors.push(message.text());
    }
  });

  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const checks = await page.evaluate(() => ({
    appMounted: Boolean(document.querySelector("#root main")),
    fontAvailable: document.fonts.check("16px Manrope"),
    thirdPartyScripts: [...document.scripts].filter((script) => script.src && new URL(script.src).origin !== location.origin).length,
  }));
  if (!checks.appMounted) failures.push(`${path}: application did not mount under the configured CSP`);
  if (!checks.fontAvailable) failures.push(`${path}: primary web font was not available under the configured CSP`);
  if (checks.thirdPartyScripts) failures.push(`${path}: unexpected third-party scripts were present`);
  if (policyErrors.length) failures.push(`${path}: ${policyErrors.join(" | ")}`);
  await context.close();
}

await browser.close();

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Deployment security headers parsed and the production CSP allowed the informational app, fonts and images without third-party scripts.");
}
