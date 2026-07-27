import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import {
  translateCoffeeGrade,
  translateCoffeeValue,
} from "../../src/lib/turkishCoffee.js";

const colors = {
  cream: rgb(0.978, 0.956, 0.91),
  paper: rgb(1, 0.994, 0.976),
  green: rgb(0.055, 0.205, 0.165),
  greenDeep: rgb(0.035, 0.145, 0.118),
  greenSoft: rgb(0.105, 0.29, 0.235),
  gold: rgb(0.77, 0.515, 0.19),
  goldSoft: rgb(0.94, 0.88, 0.76),
  muted: rgb(0.32, 0.37, 0.345),
  line: rgb(0.84, 0.80, 0.71),
  white: rgb(1, 1, 1),
};

const copyByLanguage = {
  en: {
    languageTag: "en",
    documentLabel: "ENGLISH ORIGIN SHEET",
    brandLine: "COFFENDI  /  GREEN COFFEE",
    subject: "Coffendi source-backed green coffee technical sheet",
    type: "TYPE",
    process: "PROCESS",
    flavor: "FLAVOR",
    technical: "TECHNICAL SPECIFICATIONS",
    sensory: "SENSORY PROFILE & APPLICATION",
    fields: {
      defects: "Defect tolerance",
      aroma: "Aroma",
      body: "Body",
      acidity: "Acidity",
      screen: "Screen",
      moisture: "Moisture",
      packing: "Packing",
    },
    tasting: "TASTING NOTES",
    use: "RECOMMENDED USE",
    source: "SOURCE & VERIFICATION",
    sourcePage: "Source page",
    originalGrade: "Commercial grade",
    status: "DOCUMENT QUALITY",
    structure: "CUP STRUCTURE",
    quality: "Selectable text  •  Embedded fonts  •  270 PPI preview",
    visualProvenance: "Visuals: source-provided origin context + an illustrative, non-country-specific process image.",
    footer: "Source-backed technical sheet",
    provenance: "Technical values are generated directly from the named English source page without changing the commercial specification.",
    fallbackUse: "Application confirmed during inquiry",
  },
  tr: {
    languageTag: "tr-TR",
    documentLabel: "TÜRKÇE MENŞE FÖYÜ",
    brandLine: "COFFENDI  /  YEŞİL KAHVE",
    subject: "Coffendi menşe kataloğu Türkçe teknik bilgi föyü",
    type: "TÜR",
    process: "İŞLEME",
    flavor: "LEZZET",
    technical: "TEKNİK ÖZELLİKLER",
    sensory: "DUYUSAL PROFİL VE KULLANIM",
    fields: {
      defects: "Kusur sınırı",
      aroma: "Aroma",
      body: "Gövde",
      acidity: "Asidite",
      screen: "Elek ölçüsü",
      moisture: "Nem",
      packing: "Ambalaj",
    },
    tasting: "TADIM NOTLARI",
    use: "ÖNERİLEN KULLANIM",
    source: "KAYNAK VE DOĞRULAMA",
    sourcePage: "Kaynak sayfa",
    originalGrade: "Özgün ticari sınıf",
    status: "BELGE NİTELİĞİ",
    structure: "FİNCAN YAPISI",
    quality: "Seçilebilir metin  •  Gömülü yazı tipi  •  270 PPI ön izleme",
    visualProvenance: "Görseller: kaynakta sunulan menşe bağlamı + ülkeye özgü olmayan temsili işleme görseli.",
    footer: "Kaynağa dayalı teknik föy",
    provenance: "Teknik değerler belirtilen İngilizce kaynak sayfadan alınmış ve Türkçe olarak yerelleştirilmiştir.",
    fallbackUse: "Kullanım amacı talep sırasında teyit edilir",
  },
};

function wrapText(value, font, size, maximumWidth) {
  const paragraphs = String(value || "").split(/\r?\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maximumWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawFittedText(page, value, {
  font,
  size,
  minimumSize = 6.4,
  x,
  y,
  maximumWidth,
  color = colors.green,
  lineHeightRatio = 1.28,
  maximumLines = 2,
}) {
  let fittedSize = size;
  let lines = wrapText(value, font, fittedSize, maximumWidth);
  while (lines.length > maximumLines && fittedSize > minimumSize) {
    fittedSize = Math.max(minimumSize, fittedSize - 0.35);
    lines = wrapText(value, font, fittedSize, maximumWidth);
  }
  if (lines.length > maximumLines) {
    throw new Error(`Generated PDF text does not fit: ${value}`);
  }
  const lineHeight = fittedSize * lineHeightRatio;
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - (index * lineHeight),
      size: fittedSize,
      font,
      color,
    });
  });
  return {
    bottom: y - (lines.length * lineHeight),
    lines: lines.length,
    size: fittedSize,
  };
}

