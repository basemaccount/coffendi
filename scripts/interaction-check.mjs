import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const profileFlags = [
  ["/coffees/ethiopia-washed", "et"],
  ["/coffees/colombia-balanced", "co"],
  ["/coffees/brazil-classic", "br"],
  ["/coffees/guatemala-structured", "gt"],
  ["/coffees/kenya-vivid", "ke"],
  ["/coffees/rwanda-sweet", "rw"],
];
const routes = ["/", "/coffees", "/origins", "/compare", "/approach", "/contact", "/privacy", ...profileFlags.map(([route]) => route)];
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
  const expectedFlag = profileFlags.find(([profileRoute]) => profileRoute === route)?.[1];
  if (expectedFlag) {
    const heroFlag = page.locator(".profile-detail__origin-badge .origin-flag");
    assert(await heroFlag.getAttribute("data-flag-source") === "local-svg", `${route}: profile hero did not use local SVG flag artwork`);
    assert((await heroFlag.locator("img").getAttribute("src"))?.endsWith(`/images/flags/${expectedFlag}.svg`), `${route}: profile hero exposed the wrong country flag`);
    assert(await heroFlag.locator("img").evaluate((image) => image.complete && image.naturalWidth > 0), `${route}: profile hero country flag did not decode`);
  }
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
assert(await page.locator(".origin-atlas__flag").count() === 6, "country atlas did not expose a flag for every origin");
assert(await page.locator('.origin-atlas__flag[data-flag-source="local-svg"] img').count() === 6, "country atlas did not render six real local flag images");
assert(await page.locator(".origin-atlas__directions li").count() === 3, "country atlas did not expose multiple coffee directions for the active origin");
await atlasButtons.evaluateAll((buttons) => buttons.slice(1).forEach((button) => button.click()));
await page.waitForFunction(() => document.querySelector('.origin-atlas__workspace')?.getAttribute('aria-busy') === 'false');
assert(await atlasButtons.last().getAttribute("aria-pressed") === "true", "rapid atlas selection did not settle on the last requested origin");
assert(await page.locator(".origin-atlas__directions li").count() === 3, "selected atlas origin did not retain its three representative coffee directions");
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

await page.goto(`${baseUrl}/origins`, { waitUntil: "networkidle" });
const mapPins = page.locator(".coffee-map__pin");
const flagFilters = page.locator('.origin-flag-filter [role="group"] > button');
await page.locator(".coffee-map__canvas").scrollIntoViewIfNeeded();
await page.locator(".coffee-map__canvas .origin-map-artwork").evaluate((image) => image.decode());
assert(await mapPins.count() === 6, "origin map did not expose all six country pins");
assert(await page.locator('.coffee-map__canvas .origin-map-artwork[data-map-geometry="natural-earth-110m"]').evaluate((image) => image.naturalWidth === 1000), "origin map did not load the local Natural Earth geometry");
assert(await page.locator(".coffee-map__canvas [data-origin-anchor]").count() === 6, "origin map did not expose a geographic anchor for every profile");
assert(await mapPins.locator('.origin-flag[data-flag-source="local-svg"] img').count() === 6, "origin map did not render real flags for all six country pins");
assert(await flagFilters.count() === 7, "origin filters did not expose all six flags plus the all-origins control");
assert(await page.locator(".coffee-map__lenses button").count() === 3, "origin map did not expose its three information lenses");
assert(await page.locator(".origin-explorer__country-index button").count() === 6, "origin explorer did not expose all six country passports");
await page.locator(".coffee-map__lenses button").filter({ hasText: "Process" }).click();
assert((await mapPins.first().locator("small").textContent()).includes("Washed"), "process lens did not replace the geographic map labels");
await mapPins.filter({ hasText: "Kenya" }).click();
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Kenya"), "map pin selection did not update the origin readout");
await page.locator('.coffee-map__stepper button[aria-label="Next origin"]').click();
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Rwanda"), "origin stepper did not advance to the next country");
await flagFilters.filter({ hasText: "Rwanda" }).click();
assert(await mapPins.count() === 1, "flag filter did not narrow the map to one country");
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Rwanda"), "flag filter did not synchronize the active readout");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-zone-filter button").filter({ hasText: "Africa" }).click();
assert(await mapPins.count() === 3, "Africa region filter did not expose the three African origins");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-select:not(.origin-sort) select").selectOption("natural");
assert(await mapPins.count() === 1 && (await mapPins.first().textContent()).includes("Brazil"), "process filter did not isolate the natural profile");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-search input").fill("Cerrado");
assert(await mapPins.count() === 1 && (await mapPins.first().textContent()).includes("Brazil"), "text filter did not search regional profile information");
await page.locator(".origin-search input").fill("no matching origin");
assert(await page.locator(".origin-explorer__empty").count() === 1, "empty map filters did not expose a recovery state");
await page.locator(".origin-explorer__empty button").click();
assert(await mapPins.count() === 6, "empty-state reset did not restore all map pins");

