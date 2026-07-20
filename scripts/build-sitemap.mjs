import { writeFileSync } from "node:fs";

const baseUrl = String(process.env.PUBLIC_STORE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const profiles = ["ethiopia-washed", "colombia-balanced", "brazil-classic", "guatemala-structured", "kenya-vivid", "rwanda-sweet"];
const routes = [
  ["/", "weekly", "1.0"],
  ["/coffees", "monthly", "0.9"],
  ...profiles.map((profile) => [`/coffees/${profile}`, "monthly", "0.8"]),
  ["/origins", "monthly", "0.8"],
  ["/compare", "monthly", "0.8"],
  ["/approach", "monthly", "0.7"],
  ["/contact", "monthly", "0.7"],
  ["/privacy", "yearly", "0.4"],
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(([path, changefreq, priority]) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

writeFileSync("public/sitemap.xml", sitemap);
console.log(`Wrote ${routes.length} sitemap URLs.`);
