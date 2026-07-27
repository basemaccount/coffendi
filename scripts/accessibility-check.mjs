import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const routes = [
  "/",
  "/coffees",
  "/origins",
  "/origins/ethiopia",
  "/origins/indonesia",
  "/origins/kenya",
  "/origins/kenya?sheet=kenya-aa-ab-faq-main-crop-export-classifications",
  "/compare",
  "/approach",
  "/contact",
  "/privacy",
];
const checks = routes.flatMap((path) => [
  { name: `desktop-${path === "/" ? "home" : path.split("/").filter(Boolean).join("-")}`, path, width: 1440, height: 1000 },
  { name: `mobile-${path === "/" ? "home" : path.split("/").filter(Boolean).join("-")}`, path, width: 390, height: 844 },
]).concat([
  { name: "mobile-origins-world", path: "/origins", width: 390, height: 844, world: ".coffee-map__scale" },
  { name: "mobile-origin-profile-world", path: "/origins/ethiopia", width: 390, height: 844, world: ".origin-constellation__view-controls" },
]);

const browser = await chromium.launch();
const failures = [];
for (const check of checks) {
  const context = await browser.newContext({ viewport: { width: check.width, height: check.height } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  if (check.world) {
    await page.locator(check.world).getByRole("button", { name: "World" }).click();
    await page.waitForTimeout(460);
  }
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const actionable = results.violations.filter(({ impact }) => ["critical", "serious", "moderate"].includes(impact));
  actionable.forEach((violation) => failures.push(`${check.name}: [${violation.impact}] ${violation.id} — ${violation.help} (${violation.nodes.slice(0, 4).map((node) => node.target.join(" ")).join(", ")})`));
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
