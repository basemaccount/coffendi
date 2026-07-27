import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { put } from "@vercel/blob";
import { geoNaturalEarth1 } from "d3-geo";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot =
  process.env.COFFENDI_CATALOG_SOURCE_ROOT ||
  "/mnt/c/Users/progr/Downloads";
const workRoot = path.join(projectRoot, ".catalog-work");
const previewRoot = path.join(projectRoot, "public", "catalog", "previews");
const catalogDataRoot = path.join(projectRoot, "public", "catalog", "data");
const outputDataFile = path.join(projectRoot, "src", "originCatalog.js");
const uploadDocuments = process.env.UPLOAD_ORIGIN_BLOBS === "1";
const reuseUploadedDocuments = process.env.REUSE_ORIGIN_BLOBS === "1";
const catalogRevision = "2026-07-27-full";
const catalogRevisionDate = new Date("2026-07-27T00:00:00.000Z");

const sources = {
  p1: {
    label: "v5 p1.pdf",
    path: path.join(sourceRoot, "v5 p1.pdf"),
  },
  p2India: {
    label: "v5 p2.pdf",
    path: path.join(sourceRoot, "v5 p2.pdf"),
  },
  indonesia: {
    label: "MAKENDI 117.pptx.pdf",
    path: path.join(sourceRoot, "Documents", "MAKENDI 117.pptx.pdf"),
  },
  catalog: {
    label: "MAKENDI 1.2.pdf",
    path: path.join(sourceRoot, "Documents", "MAKENDI 1.2.pdf"),
  },
};

const pageRange = (start, end) => Array.from(
  { length: end - start + 1 },
  (_, index) => start + index,
);

