import { chromium } from "@playwright/test";

const baseUrl = process.env.COFFENDI_BASE_URL || "http://127.0.0.1:4173";
const checks = [
  { name: "desktop-home", path: "/", width: 1440, height: 1000, maxTransferKb: 700 },
  { name: "desktop-coffees", path: "/coffees", width: 1440, height: 1000, maxTransferKb: 650 },
  { name: "desktop-profile", path: "/coffees/ethiopia-washed", width: 1440, height: 1000, maxTransferKb: 600 },
  { name: "desktop-compare", path: "/compare", width: 1440, height: 1000, maxTransferKb: 350 },
  { name: "desktop-contact", path: "/contact", width: 1440, height: 1000, maxTransferKb: 350 },
  { name: "mobile-home", path: "/", width: 390, height: 844, deviceScaleFactor: 2, maxTransferKb: 750 },
];

const browser = await chromium.launch();
const failures = [];
for (const check of checks) {
  const context = await browser.newContext({ viewport: { width: check.width, height: check.height }, deviceScaleFactor: check.deviceScaleFactor || 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__siteVitals = { cls: 0, lcp: 0, longTasks: 0 };
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => { if (!entry.hadRecentInput) window.__siteVitals.cls += entry.value; })).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => { window.__siteVitals.lcp = list.getEntries().at(-1)?.startTime || 0; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => { window.__siteVitals.longTasks += list.getEntries().length; }).observe({ type: "longtask", buffered: true });
    } catch { /* Navigation and image metrics still provide coverage. */ }
  });
  await page.goto(`${baseUrl}${check.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const visibleImages = [...document.images].filter((image) => { const box = image.getBoundingClientRect(); return box.bottom >= 0 && box.top <= innerHeight; });
    return {
      dcl: Math.round(navigation?.domContentLoadedEventEnd || 0),
      load: Math.round(navigation?.loadEventEnd || 0),
      transferKb: Math.round(resources.reduce((total, resource) => total + (resource.transferSize || 0), 0) / 1024),
      domNodes: document.querySelectorAll("*").length,
      incompleteImages: visibleImages.filter((image) => !image.complete || image.naturalWidth === 0).length,
      cls: Number((window.__siteVitals.cls || 0).toFixed(3)),
      lcp: Math.round(window.__siteVitals.lcp || 0),
      longTasks: window.__siteVitals.longTasks || 0,
      thirdParty: [...new Set(resources.map((resource) => new URL(resource.name).origin).filter((origin) => origin !== location.origin))],
    };
  });
  if (errors.length) failures.push(`${check.name}: ${errors.join(" | ")}`);
  if (metrics.cls > 0.1) failures.push(`${check.name}: CLS ${metrics.cls} exceeds 0.1`);
  if (metrics.lcp > 2500) failures.push(`${check.name}: local LCP ${metrics.lcp}ms exceeds 2500ms`);
  if (metrics.transferKb > check.maxTransferKb) failures.push(`${check.name}: ${metrics.transferKb}KB exceeds ${check.maxTransferKb}KB`);
  if (metrics.domNodes > 1800) failures.push(`${check.name}: ${metrics.domNodes} DOM nodes exceeds 1800`);
  if (metrics.longTasks > 3) failures.push(`${check.name}: ${metrics.longTasks} long tasks exceeds 3`);
  if (metrics.incompleteImages) failures.push(`${check.name}: ${metrics.incompleteImages} visible images incomplete`);
  if (metrics.thirdParty.length) failures.push(`${check.name}: unexpected requests to ${metrics.thirdParty.join(", ")}`);
  console.log(`${check.name}: DCL ${metrics.dcl}ms · load ${metrics.load}ms · LCP ${metrics.lcp}ms · CLS ${metrics.cls} · ${metrics.transferKb}KB · ${metrics.domNodes} nodes`);
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
