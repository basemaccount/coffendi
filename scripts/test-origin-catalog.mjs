import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  originCatalogIndexUrl,
  originCatalogMeta,
} from "../src/originCatalog.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const originCatalogCountries = JSON.parse(
  await readFile(path.join(projectRoot, "public", originCatalogIndexUrl), "utf8"),
).countries;
const expectedCounts = {
  bolivia: 1,
  brazil: 9,
  burundi: 3,
  cameroon: 2,
  china: 2,
  colombia: 8,
  "costa-rica": 3,
  "cote-divoire": 1,
  "dominican-republic": 1,
  ecuador: 2,
  "el-salvador": 2,
  ethiopia: 8,
  guatemala: 4,
  haiti: 1,
  honduras: 3,
  india: 7,
  indonesia: 6,
  jamaica: 1,
  kenya: 6,
  laos: 3,
  madagascar: 1,
  malawi: 1,
  mexico: 4,
  nicaragua: 3,
  panama: 2,
  "papua-new-guinea": 7,
  peru: 1,
  philippines: 2,
  rwanda: 1,
  tanzania: 3,
  thailand: 2,
  "timor-leste": 2,
  togo: 1,
  uganda: 5,
  vietnam: 6,
  yemen: 1,
  zambia: 1,
  zimbabwe: 1,
};

const sourceRange = (document, start, end = start) => Array.from(
  { length: end - start + 1 },
  (_, index) => `${document}:${start + index}`,
);

