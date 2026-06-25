import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const SOURCE_ROOT =
  process.env.MAKENDI_SOURCE_ROOT ||
  "/mnt/c/Users/progr/Downloads/MAKENDI_FINAL_V5_COMPLETE_EDITABLE";
const DATA_DIR = path.join(SOURCE_ROOT, "04_EDITABLE_DATA");
const ASSET_DIR = path.join(SOURCE_ROOT, "05_ALL_IMAGE_ASSETS");
const OUTPUT_ASSET_DIR = path.join(process.cwd(), "public", "makendi");
const OUTPUT_DATA_FILE = path.join(process.cwd(), "src", "makendiCatalog.js");
const OUTPUT_SUMMARY_FILE = path.join(process.cwd(), "src", "makendiSummary.js");

const coordinates = {
  Bolivia: [-64.7, -16.5],
  Brazil: [-47.88, -18.91],
  Burundi: [29.9, -3.4],
  Cameroon: [11.5, 5],
  China: [100, 24],
  Colombia: [-75.23, 4.44],
  "Costa Rica": [-84.1, 9.9],
  "Côte d'Ivoire": [-5.5, 7.5],
  "Dominican Rep.": [-70.1, 18.9],
  Ecuador: [-78.5, -1.2],
  "El Salvador": [-88.9, 13.8],
  Ethiopia: [38.46, 6.76],
  Guatemala: [-91.48, 15.32],
  Haiti: [-72.3, 19],
  Honduras: [-87.68, 14.31],
  India: [77.5, 12.5],
  Indonesia: [101.26, -1.7],
  Jamaica: [-76.8, 18.1],
  Kenya: [37.3, -0.66],
  Laos: [102.6, 19.8],
  Madagascar: [47, -19],
  Malawi: [34.3, -13.3],
  Mexico: [-96.7, 16.7],
  Nicaragua: [-85.2, 12.8],
  Panama: [-82.4, 8.6],
  "Papua N.G.": [145.7, -6.3],
  Peru: [-78.9, -5.15],
  Philippines: [125, 7.1],
  Rwanda: [29.38, -2.07],
  Tanzania: [36.8, -3.4],
  Thailand: [99, 18.8],
  "Timor-Leste": [125.6, -8.8],
  Togo: [0.8, 7.8],
  Uganda: [32.5, 1.1],
  Vietnam: [108, 12],
  Yemen: [44.2, 15.4],
  Zambia: [28.2, -12.8],
  Zimbabwe: [31, -18.9],
};

const flagFileOverrides = {
  "Côte d'Ivoire": "flag_c_te_d_ivoire.jpg",
};

const productFiles = {
  Arabica: "product_arabica.jpg",
  Robusta: "product_robusta.jpg",
  Liberica: "product_liberica.jpg",
  "Híbrido de Timor": "product_h_brido_de_timor.jpg",
};

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function compact(value, fallback = "Lot-specific") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function displayGrade(value) {
  const text = compact(value);
  return text.length > 82 ? `${text.slice(0, 79).trim()}...` : text;
}

function mapImageAssets(manifest) {
  const assetsByRole = { origin: new Map(), farmer: new Map() };
  for (const item of manifest.assets) {
    if (item.role === "origin" || item.role === "farmer") {
      assetsByRole[item.role].set(item.subject, item);
    }
  }
  return assetsByRole;
}

async function resizeCover(source, destination, width, height, quality = 82) {
  const image = await loadImage(source);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";

  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (sourceRatio > targetRatio) {
    sw = Math.round(image.height * targetRatio);
    sx = Math.round((image.width - sw) / 2);
  } else {
    sh = Math.round(image.width / targetRatio);
    sy = Math.round((image.height - sh) / 2);
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, canvas.toBuffer("image/jpeg", quality));
}

async function buildFlagMap() {
  const files = await readdir(ASSET_DIR);
  const flags = new Map();
  for (const file of files.filter((item) => item.startsWith("flag_"))) {
    const key = file.replace(/^flag_|\.jpg$/g, "");
    flags.set(key, file);
  }
  return flags;
}

