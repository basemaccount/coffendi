import fs from "node:fs";
import { chromium } from "@playwright/test";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });
const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const allChecks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000 },
  { name: "desktop-shop", path: "/shop", width: 1440, height: 1000 },
  { name: "desktop-spray", path: "/products/spray-dried", width: 1440, height: 1000 },
  { name: "desktop-agglomerated", path: "/products/agglomerated", width: 1440, height: 1000 },
  { name: "desktop-freeze", path: "/products/freeze-dried", width: 1440, height: 1000 },
  { name: "desktop-bulk", path: "/bulk", width: 1440, height: 1000 },
  { name: "desktop-learn", path: "/learn", width: 1440, height: 1000 },
  { name: "desktop-sustainability", path: "/sustainability", width: 1440, height: 1000 },
  { name: "desktop-privacy", path: "/privacy", width: 1440, height: 1000 },
  { name: "desktop-contact", path: "/contact", width: 1440, height: 1000 },
  { name: "desktop-cart-recovery", path: "/checkout", width: 1440, height: 1000, malformedCart: true },
  { name: "tablet-home", path: "/", width: 1024, height: 900 },
  { name: "tablet-shop", path: "/shop", width: 768, height: 900 },
  { name: "mobile-home", path: "/", width: 390, height: 844, mobile: true },
  { name: "mobile-shop", path: "/shop", width: 390, height: 844, mobile: true },
  { name: "mobile-product", path: "/products/freeze-dried", width: 390, height: 844, mobile: true },
  { name: "mobile-bulk", path: "/bulk", width: 390, height: 844, mobile: true },
  { name: "mobile-learn", path: "/learn", width: 390, height: 844, mobile: true },
  { name: "mobile-sustainability", path: "/sustainability", width: 390, height: 844, mobile: true },
  { name: "mobile-shipping", path: "/shipping-returns", width: 390, height: 844, mobile: true },
  { name: "mobile-contact", path: "/contact", width: 390, height: 844, mobile: true },
  { name: "mobile-checkout", path: "/checkout", width: 390, height: 844, cart: true, mobile: true },
  { name: "compact-home", path: "/", width: 320, height: 700, mobile: true },
  { name: "compact-product", path: "/products/agglomerated", width: 320, height: 700, mobile: true },
  { name: "compact-shop", path: "/shop", width: 320, height: 568, mobile: true },
  { name: "landscape-home", path: "/", width: 844, height: 390, mobile: true },
  { name: "landscape-product", path: "/products/freeze-dried", width: 844, height: 390, mobile: true },
];
const visualFilter = process.env.COFFENDI_VISUAL_FILTER;
const checks = visualFilter
  ? allChecks.filter(({ name }) => name.includes(visualFilter))
  : allChecks;

if (!checks.length) throw new Error(`No visual checks matched COFFENDI_VISUAL_FILTER=${visualFilter}`);

const browser = await chromium.launch();
const failures = [];
const firstViewportTargets = {
  "tablet-home": ".hero__visual",
  "tablet-shop": ".format-switcher",
  "mobile-home": ".hero__actions .button--dark",
  "compact-home": ".hero__actions .button--dark",
  "compact-shop": ".page-hero__jump",
  "landscape-home": ".hero__actions .button--dark",
  "landscape-product": ".product-detail__content h1",
  "mobile-shop": ".page-hero__jump",
  "mobile-product": ".product-purchase > .button",
  "mobile-bulk": ".bulk-route",
  "mobile-learn": ".making-process",
  "mobile-sustainability": ".sustainability-intro",
  "mobile-shipping": ".policy-status",
  "mobile-contact": ".contact-options",
  "mobile-checkout": ".checkout-items",
};

async function waitForMotion(page, timeout = 1_600) {
  await page.waitForFunction(
    () => document.getAnimations().every((animation) => {
      const iterations = animation.effect?.getTiming?.().iterations;
      return iterations === Infinity || ["finished", "idle"].includes(animation.playState);
    }),
    undefined,
    { timeout },
  ).catch(() => {});
}

