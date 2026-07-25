import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const revision = "086f7e97d657358203916dbe84f61c2bccaa81eb";
const expected = {
  et: "43d5922fff81ae1accda75ed99b1b6e68dbebaa3d88a5d87f10a744f17cba34c",
  co: "6bab3c96c1657510c6e49354dd40203c69401bee54da497392ab9267334e5fd4",
  br: "b0a912826c3ffd7287435ebed66e18fe058e992309c00dc10b430dd41a29ba91",
  gt: "a20814d011af90ab2e80ea88eae9928cfce824cb9b50edf7b74ce2a98a159059",
  ke: "699163d87382eb969d8a26d4ce1a99a00264e8b7b95276abf585476506f46e82",
  rw: "9512100aa3e8079ed3780e8b3d6cd6a49639d0986ad78a709f81e9d0827b65b2",
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(projectRoot, "public", "images", "flags");
await mkdir(destination, { recursive: true });

for (const [iso, integrity] of Object.entries(expected)) {
  const source = `https://raw.githubusercontent.com/lipis/flag-icons/${revision}/flags/4x3/${iso}.svg`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not retrieve ${iso.toUpperCase()} flag: HTTP ${response.status}`);

  const artwork = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(artwork).digest("hex");
  if (actual !== integrity) throw new Error(`Integrity mismatch for ${iso.toUpperCase()} flag`);

  await writeFile(path.join(destination, `${iso}.svg`), artwork);
  console.log(`${iso.toUpperCase()}: verified ${artwork.byteLength} bytes`);
}