const countries = [
  {
    slug: "bolivia",
    country: "Bolivia",
    countryTr: "Bolivya",
    iso: "BO",
    emoji: "🇧🇴",
    zone: "latin-america",
    coordinates: [-64.7, -16.3],
    regions: "Caranavi",
    source: "p1",
    pages: [1],
  },
  {
    slug: "brazil",
    profileId: "brazil-classic",
    country: "Brazil",
    countryTr: "Brezilya",
    iso: "BR",
    emoji: "🇧🇷",
    zone: "latin-america",
    coordinates: [-52, -10],
    regions: "Santos · Sul de Minas · Cerrado Mineiro · Mogiana · Espírito Santo",
    source: "p1",
    pages: pageRange(2, 10),
  },
  {
    slug: "burundi",
    country: "Burundi",
    countryTr: "Burundi",
    iso: "BI",
    emoji: "🇧🇮",
    zone: "africa",
    coordinates: [29.9, -3.4],
    regions: "Kayanza · Regional blends",
    source: "p1",
    pages: pageRange(11, 13),
  },
  {
    slug: "cameroon",
    country: "Cameroon",
    countryTr: "Kamerun",
    iso: "CM",
    emoji: "🇨🇲",
    zone: "africa",
    coordinates: [12.4, 5.7],
    regions: "Western Highlands · Regional lots",
    source: "p1",
    pages: pageRange(14, 15),
  },
  {
    slug: "china",
    country: "China",
    countryTr: "Çin",
    iso: "CN",
    emoji: "🇨🇳",
    zone: "asia",
    coordinates: [103.8, 35],
    regions: "Yunnan · Pu’er",
    source: "p1",
    pages: pageRange(16, 17),
  },
  {
    slug: "colombia",
    profileId: "colombia-balanced",
    country: "Colombia",
    countryTr: "Kolombiya",
    iso: "CO",
    emoji: "🇨🇴",
    zone: "latin-america",
    coordinates: [-73.5, 4.5],
    regions: "Medellín · Tolima · Huila · Regional lots",
    source: "p1",
    pages: pageRange(18, 25),
  },
  {
    slug: "costa-rica",
    country: "Costa Rica",
    countryTr: "Kosta Rika",
    iso: "CR",
    emoji: "🇨🇷",
    zone: "latin-america",
    coordinates: [-84, 9.8],
    regions: "Tarrazú · Central Valley · Tres Ríos",
    source: "p1",
    pages: pageRange(26, 28),
  },
  {
    slug: "cote-divoire",
    sourceCountry: "Côte d'Ivoire",
    country: "Côte d’Ivoire",
    countryTr: "Fildişi Sahili",
    iso: "CI",
    emoji: "🇨🇮",
    zone: "africa",
    coordinates: [-5.5, 7.6],
    regions: "Regional lots",
    source: "p1",
    pages: [29],
  },
  {
    slug: "dominican-republic",
    sourceCountry: "Dominican Rep.",
    country: "Dominican Republic",
    countryTr: "Dominik Cumhuriyeti",
    iso: "DO",
    emoji: "🇩🇴",
    zone: "latin-america",
    coordinates: [-70.2, 18.8],
    regions: "Barahona",
    source: "p1",
    pages: [30],
  },
  {
    slug: "ecuador",
    country: "Ecuador",
    countryTr: "Ekvador",
    iso: "EC",
    emoji: "🇪🇨",
    zone: "latin-america",
    coordinates: [-78.2, -1.4],
    regions: "Loja · Napo · Sucumbíos",
    source: "p1",
    pages: pageRange(31, 32),
  },
  {
    slug: "el-salvador",
    country: "El Salvador",
    countryTr: "El Salvador",
    iso: "SV",
    emoji: "🇸🇻",
    zone: "latin-america",
    coordinates: [-88.9, 13.7],
    regions: "Santa Ana · Regional lots",
    source: "p1",
    pages: pageRange(33, 34),
  },
  {
    slug: "ethiopia",
    profileId: "ethiopia-washed",
    country: "Ethiopia",
    countryTr: "Etiyopya",
    iso: "ET",
    emoji: "🇪🇹",
    zone: "africa",
    coordinates: [40, 9],
    regions: "Yirgacheffe · Sidamo · Guji · Harrar · Djimmah · Limu",
    source: "p1",
    pages: pageRange(35, 42),
  },
  {
    slug: "guatemala",
    profileId: "guatemala-structured",
    country: "Guatemala",
    countryTr: "Guatemala",
    iso: "GT",
    emoji: "🇬🇹",
    zone: "latin-america",
    coordinates: [-90.3, 15.7],
    regions: "Huehuetenango · Antigua",
    source: "p1",
    pages: pageRange(43, 46),
  },
  {
    slug: "haiti",
    country: "Haiti",
    countryTr: "Haiti",
    iso: "HT",
    emoji: "🇭🇹",
    zone: "latin-america",
    coordinates: [-72.3, 19],
    regions: "Regional lots",
    source: "p1",
    pages: [47],
  },
  {
    slug: "honduras",
    country: "Honduras",
    countryTr: "Honduras",
    iso: "HN",
    emoji: "🇭🇳",
    zone: "latin-america",
    coordinates: [-86.5, 14.8],
    regions: "Copán · Regional lots",
    source: "p1",
    pages: pageRange(48, 50),
  },
  {
    slug: "india",
    country: "India",
    countryTr: "Hindistan",
    iso: "IN",
    emoji: "🇮🇳",
    zone: "asia",
    coordinates: [78, 22],
    regions: "Mysore · Malabar · Regional estates",
    segments: [
      { source: "p1", pages: pageRange(51, 56) },
      { source: "p2India", pages: [1] },
    ],
  },
  {
    slug: "indonesia",
    country: "Indonesia",
    countryTr: "Endonezya",
    iso: "ID",
    emoji: "🇮🇩",
    zone: "asia",
    coordinates: [117, -2],
    regions: "Sumatra · Sulawesi · Bali · Java",
    source: "indonesia",
    pages: pageRange(1, 6),
  },
  {
    slug: "jamaica",
    country: "Jamaica",
    countryTr: "Jamaika",
    iso: "JM",
    emoji: "🇯🇲",
    zone: "latin-america",
    coordinates: [-77.3, 18.1],
    regions: "Blue Mountain · Wallenford",
    source: "catalog",
    pages: [1],
  },
  {
    slug: "kenya",
    profileId: "kenya-vivid",
    country: "Kenya",
    countryTr: "Kenya",
    iso: "KE",
    emoji: "🇰🇪",
    zone: "africa",
    coordinates: [37, -0.3],
    regions: "Central Highlands · Rift Valley",
    source: "catalog",
    pages: pageRange(2, 7),
  },
  {
    slug: "laos",
    country: "Laos",
    countryTr: "Laos",
    iso: "LA",
    emoji: "🇱🇦",
    zone: "asia",
    coordinates: [102.6, 19],
    regions: "Bolaven Plateau · Champasak",
    source: "catalog",
    pages: pageRange(8, 10),
  },
  {
    slug: "madagascar",
    country: "Madagascar",
    countryTr: "Madagaskar",
    iso: "MG",
    emoji: "🇲🇬",
    zone: "africa",
    coordinates: [46.8, -19],
    regions: "East Coast",
    source: "catalog",
    pages: [11],
  },
  {
    slug: "malawi",
    country: "Malawi",
    countryTr: "Malavi",
    iso: "MW",
    emoji: "🇲🇼",
    zone: "africa",
    coordinates: [34.3, -13.3],
    regions: "Misuku Hills · Pamwamba",
    source: "catalog",
    pages: [12],
  },
  {
    slug: "mexico",
    country: "Mexico",
    countryTr: "Meksika",
    iso: "MX",
    emoji: "🇲🇽",
    zone: "latin-america",
    coordinates: [-102, 23],
    regions: "Puebla · Chiapas · Oaxaca · Veracruz",
    source: "catalog",
    pages: pageRange(13, 16),
  },
  {
    slug: "nicaragua",
    country: "Nicaragua",
    countryTr: "Nikaragua",
    iso: "NI",
    emoji: "🇳🇮",
    zone: "latin-america",
    coordinates: [-85.2, 12.8],
    regions: "Jinotega · Matagalpa",
    source: "catalog",
    pages: pageRange(17, 19),
  },
  {
    slug: "panama",
    country: "Panama",
    countryTr: "Panama",
    iso: "PA",
    emoji: "🇵🇦",
    zone: "latin-america",
    coordinates: [-80, 8.6],
    regions: "Boquete",
    source: "catalog",
    pages: pageRange(20, 21),
  },
  {
    slug: "papua-new-guinea",
    sourceCountry: "Papua N.G.",
    country: "Papua New Guinea",
    countryTr: "Papua Yeni Gine",
    iso: "PG",
    emoji: "🇵🇬",
    zone: "pacific",
    coordinates: [145.5, -6.3],
    regions: "Highlands · Morobe · Kimel · Sigri",
    source: "catalog",
    pages: pageRange(22, 28),
  },
  {
    slug: "peru",
    country: "Peru",
    countryTr: "Peru",
    iso: "PE",
    emoji: "🇵🇪",
    zone: "latin-america",
    coordinates: [-75.3, -9.2],
    regions: "Smallholder regional lots",
    source: "catalog",
    pages: [29],
  },
  {
    slug: "philippines",
    country: "Philippines",
    countryTr: "Filipinler",
    iso: "PH",
    emoji: "🇵🇭",
    zone: "asia",
    coordinates: [122.5, 12],
    regions: "Mindanao · Batangas",
    source: "catalog",
    pages: pageRange(30, 31),
  },
  {
    slug: "rwanda",
    profileId: "rwanda-sweet",
    country: "Rwanda",
    countryTr: "Ruanda",
    iso: "RW",
    emoji: "🇷🇼",
    zone: "africa",
    coordinates: [29.7, -1.7],
    regions: "Karongi · Gakenke",
    source: "catalog",
    pages: [32],
  },
  {
    slug: "tanzania",
    country: "Tanzania",
    countryTr: "Tanzanya",
    iso: "TZ",
    emoji: "🇹🇿",
    zone: "africa",
    coordinates: [35, -6],
    regions: "Kilimanjaro · Mbeya · Bukoba",
    source: "catalog",
    pages: pageRange(33, 35),
  },
  {
    slug: "thailand",
    country: "Thailand",
    countryTr: "Tayland",
    iso: "TH",
    emoji: "🇹🇭",
    zone: "asia",
    coordinates: [100.8, 15.8],
    regions: "Chiang Mai · Doi Chang · Chumphon",
    source: "catalog",
    pages: pageRange(36, 37),
  },
  {
    slug: "timor-leste",
    country: "Timor-Leste",
    countryTr: "Doğu Timor",
    iso: "TL",
    emoji: "🇹🇱",
    zone: "asia",
    coordinates: [125.7, -8.8],
    regions: "Ermera · Regional lots",
    source: "catalog",
    pages: pageRange(38, 39),
  },
  {
    slug: "togo",
    country: "Togo",
    countryTr: "Togo",
    iso: "TG",
    emoji: "🇹🇬",
    zone: "africa",
    coordinates: [1, 8],
    regions: "Regional lots",
    source: "catalog",
    pages: [40],
  },
  {
    slug: "uganda",
    country: "Uganda",
    countryTr: "Uganda",
    iso: "UG",
    emoji: "🇺🇬",
    zone: "africa",
    coordinates: [32.3, 1.3],
    regions: "Kaweri · Western Uganda",
    source: "catalog",
    pages: pageRange(41, 45),
  },
  {
    slug: "vietnam",
    country: "Vietnam",
    countryTr: "Vietnam",
    iso: "VN",
    emoji: "🇻🇳",
    zone: "asia",
    coordinates: [107.8, 15.8],
    regions: "Da Lat · Son La · Regional lots",
    source: "catalog",
    pages: pageRange(46, 51),
  },
  {
    slug: "yemen",
    country: "Yemen",
    countryTr: "Yemen",
    iso: "YE",
    emoji: "🇾🇪",
    zone: "middle-east",
    coordinates: [44.2, 15.4],
    regions: "Mattari · Sanani",
    source: "catalog",
    pages: [52],
  },
  {
    slug: "zambia",
    country: "Zambia",
    countryTr: "Zambiya",
    iso: "ZM",
    emoji: "🇿🇲",
    zone: "africa",
    coordinates: [27.8, -13.1],
    regions: "Northern Province",
    source: "catalog",
    pages: [53],
  },
  {
    slug: "zimbabwe",
    country: "Zimbabwe",
    countryTr: "Zimbabve",
    iso: "ZW",
    emoji: "🇿🇼",
    zone: "africa",
    coordinates: [29.8, -18.9],
    regions: "Calveley Estate",
    source: "catalog",
    pages: [54],
  },
];

