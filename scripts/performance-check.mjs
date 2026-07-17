import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const checks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000 },
  { name: "desktop-shop", path: "/shop", width: 1440, height: 1000 },
  { name: "desktop-product", path: "/products/freeze-dried", width: 1440, height: 1000 },
  { name: "desktop-bulk", path: "/bulk", width: 1440, height: 1000 },
  { name: "mobile-home", path: "/", width: 390, height: 844 },
];

const browser = await chromium.launch();
const failures = [];

for (const check of checks) {
  const context = await browser.newContext({ viewport: { width: check.width, height: check.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
  await page.addInitScript(() => {
    window.__coffendiVitals = { cls: 0, lcp: 0, longTasks: 0, shifts: [] };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__coffendiVitals.cls += entry.value;
            window.__coffendiVitals.shifts.push({ value: entry.value });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        window.__coffendiVitals.lcp = list.getEntries().at(-1)?.startTime || 0;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        window.__coffendiVitals.longTasks += list.getEntries().length;
      }).observe({ type: "longtask", buffered: true });
    } catch {
      // Navigation and image checks still provide useful coverage without observer support.
    }
  });

  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const visibleImages = [...document.images].filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.bottom >= 0 && bounds.top <= innerHeight;
    });
    return {
      domContentLoaded: Math.round(navigation?.domContentLoadedEventEnd || 0),
      load: Math.round(navigation?.loadEventEnd || 0),
      transferKb: Math.round(resources.reduce((total, resource) => total + (resource.transferSize || 0), 0) / 1024),
      domNodes: document.querySelectorAll("*").length,
      incompleteImages: visibleImages.filter((image) => !image.complete || image.naturalWidth === 0).length,
      cls: Number((window.__coffendiVitals?.cls || 0).toFixed(3)),
      lcp: Math.round(window.__coffendiVitals?.lcp || 0),
      longTasks: window.__coffendiVitals?.longTasks || 0,
    };
  });

  if (pageErrors.length) failures.push(`${check.name}: ${pageErrors.join(" | ")}`);
  if (metrics.cls > 0.1) failures.push(`${check.name}: CLS ${metrics.cls} exceeds 0.1`);
  if (metrics.lcp > 2500) failures.push(`${check.name}: local LCP ${metrics.lcp}ms exceeds 2500ms`);
  if (metrics.domNodes > 3500) failures.push(`${check.name}: ${metrics.domNodes} DOM nodes exceeds 3500`);
  if (metrics.incompleteImages) failures.push(`${check.name}: ${metrics.incompleteImages} visible images are incomplete`);
  console.log(`${check.name}: DCL ${metrics.domContentLoaded}ms · load ${metrics.load}ms · LCP ${metrics.lcp}ms · CLS ${metrics.cls} · ${metrics.transferKb}KB transferred · ${metrics.domNodes} nodes · ${metrics.longTasks} long tasks`);
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("\nPerformance check failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nPerformance budgets passed for all audited routes.");
}
