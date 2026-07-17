import fs from "node:fs";
import { chromium } from "@playwright/test";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });
const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const checks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000 },
  { name: "desktop-shop", path: "/shop", width: 1440, height: 1000 },
  { name: "desktop-spray", path: "/products/spray-dried", width: 1440, height: 1000 },
  { name: "desktop-agglomerated", path: "/products/agglomerated", width: 1440, height: 1000 },
  { name: "desktop-freeze", path: "/products/freeze-dried", width: 1440, height: 1000 },
  { name: "desktop-bulk", path: "/bulk", width: 1440, height: 1000 },
  { name: "desktop-learn", path: "/learn", width: 1440, height: 1000 },
  { name: "desktop-sustainability", path: "/sustainability", width: 1440, height: 1000 },
  { name: "desktop-privacy", path: "/privacy", width: 1440, height: 1000 },
  { name: "desktop-cart-recovery", path: "/checkout", width: 1440, height: 1000, malformedCart: true },
  { name: "mobile-home", path: "/", width: 390, height: 844 },
  { name: "mobile-shop", path: "/shop", width: 390, height: 844 },
  { name: "mobile-product", path: "/products/freeze-dried", width: 390, height: 844 },
  { name: "mobile-bulk", path: "/bulk", width: 390, height: 844 },
  { name: "mobile-learn", path: "/learn", width: 390, height: 844 },
  { name: "mobile-sustainability", path: "/sustainability", width: 390, height: 844 },
  { name: "mobile-shipping", path: "/shipping-returns", width: 390, height: 844 },
  { name: "mobile-checkout", path: "/checkout", width: 390, height: 844, cart: true },
  { name: "compact-home", path: "/", width: 320, height: 700 },
  { name: "compact-product", path: "/products/agglomerated", width: 320, height: 700 },
];

const browser = await chromium.launch();
const failures = [];
const firstViewportTargets = {
  "mobile-home": ".hero__actions .button--dark",
  "compact-home": ".hero__actions .button--dark",
  "mobile-shop": ".product-card",
  "mobile-product": ".product-detail__content > .button",
  "mobile-bulk": ".bulk-route",
  "mobile-learn": ".making-process",
  "mobile-sustainability": ".sustainability-intro",
  "mobile-shipping": ".policy-status",
  "mobile-checkout": ".checkout-items",
};

