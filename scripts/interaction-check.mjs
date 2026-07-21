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

await page.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 520));
const sameRouteHistoryLength = await page.evaluate(() => history.length);
await page.locator('.desktop-nav a[href="/compare"]').click();
await page.waitForTimeout(850);
assert(await page.evaluate(() => scrollY) === 0, "current-route navigation did not return to the top");
assert(await page.evaluate(() => history.length) === sameRouteHistoryLength, "current-route navigation added a duplicate history entry");
assert(!await page.locator("html.route-changing").count(), "current-route navigation started a redundant page transition");

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
const deferredRendering = await page.evaluate(() => ({
  supported: CSS.supports("content-visibility: auto"),
  values: [...document.querySelectorAll('[data-render-deferred="true"]')].map((section) => getComputedStyle(section).contentVisibility),
}));
assert(!deferredRendering.supported || deferredRendering.values.length > 0 && deferredRendering.values.every((value) => value === "auto"), "deep sections did not opt into native deferred rendering");
await page.mouse.wheel(0, 3600);
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

const chapterNavigator = page.locator(".chapter-navigator");
assert(await chapterNavigator.locator("button").count() > 1, "home did not expose multiple page chapters");
assert(await chapterNavigator.evaluate((element) => element.classList.contains("is-visible") && element.getAttribute("aria-hidden") === "false"), "chapter navigator did not become available after scrolling");
const targetChapterIndex = Math.min(2, await chapterNavigator.locator("button").count() - 1);
const targetChapterButton = chapterNavigator.locator("button").nth(targetChapterIndex);
const targetChapterId = await targetChapterButton.getAttribute("aria-controls");
const targetChapterBounds = await targetChapterButton.boundingBox();
assert(Boolean(targetChapterBounds), "chapter selection did not expose a clickable target");
if (targetChapterBounds) await page.mouse.click(targetChapterBounds.x + targetChapterBounds.width / 2, targetChapterBounds.y + targetChapterBounds.height / 2);
await page.waitForTimeout(850);
assert(await targetChapterButton.getAttribute("aria-current") === "step", "chapter selection did not update its current state");
assert(await page.locator(`#${targetChapterId}`).evaluate((element) => Math.abs(element.getBoundingClientRect().top - 96) < 8), "chapter selection did not align the target below the sticky header");
const documentTitle = await page.title();
assert((await page.locator(".experience-announcer").textContent()).includes(documentTitle), `route announcement did not include the current title: ${documentTitle}`);
const progressMode = await page.locator(".scroll-progress span").evaluate((element) => ({
  supported: CSS.supports("animation-timeline: scroll(root block)"),
  timeline: getComputedStyle(element).animationTimeline,
}));
assert(!progressMode.supported || progressMode.timeline !== "auto", "native scroll timeline support was not used for page progress");

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator(".origin-atlas").scrollIntoViewIfNeeded();
const atlasButtons = page.locator(".origin-atlas__controls button");
await atlasButtons.evaluateAll((buttons) => buttons.slice(1).forEach((button) => button.click()));
await page.waitForFunction(() => document.querySelector('.origin-atlas__workspace')?.getAttribute('aria-busy') === 'false');
assert(await atlasButtons.last().getAttribute("aria-pressed") === "true", "rapid atlas selection did not settle on the last requested origin");
await page.locator(".origin-atlas__visual").evaluate((element) => Object.defineProperty(element, "startViewTransition", { configurable: true, value: () => { throw new Error("forced scoped transition failure"); } }));
await atlasButtons.first().click();
await page.waitForFunction(() => document.querySelector('.origin-atlas__workspace')?.getAttribute('aria-busy') === 'false');
assert(await atlasButtons.first().getAttribute("aria-pressed") === "true", "atlas did not recover from a scoped transition failure");