const pinOverrides = {
  ET: [62, 44],
  KE: [63, 49],
  RW: [54.5, 51],
  UG: [56, 47],
  TZ: [62, 54],
  MW: [61, 57.5],
  ZM: [54, 57],
  ZW: [55, 63],
  MG: [64, 61],
  GT: [25, 41],
  NI: [27, 44],
  PA: [31, 45],
  CO: [33, 48],
  JM: [31, 37.5],
  LA: [72.5, 37],
  TH: [75, 43],
  VN: [79, 39],
  PH: [83, 42],
  ID: [80, 50],
  TL: [83, 56],
  PG: [88, 53],
};

const fieldLabels = [
  "ORIGIN",
  "TYPE",
  "GRADE",
  "DEFECTS",
  "FLAVOR",
  "AROMA",
  "BODY",
  "ACIDITY",
  "PROCESS",
  "SCREEN",
  "MOISTURE",
  "PACKING",
];

const projection = geoNaturalEarth1().fitExtent([[20, 18], [980, 502]], { type: "Sphere" });

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeParts(items) {
  const parts = items
    .map((item) => String(item.str || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts
    .filter((item, index) => !(item === "PROFILE" && parts[index - 1] === "FLAVOR"))
    .map((item) => ({
      "COFFEE TYPE": "TYPE",
      PROCESSING: "PROCESS",
      "SCREEN SIZE": "SCREEN",
    })[item] || item);
}

function valuesBetween(parts, startIndex, startLabel, endLabel) {
  const start = parts.indexOf(startLabel, startIndex);
  if (start < 0) throw new Error(`Missing ${startLabel}`);
  const end = endLabel ? parts.indexOf(endLabel, start + 1) : start + 2;
  if (end < 0) throw new Error(`Missing ${endLabel} after ${startLabel}`);
  return parts.slice(start + 1, end).join(" ").replace(/\s+/g, " ").trim();
}

function listBetween(parts, startLabel, endLabel) {
  const start = parts.indexOf(startLabel);
  const end = parts.indexOf(endLabel, start + 1);
  if (start < 0 || end < 0) return [];
  return parts
    .slice(start + 1, end)
    .map((item) => item.trim())
    .filter((item) => item && item !== "✓" && !/^[|]+$/.test(item));
}

async function extractSheet(pdf, pageNumber, expectedCountry) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const parts = normalizeParts(content.items);
  const specificationsIndex = parts.indexOf("SPECIFICATIONS");
  if (specificationsIndex < 0) throw new Error(`Page ${pageNumber}: missing specifications`);

  const specifications = {};
  fieldLabels.forEach((label, index) => {
    specifications[label.toLowerCase()] = valuesBetween(
      parts,
      specificationsIndex,
      label,
      fieldLabels[index + 1],
    );
  });

  if (specifications.origin !== expectedCountry) {
    throw new Error(
      `Page ${pageNumber}: expected ${expectedCountry}, found ${specifications.origin}`,
    );
  }

  return {
    page,
    specifications,
    tastingNotes: listBetween(parts, "TASTING NOTES", "PERFECT FOR"),
    perfectFor: listBetween(parts, "PERFECT FOR", "WHY CHOOSE THIS COFFEE?"),
  };
}

async function renderPage(page, targetWidth, quality) {
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.encode("webp", quality);
}

async function uploadPdf(pathname, bytes) {
  if (!uploadDocuments && !reuseUploadedDocuments) return null;
  if (reuseUploadedDocuments) {
    return {
      pathname,
      url: `/api/catalog-document?path=${encodeURIComponent(pathname)}`,
      downloadUrl: `/api/catalog-document?path=${encodeURIComponent(pathname)}&download=1`,
    };
  }
  const result = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31_536_000,
    contentType: "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return {
    pathname: result.pathname,
    url: `/api/catalog-document?path=${encodeURIComponent(result.pathname)}`,
    downloadUrl: `/api/catalog-document?path=${encodeURIComponent(result.pathname)}&download=1`,
  };
}