function localize(value, language) {
  return language === "tr" ? translateCoffeeValue(value, "tr") : value;
}

function drawCover(context, image, x, y, width, height, focusX = 0.5, focusY = 0.5) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
  } else {
    sourceHeight = image.width / targetRatio;
  }
  const sourceX = Math.max(0, Math.min(
    image.width - sourceWidth,
    (image.width - sourceWidth) * focusX,
  ));
  const sourceY = Math.max(0, Math.min(
    image.height - sourceHeight,
    (image.height - sourceHeight) * focusY,
  ));
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function seededFocus(seed, offset = 0) {
  const digest = createHash("sha256").update(`${seed}:${offset}`).digest();
  return 0.22 + ((digest[offset % digest.length] / 255) * 0.56);
}

export function resolveProcessArtworkKey(process) {
  const normalized = String(process || "").toLocaleLowerCase("en");
  if (
    normalized.includes("honey")
    || normalized.includes("pulped")
    || normalized.includes("anaerobic")
    || normalized.includes("experimental")
    || normalized.includes("/")
  ) {
    return "honey-mixed";
  }
  if (
    normalized.includes("natural")
    || normalized.includes("sun-dried")
    || normalized.includes("unwashed")
  ) {
    return "natural";
  }
  return "washed";
}

export async function createSheetHeroArtwork({
  sourceImageBytes,
  processImageBytes,
  seed,
}) {
  const [sourceImage, processImage] = await Promise.all([
    loadImage(sourceImageBytes),
    loadImage(processImageBytes),
  ]);
  const canvas = createCanvas(1440, 630);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#12372d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gutter = 20;
  const processWidth = 570;
  drawCover(
    context,
    processImage,
    0,
    0,
    processWidth,
    canvas.height,
    seededFocus(seed, 1),
    seededFocus(seed, 2),
  );
  drawCover(
    context,
    sourceImage,
    processWidth + gutter,
    0,
    canvas.width - processWidth - gutter,
    canvas.height,
    seededFocus(seed, 3),
    seededFocus(seed, 4),
  );

  const sourceShade = context.createLinearGradient(
    processWidth + gutter,
    0,
    canvas.width,
    0,
  );
  sourceShade.addColorStop(0, "rgba(8,36,29,.2)");
  sourceShade.addColorStop(0.22, "rgba(8,36,29,0)");
  sourceShade.addColorStop(1, "rgba(8,36,29,.08)");
  context.fillStyle = sourceShade;
  context.fillRect(
    processWidth + gutter,
    0,
    canvas.width - processWidth - gutter,
    canvas.height,
  );

  const lowerShade = context.createLinearGradient(0, 390, 0, canvas.height);
  lowerShade.addColorStop(0, "rgba(8,36,29,0)");
  lowerShade.addColorStop(1, "rgba(8,36,29,.4)");
  context.fillStyle = lowerShade;
  context.fillRect(0, 390, canvas.width, canvas.height - 390);

  context.fillStyle = "#c78634";
  context.fillRect(processWidth + 6, 0, 8, canvas.height);
  const bytes = await canvas.encode("jpeg", 92);
  return {
    bytes,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function prepareDocumentArtwork({
  logoPath,
  processArtworkPaths,
  flagRoot,
  countries,
}) {
  const logoSource = await loadImage(logoPath);
  const logoCanvas = createCanvas(900, 855);
  const logoContext = logoCanvas.getContext("2d");
  logoContext.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
  const logoScale = Math.min(
    logoCanvas.width / logoSource.width,
    logoCanvas.height / logoSource.height,
  );
  const logoWidth = logoSource.width * logoScale;
  const logoHeight = logoSource.height * logoScale;
  logoContext.drawImage(
    logoSource,
    (logoCanvas.width - logoWidth) / 2,
    (logoCanvas.height - logoHeight) / 2,
    logoWidth,
    logoHeight,
  );
  const logoBytes = await logoCanvas.encode("png");

  const processImages = new Map();
  for (const [key, processArtworkPath] of Object.entries(processArtworkPaths)) {
    const source = await loadImage(processArtworkPath);
    const processCanvas = createCanvas(1536, 1024);
    const processContext = processCanvas.getContext("2d");
    processContext.imageSmoothingEnabled = true;
    processContext.imageSmoothingQuality = "high";
    drawCover(
      processContext,
      source,
      0,
      0,
      processCanvas.width,
      processCanvas.height,
    );
    processImages.set(key, await processCanvas.encode("jpeg", 92));
  }

  const flags = new Map();
  for (const { iso } of countries) {
    const flagSource = await loadImage(path.join(flagRoot, `${iso.toLowerCase()}.svg`));
    const flagCanvas = createCanvas(240, 160);
    const flagContext = flagCanvas.getContext("2d");
    flagContext.clearRect(0, 0, flagCanvas.width, flagCanvas.height);
    flagContext.drawImage(flagSource, 0, 0, flagCanvas.width, flagCanvas.height);
    flags.set(iso, await flagCanvas.encode("png"));
  }
  return { logoBytes, processImages, flags };
}

export async function loadDocumentFonts(fontRoot) {
  const [normalFontBytes, boldFontBytes] = await Promise.all([
    readFile(path.join(fontRoot, "DejaVuSans.ttf")),
    readFile(path.join(fontRoot, "DejaVuSans-Bold.ttf")),
  ]);
  return { normalFontBytes, boldFontBytes };
}

export async function createLocalizedSheetPdf({
  country,
  extracted,
  sourceDocument,
  sourcePage,
  normalFontBytes,
  boldFontBytes,
  heroBytes,
  logoBytes,
  flagBytes,
  language,
  catalogRevision,
  catalogRevisionDate,
}) {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const [normal, bold, hero, logo, flag] = await Promise.all([
    document.embedFont(normalFontBytes, { subset: true }),
    document.embedFont(boldFontBytes, { subset: true }),
    document.embedJpg(heroBytes),
    document.embedPng(logoBytes),
    document.embedPng(flagBytes),
  ]);
  const page = document.addPage([576, 864]);
  const { width, height } = page.getSize();
  const copy = copyByLanguage[language];
  const countryName = language === "tr" ? country.countryTr : country.country;
  const specifications = extracted.specifications;
  const localizedGrade = language === "tr"
    ? translateCoffeeGrade(specifications.grade, "tr")
    : specifications.grade;

  document.setTitle(`${countryName} — ${localizedGrade} — Coffendi`);
  document.setAuthor("Coffendi");
  document.setSubject(copy.subject);
  document.setLanguage(copy.languageTag);
  document.setCreator("Coffendi");
  document.setProducer("Coffendi branded bilingual origin document generator");
  document.setKeywords([
    "Coffendi",
    countryName,
    language === "tr" ? "yeşil kahve" : "green coffee",
    language === "tr" ? "menşe" : "origin",
    localizedGrade,
  ]);
  document.setCreationDate(catalogRevisionDate);
  document.setModificationDate(catalogRevisionDate);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: colors.cream,
  });
  page.drawImage(hero, {
    x: 0,
    y: 600,
    width,
    height: 264,
  });
  page.drawRectangle({
    x: 0,
    y: 600,
    width: 346,
    height: 264,
    color: colors.green,
    opacity: 0.94,
  });
  page.drawRectangle({
    x: 346,
    y: 600,
    width: 2,
    height: 264,
    color: colors.gold,
    opacity: 0.88,
  });
  page.drawRectangle({
    x: 0,
    y: 857,
    width,
    height: 7,
    color: colors.gold,
  });

  // Keep the authentic transparent mark integrated with the brand field.
  // An opaque backing tile makes the logo look like a pasted thumbnail.
  page.drawImage(logo, {
    x: 29,
    y: 803,
    width: 57,
    height: 54,
  });
  page.drawText(copy.documentLabel, {
    x: 99,
    y: 835,
    size: 7.5,
    font: bold,
    color: colors.gold,
  });
  page.drawText(copy.brandLine, {
    x: 99,
    y: 817,
    size: 5.3,
    font: bold,
    color: rgb(0.76, 0.83, 0.79),
  });
  page.drawRectangle({
    x: 500,
    y: 805,
    width: 52,
    height: 38,
    color: colors.paper,
    borderColor: colors.gold,
    borderWidth: 1,
  });
  page.drawImage(flag, {
    x: 506,
    y: 812,
    width: 40,
    height: 26,
  });
  page.drawText(countryName.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en"), {
    x: 32,
    y: 774,
    size: 21.5,
    font: bold,
    color: colors.white,
  });
  drawFittedText(page, localizedGrade, {
    font: bold,
    size: 16,
    minimumSize: 10.5,
    x: 32,
    y: 736,
    maximumWidth: 292,
    color: colors.white,
    lineHeightRatio: 1.22,
    maximumLines: 3,
  });
  page.drawRectangle({
    x: 32,
    y: 616,
    width: 290,
    height: 42,
    color: colors.greenSoft,
    borderColor: rgb(0.27, 0.48, 0.39),
    borderWidth: 0.8,
  });
  drawFittedText(
    page,
    `${localize(specifications.type, language)}  •  ${localize(specifications.process, language)}`,
    {
      x: 44,
      y: 642,
      maximumWidth: 266,
      size: 8.7,
      minimumSize: 7,
      font: bold,
      color: colors.white,
      maximumLines: 2,
    },
  );

  const highlights = [
    [copy.type, localize(specifications.type, language)],
    [copy.process, localize(specifications.process, language)],
    [copy.flavor, localize(specifications.flavor, language)],
  ];
  highlights.forEach(([label, value], index) => {
    const x = 32 + (index * 174);
    page.drawRectangle({
      x,
      y: 536,
      width: index === 2 ? 164 : 158,
      height: 46,
      color: index === 1 ? colors.goldSoft : colors.paper,
      borderColor: colors.line,
      borderWidth: 0.7,
    });
    page.drawText(label, {
      x: x + 10,
      y: 567,
      size: 5.5,
      font: bold,
      color: colors.gold,
    });
    drawFittedText(page, value, {
      x: x + 10,
      y: 551,
      maximumWidth: index === 2 ? 144 : 138,
      size: 8,
      minimumSize: 6.5,
      maximumLines: 2,
      font: bold,
      color: colors.green,
      lineHeightRatio: 1.1,
    });
  });

  page.drawRectangle({
    x: 32,
    y: 300,
    width: 248,
    height: 218,
    color: colors.paper,
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: 296,
    y: 300,
    width: 248,
    height: 218,
    color: colors.paper,
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  page.drawText(copy.technical, {
    x: 46,
    y: 494,
    size: 8.5,
    font: bold,
    color: colors.green,
  });
  page.drawText(copy.sensory, {
    x: 310,
    y: 494,
    size: 7.7,
    font: bold,
    color: colors.green,
  });
  page.drawLine({
    start: { x: 46, y: 484 },
    end: { x: 266, y: 484 },
    thickness: 1.1,
    color: colors.gold,
  });
  page.drawLine({
    start: { x: 310, y: 484 },
    end: { x: 530, y: 484 },
    thickness: 1.1,
    color: colors.gold,
  });

  const compactFields = [
    ["defects", 46, 458, 102],
    ["aroma", 160, 458, 106],
    ["body", 46, 414, 102],
    ["acidity", 160, 414, 106],
    ["screen", 46, 370, 102],
    ["moisture", 160, 370, 106],
    ["packing", 46, 326, 220],
  ];
  for (const [field, x, fieldY, maximumWidth] of compactFields) {
    page.drawText(copy.fields[field].toLocaleUpperCase(language === "tr" ? "tr-TR" : "en"), {
      x,
      y: fieldY,
      size: 5.3,
      font: bold,
      color: colors.gold,
    });
    drawFittedText(page, localize(specifications[field], language), {
      font: normal,
      size: 7.7,
      minimumSize: 6.2,
      x,
      y: fieldY - 13,
      maximumWidth,
      color: colors.green,
      lineHeightRatio: 1.16,
      maximumLines: 2,
    });
  }
  for (const y of [433, 389, 345]) {
    page.drawLine({
      start: { x: 46, y },
      end: { x: 266, y },
      thickness: 0.5,
      color: colors.line,
    });
  }
  page.drawLine({
    start: { x: 152, y: 345 },
    end: { x: 152, y: 472 },
    thickness: 0.5,
    color: colors.line,
  });

  const drawListSection = (title, values, x, maximumWidth) => {
    page.drawText(title, {
      x,
      y: 458,
      size: 5.6,
      font: bold,
      color: colors.gold,
    });
    let listY = 438;
    for (const value of values.slice(0, 5)) {
      page.drawCircle({
        x: x + 3,
        y: listY + 3,
        size: 1.8,
        color: colors.gold,
      });
      const result = drawFittedText(page, localize(value, language), {
        font: normal,
        size: 7.5,
        minimumSize: 6,
        x: x + 12,
        y: listY,
        maximumWidth: maximumWidth - 12,
        color: colors.green,
        lineHeightRatio: 1.16,
        maximumLines: 2,
      });
      listY = result.bottom - 2;
    }
  };

  drawListSection(
    copy.tasting,
    extracted.tastingNotes.length ? extracted.tastingNotes : [specifications.flavor],
    310,
    98,
  );
  drawListSection(
    copy.use,
    extracted.perfectFor.length ? extracted.perfectFor : [copy.fallbackUse],
    422,
    108,
  );
  page.drawLine({
    start: { x: 416, y: 368 },
    end: { x: 416, y: 470 },
    thickness: 0.5,
    color: colors.line,
  });
  page.drawRectangle({
    x: 310,
    y: 316,
    width: 220,
    height: 42,
    color: colors.goldSoft,
    borderColor: colors.line,
    borderWidth: 0.6,
  });
  page.drawText(copy.structure, {
    x: 321,
    y: 343,
    size: 5.4,
    font: bold,
    color: colors.gold,
  });
  drawFittedText(
    page,
    `${copy.fields.body}: ${localize(specifications.body, language)}  •  ${copy.fields.acidity}: ${localize(specifications.acidity, language)}`,
    {
    x: 321,
    y: 329,
    maximumWidth: 198,
    size: 5.9,
    minimumSize: 5.1,
    maximumLines: 2,
    font: normal,
    color: colors.green,
    },
  );

  page.drawRectangle({
    x: 32,
    y: 94,
    width: 512,
    height: 184,
    color: colors.greenDeep,
    borderColor: colors.greenSoft,
    borderWidth: 0.8,
  });
  page.drawText(copy.source, {
    x: 48,
    y: 250,
    size: 6.2,
    font: bold,
    color: colors.gold,
  });
  drawFittedText(page, `${copy.sourcePage}: ${sourceDocument} • ${sourcePage}`, {
    font: bold,
    size: 8.2,
    minimumSize: 6.5,
    x: 48,
    y: 231,
    maximumWidth: 236,
    color: colors.white,
    maximumLines: 2,
  });
  drawFittedText(page, `${copy.originalGrade}: ${specifications.grade}`, {
    font: normal,
    size: 7.1,
    minimumSize: 5.8,
    x: 48,
    y: 207,
    maximumWidth: 236,
    color: rgb(0.79, 0.84, 0.81),
    maximumLines: 3,
  });
  drawFittedText(page, copy.provenance, {
    font: normal,
    size: 6.3,
    minimumSize: 5.5,
    x: 48,
    y: 163,
    maximumWidth: 236,
    color: rgb(0.68, 0.75, 0.71),
    lineHeightRatio: 1.22,
    maximumLines: 5,
  });
  page.drawLine({
    start: { x: 310, y: 112 },
    end: { x: 310, y: 260 },
    thickness: 0.55,
    color: rgb(0.22, 0.39, 0.33),
  });
  page.drawText(copy.status, {
    x: 330,
    y: 250,
    size: 6.2,
    font: bold,
    color: colors.gold,
  });
  drawFittedText(page, copy.quality, {
    x: 330,
    y: 231,
    maximumWidth: 190,
    size: 6.8,
    minimumSize: 5.7,
    maximumLines: 3,
    font: bold,
    color: colors.white,
  });
  drawFittedText(page, copy.visualProvenance, {
    font: normal,
    size: 6.25,
    minimumSize: 5.4,
    x: 330,
    y: 186,
    maximumWidth: 190,
    color: rgb(0.68, 0.75, 0.71),
    lineHeightRatio: 1.22,
    maximumLines: 5,
  });

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 70,
    color: colors.green,
  });
  page.drawText(copy.footer, {
    x: 32,
    y: 43,
    size: 6.4,
    font: bold,
    color: colors.gold,
  });
  page.drawText(`${sourceDocument} • ${sourcePage} • ${catalogRevision}`, {
    x: 32,
    y: 24,
    size: 7.2,
    font: normal,
    color: colors.white,
  });
  page.drawText("coffendi.com", {
    x: 426,
    y: 32,
    size: 7,
    font: bold,
    color: colors.white,
  });
  page.drawImage(logo, {
    x: 500,
    y: 13,
    width: 38,
    height: 36,
  });

  return Buffer.from(await document.save({
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: false,
    useObjectStreams: true,
  }));
}
