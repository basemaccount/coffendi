import fs from "node:fs";
import { chromium } from "@playwright/test";

const outputDir = new URL("../test-output/", import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch();
const checks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000 },
  { name: "desktop-coffees", path: "/coffees", width: 1440, height: 1000 },
  {
    name: "desktop-detail",
    path: "/coffees/ethiopia-bensa",
    width: 1440,
    height: 1000,
  },
  { name: "desktop-origins", path: "/origins", width: 1440, height: 1000 },
  { name: "mobile-home", path: "/", width: 390, height: 844 },
  { name: "mobile-coffees", path: "/coffees", width: 390, height: 844 },
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
  }

  if (check.name === "desktop-origins") {
    await page.locator(".origin-map-layout").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: new URL("desktop-origin-map.png", outputDir).pathname,
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

  if (check.name === "mobile-coffees") {
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: new URL("mobile-filters.png", outputDir).pathname,
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
