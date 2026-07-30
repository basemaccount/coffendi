import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const profileFlags = [
  ["/origins/ethiopia", "et"],
  ["/origins/colombia", "co"],
  ["/origins/brazil", "br"],
  ["/origins/guatemala", "gt"],
  ["/origins/kenya", "ke"],
  ["/origins/rwanda", "rw"],
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
  const canonicalPath = await page.locator('link[rel="canonical"]').getAttribute("href");
  const openGraphPath = await page.locator('meta[property="og:url"]').getAttribute("content");
  assert(new URL(canonicalPath).pathname === route, `${route}: canonical metadata did not match the current route`);
  assert(new URL(openGraphPath).pathname === route, `${route}: Open Graph URL did not match the current route`);
  assert((await page.locator('meta[property="og:title"]').getAttribute("content")) === await page.title(), `${route}: Open Graph title did not follow the document title`);
  assert((await page.locator('meta[name="twitter:description"]').getAttribute("content")) === await page.locator('meta[name="description"]').getAttribute("content"), `${route}: Twitter description diverged from the route description`);
  const blockedTargets = await page.evaluate(() => [...document.querySelectorAll("a[href], button:not([disabled]), input:not([type='hidden']), textarea, select, summary")].flatMap((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const hidden = style.display === "none"
      || style.visibility === "hidden"
      || Number.parseFloat(style.opacity) < 0.1
      || bounds.width < 1
      || bounds.height < 1
      || bounds.bottom <= 0
      || bounds.top >= innerHeight
      || bounds.right <= 0
      || bounds.left >= innerWidth
      || element.closest("[inert], [aria-hidden='true']");
    if (hidden) return [];
    let left = Math.max(0, bounds.left);
    let right = Math.min(innerWidth, bounds.right);
    let top = Math.max(0, bounds.top);
    let bottom = Math.min(innerHeight, bounds.bottom);
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      const ancestorBounds = ancestor.getBoundingClientRect();
      if (ancestorStyle.overflowX !== "visible") {
        left = Math.max(left, ancestorBounds.left);
        right = Math.min(right, ancestorBounds.right);
      }
      if (ancestorStyle.overflowY !== "visible") {
        top = Math.max(top, ancestorBounds.top);
        bottom = Math.min(bottom, ancestorBounds.bottom);
      }
    }
    if (right - left < 1 || bottom - top < 1) return [];
    const x = Math.max(0, Math.min(innerWidth - 1, (left + right) / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, (top + bottom) / 2));
    const hit = document.elementFromPoint(x, y);
    if (hit === element || element.contains(hit)) return [];
    return [element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim().slice(0, 60) || element.tagName];
  }));
  assert(blockedTargets.length === 0, `${route}: visible controls were blocked at their click point: ${blockedTargets.join(", ")}`);
  const expectedFlag = profileFlags.find(([profileRoute]) => profileRoute === route)?.[1];
  if (expectedFlag) {
    const heroFlag = page.locator(".profile-detail__origin-badge .origin-flag");
    const heroImage = page.locator(".profile-detail__media > img");
    assert(await heroFlag.getAttribute("data-flag-source") === "local-svg", `${route}: profile hero did not use local SVG flag artwork`);
    assert((await heroFlag.locator("img").getAttribute("src"))?.endsWith(`/images/flags/${expectedFlag}.svg`), `${route}: profile hero exposed the wrong country flag`);
    assert(await heroFlag.locator("img").evaluate((image) => image.complete && image.naturalWidth > 0), `${route}: profile hero country flag did not decode`);
    assert((await heroImage.getAttribute("srcset"))?.includes("-480.webp 480w"), `${route}: profile hero did not expose responsive image candidates`);
    assert(await heroFlag.evaluate((flag) => flag.offsetWidth === 42 && flag.offsetHeight === 32), `${route}: profile media sizing distorted the country flag`);
    assert(await heroImage.evaluate((image) => image.offsetHeight < 650), `${route}: intrinsic image attributes overrode the responsive profile layout`);
  }
  await page.reload({ waitUntil: "networkidle" });
  assert(await page.locator("h1").count() === 1, `${route}: reload did not recover the route`);
}
console.log(`Interaction progress: ${routes.length} direct routes and reloads checked.`);

const hydrationContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const hydrationPage = await hydrationContext.newPage();
let releaseCatalog;
await hydrationPage.route("**/catalog/data/origin-index-*.json", async (route) => {
  await new Promise((resolve) => { releaseCatalog = resolve; });
  await route.continue();
});
await hydrationPage.goto(`${baseUrl}/origins/ethiopia`, { waitUntil: "domcontentloaded" });
await hydrationPage.locator(".site-header").waitFor({ timeout: 1_500 });
await hydrationPage.locator('.catalog-route-status[aria-busy="true"]').waitFor({ timeout: 1_500 });
assert(typeof releaseCatalog === "function", "direct origin route did not begin its bounded catalog request");
releaseCatalog?.();
await hydrationPage.getByRole("heading", { level: 1, name: "Ethiopia" }).waitFor();
await hydrationContext.close();

await page.goto(baseUrl, { waitUntil: "networkidle" });
assert(await page.locator('.language-switcher[role="group"]').count() === 1, "language controls did not expose grouped semantics");
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
assert(await page.evaluate(() => [...document.querySelectorAll("#main-content > section")].every((section) => getComputedStyle(section).contentVisibility === "visible")), "a page section could be skipped and paint as an empty region");
assert((await page.locator("html").evaluate((element) => getComputedStyle(element).scrollbarColor)) !== "auto", "the document scrollbar did not use the site color system");
const headerLogo = page.locator(".brand img");
assert(await headerLogo.evaluate((image) => image.complete && image.naturalWidth > 0), "header logo did not decode");
assert((await headerLogo.getAttribute("srcset"))?.includes("coffendi-logo-256.webp"), "header logo did not expose a responsive source");
const footerLogo = page.locator(".footer-brand img");
await footerLogo.scrollIntoViewIfNeeded();
await footerLogo.evaluate((image) => image.decode());
const footerLogoState = await footerLogo.evaluate((image) => ({ naturalWidth: image.naturalWidth, filter: getComputedStyle(image).filter, opacity: getComputedStyle(image).opacity }));
assert(footerLogoState.naturalWidth > 0, "footer logo did not decode");
assert(!/brightness|invert/.test(footerLogoState.filter) && Number.parseFloat(footerLogoState.opacity) === 1, "footer logo colors were being flattened or hidden");
await page.waitForTimeout(80);
assert(!await page.locator(".back-to-top.is-visible").count(), "back-to-top control overlapped the footer");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
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