await page.goto(`${baseUrl}/coffees`, { waitUntil: "networkidle" });
const libraryFlags = page.locator('.origin-flag-filter [role="group"] > button');
await libraryFlags.filter({ hasText: "Colombia" }).click();
assert(await page.locator(".profile-grid--catalog .profile-card").count() === 1, "coffee-library flag filter did not narrow the profile cards");
assert((await page.locator(".profile-grid--catalog .profile-card").textContent()).includes("Colombia"), "coffee-library flag filter exposed the wrong profile");
await page.locator(".origin-filter-panel__reset").click();
assert(await page.locator(".profile-grid--catalog .profile-card").count() === 6, "coffee-library reset did not restore all profiles");
await page.locator(".origin-sort select").selectOption("country");
assert((await page.locator(".profile-grid--catalog .profile-card").first().textContent()).includes("Brazil"), "country sorting did not put Brazil first in the coffee library");

await page.goto(`${baseUrl}/coffees/ethiopia-washed`, { waitUntil: "networkidle" });
await page.locator(".origin-constellation__map").scrollIntoViewIfNeeded();
await page.locator(".origin-constellation__map .origin-map-artwork").evaluate((image) => image.decode());
assert(await page.locator(".origin-constellation__pin").count() === 6, "profile page did not expose six spatial origin links");
assert(await page.locator('.origin-constellation__map .origin-map-artwork[data-map-geometry="natural-earth-110m"]').evaluate((image) => image.naturalWidth === 1000), "profile constellation did not load the local Natural Earth geometry");
assert(await page.locator(".origin-constellation__map [data-origin-anchor]").count() === 6, "profile constellation did not retain six geographic anchors");
assert(await page.locator('.origin-constellation__pin .origin-flag[data-flag-source="local-svg"] img').count() === 6, "profile constellation did not render six real country flags");
assert(await page.locator(".origin-constellation__rail a").count() === 6, "profile page did not expose six conventional origin links");
assert(await page.locator('.origin-constellation__pin[aria-current="page"]').count() === 1, "profile constellation did not identify the active country");

