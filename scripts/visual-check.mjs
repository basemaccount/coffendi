import fs from "node:fs";
import { chromium } from "@playwright/test";
import { makendiSearchIndex } from "../src/makendiSummary.js";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const atlasDetailId =
  makendiSearchIndex.find((item) => item.country === "Brazil")?.id || makendiSearchIndex[0].id;
const checks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000 },
  { name: "desktop-sourcing", path: "/sourcing", width: 1440, height: 1000 },
  { name: "desktop-coffees", path: "/coffees", width: 1440, height: 1000 },
  { name: "desktop-atlas", path: "/atlas", width: 1440, height: 1000 },
  {
    name: "desktop-atlas-detail",
    path: `/atlas/${atlasDetailId}`,
    width: 1440,
    height: 1000,
  },
  {
    name: "desktop-detail",
    path: "/coffees/ethiopia-bensa",
    width: 1440,
    height: 1000,
  },
  { name: "desktop-origins", path: "/origins", width: 1440, height: 1000 },
  { name: "mobile-home", path: "/", width: 390, height: 844 },
  { name: "mobile-sourcing", path: "/sourcing", width: 390, height: 844 },
  { name: "mobile-coffees", path: "/coffees", width: 390, height: 844 },
  { name: "mobile-atlas", path: "/atlas", width: 390, height: 844 },
  { name: "mobile-atlas-detail", path: `/atlas/${atlasDetailId}`, width: 390, height: 844 },
  { name: "mobile-origins", path: "/origins", width: 390, height: 844 },
  { name: "mobile-detail", path: "/coffees/ethiopia-bensa", width: 390, height: 844 },
  { name: "mobile-availability", path: "/availability", width: 390, height: 844 },
];

const failures = [];