for (const check of checks) {
  const context = await browser.newContext({
    viewport: { width: check.width, height: check.height },
    deviceScaleFactor: 1,
    hasTouch: Boolean(check.mobile),
    isMobile: Boolean(check.mobile),
  });
  if (check.cart) {
    await context.addInitScript(() => localStorage.setItem("coffendi-instant-cart", JSON.stringify([{ id: "freeze-dried", quantity: 2 }])));
  }
  if (check.malformedCart) {
    await context.addInitScript(() => localStorage.setItem("coffendi-instant-cart", JSON.stringify({ unexpected: true })));
  }
  const page = await context.newPage();
  await page.route("**/api/commerce-status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, ready: false, purchasePath: "inquiry", message: "Online checkout is being prepared." }),
  }));
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await waitForMotion(page);
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

  if (check.name === "desktop-home") {
    if (await page.locator(".hero__marquee-group").count() !== 2) failures.push("desktop-home: format ribbon did not contain two seamless groups");
    const marqueeRunning = await page.locator(".hero__marquee-track").evaluate((element) => (
      element.getAnimations().some((animation) => animation.effect?.getTiming?.().iterations === Infinity)
    ));
    if (!marqueeRunning) failures.push("desktop-home: editorial format ribbon was not moving");
    await page.evaluate(() => window.scrollTo(0, Math.min(800, document.documentElement.scrollHeight - innerHeight)));
    await page.waitForFunction(() => Number.parseFloat(document.querySelector(".scroll-progress")?.style.getPropertyValue("--scroll-progress") || "0") > 0);
    await page.locator(".faq-section").scrollIntoViewIfNeeded();
    await waitForMotion(page);
    await page.locator(".faq-grid summary").first().click();
    const faqMotion = await page.locator(".faq-grid details p").first().evaluate((element) => (
      element.getAnimations().some((animation) => animation.animationName === "faq-answer-in")
    ));
    if (!faqMotion) failures.push("desktop-home: FAQ answer did not receive disclosure motion");
  }

  if (check.name === "desktop-shop") {
    const addButton = page.getByRole("button", { name: /Add to (cart|selection)/ }).first();
    const addButtonHandle = await addButton.elementHandle();
    await addButton.click();
    const cart = page.getByRole("dialog", { name: /Cart/ });
    if (!(await cart.isVisible())) failures.push("desktop-shop: cart did not open after adding a product");
    if (!(await page.locator(".site-frame").evaluate((element) => element.inert))) failures.push("desktop-shop: background was not inert while cart was open");
    if (!(await cart.getByRole("button", { name: "Close cart" }).evaluate((element) => document.activeElement === element))) failures.push("desktop-shop: focus did not move into the cart dialog");
    await cart.getByRole("button", { name: /Increase Spray dried coffee quantity/ }).click();
    if ((await cart.getByRole("status", { name: "Quantity" }).textContent()) !== "2") failures.push("desktop-shop: cart quantity did not increment");
    await waitForMotion(page);
    await page.screenshot({ path: new URL("desktop-cart.png", outputDir).pathname, fullPage: false });
    await page.keyboard.press("Escape");
    if (await cart.isVisible()) failures.push("desktop-shop: Escape did not close the cart");
    await page.waitForFunction((element) => document.activeElement === element, addButtonHandle);
    if (await page.locator(".site-frame").evaluate((element) => element.inert)) failures.push("desktop-shop: background stayed inert after cart closed");
    if (!(await page.locator(".product-card").first().getAttribute("class"))?.includes("is-in-cart")) failures.push("desktop-shop: product card did not reflect its in-cart state");
    if (!(await page.locator(".product-card__cart-state").first().textContent())?.includes("2")) failures.push("desktop-shop: product card did not expose the updated cart quantity");
    await page.screenshot({ path: new URL("desktop-shop-in-cart.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "mobile-home") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    if (!(await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible())) failures.push("mobile-home: navigation did not open");
    if (!(await page.locator("#main-content").evaluate((element) => element.inert))) failures.push("mobile-home: main content was not inert while navigation was open");
    await page.waitForFunction(() => document.activeElement?.closest("#mobile-navigation") !== null);
    const focusedNavigationLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() || "");
    if (!focusedNavigationLabel.includes("Shop")) failures.push("mobile-home: focus did not move to the first navigation link");
    await waitForMotion(page);
    await page.screenshot({ path: new URL("mobile-navigation.png", outputDir).pathname, fullPage: false });
    await page.keyboard.press("Escape");
    if (await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible()) failures.push("mobile-home: Escape did not close navigation");
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Open navigation");
    if (await page.locator("#main-content").evaluate((element) => element.inert)) failures.push("mobile-home: main content stayed inert after navigation closed");
  }

  if (check.name === "mobile-shop") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const shopNavigationLink = page.locator('#mobile-navigation a[href="/shop"]');
    if (!(await shopNavigationLink.getAttribute("aria-current"))) failures.push("mobile-shop: current mobile navigation destination was not identified");
    await page.keyboard.press("Escape");
    if (!(await page.locator(".format-switcher__hint").isVisible())) failures.push("mobile-shop: horizontal format guidance was not visible");
    const formatSwitcher = page.locator(".format-switcher");
    await formatSwitcher.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: "instant" }));
    if (await formatSwitcher.evaluate((element) => element.scrollLeft) === 0) failures.push("mobile-shop: format selector was not horizontally scrollable");
    await formatSwitcher.evaluate((element) => element.scrollTo({ left: 0, behavior: "instant" }));
    await page.getByRole("button", { name: /Add to (cart|selection)/ }).first().click();
    const mobileCart = page.getByRole("dialog", { name: /Cart/ });
    await mobileCart.waitFor({ state: "visible" });
    await waitForMotion(page);
    const drawerBounds = await mobileCart.evaluate((element) => element.getBoundingClientRect().toJSON());
    if (drawerBounds.top <= 0 || Math.abs(drawerBounds.bottom - check.height) > 1) failures.push("mobile-shop: cart did not settle as a bottom sheet");
    if (drawerBounds.height >= check.height * 0.82) failures.push("mobile-shop: one-item cart sheet was taller than its content required");
    await page.screenshot({ path: new URL("mobile-cart.png", outputDir).pathname, fullPage: false });
    await page.keyboard.press("Escape");
  }

  if (check.name === "desktop-bulk") {
    await page.locator('select[name="product"]').selectOption("agglomerated");
    await page.getByLabel("Indicative volume").selectOption({ label: "2–10 tonnes" });
    await page.getByLabel("Packaging route").selectOption({ label: "Retail or private label" });
    if (!(await page.getByLabel(/I agree that Coffendi/).getAttribute("required") !== null)) failures.push("desktop-bulk: privacy consent was not required");
    if (await page.locator(".form-group").count() !== 3) failures.push("desktop-bulk: commercial brief was not divided into three clear groups");
    await page.locator(".bulk-form").scrollIntoViewIfNeeded();
    await waitForMotion(page);
    await page.screenshot({ path: new URL("desktop-bulk-brief.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "desktop-freeze") {
    const productSchema = await page.locator('script[type="application/ld+json"]').textContent();
    if (!productSchema?.includes('"@type":"Product"')) failures.push("desktop-freeze: product structured data was missing");
    if (await page.locator(".preparation-grid li").count() !== 3) failures.push("desktop-freeze: preparation guidance was incomplete");
    if (await page.locator(".next-products__content small").count() !== 2) failures.push("desktop-freeze: alternative formats lacked comparison attributes");
    const purchaseControls = page.locator(".product-purchase");
    await purchaseControls.getByRole("button", { name: /Increase purchase quantity/ }).click();
    await purchaseControls.getByRole("button", { name: /Increase purchase quantity/ }).click();
    if (await purchaseControls.getByRole("spinbutton").inputValue() !== "3") failures.push("desktop-freeze: product purchase quantity did not increment to three");
    const multiAddButton = purchaseControls.getByRole("button", { name: /Add 3 to (cart|selection)/ });
    const multiAddButtonHandle = await multiAddButton.elementHandle();
    await multiAddButton.click();
    const productCart = page.getByRole("dialog", { name: /Cart/ });
    if ((await productCart.getByRole("status", { name: "Quantity" }).textContent()) !== "3") failures.push("desktop-freeze: selected product quantity was not added to the cart");
    await page.keyboard.press("Escape");
    await page.waitForFunction((element) => document.activeElement === element, multiAddButtonHandle);
    if (await purchaseControls.getByRole("spinbutton").inputValue() !== "1") failures.push("desktop-freeze: product purchase quantity did not reset after adding");
    await page.locator(".preparation-section").scrollIntoViewIfNeeded();
    await waitForMotion(page);
    await page.screenshot({ path: new URL("desktop-preparation.png", outputDir).pathname, fullPage: false });
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
    await page.waitForFunction(() => document.querySelector(".mobile-buy-bar")?.classList.contains("is-visible"));
    await waitForMotion(page);
    if (!(await mobileBuyBar.isVisible())) failures.push("mobile-product: contextual buy bar did not appear after the primary purchase action was passed");
    await page.screenshot({ path: new URL("mobile-product-buy-bar.png", outputDir).pathname, fullPage: false });
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await mobileBuyBar.waitFor({ state: "hidden" });
    if (await mobileBuyBar.isVisible()) failures.push("mobile-product: contextual buy bar covered the footer");
  }

  if (check.name === "compact-shop") {
    await page.getByRole("button", { name: /Add to (cart|selection)/ }).first().click();
    const compactCart = page.getByRole("dialog", { name: /Cart/ });
    await compactCart.waitFor({ state: "visible" });
    await waitForMotion(page);
    const compactBounds = await compactCart.evaluate((element) => element.getBoundingClientRect().toJSON());
    if (compactBounds.top < 8 || Math.abs(compactBounds.bottom - check.height) > 1) failures.push("compact-shop: short-screen cart did not remain inside the usable viewport");
    await page.screenshot({ path: new URL("compact-cart.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "landscape-home") {
    if (await page.locator(".announcement").isVisible()) failures.push("landscape-home: announcement consumed the short mobile viewport");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const finalNavItemBottom = await page.getByRole("link", { name: /05 Contact/ }).evaluate((element) => element.getBoundingClientRect().bottom);
    if (finalNavItemBottom > check.height) failures.push("landscape-home: mobile navigation destinations exceeded the short viewport");
    await page.keyboard.press("Escape");
  }

  if (check.name === "mobile-bulk") {
    await page.locator(".bulk-form").scrollIntoViewIfNeeded();
    await waitForMotion(page);
    await page.screenshot({ path: new URL("mobile-bulk-brief.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "mobile-learn") {
    await page.locator(".comparison-section").scrollIntoViewIfNeeded();
    await waitForMotion(page);
    const mobileComparisonWidth = await page.locator(".comparison-row:not(.comparison-row--header)").first().evaluate((element) => element.getBoundingClientRect().width);
    if (mobileComparisonWidth > check.width - 34 + 1) failures.push("mobile-learn: comparison card exceeded the mobile content width");
    if (await page.locator('.comparison-row [data-label="Appearance"]').count() !== 3) failures.push("mobile-learn: comparison cards lacked mobile attribute labels");
    await page.screenshot({ path: new URL("mobile-comparison.png", outputDir).pathname, fullPage: false });
  }

  if (check.name === "desktop-learn") {
    const rows = await page.locator(".comparison-row").count();
    if (rows !== 4) failures.push(`desktop-learn: expected 4 comparison rows, found ${rows}`);
  }
  await context.close();
}

const reducedMotionContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const reducedMotionPage = await reducedMotionContext.newPage();
await reducedMotionPage.route("**/api/commerce-status", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ ok: true, ready: false, purchasePath: "inquiry", message: "Online checkout is being prepared." }),
}));
await reducedMotionPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
const reducedMotionState = await reducedMotionPage.evaluate(() => ({
  motionReady: document.documentElement.classList.contains("motion-ready"),
  hiddenSections: [...document.querySelectorAll(".reveal-section")].filter((section) => getComputedStyle(section).opacity === "0").length,
  infiniteAnimations: document.getAnimations().filter((animation) => animation.effect?.getTiming?.().iterations === Infinity).length,
}));
if (reducedMotionState.motionReady) failures.push("reduced-motion: animated motion system remained enabled");
if (reducedMotionState.hiddenSections) failures.push(`reduced-motion: ${reducedMotionState.hiddenSections} sections remained hidden`);
if (reducedMotionState.infiniteAnimations) failures.push(`reduced-motion: ${reducedMotionState.infiniteAnimations} continuous animations remained enabled`);
await reducedMotionContext.close();

await browser.close();
if (failures.length) {
  console.error("\nVisual check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nVisual checks passed with working cart interactions, no console errors, broken images, or horizontal overflow.");
}