await page.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" });
const clearComparison = page.locator(".compare-toolbar__clear");
if (await clearComparison.count()) await clearComparison.click();
const comparisonButtons = page.locator(".compare-picker button");
const comparisonMapPins = page.locator(".origin-constellation__pin");
assert(await comparisonMapPins.count() === 6, "comparison desk did not expose six spatial country controls");
await comparisonMapPins.filter({ hasText: "BR" }).click();
assert(await comparisonButtons.nth(2).getAttribute("aria-pressed") === "true", "comparison map did not add Brazil");
await comparisonMapPins.filter({ hasText: "BR" }).click();
assert(await comparisonButtons.nth(2).getAttribute("aria-pressed") === "false", "comparison map did not remove Brazil");
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
assert(await page.locator('.contact-channels a[href="mailto:info@makendi.com"]').count() === 1, "confirmed contact email was not published");
assert(await page.locator('.contact-channels a[href="tel:+902163407028"]').count() === 1, "confirmed contact telephone was not callable");
assert((await page.locator(".contact-channels").textContent()).includes("www.coffendi.com"), "confirmed Coffendi website was not published");
const inquiryProgress = page.locator(".inquiry-progress__meter");
assert(await inquiryProgress.getAttribute("aria-valuemax") === "5", "inquiry readiness did not identify the five required fields");
await page.locator('[name="name"]').fill("Test Person");
await page.locator('[name="company"]').fill("Test Company");
await page.locator('[name="email"]').fill("test@example.com");
await page.locator('[name="message"]').fill("A complete test coffee brief.");
await page.locator('[name="consent"]').check();
await page.waitForFunction(() => document.querySelector(".inquiry-progress__meter")?.getAttribute("aria-valuenow") === "5");
assert(await page.locator(".inquiry-progress.is-ready").count() === 1, "completed inquiry did not expose its ready state");
await page.route("**/api/inquiries", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, reference: "CFI-TEST" }) }));
await page.locator('.inquiry-form button[type="submit"]').click();
await page.locator(".inquiry-fallback").waitFor();
assert((await page.locator('.inquiry-fallback a[href^="mailto:"]').getAttribute("href")).includes("Coffendi"), "stored inquiry did not preserve a prepared email fallback");
assert(await page.locator('.inquiry-fallback a[href="tel:+902163407028"]').count() === 1, "stored inquiry did not preserve the telephone fallback");
await page.unroute("**/api/inquiries");

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
await mobile.goto(`${baseUrl}/origins`, { waitUntil: "networkidle" });
await mobile.locator(".origin-explorer__workspace").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(120);
const mobileMapTargets = await mobile.locator(".coffee-map__pin").evaluateAll((pins) => pins.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileMapTargets.length === 6 && mobileMapTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile origin map has a country target below 44px");
const activeMapVisibility = await mobile.evaluate(() => {
  const viewport = document.querySelector(".coffee-map__viewport").getBoundingClientRect();
  const pin = document.querySelector(".coffee-map__pin.is-active").getBoundingClientRect();
  return pin.left >= viewport.left && pin.right <= viewport.right;
});
assert(activeMapVisibility, "mobile map did not bring the active country flag into view");
const mobileFlagTargets = await mobile.locator('.origin-flag-filter [role="group"] > button').evaluateAll((buttons) => buttons.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileFlagTargets.length === 7 && mobileFlagTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile flag filters have a touch target below 44px");
const mobileLensTargets = await mobile.locator(".coffee-map__lenses button").evaluateAll((buttons) => buttons.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileLensTargets.length === 3 && mobileLensTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile map lenses have a touch target below 44px");
assert(await mobile.locator(".origin-explorer__country-index button").count() === 6, "mobile origin explorer did not expose its country passport controls");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile origins page has horizontal overflow");
await mobile.goto(`${baseUrl}/coffees/ethiopia-washed`, { waitUntil: "networkidle" });
const mobileConstellationTargets = await mobile.locator(".origin-constellation__pin").evaluateAll((links) => links.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileConstellationTargets.length === 6 && mobileConstellationTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile profile constellation has a target below 44px");
const mobileConstellationVisibility = await mobile.evaluate(() => {
  const viewport = document.querySelector(".origin-constellation__viewport").getBoundingClientRect();
  const pin = document.querySelector('.origin-constellation__pin[aria-current="page"]').getBoundingClientRect();
  return pin.left >= viewport.left && pin.right <= viewport.right;
});
assert(mobileConstellationVisibility, "mobile profile constellation did not center the active country");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile profile constellation created page overflow");
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
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
  console.log(`Interaction checks passed: ${routes.length} direct loads/reloads, six verified local SVG profile flags, keyboard, modified and current-route clicks, rapid navigation, deep history restoration, deferred rendering, map lenses, origin steppers, sorting, flags, profile constellations, spatial comparison, stable selection, responsive chapters, inquiry readiness, BFCache/offline/storage recovery, reduced motion, atlas preload/interruption safety, mobile touch targets, and transition failure recovery.`);
}
