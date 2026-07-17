import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const imageDirectory = path.join(process.cwd(), "public", "images");
const instantSourceDirectory = path.join(process.cwd(), "assets", "instant");
const instantImages = (await readdir(instantSourceDirectory))
  .filter((file) => /\.(png|jpe?g)$/i.test(file))
  .map((file) => ({
    source: path.join(instantSourceDirectory, file),
    destination: path.join(imageDirectory, `instant-${file.replace(/\.(png|jpe?g)$/i, ".webp")}`),
  }));
const files = instantImages;
let sourceBytes = 0;
let outputBytes = 0;

await mkdir(imageDirectory, { recursive: true });

for (const { source, destination } of files) {
  const image = await loadImage(source);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, image.width, image.height);

  const output = await canvas.encode("webp", 80);
  await writeFile(destination, output);
  sourceBytes += (await stat(source)).size;
  outputBytes += output.byteLength;
}

const reduction = sourceBytes ? Math.round((1 - outputBytes / sourceBytes) * 100) : 0;
console.log(
  `Generated ${files.length} WebP assets: ${Math.round(sourceBytes / 1024)}KB → ${Math.round(outputBytes / 1024)}KB (${reduction}% smaller).`,
);