const expectedSourcePages = {
  bolivia: sourceRange("v5 p1.pdf", 1),
  brazil: sourceRange("v5 p1.pdf", 2, 10),
  burundi: sourceRange("v5 p1.pdf", 11, 13),
  cameroon: sourceRange("v5 p1.pdf", 14, 15),
  china: sourceRange("v5 p1.pdf", 16, 17),
  colombia: sourceRange("v5 p1.pdf", 18, 25),
  "costa-rica": sourceRange("v5 p1.pdf", 26, 28),
  "cote-divoire": sourceRange("v5 p1.pdf", 29),
  "dominican-republic": sourceRange("v5 p1.pdf", 30),
  ecuador: sourceRange("v5 p1.pdf", 31, 32),
  "el-salvador": sourceRange("v5 p1.pdf", 33, 34),
  ethiopia: sourceRange("v5 p1.pdf", 35, 42),
  guatemala: sourceRange("v5 p1.pdf", 43, 46),
  haiti: sourceRange("v5 p1.pdf", 47),
  honduras: sourceRange("v5 p1.pdf", 48, 50),
  india: [
    ...sourceRange("v5 p1.pdf", 51, 56),
    ...sourceRange("v5 p2.pdf", 1),
  ],
  indonesia: sourceRange("MAKENDI 117.pptx.pdf", 1, 6),
  jamaica: sourceRange("MAKENDI 1.2.pdf", 1),
  kenya: sourceRange("MAKENDI 1.2.pdf", 2, 7),
  laos: sourceRange("MAKENDI 1.2.pdf", 8, 10),
  madagascar: sourceRange("MAKENDI 1.2.pdf", 11),
  malawi: sourceRange("MAKENDI 1.2.pdf", 12),
  mexico: sourceRange("MAKENDI 1.2.pdf", 13, 16),
  nicaragua: sourceRange("MAKENDI 1.2.pdf", 17, 19),
  panama: sourceRange("MAKENDI 1.2.pdf", 20, 21),
  "papua-new-guinea": sourceRange("MAKENDI 1.2.pdf", 22, 28),
  peru: sourceRange("MAKENDI 1.2.pdf", 29),
  philippines: sourceRange("MAKENDI 1.2.pdf", 30, 31),
  rwanda: sourceRange("MAKENDI 1.2.pdf", 32),
  tanzania: sourceRange("MAKENDI 1.2.pdf", 33, 35),
  thailand: sourceRange("MAKENDI 1.2.pdf", 36, 37),
  "timor-leste": sourceRange("MAKENDI 1.2.pdf", 38, 39),
  togo: sourceRange("MAKENDI 1.2.pdf", 40),
  uganda: sourceRange("MAKENDI 1.2.pdf", 41, 45),
  vietnam: sourceRange("MAKENDI 1.2.pdf", 46, 51),
  yemen: sourceRange("MAKENDI 1.2.pdf", 52),
  zambia: sourceRange("MAKENDI 1.2.pdf", 53),
  zimbabwe: sourceRange("MAKENDI 1.2.pdf", 54),
};
const allOriginIsos = originCatalogCountries.map(({ iso }) => iso);
const requiredFields = [
  "id",
  "countrySlug",
  "country",
  "type",
  "grade",
  "defects",
  "flavor",
  "aroma",
  "body",
  "acidity",
  "process",
  "screen",
  "moisture",
  "packing",
  "thumbnail",
  "preview",
  "pdfUrl",
  "downloadUrl",
  "sourceDocument",
  "sourcePage",
  "revision",
  "language",
  "checksum",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(originCatalogMeta.sheetCount === 117, "Catalog metadata must declare 117 sheets");
assert(originCatalogMeta.countryCount === 38, "Catalog metadata must declare 38 PDF countries");
assert(originCatalogMeta.exportedPageCount === 117, "Catalog metadata must account for all 117 unique pages");
assert(originCatalogCountries.length === 38, "Generated catalog must contain 38 PDF countries");
const countryCatalogs = await Promise.all(originCatalogCountries.map(async (country) => {
  assert(country.dataUrl.startsWith("/catalog/data/"), `${country.slug}: invalid deferred catalog URL`);
  const payload = JSON.parse(await readFile(path.join(projectRoot, "public", country.dataUrl), "utf8"));
  assert(payload.countrySlug === country.slug, `${country.slug}: deferred country catalog mismatch`);
  assert(payload.revision === originCatalogMeta.revision, `${country.slug}: deferred catalog revision mismatch`);
  return { country, sheets: payload.sheets };
}));
const originCatalogSheets = countryCatalogs.flatMap(({ sheets }) => sheets);
assert(originCatalogSheets.length === 117, "Generated catalog must contain 117 sheets");
assert(new Set(originCatalogSheets.map(({ id }) => id)).size === 117, "Every sheet ID must be unique");
assert(new Set(originCatalogSheets.map(({ checksum }) => checksum)).size === 117, "Every canonical one-page PDF must have a unique checksum");
assert(new Set(allOriginIsos).size === 38, "Expanded Coffendi origins must contain 38 unique ISO codes");

const sourcePages = new Set();
for (const { country, sheets } of countryCatalogs) {
  assert(expectedCounts[country.slug] === country.sheetCount, `${country.slug}: unexpected sheet count`);
  assert(country.sheetCount === sheets.length, `${country.slug}: deferred sheet count mismatch`);
  assert(
    JSON.stringify(sheets.map(({ sourceDocument, sourcePage }) => `${sourceDocument}:${sourcePage}`)) === JSON.stringify(expectedSourcePages[country.slug]),
    `${country.slug}: source pages are missing, mixed, or out of order`,
  );
  assert(country.websiteProfile.directions.length === sheets.length, `${country.slug}: deferred profile directions are incomplete`);
  assert(country.websiteProfile.catalogDataUrl === country.dataUrl, `${country.slug}: website profile catalog relationship mismatch`);
  assert(country.firstSheet.id === sheets[0].id, `${country.slug}: lightweight hero sheet mismatch`);
  assert(country.bundleUrl.startsWith("/api/catalog-document?path="), `${country.slug}: bundle must use private delivery endpoint`);
  assert(country.bundleDownloadUrl.includes("download=1"), `${country.slug}: bundle download URL missing`);
  assert(country.map.x >= 0 && country.map.x <= 100, `${country.slug}: projected x is outside map`);
  assert(country.map.y >= 0 && country.map.y <= 100, `${country.slug}: projected y is outside map`);

  for (const sheet of sheets) {
    for (const field of requiredFields) {
      assert(sheet[field] !== undefined && sheet[field] !== "", `${sheet.id}: missing ${field}`);
    }
    assert(sheet.countrySlug === country.slug, `${sheet.id}: country relationship mismatch`);
    assert(sheet.pdfUrl.startsWith("/api/catalog-document?path="), `${sheet.id}: PDF must use private delivery endpoint`);
    assert(sheet.downloadUrl.includes("download=1"), `${sheet.id}: download URL missing`);
    assert(sheet.language === "en", `${sheet.id}: unreviewed translation entered source documents`);
    assert(/^[a-f0-9]{64}$/.test(sheet.checksum), `${sheet.id}: invalid checksum`);

    const sourcePage = `${sheet.sourceDocument}:${sheet.sourcePage}`;
    assert(!sourcePages.has(sourcePage), `${sheet.id}: duplicate canonical source page ${sourcePage}`);
    sourcePages.add(sourcePage);

    for (const preview of [sheet.thumbnail, sheet.preview]) {
      assert(preview.startsWith("/catalog/previews/"), `${sheet.id}: invalid preview path`);
      await access(path.join(projectRoot, "public", preview));
    }
  }
}

for (const iso of allOriginIsos) {
  const flagPath = path.join(projectRoot, "public", "images", "flags", `${iso.toLowerCase()}.svg`);
  const artwork = await readFile(flagPath, "utf8");
  assert(artwork.includes("<svg"), `${iso}: local flag is not valid SVG artwork`);
  assert(!/<script/i.test(artwork), `${iso}: local flag contains script content`);
}

assert(sourcePages.size === 117, "Canonical source-page coverage must equal 117");
console.log("Origin catalog verification passed: 38 origins, 117 canonical sheets, 234 previews, and 38 verified local flags.");
