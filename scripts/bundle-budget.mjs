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
  deferredJs: 24 * 1024,
  deferredCss: 6 * 1024,
  allCombined: 140 * 1024,
};

async function compressedBytes(extension, candidates = files) {
  const matching = candidates.filter((file) => file.endsWith(extension));
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

const html = await readFile(path.join(process.cwd(), "dist", "index.html"), "utf8");
const criticalAssets = [...html.matchAll(/\/assets\/([^"'?]+\.(?:js|css))/g)].map((match) => match[1]);
const deferredAssets = files.filter((file) => !criticalAssets.includes(file));
const javascript = await compressedBytes(".js", criticalAssets);
const styles = await compressedBytes(".css", criticalAssets);
const deferredJavascript = await compressedBytes(".js", deferredAssets);
const deferredStyles = await compressedBytes(".css", deferredAssets);
const combined = javascript.gzip + styles.gzip;
const allCombined = combined + deferredJavascript.gzip + deferredStyles.gzip;

assert.ok(javascript.gzip <= budgets.js, `JavaScript gzip size ${javascript.gzip} exceeds ${budgets.js} bytes.`);
assert.ok(styles.gzip <= budgets.css, `CSS gzip size ${styles.gzip} exceeds ${budgets.css} bytes.`);
assert.ok(combined <= budgets.combined, `Combined JavaScript and CSS gzip size ${combined} exceeds ${budgets.combined} bytes.`);
assert.ok(deferredJavascript.gzip <= budgets.deferredJs, `Deferred JavaScript gzip size ${deferredJavascript.gzip} exceeds ${budgets.deferredJs} bytes.`);
assert.ok(deferredStyles.gzip <= budgets.deferredCss, `Deferred CSS gzip size ${deferredStyles.gzip} exceeds ${budgets.deferredCss} bytes.`);
assert.ok(allCombined <= budgets.allCombined, `All critical and deferred assets total ${allCombined} gzip bytes, exceeding ${budgets.allCombined}.`);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;
console.log(`Bundle budgets passed: ${kb(javascript.gzip)} critical JavaScript, ${kb(styles.gzip)} critical CSS, ${kb(combined)} critical combined; ${kb(deferredJavascript.gzip)} deferred JavaScript and ${kb(deferredStyles.gzip)} deferred CSS; ${kb(allCombined)} total gzip.`);
