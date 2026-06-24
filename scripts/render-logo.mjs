import fs from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const input = "/mnt/c/Users/progr/Downloads/coffendi logo 1.pdf";
const output = new URL("../public/coffendi-logo.png", import.meta.url);
const data = new Uint8Array(fs.readFileSync(input));
const document = await pdfjsLib.getDocument({ data }).promise;
const page = await document.getPage(1);
const viewport = page.getViewport({ scale: 3 });
const canvas = createCanvas(viewport.width, viewport.height);
const context = canvas.getContext("2d");

context.fillStyle = "#ffffff";
context.fillRect(0, 0, canvas.width, canvas.height);
await page.render({ canvasContext: context, viewport }).promise;

const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
let minX = canvas.width;
let minY = canvas.height;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < canvas.height; y += 1) {
  for (let x = 0; x < canvas.width; x += 1) {
    const index = (y * canvas.width + x) * 4;
    const r = pixels.data[index];
    const g = pixels.data[index + 1];
    const b = pixels.data[index + 2];
    if (r < 248 || g < 248 || b < 248) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

const margin = 32;
minX = Math.max(0, minX - margin);
minY = Math.max(0, minY - margin);
maxX = Math.min(canvas.width - 1, maxX + margin);
maxY = Math.min(canvas.height - 1, maxY + margin);

const trimmed = createCanvas(maxX - minX + 1, maxY - minY + 1);
const trimmedContext = trimmed.getContext("2d");
trimmedContext.drawImage(
  canvas,
  minX,
  minY,
  trimmed.width,
  trimmed.height,
  0,
  0,
  trimmed.width,
  trimmed.height,
);

const trimmedPixels = trimmedContext.getImageData(
  0,
  0,
  trimmed.width,
  trimmed.height,
);
for (let index = 0; index < trimmedPixels.data.length; index += 4) {
  const r = trimmedPixels.data[index];
  const g = trimmedPixels.data[index + 1];
  const b = trimmedPixels.data[index + 2];
  if (r > 248 && g > 248 && b > 248) {
    trimmedPixels.data[index + 3] = 0;
  }
}
trimmedContext.putImageData(trimmedPixels, 0, 0);

fs.writeFileSync(output, trimmed.toBuffer("image/png"));