await page.reload({ waitUntil: "networkidle" });
await page.locator(".origin-atlas").scrollIntoViewIfNeeded();
await page.evaluate(() => {
  window.Image = class FailingPreloadImage {
    set sizes(value) { this._sizes = value; }
    set srcset(value) { this._srcset = value; }
    set src(value) { this._src = value; queueMicrotask(() => this.onerror?.(new Event("error"))); }
  };
});
const fallbackAtlasButtons = page.locator(".origin-atlas__controls button");
await fallbackAtlasButtons.nth(1).click();
await page.waitForFunction(() => document.querySelector('.origin-atlas__workspace')?.getAttribute('aria-busy') === 'false');
assert(await fallbackAtlasButtons.nth(1).getAttribute("aria-pressed") === "true", "atlas left a click pending after image preloading failed");

await page.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" });
const clearComparison = page.locator(".compare-toolbar__clear");
if (await clearComparison.count()) await clearComparison.click();
const comparisonButtons = page.locator(".compare-picker button");
for (const index of [0, 2, 4]) await comparisonButtons.nth(index).click();
await page.waitForTimeout(280);
assert(await comparisonButtons.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute("aria-pressed") === "true").length) === 3, "comparison did not retain three explicit selections");
assert(await comparisonButtons.evaluateAll((buttons) => buttons.filter((button) => button.disabled).length) === 3, "comparison limit did not disable only the unselected profiles");
assert(await comparisonButtons.evaluateAll((buttons) => buttons.every((button) => Number.parseFloat(getComputedStyle(button).opacity) > 0.35 && !button.dataset.reveal)), "comparison state change recreated the invisible-control screenshot bug");
await comparisonButtons.nth(0).click();
await comparisonButtons.nth(5).click();
await page.waitForTimeout(280);
assert(await comparisonButtons.nth(5).getAttribute("aria-pressed") === "true", "comparison did not accept a new profile after one was removed");
assert(await comparisonButtons.evaluateAll((buttons) => buttons.every((button) => Number.parseFloat(getComputedStyle(button).opacity) > 0.35)), "comparison controls became invisible after replacing a selection");
assert(await page.locator('.compare-table [role="cell"]').first().getAttribute("data-label") !== "Profile", "responsive comparison cells did not retain their profile identity");