await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
await page.waitForFunction(() => document.querySelector(".chapter-navigator")?.getAttribute("aria-hidden") === "false");
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
assert(await page.locator('.origin-atlas__controls[role="group"]').count() === 1, "country atlas controls did not expose grouped semantics");
assert(await page.locator(".origin-atlas__flag").count() === 6, "country atlas did not expose a flag for every origin");
assert(await page.locator('.origin-atlas__flag[data-flag-source="local-svg"] img').count() === 6, "country atlas did not render six real local flag images");
assert(await page.locator(".origin-atlas__directions li").count() === 3, "country atlas did not expose multiple coffee directions for the active origin");
await atlasButtons.evaluateAll((buttons) => buttons.slice(1).forEach((button) => button.click()));
await page.waitForFunction(() => document.querySelector('.origin-atlas__workspace')?.getAttribute('aria-busy') === 'false');
assert(await atlasButtons.last().getAttribute("aria-pressed") === "true", "rapid atlas selection did not settle on the last requested origin");
assert(await page.locator(".origin-atlas__directions li").count() >= 1, "selected atlas origin did not retain its source-backed coffee directions");
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
assert(await mapPins.count() === 38, "origin map did not expose all 38 country pins");
assert(await page.locator('.coffee-map__canvas .origin-map-artwork[data-map-geometry="natural-earth-110m"]').evaluate((image) => image.naturalWidth === 1000), "origin map did not load the local Natural Earth geometry");
assert(await page.locator(".coffee-map__canvas [data-origin-anchor]").count() === 38, "origin map did not expose a geographic anchor for every profile");
assert(await mapPins.locator('.origin-flag[data-flag-source="local-svg"] img').count() === 38, "origin map did not render real flags for all 38 country pins");
assert(await flagFilters.count() === 39, "origin filters did not expose all 38 flags plus the all-origins control");
assert(await page.locator(".coffee-map__lenses button").count() === 3, "origin map did not expose its three information lenses");
assert(await page.locator(".origin-explorer__country-index button").count() === 38, "origin explorer did not expose all 38 country passports");
assert(await page.locator('.coffee-map__pin[tabindex="0"]').count() === 1, "origin map exposed more than one entry in the page tab sequence");
const initialMapKeyboardPin = page.locator('.coffee-map__pin[tabindex="0"]');
await initialMapKeyboardPin.focus();
await page.keyboard.press("ArrowRight");
assert(await mapPins.evaluateAll((pins) => pins.filter((pin) => pin.tabIndex === 0).length === 1), "origin map arrow navigation created multiple tab stops");
assert(await mapPins.evaluateAll((pins) => pins.includes(document.activeElement) && document.activeElement !== pins[0]), "origin map arrow navigation did not move focus");
await page.locator(".coffee-map__lenses button").filter({ hasText: "Process" }).click();
assert((await page.locator(".coffee-map__pin.is-active small").textContent()).includes("Washed"), "process lens did not replace the geographic map labels");
const kenyaPin = await mapPins.filter({ has: page.locator('.origin-flag[data-country="KE"]') }).boundingBox();
assert(kenyaPin, "Kenya map flag was not visible");
await page.mouse.click(kenyaPin.x + (kenyaPin.width / 2), kenyaPin.y + (kenyaPin.height / 2));
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Kenya"), "clicking a real map flag did not update the origin readout");
assert(new URL(page.url()).searchParams.get("focus") === "kenya-vivid", "map focus was not preserved in the URL");
await page.reload({ waitUntil: "networkidle" });
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Kenya"), "reloading the atlas did not restore the focused country");
await page.locator('.coffee-map__stepper button[aria-label="Next origin"]').click();
await page.waitForFunction(() => document.querySelector(".origin-explorer__readout")?.textContent.includes("Rwanda"));
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Rwanda"), "origin stepper did not advance to the next country");
await flagFilters.filter({ hasText: "Rwanda" }).click();
assert(await mapPins.count() === 1, "flag filter did not narrow the map to one country");
assert((await page.locator(".origin-explorer__readout").textContent()).includes("Rwanda"), "flag filter did not synchronize the active readout");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-zone-filter button").filter({ hasText: "Africa" }).click();
assert(await mapPins.count() === 13, "Africa region filter did not expose all 13 African origins");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-select:not(.origin-sort) select").selectOption("natural");
assert(await mapPins.count() >= 1 && await page.locator(".origin-explorer__country-index button").filter({ hasText: "Brazil" }).count() === 1, "process filter did not retain the natural Brazil profile");
await page.locator(".origin-filter-panel__reset").click();
await page.locator(".origin-search input").fill("Cerrado");
assert(await mapPins.count() === 1 && await page.locator(".origin-explorer__country-index button").filter({ hasText: "Brazil" }).count() === 1, "text filter did not search regional profile information");
assert(await page.locator(".origin-filter-panel__active button").count() === 1, "active origin filters were not exposed as removable controls");
await page.locator(".origin-explorer__actions a").first().click();
await page.waitForURL("**/origins/brazil");
await page.waitForFunction(() => document.querySelector("h1")?.textContent.trim() === "Brazil");
assert((await page.locator("h1").textContent()).trim() === "Brazil", "country profile did not identify the origin country as its primary heading");
await page.locator(".breadcrumbs").click();
await page.waitForURL(/\/origins\?/);
assert(await page.locator(".origin-search input").inputValue() === "Cerrado", "returning from a country profile discarded the atlas search context");
assert(await page.locator(".coffee-map__pin").count() === 1, "returning from a country profile discarded the filtered atlas result");
await page.locator(".origin-search input").fill("no matching origin");
assert(await page.locator(".origin-explorer__empty").count() === 1, "empty map filters did not expose a recovery state");
await page.locator(".origin-explorer__empty button").click();
assert(await mapPins.count() === 38, "empty-state reset did not restore all map pins");

