import fs from "node:fs";
import { chromium } from "@playwright/test";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });
const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const checks = [
  ["desktop-home", "/", 1440, 1000],
  ["desktop-coffees", "/coffees", 1440, 1000],
  ["desktop-profile", "/origins/ethiopia", 1440, 1000],
  ["desktop-kenya", "/origins/kenya", 1440, 1000],
  ["desktop-indonesia", "/origins/indonesia", 1440, 1000],
  ["desktop-origins", "/origins", 1440, 1000],
  ["desktop-compare", "/compare", 1440, 1000],
  ["desktop-approach", "/approach", 1440, 1000],
  ["desktop-contact", "/contact", 1440, 1000],
  ["desktop-privacy", "/privacy", 1440, 1000],
  ["tablet-home", "/", 768, 900],
  ["mobile-home", "/", 390, 844],
  ["mobile-coffees", "/coffees", 390, 844],
  ["mobile-profile", "/origins/brazil", 390, 844],
  ["mobile-kenya", "/origins/kenya", 390, 844],
  ["mobile-indonesia", "/origins/indonesia", 390, 844],
  ["mobile-origins", "/origins", 390, 844],
  ["mobile-compare", "/compare", 390, 844],
  ["mobile-contact", "/contact", 390, 844],
  ["compact-home", "/", 320, 700],
  ["compact-origins", "/origins", 320, 700],
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
    flagCount: document.querySelectorAll(".origin-flag[data-country]").length,
    localFlagCount: document.querySelectorAll('.origin-flag[data-flag-source="local-svg"] img.origin-flag__image').length,
    fallbackFlagCount: document.querySelectorAll('.origin-flag[data-flag-source="emoji-fallback"]').length,
    mapArtworkCount: document.querySelectorAll('.origin-map-artwork[data-map-geometry="natural-earth-110m"]').length,
    hasCart: Boolean(document.querySelector('[class*="cart"], [aria-label*="cart" i], [aria-label*="sepet" i]')),
    hasPrice: /(?:[$€£]\s?\d|\d(?:[.,]\d{2})?\s?(?:USD|EUR|TRY|TL)\b)/i.test(document.body.innerText),
  }));

  if (audit.scrollWidth > audit.clientWidth + 1) failures.push(`${check.name}: horizontal overflow ${audit.scrollWidth}px > ${audit.clientWidth}px`);
  if (audit.brokenImages) failures.push(`${check.name}: ${audit.brokenImages} broken images`);
  if (audit.flagCount && audit.localFlagCount !== audit.flagCount) failures.push(`${check.name}: expected ${audit.flagCount} local SVG flags, found ${audit.localFlagCount}`);
  if (audit.fallbackFlagCount) failures.push(`${check.name}: ${audit.fallbackFlagCount} flags fell back to emoji`);
  if ((check.path === "/origins" || check.path.startsWith("/origins/") || check.path.startsWith("/coffees/")) && audit.mapArtworkCount !== 1) failures.push(`${check.name}: local Natural Earth map artwork was missing`);
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
    if ((await page.locator(".origin-constellation__pin").count()) !== 38) failures.push("desktop-compare: geographic comparison controls were missing");
    const rows = page.locator(".compare-table__row");
    if ((await rows.count()) !== 7) failures.push("desktop-compare: expected header plus six comparison rows");
    const columns = await rows.first().locator(":scope > *").count();
    if (columns !== 3) failures.push(`desktop-compare: default comparison should have attribute plus two profiles, found ${columns} columns`);
    const template = await rows.first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    if (template !== columns) failures.push(`desktop-compare: rendered grid had ${template} tracks for ${columns} content columns`);
  }

  if (check.name === "desktop-home") {
    const atlas = page.locator(".origin-atlas");
    if ((await atlas.locator(".origin-atlas__controls button").count()) !== 6) failures.push("desktop-home: atlas did not expose all six countries");
    if ((await atlas.locator(".origin-atlas__flag").count()) !== 6) failures.push("desktop-home: atlas flags were missing");
    if ((await atlas.locator(".origin-atlas__directions li").count()) !== 3) failures.push("desktop-home: active origin did not expose three representative coffees");
    if (!(await atlas.getByText("Sidamo · Guji · Yirgacheffe", { exact: true }).first().isVisible())) failures.push("desktop-home: Ethiopia region did not use the owner-approved Sidamo spelling");
    const englishHeading = await page.locator("h1").textContent();
    await page.getByRole("button", { name: "TR" }).click();
    if ((await page.locator("h1").textContent()) === englishHeading) failures.push("desktop-home: Turkish language control did not localise the page");
    if ((await page.locator("html").getAttribute("lang")) !== "tr") failures.push("desktop-home: document language did not change to Turkish");
    const turkishFonts = await page.evaluate(() => document.fonts.load(
      '700 16px "Manrope"',
      "Türkçe İı Şş Ğğ Çç Öö Üü",
    ).then((fonts) => fonts.length));
    if (!turkishFonts) failures.push("desktop-home: Turkish extended glyph font did not load");
  }

  if (check.name === "desktop-coffees") {
    if ((await page.locator('.origin-flag-filter [role="group"] > button').count()) !== 39) failures.push("desktop-coffees: flag filters did not expose 38 countries plus all");
    if ((await page.locator(".profile-card__process .origin-flag").count()) !== 38) failures.push("desktop-coffees: profile cards did not expose origin flags");
  }

  if (["desktop-profile", "desktop-kenya", "desktop-indonesia"].includes(check.name)) {
    if ((await page.locator(".origin-constellation__pin").count()) !== 38) failures.push(`${check.name}: constellation did not expose all 38 origins`);
    if ((await page.locator(".origin-constellation__rail a").count()) !== 38) failures.push(`${check.name}: conventional origin links were missing`);
    const expectedSheets = check.name === "desktop-kenya" || check.name === "desktop-indonesia" ? 6 : 8;
    if ((await page.locator(".origin-sheet-card").count()) !== expectedSheets) failures.push(`${check.name}: expected ${expectedSheets} country-specific sheets`);
    if (expectedSheets) {
      if ((await page.locator(".origin-page-reader").count()) !== 1) failures.push(`${check.name}: country PDF reader was missing`);
      if ((await page.locator(".origin-page-reader__thumbnails button").count()) !== expectedSheets) failures.push(`${check.name}: country PDF reader did not expose every source page`);
      await page.locator(".origin-sheet-card__preview").first().click();
      await page.locator(".origin-document-dialog").waitFor({ state: "visible" });
      await page.locator(".origin-document-dialog__preview img").evaluate((image) => image.decode());
      await page.locator(".origin-document-dialog__preview-status").waitFor({ state: "detached" });
      if ((await page.locator(".origin-document-dialog__specifications dl > div").count()) !== 11) failures.push(`${check.name}: viewer specifications were incomplete`);
      if (check.name === "desktop-kenya") {
        for (let step = 0; step < 4; step += 1) {
          await page.getByRole("button", { name: "Zoom in" }).click();
        }
        await page.waitForFunction(() => (
          document.querySelector(".origin-document-dialog__preview img")?.currentSrc.includes("-2160.webp")
        ));
        const highResolutionSource = await page.locator(".origin-document-dialog__preview img").evaluate((image) => image.currentSrc);
        if (!highResolutionSource.includes("-2160.webp")) failures.push("desktop-kenya: zoom did not promote the reader to the 2160px source");
        await page.getByRole("button", { name: "Close document viewer" }).click();
        await page.getByRole("button", { name: "TR" }).click();
        await page.locator(".origin-page-reader__page img[src$='-tr-1080.webp']").waitFor();
        await page.locator(".origin-sheet-card__preview").first().click();
        await page.locator(".origin-document-dialog").waitFor({ state: "visible" });
        await page.locator(".origin-document-dialog__preview img[src$='-tr-1080.webp']").evaluate((image) => image.decode());
        if ((await page.getByRole("link", { name: "İngilizce orijinali aç" }).count()) !== 1) failures.push("desktop-kenya: Turkish reader did not preserve a route to the English original");
        if (!(await page.locator(".origin-document-dialog__provenance").getByText("Türkçe bilgi föyü", { exact: true }).isVisible())) failures.push("desktop-kenya: Turkish companion provenance was missing");
      }
      await page.screenshot({ path: new URL(`${check.name}-viewer.png`, outputDir).pathname, fullPage: false });
    }
  }

  if (check.name === "desktop-origins") {
    if ((await page.locator(".coffee-map__pin").count()) !== 38) failures.push("desktop-origins: interactive map did not expose 38 pins");
    if ((await page.locator('.origin-flag-filter [role="group"] > button').count()) !== 39) failures.push("desktop-origins: flag filters did not expose 38 countries plus all");
    if ((await page.locator(".coffee-map__lenses button").count()) !== 3) failures.push("desktop-origins: information lenses were missing");
    if ((await page.locator(".origin-explorer__country-index button").count()) !== 38) failures.push("desktop-origins: country passports were missing");
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
    if (!(await page.locator('a[href="mailto:info@makendi.com"]').first().isVisible())) failures.push("mobile-contact: direct email channel was missing");
    if (!(await page.locator('a[href="tel:+902163407028"]').first().isVisible())) failures.push("mobile-contact: direct phone channel was missing");
    if (!(await page.getByText("www.coffendi.com", { exact: true }).first().isVisible())) failures.push("mobile-contact: planned Coffendi domain was missing");
  }

  if (check.name === "mobile-origins" || check.name === "compact-origins") {
    if ((await page.locator(".coffee-map__pin").count()) !== 38) failures.push(`${check.name}: interactive map pins were missing`);
    if ((await page.locator('.origin-flag-filter [role="group"] > button').count()) !== 39) failures.push(`${check.name}: flag filters were missing`);
    if ((await page.locator(".coffee-map__lenses button").count()) !== 3) failures.push(`${check.name}: map lenses were missing`);
    if ((await page.locator(".coffee-map__scale button").count()) !== 2) failures.push(`${check.name}: World and Focus map controls were missing`);
    if ((await page.locator('.coffee-map__canvas[data-map-view="focus"]').count()) !== 1) failures.push(`${check.name}: map did not begin in Focus view`);
    if (!(await page.locator(".origin-explorer__country-index").evaluate((element) => element.scrollWidth > element.clientWidth))) failures.push(`${check.name}: country continuation was not horizontally scrollable`);
  }

  if (["mobile-profile", "mobile-kenya", "mobile-indonesia"].includes(check.name)) {
    if ((await page.locator(".origin-constellation__pin").count()) !== 38) failures.push(`${check.name}: responsive origin constellation was missing`);
    if ((await page.locator(".origin-constellation__view-controls button").count()) !== 2) failures.push(`${check.name}: World and Focus controls were missing`);
    if (!(await page.locator(".origin-constellation__rail").evaluate((element) => element.scrollWidth > element.clientWidth))) failures.push(`${check.name}: origin continuation was not horizontally scrollable`);
    const expectedSheets = check.name === "mobile-kenya" || check.name === "mobile-indonesia" ? 6 : 9;
    if ((await page.locator(".origin-sheet-card").count()) !== expectedSheets) failures.push(`${check.name}: expected ${expectedSheets} country-specific sheets`);
    if (expectedSheets && (await page.locator(".origin-page-reader__thumbnails button").count()) !== expectedSheets) failures.push(`${check.name}: responsive country PDF reader did not expose every source page`);
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
