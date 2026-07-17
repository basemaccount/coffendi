import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const imageDirectory = path.join(process.cwd(), "public", "images");
const instantSourceDirectory = path.join(process.cwd(), "assets", "instant");
const responsiveWidths = {
  "agglomerated.png": [320, 480, 640, 800, 960],
  "bulk-beans.jpg": [640, 960, 1280],
  "freeze-dried.png": [320, 480, 640, 800, 960],
  "hero.png": [640, 960, 1280],
  "spray-dried.png": [320, 480, 640, 800, 960],
};
const instantImages = (await readdir(instantSourceDirectory))
  .filter((file) => /\.(png|jpe?g)$/i.test(file))
  .map((file) => ({
    file,
    source: path.join(instantSourceDirectory, file),
    destination: path.join(imageDirectory, `instant-${file.replace(/\.(png|jpe?g)$/i, ".webp")}`),
  }));
let sourceBytes = 0;
let outputBytes = 0;
let generatedFiles = 0;

await mkdir(imageDirectory, { recursive: true });

async function encodeWebp(image, width, destination, quality = 80) {
  const height = Math.round((image.height * width) / image.width);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  const output = await canvas.encode("webp", quality);
  await writeFile(destination, output);
  outputBytes += output.byteLength;
  generatedFiles += 1;
}

for (const { file, source, destination } of instantImages) {
  const image = await loadImage(source);
  sourceBytes += (await stat(source)).size;
  await encodeWebp(image, image.width, destination);

  const basename = destination.replace(/\.webp$/, "");
  for (const width of responsiveWidths[file] || []) {
    if (width >= image.width) continue;
    await encodeWebp(image, width, `${basename}-${width}.webp`, 78);
  }
}

const logoSource = path.join(process.cwd(), "public", "coffendi-logo.png");
const logo = await loadImage(logoSource);
for (const width of [160, 256, 512]) {
  await encodeWebp(logo, width, path.join(process.cwd(), "public", `coffendi-logo-${width}.webp`), 90);
}

const faviconWidth = 64;
const faviconHeight = Math.round((logo.height * faviconWidth) / logo.width);
const faviconCanvas = createCanvas(faviconWidth, faviconHeight);
const faviconContext = faviconCanvas.getContext("2d");
faviconContext.imageSmoothingEnabled = true;
faviconContext.imageSmoothingQuality = "high";
faviconContext.drawImage(logo, 0, 0, faviconWidth, faviconHeight);
const favicon = await faviconCanvas.encode("png");
await writeFile(path.join(process.cwd(), "public", "favicon-64.png"), favicon);
outputBytes += favicon.byteLength;
generatedFiles += 1;

const reduction = sourceBytes ? Math.round((1 - outputBytes / sourceBytes) * 100) : 0;
console.log(
  `Generated ${generatedFiles} responsive image assets: ${Math.round(sourceBytes / 1024)}KB source → ${Math.round(outputBytes / 1024)}KB across all variants (${reduction}% below the source set).`,
);