function processFamily(processes) {
  const values = processes.map((value) => value.toLowerCase());
  if (values.every((value) => value.includes("washed") && !value.includes("natural"))) {
    return "washed";
  }
  if (values.every((value) => value.includes("natural") && !value.includes("washed"))) {
    return "natural";
  }
  return "mixed";
}

async function main() {
  if (uploadDocuments && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("UPLOAD_ORIGIN_BLOBS=1 requires BLOB_READ_WRITE_TOKEN");
  }

  await rm(workRoot, { recursive: true, force: true });
  await rm(previewRoot, { recursive: true, force: true });
  await mkdir(workRoot, { recursive: true });
  await mkdir(previewRoot, { recursive: true });

  const sourceDocuments = {};
  for (const [key, source] of Object.entries(sources)) {
    const bytes = await readFile(source.path);
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true });
    sourceDocuments[key] = {
      bytes,
      pdf: await task.promise,
      pdfLib: await PDFDocument.load(bytes),
      task,
      label: source.label,
    };
  }

  const generatedCountries = [];
  const sourcePageKeys = new Set();

  for (const country of countries) {
    const pageReferences = (country.segments || [{ source: country.source, pages: country.pages }])
      .flatMap((segment) => segment.pages.map((pageNumber) => ({
        sourceKey: segment.source,
        pageNumber,
      })));
    const expectedCountry = country.sourceCountry || country.country;
    const sheets = [];
    const countryPdf = await PDFDocument.create();
    for (const reference of pageReferences) {
      const source = sourceDocuments[reference.sourceKey];
      const [bundlePage] = await countryPdf.copyPages(
        source.pdfLib,
        [reference.pageNumber - 1],
      );
      countryPdf.addPage(bundlePage);
    }

    for (const { sourceKey, pageNumber } of pageReferences) {
      const source = sourceDocuments[sourceKey];
      const sourcePageKey = `${sourceKey}:${pageNumber}`;
      if (sourcePageKeys.has(sourcePageKey)) throw new Error(`Duplicate source page ${sourcePageKey}`);
      sourcePageKeys.add(sourcePageKey);

      const extracted = await extractSheet(source.pdf, pageNumber, expectedCountry);
      const onePagePdf = await PDFDocument.create();
      const [copiedPage] = await onePagePdf.copyPages(source.pdfLib, [pageNumber - 1]);
      onePagePdf.addPage(copiedPage);
      onePagePdf.setTitle(`${country.country} — ${extracted.specifications.grade}`);
      onePagePdf.setSubject("Coffendi green coffee reference sheet");
      onePagePdf.setLanguage("en");
      onePagePdf.setCreator("Coffendi");
      onePagePdf.setProducer("Coffendi origin catalog importer");
      onePagePdf.setCreationDate(catalogRevisionDate);
      onePagePdf.setModificationDate(catalogRevisionDate);
      const pdfBytes = Buffer.from(await onePagePdf.save({ useObjectStreams: true }));
      const hash = createHash("sha256").update(pdfBytes).digest("hex");
      const id = `${country.slug}-${slugify(extracted.specifications.grade)}`;
      const versionedName = `${id}-${hash.slice(0, 10)}`;
      const countryPreviewRoot = path.join(previewRoot, country.slug);
      await mkdir(countryPreviewRoot, { recursive: true });

      const [thumbnail, preview] = await Promise.all([
        renderPage(extracted.page, 360, 72),
        renderPage(extracted.page, 1080, 80),
      ]);
      const thumbnailFile = `${versionedName}-360.webp`;
      const previewFile = `${versionedName}-1080.webp`;
      await Promise.all([
        writeFile(path.join(countryPreviewRoot, thumbnailFile), thumbnail),
        writeFile(path.join(countryPreviewRoot, previewFile), preview),
        writeFile(path.join(workRoot, `${versionedName}.pdf`), pdfBytes),
      ]);

      const remote = await uploadPdf(
        `coffendi/origins/${catalogRevision}/${country.slug}/${versionedName}.pdf`,
        pdfBytes,
      );
      const pdfUrl = remote?.url || `/catalog/documents/${country.slug}/${versionedName}.pdf`;
      const downloadUrl = remote?.downloadUrl || `${pdfUrl}?download=1`;

      sheets.push({
        id,
        countrySlug: country.slug,
        country: country.country,
        type: extracted.specifications.type,
        grade: extracted.specifications.grade,
        defects: extracted.specifications.defects,
        flavor: extracted.specifications.flavor,
        aroma: extracted.specifications.aroma,
        body: extracted.specifications.body,
        acidity: extracted.specifications.acidity,
        process: extracted.specifications.process,
        screen: extracted.specifications.screen,
        moisture: extracted.specifications.moisture,
        packing: extracted.specifications.packing,
        tastingNotes: extracted.tastingNotes,
        perfectFor: extracted.perfectFor,
        thumbnail: `/catalog/previews/${country.slug}/${thumbnailFile}`,
        preview: `/catalog/previews/${country.slug}/${previewFile}`,
        pdfUrl,
        downloadUrl,
        sourceDocument: source.label,
        sourcePage: pageNumber,
        revision: catalogRevision,
        language: "en",
        checksum: hash,
      });
      process.stdout.write(`Sheet ${sheets.length}/${pageReferences.length}: ${country.country} — ${extracted.specifications.grade}\n`);
    }

    countryPdf.setTitle(`${country.country} — Coffendi green coffee catalogue`);
    countryPdf.setSubject("Coffendi country reference-sheet collection");
    countryPdf.setLanguage("en");
    countryPdf.setCreator("Coffendi");
    countryPdf.setProducer("Coffendi origin catalog importer");
    countryPdf.setCreationDate(catalogRevisionDate);
    countryPdf.setModificationDate(catalogRevisionDate);
    const bundleBytes = Buffer.from(await countryPdf.save({ useObjectStreams: true }));
    const bundleHash = createHash("sha256").update(bundleBytes).digest("hex");
    const bundleRemote = await uploadPdf(
      `coffendi/origins/${catalogRevision}/${country.slug}/${country.slug}-catalog-${bundleHash.slice(0, 10)}.pdf`,
      bundleBytes,
    );
    const [projectedX, projectedY] = projection(country.coordinates);
    const map = {
      x: Number((projectedX / 10).toFixed(1)),
      y: Number((projectedY / 5.2).toFixed(1)),
    };
    const override = pinOverrides[country.iso];
    const types = [...new Set(sheets.map((sheet) => sheet.type))];
    const processes = [...new Set(sheets.map((sheet) => sheet.process))];
    const flavors = [...new Set(sheets.flatMap((sheet) => sheet.tastingNotes))].slice(0, 6);

    generatedCountries.push({
      slug: country.slug,
      profileId: country.profileId || `${country.slug}-catalog`,
      iso: country.iso,
      emoji: country.emoji,
      zone: country.zone,
      coordinates: country.coordinates,
      map,
      pin: override ? { x: override[0], y: override[1] } : map,
      country: { en: country.country, tr: country.countryTr },
      regions: country.regions,
      types,
      processes,
      flavors,
      processFamily: processFamily(processes),
      bundleUrl: bundleRemote?.url || "",
      bundleDownloadUrl: bundleRemote?.downloadUrl || "",
      bundleChecksum: bundleHash,
      sheets,
    });
  }

  if (sourcePageKeys.size !== 117) {
    throw new Error(`Expected 117 canonical source pages, found ${sourcePageKeys.size}`);
  }

  await rm(catalogDataRoot, { recursive: true, force: true });
  await mkdir(catalogDataRoot, { recursive: true });

  const catalogSummaries = [];
  for (const country of generatedCountries) {
    const payload = `${JSON.stringify({
      revision: catalogRevision,
      countrySlug: country.slug,
      sheets: country.sheets,
    })}\n`;
    const dataHash = createHash("sha256").update(payload).digest("hex").slice(0, 10);
    const dataFilename = `${country.slug}-${dataHash}.json`;
    await writeFile(path.join(catalogDataRoot, dataFilename), payload);

    const firstSheet = country.sheets[0];
    const directions = country.sheets.map(({ id, grade, process, flavor }) => ({
      name: grade,
      process: { en: process, tr: process },
      cup: { en: flavor, tr: flavor },
      sheetId: id,
    }));
    const typeDirection = country.types.join(" · ");
    const useDirection = [...new Set(country.sheets.flatMap(({ perfectFor }) => perfectFor))].slice(0, 4).join(" · ");
    const flavorDirection = country.flavors.slice(0, 4).join(" · ");
    const sheetCount = country.sheets.length;
    const websiteProfile = {
      id: country.profileId,
      slug: country.slug,
      iso: country.iso,
      flag: country.emoji,
      zone: country.zone,
      processFamily: country.processFamily,
      map: country.map,
      pin: country.pin,
      coordinates: country.coordinates,
      country: country.country,
      name: {
        en: `${country.country.en} green coffee catalogue`,
        tr: `${country.country.tr} yeşil kahve kataloğu`,
      },
      region: country.regions,
      process: {
        en: country.processes.join(" · "),
        tr: country.processes.join(" · "),
      },
      profile: {
        en: `${sheetCount} source-backed ${sheetCount === 1 ? "sheet" : "sheets"} across ${typeDirection}, with cup directions including ${flavorDirection}.`,
        tr: `${typeDirection} için kaynağa dayalı ${sheetCount} föy; öne çıkan fincan yönleri: ${flavorDirection}.`,
      },
      use: {
        en: useDirection || "Application confirmed with every inquiry",
        tr: useDirection || "Kullanım amacı her taleple birlikte teyit edilir",
      },
      harvest: {
        en: "Seasonality and current-lot details are confirmed with every inquiry.",
        tr: "Sezon ve güncel lot ayrıntıları her taleple birlikte teyit edilir.",
      },
      image: firstSheet.preview,
      srcSet: `${firstSheet.thumbnail} 360w, ${firstSheet.preview} 1080w`,
      cardImage: firstSheet.thumbnail,
      alt: {
        en: `Preview of the ${firstSheet.grade} reference sheet`,
        tr: `${firstSheet.grade} referans föyünün ön izlemesi`,
      },
      heroKind: "document",
      directions,
      sheets: [],
      sheetCount,
      catalogDataUrl: `/catalog/data/${dataFilename}`,
      bundleUrl: country.bundleUrl,
      bundleDownloadUrl: country.bundleDownloadUrl,
      catalogRevision,
      featured: false,
    };
    catalogSummaries.push({
      ...country,
      sheetCount,
      firstSheet: {
        id: firstSheet.id,
        grade: firstSheet.grade,
        thumbnail: firstSheet.thumbnail,
        preview: firstSheet.preview,
        pdfUrl: firstSheet.pdfUrl,
        downloadUrl: firstSheet.downloadUrl,
        checksum: firstSheet.checksum,
      },
      dataUrl: `/catalog/data/${dataFilename}`,
      dataChecksum: dataHash,
      websiteProfile,
      sheets: undefined,
    });
  }

  const catalogIndexPayload = `${JSON.stringify({
    revision: catalogRevision,
    countries: catalogSummaries,
  })}\n`;
  const catalogIndexHash = createHash("sha256").update(catalogIndexPayload).digest("hex").slice(0, 10);
  const catalogIndexFilename = `origin-index-${catalogIndexHash}.json`;
  await writeFile(path.join(catalogDataRoot, catalogIndexFilename), catalogIndexPayload);

  const fileContents = [
    "// Generated by scripts/import-origin-catalog.mjs.",
    "// Canonical public set: 117 unique sheets selected from the most complete matching exports.",
    "// Alternate and repeated pages are retained only as audited duplicate references.",
    "",
    `export const originCatalogMeta = ${JSON.stringify(
      {
        revision: catalogRevision,
        exportedPageCount: 117,
        sheetCount: 117,
        countryCount: 38,
        canonicalSources: [
          { document: sources.p1.label, pages: "1–56" },
          { document: sources.p2India.label, pages: "1" },
          { document: sources.indonesia.label, pages: "1–6" },
          { document: sources.catalog.label, pages: "1–54" },
        ],
        excludedSources: [
          { document: "v5 p2.pdf", pages: "2–61", reason: "alternate versions of the selected complete Indonesia–Zimbabwe exports" },
          { document: "MAKENDI 117.pptx.pdf", pages: "7–60", reason: "alternate duplicates of MAKENDI 1.2 pages 1–54" },
          { document: "MAKENDI 1.pptx.pdf", pages: "1–4", reason: "exact duplicates of MAKENDI 1.2 pages 51–54" },
        ],
      },
      null,
      2,
    )};`,
    "",
    `export const originCatalogIndexUrl = ${JSON.stringify(`/catalog/data/${catalogIndexFilename}`)};`,
    "",
  ].join("\n");

  await writeFile(outputDataFile, fileContents);
  for (const source of Object.values(sourceDocuments)) await source.task.destroy();
  await rm(workRoot, { recursive: true, force: true });

  const previewCount = generatedCountries.reduce((total, country) => total + country.sheets.length * 2, 0);
  console.log(`Generated ${generatedCountries.length} countries, 117 sheets and ${previewCount} previews.`);
  console.log(`Document delivery: ${uploadDocuments ? "uploaded to Vercel Blob" : reuseUploadedDocuments ? "reused existing Vercel Blob paths" : "local fallback paths"}.`);
}

await main();
