import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const assetsDirectory = path.join(process.cwd(), "dist", "assets");
const files = await readdir(assetsDirectory);
const budgets = {
  js: 110 * 1024,
  css: 15 * 1024,
  combined: 125 * 1024,
};

async function compressedBytes(extension) {
  const matching = files.filter((file) => file.endsWith(extension));
  assert.ok(matching.length, `No ${extension} assets were found. Run npm run build first.`);
  let raw = 0;
  let gzip = 0;
  for (const file of matching) {
    const source = await readFile(path.join(assetsDirectory, file));
    raw += (await stat(path.join(assetsDirectory, file))).size;
    gzip += gzipSync(source, { level: 9 }).byteLength;
  }
  return { matching, raw, gzip };
}

const javascript = await compressedBytes(".js");
const styles = await compressedBytes(".css");
const combined = javascript.gzip + styles.gzip;

assert.ok(javascript.gzip <= budgets.js, `JavaScript gzip size ${javascript.gzip} exceeds ${budgets.js} bytes.`);
assert.ok(styles.gzip <= budgets.css, `CSS gzip size ${styles.gzip} exceeds ${budgets.css} bytes.`);
assert.ok(combined <= budgets.combined, `Combined JavaScript and CSS gzip size ${combined} exceeds ${budgets.combined} bytes.`);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;
console.log(`Bundle budgets passed: ${kb(javascript.gzip)} JavaScript gzip, ${kb(styles.gzip)} CSS gzip, ${kb(combined)} combined.`);
