import fs from "node:fs";
import { chromium } from "@playwright/test";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });
const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const checks = [
  ["desktop-home", "/", 1440, 1000],
  ["desktop-coffees", "/coffees", 1440, 1000],
  ["desktop-profile", "/coffees/ethiopia-washed", 1440, 1000],
  ["desktop-origins", "/origins", 1440, 1000],
  ["desktop-compare", "/compare", 1440, 1000],
  ["desktop-approach", "/approach", 1440, 1000],
  ["desktop-contact", "/contact", 1440, 1000],
  ["desktop-privacy", "/privacy", 1440, 1000],
  ["tablet-home", "/", 768, 900],
  ["mobile-home", "/", 390, 844],
  ["mobile-coffees", "/coffees", 390, 844],
  ["mobile-profile", "/coffees/brazil-classic", 390, 844],
  ["mobile-compare", "/compare", 390, 844],
  ["mobile-contact", "/contact", 390, 844],
  ["compact-home", "/", 320, 700],
  ["landscape-home", "/", 844, 390],
].map(([name, path, width, height]) => ({ name, path, width, height }));

const browser = await chromium.launch();
const failures = [];

for (const check of checks) {
  const context = await browser.newContext({
    viewport: { width: check.width, height: check.height },
    deviceScaleFactor: 1,
    hasTouch: check.width <= 844,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`${check.name}.png`, outputDir).pathname, fullPage: false });

  const audit = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
    h1Count: document.querySelectorAll("h1").length,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
    hasCart: Boolean(document.querySelector('[class*="cart"], [aria-label*="cart" i], [aria-label*="sepet" i]')),
    hasPrice: /(?:[$€£]\s?\d|\d(?:[.,]\d{2})?\s?(?:USD|EUR|TRY|TL)\b)/i.test(document.body.innerText),
  }));

  if (audit.scrollWidth > audit.clientWidth + 1) failures.push(`${check.name}: horizontal overflow ${audit.scrollWidth}px > ${audit.clientWidth}px`);
  if (audit.brokenImages) failures.push(`${check.name}: ${audit.brokenImages} broken images`);
  if (audit.h1Count !== 1) failures.push(`${check.name}: expected one h1, found ${audit.h1Count}`);
  if (!audit.canonical.endsWith(check.path === "/" ? "/" : check.path)) failures.push(`${check.name}: canonical did not match ${check.path}`);
  if (audit.hasCart) failures.push(`${check.name}: sales/cart UI was present`);
  if (audit.hasPrice) failures.push(`${check.name}: price-like public text was present`);
  if (errors.length) failures.push(`${check.name}: ${errors.join(" | ")}`);

  if (check.name === "desktop-coffees") {
    const card = page.locator(".profile-card").filter({ hasText: "Colombia" });
    const button = card.getByRole("button", { name: /Add to compare/ });
    await button.click();
    if ((await card.getByRole("button", { name: /In comparison/ }).getAttribute("aria-pressed")) !== "true") failures.push("desktop-coffees: profile was not added to comparison");
  }

  if (check.name === "desktop-compare") {
    const rows = page.locator(".compare-table__row");
    if ((await rows.count()) !== 7) failures.push("desktop-compare: expected header plus six comparison rows");
    const columns = await rows.first().locator(":scope > *").count();
    if (columns !== 3) failures.push(`desktop-compare: default comparison should have attribute plus two profiles, found ${columns} columns`);
    const template = await rows.first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    if (template !== columns) failures.push(`desktop-compare: rendered grid had ${template} tracks for ${columns} content columns`);
  }

  if (check.name === "desktop-home") {
    const englishHeading = await page.locator("h1").textContent();
    await page.getByRole("button", { name: "TR" }).click();
    if ((await page.locator("h1").textContent()) === englishHeading) failures.push("desktop-home: Turkish language control did not localise the page");
    if ((await page.locator("html").getAttribute("lang")) !== "tr") failures.push("desktop-home: document language did not change to Turkish");
  }

  if (check.name === "mobile-home") {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    if (!(await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible())) failures.push("mobile-home: navigation did not open");
    if (!(await page.locator("#main-content").evaluate((element) => element.inert))) failures.push("mobile-home: page content was not inert while navigation was open");
    if (!(await page.locator("#mobile-navigation a").first().evaluate((element) => document.activeElement === element))) failures.push("mobile-home: focus did not enter navigation");
    await page.keyboard.press("Escape");
    if (await page.locator("#main-content").evaluate((element) => element.inert)) failures.push("mobile-home: page content remained inert after navigation closed");
    if (!(await menu.evaluate((element) => document.activeElement === element))) failures.push("mobile-home: focus did not return to the menu button");
  }

  if (check.name === "mobile-contact") {
    if ((await page.locator(".inquiry-form input[required], .inquiry-form textarea[required]").count()) < 5) failures.push("mobile-contact: required inquiry fields were missing");
    if (!(await page.locator('.inquiry-form input[name="consent"]').getAttribute("required") !== null)) failures.push("mobile-contact: privacy consent was not required");
  }

  console.log(`${check.name}: ${audit.clientWidth}x${check.height}, scrollWidth=${audit.scrollWidth}, title="${audit.title}"`);
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("\nVisual/responsive check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nVisual, responsive, localisation and interaction checks passed.");
}
