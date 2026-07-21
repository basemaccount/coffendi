import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const routes = ["/", "/coffees", "/origins", "/compare", "/approach", "/contact", "/privacy", "/coffees/ethiopia-washed"];
const rapidTargets = ["/coffees", "/origins", "/compare", "/approach"];
const failures = [];
const browser = await chromium.launch();

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

for (const route of routes) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert(response?.ok(), `${route}: direct load returned ${response?.status()}`);
  assert(await page.locator("h1").count() === 1, `${route}: direct load did not render one h1`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), `${route}: horizontal overflow after direct load`);
  await page.reload({ waitUntil: "networkidle" });
  assert(await page.locator("h1").count() === 1, `${route}: reload did not recover the route`);
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
const keyboardLink = page.locator('.desktop-nav a[href="/coffees"]');
await keyboardLink.focus();
await page.keyboard.press("Enter");
await page.waitForURL("**/coffees");
assert(new URL(page.url()).pathname === "/coffees", "keyboard activation did not navigate");

await page.goto(baseUrl, { waitUntil: "networkidle" });
const modifierPrevented = await page.locator('.desktop-nav a[href="/coffees"]').evaluate((anchor) => {
  let prevented;
  window.addEventListener("click", (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));
  return prevented;
});
assert(modifierPrevented === false, "modified click was captured by application navigation");

for (let index = 0; index < 16; index += 1) {
  const target = rapidTargets[index % rapidTargets.length];
  await page.evaluate((href) => document.querySelector(`.desktop-nav a[href="${href}"]`)?.click(), target);
  await page.waitForTimeout(12);
}
await page.waitForURL("**/approach");
await page.waitForTimeout(1300);
assert(!await page.locator("html.route-changing").count(), "rapid navigation left the document transition-locked");

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(750);
await page.mouse.wheel(0, 1300);
await page.waitForTimeout(100);
const scrollBefore = await page.evaluate(() => scrollY);
const navBounds = await page.locator('.desktop-nav a[href="/coffees"]').boundingBox();
await page.mouse.click(navBounds.x + navBounds.width / 2, navBounds.y + navBounds.height / 2);
await page.waitForURL("**/coffees");
await page.waitForTimeout(750);
assert(await page.evaluate(() => scrollY) === 0, "new route did not settle at the top");
await page.goBack();
await page.waitForURL((url) => url.pathname === "/");
await page.waitForTimeout(750);
assert(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) <= 1, "Back did not restore the previous scroll position");

await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const mobile = await mobileContext.newPage();
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.locator(".menu-button").click();
await mobile.waitForTimeout(80);
assert(await mobile.locator(".mobile-navigation.is-open").count() === 1, "mobile menu did not open");
assert(await mobile.locator("#main-content").evaluate((element) => element.inert), "mobile menu did not make page content inert");
await mobile.keyboard.press("Escape");
assert(!await mobile.locator("#main-content").evaluate((element) => element.inert), "mobile menu left page content inert");
assert(await mobile.locator(".menu-button").evaluate((element) => document.activeElement === element), "mobile menu did not restore focus");
const mobileTargets = await mobile.evaluate(() => [document.querySelector(".menu-button"), ...document.querySelectorAll(".language-switcher button")].map((element) => ({ width: element.offsetWidth, height: element.offsetHeight })));
assert(mobileTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile header has a touch target below 44px");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile home has horizontal overflow");
await mobileContext.close();

const throwContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await throwContext.addInitScript(() => Object.defineProperty(document, "startViewTransition", { configurable: true, value: () => { throw new Error("forced transition failure"); } }));
const throwPage = await throwContext.newPage();
await throwPage.goto(baseUrl, { waitUntil: "networkidle" });
await throwPage.locator('.desktop-nav a[href="/origins"]').click();
await throwPage.waitForURL("**/origins");
assert(!await throwPage.locator("html.route-changing").count(), "thrown transition trapped the document");
await throwContext.close();

const stallContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await stallContext.addInitScript(() => Object.defineProperty(document, "startViewTransition", {
  configurable: true,
  value: (callback) => {
    callback();
    return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), finished: new Promise(() => {}), skipTransition() { window.__skipped = (window.__skipped || 0) + 1; } };
  },
}));
const stallPage = await stallContext.newPage();
await stallPage.goto(baseUrl, { waitUntil: "networkidle" });
await stallPage.locator('.desktop-nav a[href="/compare"]').click();
await stallPage.waitForURL("**/compare");
await stallPage.waitForTimeout(1300);
assert(await stallPage.evaluate(() => window.__skipped) === 1, "stalled transition was not skipped by the timeout");
assert(!await stallPage.locator("html.route-changing").count(), "stalled transition left the document locked");
await stallContext.close();

assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(" | ")}`);
await browser.close();

if (failures.length) {
  console.error("Interaction check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Interaction checks passed: ${routes.length} direct loads/reloads, keyboard and modified clicks, rapid navigation, exact history restoration, mobile menu/touch targets, and transition failure recovery.`);
}