await page.goto(`${baseUrl}/contact`, { waitUntil: "networkidle" });
const inquiryProgress = page.locator(".inquiry-progress__meter");
assert(await inquiryProgress.getAttribute("aria-valuemax") === "5", "inquiry readiness did not identify the five required fields");
await page.locator('[name="name"]').fill("Test Person");
await page.locator('[name="company"]').fill("Test Company");
await page.locator('[name="email"]').fill("test@example.com");
await page.locator('[name="message"]').fill("A complete test coffee brief.");
await page.locator('[name="consent"]').check();
await page.waitForFunction(() => document.querySelector(".inquiry-progress__meter")?.getAttribute("aria-valuenow") === "5");
assert(await page.locator(".inquiry-progress.is-ready").count() === 1, "completed inquiry did not expose its ready state");

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
await mobile.locator(".menu-button").click();
await mobile.evaluate(() => {
  document.documentElement.classList.add("route-changing", "is-restoring-scroll");
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
});
await mobile.waitForTimeout(80);
assert(!await mobile.locator(".mobile-navigation.is-open").count(), "BFCache restoration left the mobile menu open");
assert(!await mobile.locator("html.route-changing, html.is-restoring-scroll").count(), "BFCache restoration left transient document classes active");
assert(!await mobile.locator("#main-content").evaluate((element) => element.inert), "BFCache restoration left page content inert");
await mobile.evaluate(() => window.dispatchEvent(new Event("offline")));
await mobile.waitForTimeout(30);
assert(await mobile.locator(".connection-notice.is-offline").count() === 1, "offline state did not surface a connection notice");
await mobile.evaluate(() => window.dispatchEvent(new Event("online")));
await mobile.waitForTimeout(30);
assert(await mobile.locator(".connection-notice.is-online").count() === 1, "reconnection did not update the connection notice");
const mobileTargets = await mobile.evaluate(() => [document.querySelector(".menu-button"), ...document.querySelectorAll(".language-switcher button")].map((element) => ({ width: element.offsetWidth, height: element.offsetHeight })));
assert(mobileTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile header has a touch target below 44px");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile home has horizontal overflow");
await mobile.evaluate(() => window.scrollTo(0, 1000));
await mobile.waitForTimeout(180);
const mobileChapterNavigator = mobile.locator(".chapter-navigator");
assert(await mobileChapterNavigator.getAttribute("aria-hidden") === "false", "mobile chapter navigator did not become available after scrolling");
const mobileChapterTargets = await mobileChapterNavigator.locator("button").evaluateAll((buttons) => buttons.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileChapterTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile chapter navigator has a touch target below 44px");
const dockBounds = await mobileChapterNavigator.boundingBox();
const topBounds = await mobile.locator(".back-to-top").boundingBox();
assert(dockBounds && topBounds && dockBounds.x + dockBounds.width <= topBounds.x - 4, "mobile chapter navigator overlaps the back-to-top control");
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
await reducedPage.evaluate(() => window.scrollTo(0, 1000));
await reducedPage.waitForTimeout(80);
assert(await reducedPage.locator(".scroll-progress").evaluate((element) => getComputedStyle(element).display) === "none", "reduced motion did not disable animated scroll progress");
const reducedChapter = reducedPage.locator(".chapter-navigator button").nth(2);
const reducedChapterId = await reducedChapter.getAttribute("aria-controls");
await reducedChapter.click();
await reducedPage.waitForTimeout(50);
assert(await reducedPage.locator(`#${reducedChapterId}`).evaluate((element) => {
  const expectedTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return Math.abs(element.getBoundingClientRect().top - expectedTop) < 8;
}), "reduced-motion chapter jump was not immediate");
await reducedContext.close();

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

const storageSyncContext = await browser.newContext({ viewport: { width: 1024, height: 800 } });
await storageSyncContext.addInitScript(() => {
  window.__storageEvents = 0;
  window.addEventListener("storage", () => { window.__storageEvents += 1; });
});
const storageSourcePage = await storageSyncContext.newPage();
const storageMirrorPage = await storageSyncContext.newPage();
await Promise.all([storageSourcePage.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" }), storageMirrorPage.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" })]);
if (await storageSourcePage.locator(".compare-toolbar__clear").count()) await storageSourcePage.locator(".compare-toolbar__clear").click();
await storageMirrorPage.waitForFunction(() => document.querySelectorAll('.compare-picker button[aria-pressed="true"]').length === 0);
await storageSourcePage.locator(".compare-picker button").first().click();
await storageMirrorPage.waitForFunction(() => document.querySelectorAll('.compare-picker button[aria-pressed="true"]').length === 1);
assert(await storageSourcePage.evaluate(() => window.__storageEvents) + await storageMirrorPage.evaluate(() => window.__storageEvents) <= 3, "comparison storage synchronization echoed between tabs");
await storageSyncContext.close();

const blockedStorageContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
await blockedStorageContext.addInitScript(() => {
  Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
});
const blockedStoragePage = await blockedStorageContext.newPage();
await blockedStoragePage.goto(baseUrl, { waitUntil: "networkidle" });
assert(await blockedStoragePage.locator("h1").count() === 1, "blocked browser storage prevented the application from loading");
await blockedStoragePage.locator('.language-switcher button').nth(1).click();
assert(await blockedStoragePage.locator("html").getAttribute("lang") === "tr", "blocked browser storage prevented an in-memory language change");
await blockedStorageContext.close();

assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(" | ")}`);
await browser.close();

if (failures.length) {
  console.error("Interaction check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Interaction checks passed: ${routes.length} direct loads/reloads, keyboard, modified and current-route clicks, rapid navigation, deep history restoration, deferred rendering, stable comparison selection, responsive chapters, inquiry readiness, BFCache/offline/storage recovery, reduced motion, atlas preload/interruption safety, mobile touch targets, and transition failure recovery.`);
}
