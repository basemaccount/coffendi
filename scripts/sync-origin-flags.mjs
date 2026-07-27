import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const revision = "086f7e97d657358203916dbe84f61c2bccaa81eb";
const expected = {
  bo: "ee1075ebb655dd8252ec317827baa0a75cf0a5e4f0b0b35d6e9766b30686d183",
  bi: "5ef1a56b4ebe90326d6d807bbf61bd2d6f0b752fd6966588cd42471a886307bb",
  cm: "c9a327dc0e355739a9f2bc0a91e1293f8e08e13910e718bc63fda35a244acef5",
  cn: "981da9bdf82d48e31691f20578cefcb26cf7d0bd95e4ebd5c0df00bdfe988c1a",
  cr: "4775ef01d28b8a887cde3dbe2826466ed77c87aae4d00517c99d4977afdbdc20",
  ci: "4ecfea70e4e0860fdb49a523db7cd64431b4da8130ee9038cf87bfcc85c3806e",
  do: "02e5f5efbc60a73716f754ecb3f112dcccfeab1da925cb7b8a1764736a3a3ebd",
  ec: "4472b0618e2f5e31d31d16c0d7d811310c33b07d5a101b54f60fcb7ec84d1d4d",
  sv: "4c2b4e2b8bbb85d6cb97a5a35399f6fa9f269dc4b4c17591350441b61137041d",
  ht: "d45f0285b56379b6816ab02ac0fcef2dc47b3f9a926a661e51a5c546b259e5d6",
  hn: "67130fa043e9d30dda7691e0d59567ff32db435a0d72e4e57309bd439fd79995",
  in: "91185efa1a9b52cdc0e470712518efeefc4e4d6a6555bae9de997ba71885bb98",
  et: "43d5922fff81ae1accda75ed99b1b6e68dbebaa3d88a5d87f10a744f17cba34c",
  co: "6bab3c96c1657510c6e49354dd40203c69401bee54da497392ab9267334e5fd4",
  br: "b0a912826c3ffd7287435ebed66e18fe058e992309c00dc10b430dd41a29ba91",
  gt: "a20814d011af90ab2e80ea88eae9928cfce824cb9b50edf7b74ce2a98a159059",
  ke: "699163d87382eb969d8a26d4ce1a99a00264e8b7b95276abf585476506f46e82",
  rw: "9512100aa3e8079ed3780e8b3d6cd6a49639d0986ad78a709f81e9d0827b65b2",
  id: "5cd3acc4939dd7eae6318c8d75df8c0d1733f650e2504a2635b0dbf3dfabb040",
  jm: "f837df1ac21a4c64be2c977e2faeb6d6593624703d7c61b71a857fa8355b7f47",
  la: "da591b989d90a90d03c736d8515fe567832eb9f24dcfa7a2870b1cf3196fdb05",
  mg: "59246c21300e2456c0c5170791698e43399b089de80a69474deeac00697d2b7b",
  mw: "29a3e7057ec47f18bd8dd54312074335263b607c1543fcd969f89f14e307985f",
  mx: "9dbc8ad8b35e52ce7cb686d5cd93bd95e4c0dd8505c184186a740148ffd34901",
  ni: "b9dfe1fc2aded19b2796ad7b9b681b64457250ca6043f2865b4160e9230d097f",
  pa: "5e034a8ad127c43b19f52c648fe808160ab4ddb117afa4204772af96566d31bc",
  pg: "43e492331c192a947d9bd72ac6e1f4edcab1d86af097b8840faa9ac24e439d97",
  pe: "e9dd299d453d9c173203e60f69623ef2148dbee24b2a1763328e94d4dfece05f",
  ph: "c3bd5e08ddc5f6dbdfa899af9efb45577e3841402e6a7f5d00fef754816b2884",
  tz: "fd317abae009fa3629c51b82a6b9f1c529a7254406478047734bb52de83611cd",
  th: "329cc0d520536d6eb4b9304105f23650c2d02bbdba8f8696e996dbf166de6f2e",
  tl: "09c763aa3e5a48e2092348367b0bc93b1bc0536f5b527b31175e493132c55e19",
  tg: "f52b955fb48669d149991f511db818761589e8d45ce4dcc84478737cc0156d75",
  ug: "ab6aa03e1324d54ffbed5ea4560f757797f4729da58fc977527cedd586e928a5",
  vn: "2355037201315d74581ab0ad60b5587a29a087d26b0525bdeb8676e64fae5b86",
  ye: "4ad43705cb40095dc7dd16d6981eb2a3f46dcebe879eed54b188c62cf48e9c65",
  zm: "2753554062cd3761e53a180c3c8f8e245af622fb6ecf1c02020c79db0ff2d644",
  zw: "e27fcdcc882d7175cc4c07542779911043dc56262fe43b42f39bdaca09b762d5",
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

  const outputPath = path.join(destination, `${iso}.svg`);
  const sourceArtwork = artwork.toString("utf8");
  const image = await loadImage(artwork);
  const canvas = createCanvas(192, 144);
  canvas.getContext("2d").drawImage(image, 0, 0, 192, 144);
  const webp = await canvas.encode("webp", 94);
  const rasterized = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 144"><image width="192" height="144" href="data:image/webp;base64,${webp.toString("base64")}"/></svg>`;
  const selected = gzipSync(rasterized).byteLength < gzipSync(sourceArtwork).byteLength
    ? rasterized
    : sourceArtwork;
  await writeFile(outputPath, selected);
  console.log(`${iso.toUpperCase()}: verified ${artwork.byteLength} bytes, delivered in ${Buffer.byteLength(selected)} bytes`);
}