async function main() {
  const catalogPayload = JSON.parse(
    await readFile(path.join(DATA_DIR, "grades_clean_ALL_117.json"), "utf8"),
  );
  const manifest = JSON.parse(await readFile(path.join(DATA_DIR, "asset_manifest.json"), "utf8"));
  const sourceRows = catalogPayload.records;
  const assetsByRole = mapImageAssets(manifest);
  const flagFiles = await buildFlagMap();

  await mkdir(OUTPUT_ASSET_DIR, { recursive: true });
  for (const folder of ["origins", "farmers", "flags", "products"]) {
    await mkdir(path.join(OUTPUT_ASSET_DIR, folder), { recursive: true });
  }

  const countrySet = [...new Set(sourceRows.map((record) => record.origin))];
  const typeSet = [...new Set(sourceRows.map((record) => record.coffee_type))];

  for (const country of countrySet) {
    for (const role of ["origin", "farmer"]) {
      const asset = assetsByRole[role].get(country);
      if (!asset) continue;
      const source = path.join(ASSET_DIR, path.basename(asset.local_path));
      const target = path.join(OUTPUT_ASSET_DIR, `${role}s`, `${slugify(country)}.jpg`);
      await resizeCover(source, target, 860, 645);
    }

    const flagFile =
      flagFileOverrides[country] || flagFiles.get(slugify(country).replaceAll("-", "_"));
    if (flagFile) {
      await resizeCover(
        path.join(ASSET_DIR, flagFile),
        path.join(OUTPUT_ASSET_DIR, "flags", `${slugify(country)}.jpg`),
        180,
        120,
        88,
      );
    }
  }

  for (const coffeeType of typeSet) {
    const sourceFile = productFiles[coffeeType];
    if (!sourceFile) continue;
    await resizeCover(
      path.join(ASSET_DIR, sourceFile),
      path.join(OUTPUT_ASSET_DIR, "products", `${slugify(coffeeType)}.jpg`),
      920,
      690,
    );
  }

  const grades = sourceRows.map((record) => {
    const countrySlug = slugify(record.origin);
    const typeSlug = slugify(record.coffee_type);
    const sourceFact = record.source_trace?.source_factual || {};
    return {
      id: `mk-${String(record.no).padStart(3, "0")}-${countrySlug}-${slugify(
        record.grade,
      ).slice(0, 58)}`,
      sourceNumber: record.no,
      country: record.origin,
      coordinates: coordinates[record.origin] || [0, 0],
      coffeeType: record.coffee_type,
      grade: compact(record.grade),
      shortGrade: displayGrade(record.grade),
      description: compact(record.description_profile),
      process: compact(record.processing_method),
      processDisplay: compact(record.processing_method_display, compact(record.processing_method)),
      gradeClass: compact(record.grade_class),
      defects: compact(record.defects),
      flavorProfile: compact(record.flavor_profile),
      aroma: compact(record.aroma),
      body: compact(record.body),
      acidity: compact(record.acidity),
      screenSize: compact(record.screen_size_display || record.screen_size),
      moistureContent: compact(record.moisture_content),
      packing: compact(record.packing_display || record.packing),
      tagline: compact(record.tagline, "Premium green coffee profile"),
      profileRule: compact(record.profile_rule, "balanced"),
      topFeatures: record.top_features || [],
      originParagraph: compact(record.origin_paragraph),
      farmerQuote: compact(record.farmer_quote),
      cupProfile: record.cup_profile || {},
      tastingNotes: record.tasting_notes || [],
      perfectFor: record.perfect_for || [],
      whyChoose: record.why_choose || [],
      image: `/makendi/origins/${countrySlug}.jpg`,
      farmerImage: `/makendi/farmers/${countrySlug}.jpg`,
      flag: `/makendi/flags/${countrySlug}.jpg`,
      productImage: `/makendi/products/${typeSlug}.jpg`,
      source: {
        page: record.source_trace?.source_page,
        rows: record.source_trace?.source_rows,
        confidence: record.source_trace?.confidence,
        factual: {
          origin: sourceFact.origin,
          coffeeType: sourceFact.coffee_type,
          grade: sourceFact.grade,
          descriptionProfile: sourceFact.description_profile,
          processingMethod: sourceFact.processing_method,
        },
      },
      provenance: {
        sourcePdfFields: Object.values(record.field_provenance || {}).filter(
          (value) => value === "source_pdf",
        ).length,
        parsedFields: Object.values(record.field_provenance || {}).filter(
          (value) => value === "parsed_from_description",
        ).length,
        generatedFields: Object.values(record.field_provenance || {}).filter(
          (value) => value === "generated_marketing",
        ).length,
      },
    };
  });

  const origins = countrySet
    .map((country) => {
      const rows = grades.filter((record) => record.country === country);
      const typeCounts = rows.reduce((accumulator, record) => {
        accumulator[record.coffeeType] = (accumulator[record.coffeeType] || 0) + 1;
        return accumulator;
      }, {});
      const processes = [...new Set(rows.map((record) => record.processDisplay))].slice(0, 6);
      const flavorNotes = [
        ...new Set(rows.flatMap((record) => record.tastingNotes).filter(Boolean)),
      ].slice(0, 8);
      return {
        country,
        id: slugify(country),
        coordinates: coordinates[country] || [0, 0],
        gradeCount: rows.length,
        coffeeTypes: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
        processes,
        flavorNotes,
        image: `/makendi/origins/${slugify(country)}.jpg`,
        farmerImage: `/makendi/farmers/${slugify(country)}.jpg`,
        flag: `/makendi/flags/${slugify(country)}.jpg`,
        heroGradeId: rows[0]?.id,
      };
    })
    .sort((a, b) => b.gradeCount - a.gradeCount || a.country.localeCompare(b.country));

  const meta = {
    sourceName: "MAKENDI V5 Complete Editable Delivery",
    sourceDocument: catalogPayload.source_document,
    generatedOn: catalogPayload.generated_on,
    recordCount: grades.length,
    originCount: origins.length,
    coffeeTypes: typeSet,
    contact: {
      company: "MAKENDI WORLDWIDE",
      telephone: "+90 850 840 71 56",
      email: "info@makendi.com",
      website: "www.makendi.com",
    },
    provenanceCounts: catalogPayload.provenance_counts,
    assetWarnings: manifest.statistics?.warnings || 0,
  };

  const file = `// Generated by scripts/import-makendi.mjs from the Makendi V5 editable delivery.
// Source-factual fields are preserved separately from generated display copy.

export const makendiCatalogMeta = ${JSON.stringify(meta, null, 2)};

export const makendiGrades = ${JSON.stringify(grades, null, 2)};

export const makendiOrigins = ${JSON.stringify(origins, null, 2)};
`;

  const searchIndex = grades.map((grade) => ({
    id: grade.id,
    country: grade.country,
    coffeeType: grade.coffeeType,
    shortGrade: grade.shortGrade,
    processDisplay: grade.processDisplay,
    image: grade.image,
    tastingNotes: grade.tastingNotes,
    searchText: [
      grade.country,
      grade.coffeeType,
      grade.grade,
      grade.description,
      grade.process,
      grade.flavorProfile,
      grade.gradeClass,
      ...grade.tastingNotes,
      ...grade.perfectFor,
    ].join(" "),
    sourceNumber: grade.sourceNumber,
  }));
  const originSummary = origins.map((origin) => ({
    country: origin.country,
    id: origin.id,
    gradeCount: origin.gradeCount,
    processes: origin.processes,
    image: origin.image,
    flag: origin.flag,
    heroGradeId: origin.heroGradeId,
  }));
  const summaryFile = `// Generated by scripts/import-makendi.mjs from the Makendi V5 editable delivery.
// Lightweight index for app-shell navigation, search, and home-page previews.

export const makendiCatalogMeta = ${JSON.stringify(meta, null, 2)};

export const makendiOriginSummary = ${JSON.stringify(originSummary, null, 2)};

export const makendiSearchIndex = ${JSON.stringify(searchIndex, null, 2)};
`;

  await writeFile(OUTPUT_DATA_FILE, file);
  await writeFile(OUTPUT_SUMMARY_FILE, summaryFile);
  console.log(`Imported ${grades.length} Makendi grade records across ${origins.length} origins.`);
  console.log(`Generated assets in ${path.relative(process.cwd(), OUTPUT_ASSET_DIR)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