for (const check of checks) {
  const page = await browser.newPage({
    viewport: { width: check.width, height: check.height },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  await page.goto(`http://127.0.0.1:4173${check.path}`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({
    path: new URL(`${check.name}.png`, outputDir).pathname,
    fullPage: false,
  });

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 1) {
    failures.push(
      `${check.name}: horizontal overflow ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
    );
  }
  if (pageErrors.length) {
    failures.push(`${check.name}: ${pageErrors.join(" | ")}`);
  }
  console.log(
    `${check.name}: ${dimensions.clientWidth}x${check.height}, scrollWidth=${dimensions.scrollWidth}, title="${dimensions.title}"`,
  );

  if (check.name === "mobile-home") {
    await page.locator(".mobile-dock button").click();
    await page.screenshot({
      path: new URL("mobile-finder.png", outputDir).pathname,
      fullPage: false,
    });
    await page.getByRole("button", { name: "Show my matches" }).click();
    await page.screenshot({
      path: new URL("mobile-matches.png", outputDir).pathname,
      fullPage: false,
    });
    await page.locator(".sourcing-tabs button").nth(1).click();
    await page
      .getByPlaceholder(/Find a washed East African coffee/i)
      .fill("Find a washed East African coffee for bright filter, 20 bags, Hamburg, under $8.");
    await page.getByRole("button", { name: "Ask assistant" }).click();
    await page.waitForTimeout(300);
    if (!(await page.locator(".ai-message--assistant").last().isVisible())) {
      failures.push("mobile-home: assistant did not produce a visible response");
    }
    await page.screenshot({
      path: new URL("mobile-ai-assistant.png", outputDir).pathname,
      fullPage: false,
    });
    await page.locator(".sourcing-tabs button").nth(2).click();
    await page.waitForTimeout(250);
    if (!(await page.locator(".compare-lab").isVisible())) {
      failures.push("mobile-home: compare lab did not open");
    }
    await page.getByRole("button", { name: /Send this sourcing brief/ }).click();
    await page.waitForTimeout(250);
    if (!(await page.getByLabel("Sourcing brief preview").isVisible())) {
      failures.push("mobile-home: sourcing brief submit panel did not open");
    }
    await page.screenshot({
      path: new URL("mobile-ai-compare.png", outputDir).pathname,
      fullPage: false,
    });
  }

  if (check.name === "desktop-origins") {
    await page.locator(".origin-map-layout").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".origin-detail__media > img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    const markerCount = await page.locator(".map-marker").count();
    if (markerCount < 38) {
      failures.push(`desktop-origins: expected at least 38 origin markers, found ${markerCount}`);
    }
    await page.screenshot({
      path: new URL("desktop-origin-map.png", outputDir).pathname,
      fullPage: false,
    });
    await page.getByLabel("Search coffee origins").fill("Vietnam");
    await page.waitForTimeout(300);
    const selectedOrigin = await page.locator(".origin-detail h3").textContent();
    if (!selectedOrigin?.includes("Vietnam")) {
      failures.push("desktop-origins: origin search did not select Vietnam");
    }
    await page.screenshot({
      path: new URL("desktop-origin-map-search.png", outputDir).pathname,
      fullPage: false,
    });
    await page.locator("#origin-planner").evaluate((element) => {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - 82,
        behavior: "instant",
      });
    });
    const plannerCards = await page.locator(".origin-recommendation-card").count();
    if (!plannerCards) {
      failures.push("desktop-origins: origin planner did not render recommendations");
    }
    await page.locator("#origin-planner select").nth(0).selectOption("Hamburg");
    await page.locator("#origin-planner select").nth(3).selectOption("Washed");
    await page.locator("#origin-planner").getByRole("button", { name: "Live stock" }).click();
    await page.waitForTimeout(300);
    if (!(await page.locator(".origin-recommendation-card").first().isVisible())) {
      failures.push("desktop-origins: planner filters removed all visible cards");
    }
    await page.screenshot({
      path: new URL("desktop-origin-planner.png", outputDir).pathname,
      fullPage: false,
    });
  }

  if (check.name === "desktop-coffees") {
    await page.getByRole("button", { name: "Search coffees and pages" }).click();
    await page.getByRole("searchbox", { name: "Search Coffendi" }).fill("Kenya");
    await page.waitForTimeout(250);
    const searchDialog = page.getByRole("dialog", { name: "Search Coffendi" });
    const searchResult = searchDialog.getByRole("link", { name: /Kirinyaga Kii AA/ });
    if (!(await searchResult.isVisible())) {
      failures.push("desktop-coffees: Kenya search did not return Kirinyaga Kii AA");
    }
    await page.screenshot({
      path: new URL("desktop-search.png", outputDir).pathname,
      fullPage: false,
    });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Add Bensa Bombe to comparison" }).click();
    await page.getByRole("button", { name: "Add El Vergel Java to comparison" }).click();
    await page.getByRole("button", { name: /Compare 2/ }).click();
    await page.waitForTimeout(450);
    const compareDialog = page.getByRole("dialog", { name: "Compare coffees" });
    if (!(await compareDialog.isVisible())) {
      failures.push("desktop-coffees: comparison dialog did not open");
    }
    await page.screenshot({
      path: new URL("desktop-compare.png", outputDir).pathname,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    if ((await compareDialog.getAttribute("class"))?.includes("is-open")) {
      failures.push("desktop-coffees: Escape did not close the comparison dialog");
    }
  }

  if (check.name === "desktop-atlas") {
    await page.locator("#atlas-results").scrollIntoViewIfNeeded();
    await page.getByPlaceholder("Search origin, grade, process, defect spec, or tasting note").fill("Vietnam robusta");
    await page.waitForTimeout(250);
    const visibleCards = await page.locator(".atlas-card").count();
    if (!visibleCards) {
      failures.push("desktop-atlas: search did not return atlas cards");
    }
    await page.screenshot({
      path: new URL("desktop-atlas-search.png", outputDir).pathname,
      fullPage: false,
    });
    await page.getByRole("button", { name: /Add to brief/ }).first().click();
    await page.getByRole("button", { name: /Sample request/ }).click();
    await page.waitForTimeout(300);
    const drawer = page.getByRole("dialog", { name: "Sample request" });
    if (!(await drawer.isVisible())) {
      failures.push("desktop-atlas: atlas profile was not added to the sample drawer");
    }
    await page.screenshot({
      path: new URL("desktop-atlas-brief.png", outputDir).pathname,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
  }

  if (check.name === "mobile-coffees") {
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: new URL("mobile-filters.png", outputDir).pathname,
      fullPage: false,
    });
  }

  if (check.name === "mobile-atlas") {
    await page.locator("#atlas-results").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: new URL("mobile-atlas-filters.png", outputDir).pathname,
      fullPage: false,
    });
  }

  if (check.name === "mobile-origins") {
    await page.locator(".origin-map-layout").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".origin-detail__media > img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    const mobileMarkerCount = await page.locator(".map-marker").count();
    if (mobileMarkerCount < 38) {
      failures.push(`mobile-origins: expected at least 38 origin markers, found ${mobileMarkerCount}`);
    }
    await page.screenshot({
      path: new URL("mobile-origin-map.png", outputDir).pathname,
      fullPage: false,
    });
    await page.locator("#origin-planner").evaluate((element) => {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - 72,
        behavior: "instant",
      });
    });
    if (!(await page.locator(".origin-recommendation-card").first().isVisible())) {
      failures.push("mobile-origins: origin planner card is not visible");
    }
    await page.screenshot({
      path: new URL("mobile-origin-planner.png", outputDir).pathname,
      fullPage: false,
    });
  }

  await page.close();
}

await browser.close();

if (failures.length) {
  console.error("\nVisual check failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nVisual checks passed with no console errors or horizontal overflow.");
}
