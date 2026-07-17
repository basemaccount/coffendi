import { writeFileSync } from "node:fs";
import { products } from "../src/storefrontData.js";

const baseUrl = String(process.env.PUBLIC_STORE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");

const routes = [
  ["/", "weekly", "1.0"],
  ["/shop", "weekly", "0.95"],
  ...products.map((product) => [`/products/${product.id}`, "monthly", "0.9"]),
  ["/bulk", "monthly", "0.85"],
  ["/learn", "monthly", "0.75"],
  ["/sustainability", "monthly", "0.75"],
  ["/contact", "monthly", "0.7"],
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