for (const check of checks) {
  const context = await browser.newContext({ viewport: { width: check.width, height: check.height }, deviceScaleFactor: 1 });
  if (check.cart) {
    await context.addInitScript(() => localStorage.setItem("coffendi-instant-cart", JSON.stringify([{ id: "freeze-dried", quantity: 2 }])));
  }
  if (check.malformedCart) {
    await context.addInitScript(() => localStorage.setItem("coffendi-instant-cart", JSON.stringify({ unexpected: true })));
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: new URL(`${check.name}.png`, outputDir).pathname, fullPage: false });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 1) failures.push(`${check.name}: horizontal overflow ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`);
  if (dimensions.brokenImages) failures.push(`${check.name}: ${dimensions.brokenImages} broken images`);
  if (!dimensions.canonical.endsWith(check.path === "/" ? "/" : check.path)) failures.push(`${check.name}: canonical URL did not match the route`);
  if (pageErrors.length) failures.push(`${check.name}: ${pageErrors.join(" | ")}`);
  const firstViewportTarget = firstViewportTargets[check.name];
  if (firstViewportTarget) {
    const targetTop = await page.locator(firstViewportTarget).first().evaluate((element) => element.getBoundingClientRect().top);
    if (targetTop >= check.height) failures.push(`${check.name}: key content began below the first viewport (${Math.round(targetTop)}px)`);
  }
  console.log(`${check.name}: ${dimensions.clientWidth}x${check.height}, scrollWidth=${dimensions.scrollWidth}, title="${dimensions.title}"`);

  if (check.name === "desktop-shop") {
    const addButton = page.getByRole("button", { name: /Add to cart/ }).first();
    await addButton.click();
    const cart = page.getByRole("dialog", { name: /Cart/ });
    if (!(await cart.isVisible())) failures.push("desktop-shop: cart did not open after adding a product");
    if (!(await page.locator(".site-frame").evaluate((element) => element.inert))) failures.push("desktop-shop: background was not inert while cart was open");
    if (!(await cart.getByRole("button", { name: "Close cart" }).evaluate((element) => document.activeElement === element))) failures.push("desktop-shop: focus did not move into the cart dialog");
    await cart.getByRole("button", { name: /Increase Spray dried coffee quantity/ }).click();
    if ((await cart.getByRole("status", { name: "Quantity" }).textContent()) !== "2") failures.push("desktop-shop: cart quantity did not increment");
    await page.screenshot({ path: new URL("desktop-cart.png", outputDir).pathname, fullPage: false });
    await page.keyboard.press("Escape");
    if (await cart.isVisible()) failures.push("desktop-shop: Escape did not close the cart");
    await page.waitForFunction((element) => document.activeElement === element, await addButton.elementHandle());
    if (await page.locator(".site-frame").evaluate((element) => element.inert)) failures.push("desktop-shop: background stayed inert after cart closed");
  }

  if (check.name === "mobile-home") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    if (!(await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible())) failures.push("mobile-home: navigation did not open");
    if (!(await page.locator("#main-content").evaluate((element) => element.inert))) failures.push("mobile-home: main content was not inert while navigation was open");
    await page.waitForFunction(() => document.activeElement?.closest("#mobile-navigation") !== null);
    const focusedNavigationLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() || "");
    if (!focusedNavigationLabel.includes("Shop")) failures.push("mobile-home: focus did not move to the first navigation link");
    await page.waitForTimeout(220);
    await page.screenshot({ path: new URL("mobile-navigation.png", outputDir).pathname, fullPage: false });
    await page.keyboard.press("Escape");
    if (await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible()) failures.push("mobile-home: Escape did not close navigation");
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Open navigation");
    if (await page.locator("#main-content").evaluate((element) => element.inert)) failures.push("mobile-home: main content stayed inert after navigation closed");
  }

  if (check.name === "desktop-bulk") {
    await page.locator('select[name="product"]').selectOption("agglomerated");
    await page.getByLabel("Indicative volume").selectOption({ label: "2–10 tonnes" });
    await page.getByLabel("Packaging route").selectOption({ label: "Retail or private label" });
    if (!(await page.getByLabel(/I agree that Coffendi/).getAttribute("required") !== null)) failures.push("desktop-bulk: privacy consent was not required");
    await page.locator(".bulk-form").scrollIntoViewIfNeeded();
    await page.screenshot({ path: new URL("desktop-bulk-brief.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "desktop-freeze") {
    const productSchema = await page.locator('script[type="application/ld+json"]').textContent();
    if (!productSchema?.includes('"@type":"Product"')) failures.push("desktop-freeze: product structured data was missing");
  }

  if (check.name === "desktop-cart-recovery") {
    if (!(await page.getByRole("heading", { name: "Your cart is empty." }).isVisible())) failures.push("desktop-cart-recovery: malformed stored cart was not recovered safely");
    const storedCart = await page.evaluate(() => localStorage.getItem("coffendi-instant-cart"));
    if (storedCart !== "[]") failures.push("desktop-cart-recovery: malformed stored cart was not repaired");
  }

  if (check.name === "mobile-product") {
    const mobileBuyBar = page.locator(".mobile-buy-bar");
    if (await mobileBuyBar.isVisible()) failures.push("mobile-product: buy bar obscured the initial product view");
    await page.locator(".product-explainer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    if (!(await mobileBuyBar.isVisible())) failures.push("mobile-product: contextual buy bar did not appear after the primary purchase action was passed");
  }

  if (check.name === "desktop-learn") {
    const rows = await page.locator(".comparison-row").count();
    if (rows !== 4) failures.push(`desktop-learn: expected 4 comparison rows, found ${rows}`);
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("\nVisual check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nVisual checks passed with working cart interactions, no console errors, broken images, or horizontal overflow.");
}