await page.goto(`${baseUrl}/coffees`, { waitUntil: "networkidle" });
const libraryFlags = page.locator('.origin-flag-filter [role="group"] > button');
await libraryFlags.filter({ hasText: "Colombia" }).click();
assert(await page.locator(".profile-grid--catalog .profile-card").count() === 1, "coffee-library flag filter did not narrow the profile cards");
assert((await page.locator(".profile-grid--catalog .profile-card").textContent()).includes("Colombia"), "coffee-library flag filter exposed the wrong profile");
await page.locator(".origin-filter-panel__reset").click();
assert(await page.locator(".profile-grid--catalog .profile-card").count() === 38, "coffee-library reset did not restore all profiles");
await page.locator(".origin-sort select").selectOption("country");
assert((await page.locator(".profile-grid--catalog .profile-card").first().textContent()).includes("Bolivia"), "country sorting did not put Bolivia first in the coffee library");

await page.goto(`${baseUrl}/origins/ethiopia`, { waitUntil: "networkidle" });
await page.waitForSelector('.origin-local-nav a[aria-current="location"]');
assert((await page.locator('.origin-local-nav a[aria-current="location"]').textContent()).trim() === "Overview", "country local navigation did not expose the active overview section");
await page.evaluate(() => window.scrollTo(0, document.getElementById("origin-network").offsetTop - 150));
await page.waitForFunction(() => document.querySelector('.origin-local-nav a[aria-current="location"]')?.getAttribute("href") === "#origin-network");
await page.locator(".origin-constellation__map").scrollIntoViewIfNeeded();
await page.locator(".origin-constellation__map .origin-map-artwork").evaluate((image) => image.decode());
assert(await page.locator(".origin-constellation__pin").count() === 38, "profile page did not expose 38 spatial origin controls");
assert(await page.locator('.origin-constellation__map .origin-map-artwork[data-map-geometry="natural-earth-110m"]').evaluate((image) => image.naturalWidth === 1000), "profile constellation did not load the local Natural Earth geometry");
assert(await page.locator(".origin-constellation__map [data-origin-anchor]").count() === 38, "profile constellation did not retain 38 geographic anchors");
assert(await page.locator('.origin-constellation__pin .origin-flag[data-flag-source="local-svg"] img').count() === 38, "profile constellation did not render 38 real country flags");
assert(await page.locator(".origin-constellation__rail a").count() === 38, "profile page did not expose 38 conventional origin links");
assert(await page.locator('.origin-constellation__rail[role="group"]').count() === 1, "profile origin rail did not expose grouped semantics");
assert(await page.locator(".origin-constellation__pin.is-active").count() === 1, "profile constellation did not identify the active country");
assert(await page.locator('.origin-constellation__pin[tabindex="0"]').count() === 1, "profile constellation exposed a repetitive map tab sequence");
const initialProfileMapPin = page.locator('.origin-constellation__pin[tabindex="0"]');
await initialProfileMapPin.focus();
await page.keyboard.press("ArrowRight");
assert(await page.locator(".origin-constellation__pin").evaluateAll((pins) => pins.filter((pin) => pin.tabIndex === 0).length === 1 && pins.includes(document.activeElement)), "profile constellation arrow navigation did not preserve one focused map control");
await page.waitForTimeout(120);
assert(!await page.locator(".chapter-navigator.is-visible,.back-to-top.is-visible,.origin-pdf-launcher.is-visible").count(), "floating controls covered the desktop origin constellation");
const navigationEntriesBeforeMapClick = await page.evaluate(() => performance.getEntriesByType("navigation").length);
await page.locator(".origin-constellation__pin").filter({ has: page.locator('.origin-flag[data-country="KE"]') }).click();
await page.waitForURL((url) => url.pathname === "/origins/kenya");
await page.getByRole("heading", { level: 1, name: "Kenya" }).waitFor();
assert((await page.locator(".profile-detail h1").textContent()).trim() === "Kenya", "clicking the profile map did not open the selected origin");
assert(await page.evaluate(() => performance.getEntriesByType("navigation").length) === navigationEntriesBeforeMapClick, "profile map navigation reloaded the document");
await page.goBack();
await page.waitForURL((url) => url.pathname === "/origins/ethiopia");
await page.locator(".origin-sheet-card").first().waitFor();
assert(await page.locator(".origin-sheet-card").count() === 8, "Ethiopia profile did not expose all eight source sheets");
assert(await page.locator(".origin-page-reader__thumbnails button").count() === 8, "Ethiopia reader did not expose all eight source pages");
assert(await page.locator('.origin-pdf-launcher[data-page-count="8"]').count() === 1, "Ethiopia profile did not expose its eight-page PDF launcher");
await page.evaluate(() => window.scrollTo(0, document.getElementById("catalog").offsetTop - 150));
await page.waitForFunction(() => document.querySelector('.origin-local-nav a[aria-current="location"]')?.getAttribute("href") === "#catalog");

