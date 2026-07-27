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
const allOriginIsos = [
  "ET", "CO", "BR", "GT",
  ...originCatalogCountries.map(({ iso }) => iso),
];
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

assert(originCatalogMeta.sheetCount === 60, "Catalog metadata must declare 60 sheets");
assert(originCatalogMeta.countryCount === 22, "Catalog metadata must declare 22 PDF countries");
assert(originCatalogCountries.length === 22, "Generated catalog must contain 22 PDF countries");
const countryCatalogs = await Promise.all(originCatalogCountries.map(async (country) => {
  assert(country.dataUrl.startsWith("/catalog/data/"), `${country.slug}: invalid deferred catalog URL`);
  const payload = JSON.parse(await readFile(path.join(projectRoot, "public", country.dataUrl), "utf8"));
  assert(payload.countrySlug === country.slug, `${country.slug}: deferred country catalog mismatch`);
  assert(payload.revision === originCatalogMeta.revision, `${country.slug}: deferred catalog revision mismatch`);
  return { country, sheets: payload.sheets };
}));
const originCatalogSheets = countryCatalogs.flatMap(({ sheets }) => sheets);
assert(originCatalogSheets.length === 60, "Generated catalog must contain 60 sheets");
assert(new Set(originCatalogSheets.map(({ id }) => id)).size === 60, "Every sheet ID must be unique");
assert(new Set(originCatalogSheets.map(({ checksum }) => checksum)).size === 60, "Every canonical one-page PDF must have a unique checksum");
assert(new Set(allOriginIsos).size === 26, "Expanded Coffendi origins must contain 26 unique ISO codes");

const sourcePages = new Set();
for (const { country, sheets } of countryCatalogs) {
  assert(expectedCounts[country.slug] === country.sheetCount, `${country.slug}: unexpected sheet count`);
  assert(country.sheetCount === sheets.length, `${country.slug}: deferred sheet count mismatch`);
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

assert(sourcePages.size === 60, "Canonical source-page coverage must equal 60");
console.log("Origin catalog verification passed: 26 origins, 22 PDF countries, 60 canonical sheets, 120 previews, and 26 verified local flags.");
