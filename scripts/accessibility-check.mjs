import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

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
  { name: "desktop-terms", path: "/terms", width: 1440, height: 1000 },
  { name: "mobile-home", path: "/", width: 390, height: 844 },
  { name: "mobile-shop", path: "/shop", width: 390, height: 844 },
  { name: "mobile-spray", path: "/products/spray-dried", width: 390, height: 844 },
  { name: "mobile-bulk", path: "/bulk", width: 390, height: 844 },
  { name: "mobile-learn", path: "/learn", width: 390, height: 844 },
  { name: "mobile-sustainability", path: "/sustainability", width: 390, height: 844 },
  { name: "mobile-shipping", path: "/shipping-returns", width: 390, height: 844 },
];

const browser = await chromium.launch();
const failures = [];

for (const check of checks) {
  const context = await browser.newContext({
    viewport: { width: check.width, height: check.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const actionable = results.violations.filter((violation) =>
    ["critical", "serious", "moderate"].includes(violation.impact),
  );

  for (const violation of actionable) {
    const targets = violation.nodes.slice(0, 4).map((node) => node.target.join(" ")).join(", ");
    failures.push(`${check.name}: [${violation.impact}] ${violation.id} — ${violation.help} (${targets})`);
  }
  console.log(`${check.name}: ${results.passes.length} rules passed, ${actionable.length} actionable violations`);
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("\nAccessibility check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nAccessibility checks passed at WCAG 2.2 A/AA for all audited routes.");
}