await page.goto(`${baseUrl}/origins/kenya`, { waitUntil: "networkidle" });
const kenyaSheetCards = page.locator(".origin-sheet-card");
assert(await kenyaSheetCards.count() === 6, "Kenya profile did not expose its six source sheets");
const kenyaFloatingFile = page.locator('.origin-pdf-launcher[data-page-count="6"]');
assert(await kenyaFloatingFile.count() === 1, "Kenya profile did not expose its always-available country PDF launcher");
assert(!(await kenyaFloatingFile.getAttribute("class")).includes("is-visible"), "country PDF launcher covered the initial origin-page controls");
await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
await page.waitForFunction(() => document.querySelector(".origin-pdf-launcher")?.classList.contains("is-visible"));
await kenyaFloatingFile.click();
await page.locator(".origin-document-dialog").waitFor({ state: "visible" });
assert(new URL(page.url()).searchParams.get("sheet") === "kenya-aa-ab-faq-main-crop-export-classifications", "floating Kenya PDF launcher did not open the first ordered country page");
await page.locator(".origin-document-dialog__close").click();
await page.waitForFunction(() => !document.querySelector(".origin-document-dialog"));
await page.waitForFunction(() => document.activeElement?.classList.contains("origin-pdf-launcher"));
assert(await kenyaFloatingFile.evaluate((element) => document.activeElement === element), "floating country PDF launcher did not regain focus after closing the viewer");
const kenyaReader = page.locator('.origin-page-reader[data-country-reader="kenya"]');
assert(await kenyaReader.count() === 1, "Kenya profile did not expose its country-only PDF reader");
assert(await kenyaReader.locator(".origin-page-reader__thumbnails button").count() === 6, "Kenya PDF reader did not expose all six source pages in order");
assert((await kenyaReader.locator(".origin-page-reader__counter").textContent()).includes("01"), "Kenya PDF reader did not start on source page one");
const kenyaReaderPage = kenyaReader.locator(".origin-page-reader__page");
await kenyaReaderPage.scrollIntoViewIfNeeded();
await kenyaReaderPage.locator("img").waitFor({ state: "attached" });
const initialReaderSource = await kenyaReaderPage.locator("img").getAttribute("src");
const readerBox = await kenyaReaderPage.boundingBox();
assert(Boolean(readerBox), "Kenya PDF reader page was not measurable");
await page.mouse.move(readerBox.x + readerBox.width * .76, readerBox.y + readerBox.height * .5);
await page.mouse.down();
await page.mouse.move(readerBox.x + readerBox.width * .24, readerBox.y + readerBox.height * .5, { steps: 6 });
await page.mouse.up();
await page.waitForFunction(
  (initialSource) => document.querySelector(".origin-page-reader__page img")?.getAttribute("src") !== initialSource,
  initialReaderSource,
);
assert((await kenyaReader.locator(".origin-page-reader__counter").textContent()).includes("02"), "swiping the Kenya PDF reader did not advance to source page two");
assert(await page.locator(".origin-document-dialog").count() === 0, "swiping the inline PDF reader accidentally opened the fullscreen viewer");
await kenyaReader.locator(".origin-page-reader__thumbnails button").first().click();
assert((await kenyaReader.locator(".origin-page-reader__counter").textContent()).includes("01"), "selecting the first Kenya thumbnail did not restore source page one");
await kenyaReaderPage.click();
const documentDialog = page.locator(".origin-document-dialog");
await documentDialog.waitFor({ state: "visible" });
await documentDialog.locator(".origin-document-dialog__close").click();
await page.waitForFunction(() => !document.querySelector(".origin-document-dialog"));
await page.waitForFunction(() => document.activeElement?.classList.contains("origin-page-reader__page"));
assert(await kenyaReaderPage.evaluate((element) => document.activeElement === element), "country PDF reader did not regain focus after the fullscreen viewer closed");
const firstKenyaSheetTrigger = kenyaSheetCards.first().locator(".origin-sheet-card__preview");
await firstKenyaSheetTrigger.click();
await documentDialog.waitFor({ state: "visible" });
const firstSheetQuery = new URL(page.url()).searchParams.get("sheet");
assert(Boolean(firstSheetQuery), "opening a source sheet did not create a reload-safe sheet URL");
assert(await documentDialog.locator(".origin-document-dialog__specifications dl > div").count() === 11, "source viewer did not expose all 11 parsed specifications");
const desktopDocumentToolbar = documentDialog.locator(".origin-document-dialog__toolbar");
assert(await desktopDocumentToolbar.evaluate((element) => element.scrollWidth === element.clientWidth), "desktop document toolbar overflowed or clipped its action groups");
assert(
  await desktopDocumentToolbar.locator("button, a").evaluateAll((controls) => (
    controls.every((control) => Number.parseFloat(getComputedStyle(control).fontSize) >= 11)
  )),
  "desktop document controls regressed to tiny text",
);
const desktopViewerColumns = await documentDialog.locator(".origin-document-dialog__content").evaluate((element) => {
  const [preview, specifications] = element.children;
  return {
    preview: preview.getBoundingClientRect().width,
    specifications: specifications.getBoundingClientRect().width,
  };
});
assert(desktopViewerColumns.preview >= desktopViewerColumns.specifications * 2, "specification sidebar competes with the document canvas");
assert(
  await documentDialog.locator(".origin-document-dialog__specifications dl > div").first().evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).borderRadius) >= 10
  )),
  "specification details did not use the refined card treatment",
);
assert(
  await documentDialog.locator(".origin-document-dialog__preview").evaluate((element) => (
    getComputedStyle(element, "::-webkit-scrollbar-button").display === "none"
  )),
  "native document-scrollbar arrow buttons are still visible",
);
assert((await documentDialog.getByRole("link", { name: "Open PDF" }).getAttribute("href")).startsWith("/catalog/documents/"), "source viewer did not use resilient same-origin PDF delivery");
assert((await documentDialog.getByRole("link", { name: "Download" }).first().getAttribute("href")).includes("download=1"), "source viewer download did not request an attachment");
assert(await documentDialog.getByRole("link", { name: "Download" }).first().getAttribute("download") !== null, "source viewer download did not use the native same-origin download contract");
assert((await documentDialog.getByRole("link", { name: "Source original" }).getAttribute("href")).includes("-source.pdf"), "source viewer did not preserve the original English source page");
const dialogPreview = documentDialog.locator(".origin-document-dialog__preview");
const dialogPreviewBox = await dialogPreview.boundingBox();
assert(Boolean(dialogPreviewBox), "fullscreen country PDF preview was not measurable");
await page.mouse.move(dialogPreviewBox.x + dialogPreviewBox.width * .76, dialogPreviewBox.y + dialogPreviewBox.height * .5);
await page.mouse.down();
await page.mouse.move(dialogPreviewBox.x + dialogPreviewBox.width * .24, dialogPreviewBox.y + dialogPreviewBox.height * .5, { steps: 6 });
await page.mouse.up();
await page.waitForFunction((previousSheet) => new URL(location.href).searchParams.get("sheet") !== previousSheet, firstSheetQuery);
const swipedSheetQuery = new URL(page.url()).searchParams.get("sheet");
assert(swipedSheetQuery && swipedSheetQuery !== firstSheetQuery, "swiping the fullscreen viewer did not advance within Kenya");
await documentDialog.getByRole("button", { name: "Next sheet" }).click();
await page.waitForTimeout(80);
const nextSheetQuery = new URL(page.url()).searchParams.get("sheet");
assert(nextSheetQuery && nextSheetQuery !== swipedSheetQuery, "source viewer next control did not advance within Kenya");
assert(await documentDialog.isVisible(), "source viewer closed while advancing to the next sheet");
await page.reload({ waitUntil: "networkidle" });
assert(await page.locator(".origin-document-dialog").isVisible(), "deep-linked source sheet did not reopen after reload");
await page.keyboard.press("Escape");
await page.waitForFunction(() => !document.querySelector(".origin-document-dialog"));
assert(!new URL(page.url()).searchParams.has("sheet"), "closing the source viewer did not remove the sheet query");
await firstKenyaSheetTrigger.click();
await page.locator(".origin-document-dialog__close").click();
await page.waitForFunction(() => !document.querySelector(".origin-document-dialog"));
await page.waitForFunction(() => document.activeElement?.classList.contains("origin-sheet-card__preview"));
assert(await firstKenyaSheetTrigger.evaluate((element) => document.activeElement === element), "source viewer did not return focus to its opening control");

