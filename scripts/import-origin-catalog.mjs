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
  "/mnt/c/Users/progr/Downloads/Documents";
const workRoot = path.join(projectRoot, ".catalog-work");
const previewRoot = path.join(projectRoot, "public", "catalog", "previews");
const catalogDataRoot = path.join(projectRoot, "public", "catalog", "data");
const outputDataFile = path.join(projectRoot, "src", "originCatalog.js");
const uploadDocuments = process.env.UPLOAD_ORIGIN_BLOBS === "1";
const reuseUploadedDocuments = process.env.REUSE_ORIGIN_BLOBS === "1";
const catalogRevision = "2026-07-27";
const catalogRevisionDate = new Date(`${catalogRevision}T00:00:00.000Z`);

const sources = {
  indonesia: {
    label: "MAKENDI 117.pptx.pdf",
    path: path.join(sourceRoot, "MAKENDI 117.pptx.pdf"),
  },
  catalog: {
    label: "MAKENDI 1.2.pdf",
    path: path.join(sourceRoot, "MAKENDI 1.2.pdf"),
  },
};

const countries = [
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
    pages: [1, 2, 3, 4, 5, 6],
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
    pages: [2, 3, 4, 5, 6, 7],
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
    pages: [8, 9, 10],
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
    pages: [13, 14, 15, 16],
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
    pages: [17, 18, 19],
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
    pages: [20, 21],
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
    pages: [22, 23, 24, 25, 26, 27, 28],
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
    pages: [30, 31],
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
    pages: [33, 34, 35],
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
    pages: [36, 37],
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
    pages: [38, 39],
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
    pages: [41, 42, 43, 44, 45],
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
    pages: [46, 47, 48, 49, 50, 51],
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
  return items
    .map((item) => String(item.str || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
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
    const source = sourceDocuments[country.source];
    const expectedCountry = country.sourceCountry || country.country;
    const sheets = [];
    const countryPdf = await PDFDocument.create();
    const bundlePages = await countryPdf.copyPages(
      source.pdfLib,
      country.pages.map((page) => page - 1),
    );
    bundlePages.forEach((page) => countryPdf.addPage(page));

    for (const pageNumber of country.pages) {
      const sourcePageKey = `${country.source}:${pageNumber}`;
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
      process.stdout.write(`Sheet ${sheets.length}/${country.pages.length}: ${country.country} — ${extracted.specifications.grade}\n`);
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

  if (sourcePageKeys.size !== 60) {
    throw new Error(`Expected 60 canonical source pages, found ${sourcePageKeys.size}`);
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
    "// Canonical public set: MAKENDI 117 pages 1–6 plus MAKENDI 1.2 pages 1–54.",
    "// Sparse alternate pages and the four-page duplicate PDF are intentionally excluded.",
    "",
    `export const originCatalogMeta = ${JSON.stringify(
      {
        revision: catalogRevision,
        sheetCount: 60,
        countryCount: 22,
        canonicalSources: [
          { document: sources.indonesia.label, pages: "1–6" },
          { document: sources.catalog.label, pages: "1–54" },
        ],
        excludedSources: [
          { document: sources.indonesia.label, pages: "7–60", reason: "duplicate or incomplete alternate layouts" },
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
  console.log(`Generated ${generatedCountries.length} countries, 60 sheets and ${previewCount} previews.`);
  console.log(`Document delivery: ${uploadDocuments ? "uploaded to Vercel Blob" : reuseUploadedDocuments ? "reused existing Vercel Blob paths" : "local fallback paths"}.`);
}

await main();
