import { writeFileSync } from "node:fs";
import { coffees } from "../src/data.js";
import { makendiSearchIndex } from "../src/makendiSummary.js";

const baseUrl = "https://coffendi.vercel.app";

const routes = [
  ["/", "weekly", "1.0"],
  ["/sourcing", "weekly", "0.95"],
  ["/coffees", "daily", "0.9"],
  ...coffees.map((coffee) => [`/coffees/${coffee.id}`, "weekly", "0.8"]),
  ["/atlas", "weekly", "0.9"],
  ...makendiSearchIndex.map((grade) => [`/atlas/${grade.id}`, "monthly", "0.65"]),
  ["/origins", "weekly", "0.8"],
  ["/availability", "daily", "0.9"],
  ["/sustainability", "monthly", "0.7"],
  ["/roasters", "monthly", "0.8"],
  ["/stories", "weekly", "0.7"],
  ["/quality", "monthly", "0.7"],
  ["/contact", "monthly", "0.6"],
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ([path, changefreq, priority]) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync("public/sitemap.xml", sitemap);
console.log(`Wrote ${routes.length} sitemap URLs.`);
