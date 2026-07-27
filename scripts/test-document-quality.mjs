import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  originCatalogIndexUrl,
  originCatalogMeta,
} from "../src/originCatalog.js";

const projectRoot = path.resolve(".");
const catalogIndex = JSON.parse(
  await readFile(path.join(projectRoot, "public", originCatalogIndexUrl), "utf8"),
);
const canvas = createCanvas(360, 540);
const context = canvas.getContext("2d", { alpha: false });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstTitleGlyphIsVisible(image, label) {
  context.fillStyle = "#12372d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(16, 28, 30, 30).data;
  let brightPixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] > 205 && pixels[index + 1] > 205 && pixels[index + 2] > 205) {
      brightPixels += 1;
    }
  }
  assert(brightPixels >= 8, `${label}: the first rendered country-title glyph is missing`);
}

assert(originCatalogMeta.documentGenerator === "Coffendi branded bilingual origin document generator", "Unexpected branded bilingual document generator");
assert(originCatalogMeta.generatedDocumentCount === 234, "Bilingual document count must equal 234");
assert(originCatalogMeta.previewPpi === 270, "Full previews must declare 270 PPI");

for (const artworkName of [
  "process-washed-v1.png",
  "process-natural-v1.png",
  "process-honey-mixed-v1.png",
]) {
  const artworkPath = path.join(projectRoot, "public", "images", "catalog", artworkName);
  const [artwork, artworkStat] = await Promise.all([
    loadImage(artworkPath),
    stat(artworkPath),
  ]);
  assert(artwork.width >= 1500 && artwork.height >= 1000, `${artworkName}: artwork is below its source-resolution floor`);
  assert(artworkStat.size >= 1_000_000, `${artworkName}: artwork is unexpectedly compressed`);
}
const logo = await loadImage(path.join(projectRoot, "public", "coffendi-logo.png"));
assert(logo.width >= 1500 && logo.height >= 1400, "The embedded Coffendi logo source is below its resolution floor");

let generatedPdfBytes = 0;
let sourcePdfBytes = 0;
let previewBytes = 0;
let checkedPreviews = 0;
const heroChecksums = new Set();
const sourceVisualChecksums = new Set();
const processArtworkFamilies = new Set();

for (const country of catalogIndex.countries) {
  const payload = JSON.parse(
    await readFile(path.join(projectRoot, "public", country.dataUrl), "utf8"),
  );
  for (const sheet of payload.sheets) {
    const quality = sheet.generation;
    assert(quality?.engine === originCatalogMeta.documentGenerator, `${sheet.id}: generator metadata is missing`);
    assert(quality.englishTextCharacters >= 350, `${sheet.id}: English selectable-text layer is too small`);
    assert(quality.turkishTextCharacters >= 350, `${sheet.id}: Turkish selectable-text layer is too small`);
    assert(quality.englishFontResources >= 2, `${sheet.id}: English embedded-font set is incomplete`);
    assert(quality.turkishFontResources >= 2, `${sheet.id}: Turkish embedded-font set is incomplete`);
    assert(quality.previewPpi === 270, `${sheet.id}: preview density is stale`);
    assert(quality.logo === "coffendi-logo", `${sheet.id}: authentic Coffendi logo metadata is missing`);
    assert(quality.originVisualRole === "source-provided contextual image", `${sheet.id}: source visual provenance is missing`);
    assert(quality.processVisualRole === "illustrative non-country-specific process image", `${sheet.id}: process visual provenance is missing`);
    assert(sheet.gradeTr, `${sheet.id}: Turkish commercial-grade label is missing`);
    assert(!heroChecksums.has(quality.heroChecksum), `${sheet.id}: hero composition is repeated`);
    heroChecksums.add(quality.heroChecksum);
    sourceVisualChecksums.add(quality.originVisualChecksum);
    processArtworkFamilies.add(quality.processArtwork);

    generatedPdfBytes += quality.englishPdfBytes + quality.turkishPdfBytes;
    sourcePdfBytes += quality.sourcePdfBytes;

    for (const [language, thumbnailPath] of [
      ["English", sheet.thumbnail],
      ["Turkish", sheet.turkishThumbnail],
    ]) {
      const absolutePath = path.join(projectRoot, "public", thumbnailPath);
      const [image, file] = await Promise.all([
        loadImage(absolutePath),
        stat(absolutePath),
      ]);
      assert(image.width === 360 && image.height === 540, `${sheet.id}: ${language} thumbnail dimensions are invalid`);
      assert(file.size >= 8_000, `${sheet.id}: ${language} thumbnail is unexpectedly small`);
      firstTitleGlyphIsVisible(image, `${sheet.id}: ${language}`);
      previewBytes += file.size;
      checkedPreviews += 1;
    }
  }
}

assert(checkedPreviews === 234, `Expected 234 bilingual thumbnail renders, checked ${checkedPreviews}`);
assert(heroChecksums.size === 117, `Expected 117 distinct hero compositions, found ${heroChecksums.size}`);
assert(sourceVisualChecksums.size >= 30, `Expected at least 30 distinct source visuals, found ${sourceVisualChecksums.size}`);
assert(processArtworkFamilies.size === 3, `Expected three process-artwork families, found ${processArtworkFamilies.size}`);
assert(generatedPdfBytes >= 25_000_000, "Generated bilingual PDFs are unexpectedly small");
assert(generatedPdfBytes <= 200_000_000, "Generated bilingual PDFs exceed their aggregate delivery budget");
assert(sourcePdfBytes >= 20_000_000, "Preserved source-original PDFs are unexpectedly small");

console.log(
  `Document quality passed: ${checkedPreviews} bilingual rendered pages, `
  + `${(generatedPdfBytes / 1024 / 1024).toFixed(1)} MiB generated PDFs, `
  + `${(sourcePdfBytes / 1024 / 1024).toFixed(1)} MiB preserved source originals, `
  + `${(previewBytes / 1024 / 1024).toFixed(1)} MiB audited thumbnails.`,
);