await page.goto(`${baseUrl}/compare`, { waitUntil: "networkidle" });
const clearComparison = page.locator(".compare-toolbar__clear");
if (await clearComparison.count()) await clearComparison.click();
const comparisonButtons = page.locator(".compare-picker button");
const comparisonMapPins = page.locator(".origin-constellation__pin");
const comparisonRailButtons = page.locator(".origin-constellation__rail button");
assert(await page.locator('.compare-picker[role="group"]').count() === 1, "comparison choices did not expose grouped semantics");
assert(await comparisonMapPins.count() === 38, "comparison desk did not expose 38 spatial country controls");
await comparisonMapPins.filter({ has: page.locator('.origin-flag[data-country="BR"]') }).click();
assert(await comparisonButtons.nth(2).getAttribute("aria-pressed") === "true", "comparison map flag did not add Brazil");
await comparisonRailButtons.filter({ hasText: "Brazil" }).click();
assert(await comparisonButtons.nth(2).getAttribute("aria-pressed") === "false", "comparison rail did not remove Brazil");
for (const index of [0, 2, 4]) await comparisonButtons.nth(index).click();
await page.waitForTimeout(280);
assert(await comparisonButtons.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute("aria-pressed") === "true").length) === 3, "comparison did not retain three explicit selections");
assert(await comparisonButtons.evaluateAll((buttons) => buttons.filter((button) => button.disabled).length === buttons.length - 3), "comparison limit did not disable only the unselected profiles");
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
await page.waitForFunction(() => document.querySelector(".inquiry-progress__meter")?.getAttribute("aria-valuenow") === "0");
assert(!await page.locator(".inquiry-progress.is-ready").count(), "successful inquiry reset left the readiness meter complete");
await page.unroute("**/api/inquiries");

await page.goto(`${baseUrl}/approach`, { waitUntil: "networkidle" });
const approachImage = page.locator(".approach-feature img");
await approachImage.scrollIntoViewIfNeeded();
await approachImage.evaluate((image) => image.decode());
assert((await approachImage.getAttribute("srcset"))?.includes("green-coffee-roastery-480.webp 480w"), "approach image did not expose responsive candidates");
assert((await approachImage.evaluate((image) => new URL(image.currentSrc).pathname)).endsWith("-720.webp"), "desktop approach layout did not select an appropriately sized image candidate");

await page.goto(`${baseUrl}/this-route-does-not-exist`, { waitUntil: "networkidle" });
assert((await page.locator('meta[name="robots"]').getAttribute("content")) === "noindex,follow", "not-found route remained indexable");
assert(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).pathname === "/this-route-does-not-exist", "not-found canonical did not preserve the requested route");
await page.locator('.not-found a[href="/"]').click();
await page.waitForURL((url) => url.pathname === "/");
await page.locator(".hero h1").waitFor();
assert((await page.locator('meta[name="robots"]').getAttribute("content")) === "index,follow", "indexability did not recover after leaving a not-found route");

