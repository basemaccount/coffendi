import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topologyPath = path.join(projectRoot, "node_modules", "world-atlas", "countries-110m.json");
const topology = JSON.parse(await readFile(topologyPath, "utf8"));
const land = feature(topology, topology.objects.land);
const boundaries = mesh(topology, topology.objects.countries, (a, b) => a !== b);
const projection = geoNaturalEarth1().fitExtent([[20, 18], [980, 502]], { type: "Sphere" });
const draw = geoPath(projection).digits(0);

const artwork = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520">',
  '<path d="', draw({ type: "Sphere" }), '" fill="none" stroke="#dfe8e3" stroke-opacity=".16" stroke-width="1.2"/>',
  '<path d="', draw(land), '" fill="#dfe8e3" fill-opacity=".125" stroke="#dfe8e3" stroke-opacity=".3" stroke-width="1.15"/>',
  '<path d="', draw(boundaries), '" fill="none" stroke="#dfe8e3" stroke-opacity=".17" stroke-width=".55"/>',
  "</svg>",
].join("");

const destination = path.join(projectRoot, "public", "images", "maps");
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, "coffee-world.svg"), artwork);

const representativeOrigins = {
  ET: [38.4, 6.2],
  CO: [-75.5, 2.8],
  BR: [-46, -19.5],
  GT: [-91, 15.2],
  KE: [37, -0.3],
  RW: [29.7, -1.7],
  ID: [117, -2],
  JM: [-77.3, 18.1],
  LA: [102.6, 19],
  MG: [46.8, -19],
  MW: [34.3, -13.3],
  MX: [-102, 23],
  NI: [-85.2, 12.8],
  PA: [-80, 8.6],
  PG: [145.5, -6.3],
  PE: [-75.3, -9.2],
  PH: [122.5, 12],
  TZ: [35, -6],
  TH: [100.8, 15.8],
  TL: [125.7, -8.8],
  TG: [1, 8],
  UG: [32.3, 1.3],
  VN: [107.8, 15.8],
  YE: [44.2, 15.4],
  ZM: [27.8, -13.1],
  ZW: [29.8, -18.9],
};

for (const [iso, coordinates] of Object.entries(representativeOrigins)) {
  const [x, y] = projection(coordinates);
  console.log(`${iso}: x ${Number((x / 10).toFixed(1))}, y ${Number((y / 5.2).toFixed(1))}`);
}
console.log(`Generated public/images/maps/coffee-world.svg (${Buffer.byteLength(artwork)} bytes)`);