await context.close();
console.log("Interaction progress: desktop navigation, maps, comparison, metadata, and inquiry checked.");

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const mobile = await mobileContext.newPage();
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.locator(".menu-button").click();
await mobile.waitForTimeout(80);
assert(await mobile.locator(".mobile-navigation.is-open").count() === 1, "mobile menu did not open");
assert(await mobile.locator("#main-content").evaluate((element) => element.inert), "mobile menu did not make page content inert");
await mobile.locator(".mobile-navigation__foot a").focus();
await mobile.keyboard.press("Tab");
assert(await mobile.locator(".brand").evaluate((element) => document.activeElement === element), "mobile menu allowed forward focus to escape its visible navigation surface");
await mobile.locator(".brand").focus();
await mobile.keyboard.press("Shift+Tab");
assert(await mobile.locator(".mobile-navigation__foot a").evaluate((element) => document.activeElement === element), "mobile menu allowed reverse focus to escape its visible navigation surface");
await mobile.keyboard.press("Escape");
assert(!await mobile.locator("#main-content").evaluate((element) => element.inert), "mobile menu left page content inert");
assert(await mobile.locator(".menu-button").evaluate((element) => document.activeElement === element), "mobile menu did not restore focus");
await mobile.locator(".menu-button").click();
const emptyMenuPoint = await mobile.locator("#mobile-navigation").evaluate((navigation) => {
  const bounds = navigation.getBoundingClientRect();
  for (let y = bounds.top + 8; y < bounds.bottom - 8; y += 16) {
    for (let x = bounds.left + 8; x < bounds.right - 8; x += 16) {
      if (document.elementFromPoint(x, y) === navigation) return { x, y };
    }
  }
  return null;
});
assert(Boolean(emptyMenuPoint), "mobile navigation did not expose a dismissible backdrop");
if (emptyMenuPoint) await mobile.mouse.click(emptyMenuPoint.x, emptyMenuPoint.y);
assert(!await mobile.locator(".mobile-navigation.is-open").count(), "clicking the mobile navigation backdrop did not close it");
await mobile.locator(".menu-button").click();
await mobile.setViewportSize({ width: 1200, height: 844 });
await mobile.waitForTimeout(80);
assert(!await mobile.locator(".mobile-navigation.is-open").count(), "resizing to desktop left the mobile menu open");
assert(!await mobile.locator("body.no-scroll").count(), "resizing to desktop left document scrolling locked");
assert(!await mobile.locator("#main-content").evaluate((element) => element.inert), "resizing to desktop left page content inert");
await mobile.setViewportSize({ width: 390, height: 844 });
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
await mobile.locator(".origin-filter-panel").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(220);
assert(await mobile.locator(".chapter-navigator").getAttribute("aria-hidden") === "true", "mobile chapter navigator covered the origin filters");
assert(!await mobile.locator(".back-to-top.is-visible").count(), "mobile back-to-top control covered the origin filters");
await mobile.locator(".origin-explorer__workspace").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(220);
assert(await mobile.locator(".chapter-navigator").getAttribute("aria-hidden") === "true", "mobile chapter navigator covered the interactive origin map");
assert(!await mobile.locator(".back-to-top.is-visible").count(), "mobile back-to-top control covered the interactive origin map");
const mobileMapTargets = await mobile.locator(".coffee-map__pin").evaluateAll((pins) => pins.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileMapTargets.length === 38, "mobile origin map did not retain all 38 visual markers");
assert(await mobile.locator(".coffee-map__viewport").evaluate((element) => getComputedStyle(element).touchAction === "manipulation"), "mobile origin map blocked vertical page gestures");
const activeMapVisibility = await mobile.evaluate(() => {
  const viewport = document.querySelector(".coffee-map__viewport").getBoundingClientRect();
  const pin = document.querySelector(".coffee-map__pin.is-active").getBoundingClientRect();
  return pin.left >= viewport.left && pin.right <= viewport.right;
});
assert(activeMapVisibility, "mobile map did not bring the active country flag into view");
const mobileFlagTargets = await mobile.locator('.origin-flag-filter [role="group"] > button').evaluateAll((buttons) => buttons.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileFlagTargets.length === 39 && mobileFlagTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile flag filters have a touch target below 44px");
const mobileAdvancedToggle = mobile.locator(".origin-filter-panel__mobile-toggle");
assert(await mobileAdvancedToggle.getAttribute("aria-expanded") === "false", "mobile advanced origin filters did not begin in a compact state");
assert(await mobile.locator(".origin-filter-panel__fields").isHidden(), "collapsed mobile advanced filters remained in the interaction order");
await mobileAdvancedToggle.click();
assert(await mobileAdvancedToggle.getAttribute("aria-expanded") === "true" && await mobile.locator(".origin-filter-panel__fields").isVisible(), "mobile advanced origin filters did not expand");
const mobileLensTargets = await mobile.locator(".coffee-map__lenses button").evaluateAll((buttons) => buttons.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileLensTargets.length === 3 && mobileLensTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile map lenses have a touch target below 44px");
const mobileMapViewButtons = mobile.locator(".coffee-map__scale button");
assert(await mobileMapViewButtons.count() === 2, "mobile origin map did not expose World and Focus scale controls");
assert(await mobileMapViewButtons.evaluateAll((buttons) => buttons.every(({ offsetWidth: width, offsetHeight: height }) => width >= 44 && height >= 44)), "mobile origin map scale has a touch target below 44px");
assert(await mobile.locator('.coffee-map__canvas[data-map-view="focus"]').count() === 1, "mobile origin map did not begin in its detailed Focus view");
await mobileMapViewButtons.filter({ hasText: "World" }).click();
await mobile.waitForTimeout(460);
assert(await mobile.locator('.coffee-map__canvas[data-map-view="overview"]').count() === 1, "mobile origin map did not enter its World view");
assert(await mobile.locator(".coffee-map__viewport").evaluate((element) => Math.abs(element.scrollWidth - element.clientWidth) <= 1), "mobile origin World view did not fit the full map in its viewport");
assert(await mobile.locator(".coffee-map__pin").evaluateAll((pins) => pins.filter((pin) => getComputedStyle(pin).visibility !== "hidden").length === 1), "mobile origin World view retained overlapping country flags");
assert(await mobile.locator('.coffee-map__pin[aria-hidden="true"]').count() === 38, "mobile origin World view left duplicate map controls in the accessibility tree");
await mobileMapViewButtons.filter({ hasText: "Focus" }).click();
await mobile.waitForTimeout(460);
assert(await mobile.locator(".coffee-map__viewport").evaluate((element) => element.scrollWidth > element.clientWidth), "mobile origin Focus view did not restore detailed map scale");
assert(await mobile.locator(".coffee-map__pin").evaluateAll((pins) => pins.every((pin) => getComputedStyle(pin).visibility === "visible")), "mobile origin Focus view did not restore its country flags");
const mobileMapRail = mobile.locator(".coffee-map__country-rail > button");
assert(await mobileMapRail.count() === 38, "mobile origin map did not expose its 38-country flag rail");
assert(await mobileMapRail.locator('.origin-flag[data-flag-source="local-svg"] img').count() === 38, "mobile origin map rail did not use 38 real local flags");
await mobileMapRail.filter({ hasText: "Kenya" }).click();
assert((await mobile.locator(".origin-explorer__readout").textContent()).includes("Kenya"), "mobile origin rail did not update the active country");
assert(await mobile.locator(".coffee-map__pin-label").count() === 1, "mobile map retained overlapping labels for inactive flags");
const mobileCountryIndex = mobile.locator(".origin-explorer__country-index");
assert(await mobileCountryIndex.locator("button").count() === 38, "mobile origin explorer did not expose its country passport controls");
assert(await mobileCountryIndex.evaluate((element) => element.scrollWidth > element.clientWidth), "mobile country passports did not become a horizontal continuation rail");
assert(await mobileCountryIndex.locator("button").evaluateAll((buttons) => buttons.every(({ offsetHeight: height }) => height >= 44)), "mobile country continuation has a touch target below 44px");
await mobileCountryIndex.locator("button").filter({ hasText: "Brazil" }).click();
await mobile.waitForTimeout(520);
assert((await mobile.locator(".origin-explorer__readout").textContent()).includes("Brazil"), "mobile country continuation did not update the origin passport");
assert(await mobile.locator(".origin-explorer__readout").evaluate((element) => element.getBoundingClientRect().top >= 68), "mobile country continuation hid the selected passport beneath the sticky header");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile origins page has horizontal overflow");
console.log("Interaction progress: mobile navigation, filters, flags, and origin map checked.");
await mobile.goto(`${baseUrl}/origins/ethiopia`, { waitUntil: "networkidle" });
const mobileProfileImage = mobile.locator(".profile-detail__media > img");
const mobileProfileBadge = mobile.locator(".profile-detail__origin-badge .origin-flag");
const mobileProfileSource = await mobileProfileImage.evaluate((image) => new URL(image.currentSrc).pathname);
assert(/-(480|720)\.webp$/.test(mobileProfileSource), `mobile profile loaded an oversized image candidate: ${mobileProfileSource}`);
assert(await mobileProfileBadge.evaluate((flag) => flag.offsetWidth === 42 && flag.offsetHeight === 32), "mobile profile styling distorted the country flag");
const mobileConstellationTargets = await mobile.locator(".origin-constellation__pin").evaluateAll((links) => links.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileConstellationTargets.length === 38 && mobileConstellationTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile profile constellation has a target below 44px");
assert(await mobile.locator(".origin-constellation__viewport").evaluate((element) => getComputedStyle(element).touchAction === "manipulation"), "mobile profile constellation blocked vertical page gestures");
const mobileConstellationViews = mobile.locator(".origin-constellation__view-controls button");
assert(await mobileConstellationViews.count() === 2, "mobile profile constellation did not expose World and Focus scale controls");
assert(await mobileConstellationViews.evaluateAll((buttons) => buttons.every(({ offsetWidth: width, offsetHeight: height }) => width >= 44 && height >= 44)), "mobile profile map scale has a touch target below 44px");
assert(await mobile.locator('.origin-constellation__map[data-map-view="focus"]').count() === 1, "mobile profile constellation did not begin in Focus view");
const mobileConstellationVisibility = await mobile.evaluate(() => {
  const viewport = document.querySelector(".origin-constellation__viewport").getBoundingClientRect();
  const pin = document.querySelector(".origin-constellation__pin.is-active").getBoundingClientRect();
  return pin.left >= viewport.left && pin.right <= viewport.right;
});
assert(mobileConstellationVisibility, "mobile profile constellation did not center the active country");
await mobileConstellationViews.filter({ hasText: "World" }).click();
await mobile.waitForTimeout(460);
assert(await mobile.locator(".origin-constellation__viewport").evaluate((element) => Math.abs(element.scrollWidth - element.clientWidth) <= 1), "mobile profile World view did not fit the coffee belt");
assert(await mobile.locator(".origin-constellation__pin").evaluateAll((pins) => pins.filter((pin) => getComputedStyle(pin).visibility !== "hidden").length === 1), "mobile profile World view retained overlapping country flags");
assert(await mobile.locator('.origin-constellation__pin[aria-hidden="true"]').count() === 38, "mobile profile World view left duplicate map controls in the accessibility tree");
await mobileConstellationViews.filter({ hasText: "Focus" }).click();
await mobile.waitForTimeout(460);
assert(await mobile.locator(".origin-constellation__viewport").evaluate((element) => element.scrollWidth > element.clientWidth), "mobile profile Focus view did not restore detail");
assert(await mobile.locator(".origin-constellation__pin").evaluateAll((pins) => pins.every((pin) => getComputedStyle(pin).visibility === "visible")), "mobile profile Focus view did not restore its country flags");
assert(await mobile.locator(".origin-constellation__rail").evaluate((element) => element.scrollWidth > element.clientWidth), "mobile profile origin list did not become a swipeable rail");
assert(await mobile.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "mobile profile constellation created page overflow");
await mobile.locator(".origin-page-reader").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(220);
assert(await mobile.locator(".chapter-navigator").evaluate((element) => getComputedStyle(element).display === "none"), "mobile chapter navigator covered the country document reader");
assert(await mobile.locator(".back-to-top").evaluate((element) => getComputedStyle(element).display === "none"), "mobile back-to-top control covered the country document reader");
assert(!await mobile.locator(".origin-pdf-launcher.is-visible").count(), "floating PDF launcher covered the inline country document reader");
const readerScrollPosition = await mobile.evaluate(() => window.scrollY);
await mobile.locator(".origin-page-reader__step--next").click();
await mobile.waitForTimeout(360);
assert(Math.abs((await mobile.evaluate(() => window.scrollY)) - readerScrollPosition) <= 1, "horizontal document-thumbnail centering interrupted the page scroll position");
await mobile.locator(".origin-page-reader__page").click();
const mobileDocumentDialog = mobile.locator(".origin-document-dialog");
await mobileDocumentDialog.waitFor({ state: "visible" });
const mobileToolbar = mobileDocumentDialog.locator(".origin-document-dialog__toolbar");
assert(await mobileToolbar.evaluate((element) => element.scrollWidth === element.clientWidth), "mobile document toolbar overflowed or clipped its control groups");
const mobileViewerTargets = await mobileToolbar.locator("button, a").evaluateAll((controls) => controls.map(({ offsetWidth: width, offsetHeight: height }) => ({ width, height })));
assert(mobileViewerTargets.every(({ width, height }) => width >= 44 && height >= 44), "mobile document viewer has a control below 44px");
assert(
  await mobileDocumentDialog.locator(".origin-document-dialog__specifications dl").evaluate((element) => (
    [...element.children].every((card) => card.offsetWidth >= element.clientWidth - 24)
  )),
  "mobile specification cards did not collapse to a readable single column",
);
const mobileDocumentDock = mobileDocumentDialog.locator(".origin-document-dialog__mobile-actions");
const mobileDocumentDockBounds = await mobileDocumentDock.boundingBox();
assert(mobileDocumentDockBounds && mobileDocumentDockBounds.y + mobileDocumentDockBounds.height <= 844, "mobile document action dock was pushed below the viewport");
assert(await mobileDocumentDock.locator("a, button").evaluateAll((controls) => controls.every(({ offsetWidth: width, offsetHeight: height }) => width >= 44 && height >= 44)), "mobile document action dock has a touch target below 44px");
await mobileDocumentDialog.locator(".origin-document-dialog__close").click();
await mobile.waitForFunction(() => !document.querySelector(".origin-document-dialog"));
await mobile.goto(`${baseUrl}/approach`, { waitUntil: "networkidle" });
const mobileApproachImage = mobile.locator(".approach-feature img");
await mobileApproachImage.scrollIntoViewIfNeeded();
await mobileApproachImage.evaluate((image) => image.decode());
assert((await mobileApproachImage.evaluate((image) => new URL(image.currentSrc).pathname)).endsWith("-480.webp"), "mobile approach loaded an oversized image candidate");
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
console.log("Interaction progress: mobile profiles, responsive media, and chapter controls checked.");

const turkishContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await turkishContext.addInitScript(() => localStorage.setItem("coffendi-language", JSON.stringify("tr")));
const turkishPage = await turkishContext.newPage();
await turkishPage.goto(`${baseUrl}/origins/indonesia`, { waitUntil: "networkidle" });
assert(await turkishPage.locator("html").getAttribute("lang") === "tr", "stored Turkish preference did not set the document language");
assert((await turkishPage.locator("h1").textContent()).trim() === "Endonezya", "Turkish country profile did not identify the origin country as its primary heading");
assert((await turkishPage.locator(".profile-detail__descriptor").textContent()).includes("menşe portföyü"), "catalogue-generated Turkish profile descriptor was not professionally localised");
const turkishProfileText = await turkishPage.locator(".profile-detail__copy").innerText();
assert(turkishProfileText.includes("Islak kabuk ayırma (Giling Basah)"), "catalogue-generated processing terminology remained untranslated");
assert(turkishProfileText.includes("Filtre kahve") && turkishProfileText.includes("Harmanlar"), "catalogue-generated intended uses remained untranslated");
assert(!/kahve yönü|program yönü|kullanım yönü/i.test(turkishProfileText), "deprecated machine-like Turkish terminology remained on the origin profile");
await turkishPage.locator(".origin-page-reader").scrollIntoViewIfNeeded();
await turkishPage.locator(".origin-page-reader__page").click();
const turkishViewer = turkishPage.locator(".origin-document-dialog");
await turkishViewer.waitFor({ state: "visible" });
await turkishViewer.locator(".origin-document-dialog__preview img").evaluate((image) => image.decode());
assert(await turkishViewer.getByRole("heading", { name: "Kaynak sayfa özellikleri" }).count() === 1, "Turkish document viewer did not use the editorial source-sheet label");
assert((await turkishViewer.locator(".origin-document-dialog__specifications").innerText()).includes("İŞLEME YÖNTEMİ"), "Turkish viewer did not localise the process field");
assert((await turkishViewer.locator(".origin-document-dialog__specifications").innerText()).includes("AMBALAJ"), "Turkish viewer did not localise the packaging field");
assert((await turkishViewer.locator(".origin-document-dialog__preview img").getAttribute("src")).includes("-tr-1080.webp"), "Turkish viewer did not use the Turkish companion preview");
const turkishToolbar = turkishViewer.locator(".origin-document-dialog__toolbar");
assert((await turkishToolbar.getByRole("link", { name: "PDF’yi aç" }).getAttribute("href")).includes("-tr.pdf"), "Turkish viewer did not open the Turkish companion PDF");
assert(!(await turkishToolbar.getByRole("link", { name: "İngilizce" }).getAttribute("href")).includes("-tr.pdf"), "Turkish viewer did not expose the generated English technical sheet");
assert((await turkishToolbar.getByRole("link", { name: "Kaynak orijinali" }).getAttribute("href")).includes("-source.pdf"), "Turkish viewer did not preserve the English source original");
assert((await turkishViewer.locator(".origin-document-dialog__provenance").innerText()).includes("Üretilmiş Türkçe teknik föy"), "Turkish PDF provenance did not identify the displayed generated language");
await turkishViewer.locator(".origin-document-dialog__close").click();
await turkishPage.goto(`${baseUrl}/origins`, { waitUntil: "networkidle" });
assert((await turkishPage.locator(".origin-filter-panel h2").textContent()).includes("kahve profiline"), "Turkish origin filters retained an unnatural discovery label");
await turkishPage.locator(".origin-filter-panel__mobile-toggle").click();
await turkishPage.locator(".origin-search input").fill("fildisi");
assert(await turkishPage.locator(".coffee-map__pin").count() === 1, "Turkish origin search did not tolerate missing diacritics");
assert((await turkishPage.locator(".origin-explorer__readout").textContent()).includes("Fildişi Sahili"), "ASCII Turkish search exposed the wrong country");
assert(await turkishPage.locator(".origin-filter-panel__active button").count() === 1, "Turkish active filter did not expose a removable chip");
assert(await turkishPage.getByRole("navigation", { name: "Ana menü" }).count() === 0, "desktop navigation should not be exposed at mobile width");
await turkishPage.locator(".menu-button").click();
assert(await turkishPage.getByRole("navigation", { name: "Mobil menü" }).count() === 1, "Turkish mobile navigation did not expose a natural accessible name");
await turkishPage.keyboard.press("Escape");
assert(await turkishPage.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), "Turkish mobile copy introduced horizontal overflow");
await turkishContext.close();
console.log("Interaction progress: Turkish editorial terminology and catalogue-derived localisation checked.");

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

const invalidStorageContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
await invalidStorageContext.addInitScript(() => localStorage.setItem("coffendi-language", JSON.stringify("unsupported")));
const invalidStoragePage = await invalidStorageContext.newPage();
await invalidStoragePage.goto(baseUrl, { waitUntil: "networkidle" });
assert(await invalidStoragePage.locator("html").getAttribute("lang") === "en", "invalid stored language escaped into the document language");
assert(await invalidStoragePage.locator('.language-switcher button[aria-pressed="true"]').textContent() === "EN", "invalid stored language left the language controls without an active option");
assert(await invalidStoragePage.evaluate(() => localStorage.getItem("coffendi-language")) === JSON.stringify("en"), "invalid stored language was not repaired");
await invalidStorageContext.close();

const noScriptContext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
const noScriptPage = await noScriptContext.newPage();
await noScriptPage.goto(baseUrl, { waitUntil: "networkidle" });
assert(await noScriptPage.locator(".boot-shell").isVisible(), "the initial document exposed an empty root while the application was unavailable");
assert(await noScriptPage.locator(".boot-shell img").evaluate((image) => image.complete && image.naturalWidth > 0), "the initial loading state did not show a working Coffendi logo");
assert((await noScriptPage.locator(".boot-shell noscript").textContent()).includes("requires JavaScript"), "the no-JavaScript state did not explain how to recover");
await noScriptContext.close();

for (const route of ["/", "/coffees", "/origins/kenya", "/compare", "/contact"]) {
  const readinessContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const readinessPage = await readinessContext.newPage();
  await readinessPage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  const effectiveHeadingOpacity = await readinessPage.locator("h1").evaluate((heading) => {
    let opacity = 1;
    for (let element = heading; element; element = element.parentElement) {
      opacity *= Number.parseFloat(getComputedStyle(element).opacity) || 1;
      if (element.id === "main-content") break;
    }
    return opacity;
  });
  assert(effectiveHeadingOpacity >= 0.99, `${route}: critical heading was hidden while the page was becoming ready`);
  await readinessContext.close();
}

assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(" | ")}`);
await browser.close();

if (failures.length) {
  console.error("Interaction check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Interaction checks passed: ${routes.length} direct loads/reloads, paint-ready critical content, responsive logo integrity, pointer hit-testing, keyboard, modified and current-route clicks, rapid navigation, deep history restoration, map lenses, origin steppers, sorting, flags, profile constellations, spatial comparison, stable selection, responsive chapters and menu release, inquiry readiness, BFCache/offline/storage recovery, reduced motion, atlas preload/interruption safety, mobile touch targets, and transition failure recovery.`);
}
