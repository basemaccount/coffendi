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
  cream: rgb(0.98, 0.96, 0.91),
  paper: rgb(1, 0.992, 0.965),
  green: rgb(0.07, 0.22, 0.18),
  greenSoft: rgb(0.12, 0.31, 0.25),
  gold: rgb(0.76, 0.52, 0.2),
  muted: rgb(0.34, 0.39, 0.36),
  line: rgb(0.83, 0.79, 0.7),
  white: rgb(1, 1, 1),
};

const copyByLanguage = {
  en: {
    languageTag: "en",
    documentLabel: "ENGLISH ORIGIN SHEET",
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
    quality: "Selectable text  •  Embedded fonts  •  270 PPI preview",
    visualProvenance: "Visuals: source-provided origin context + an illustrative, non-country-specific process image.",
    footer: "Source-backed technical sheet",
    provenance: "Technical values are generated directly from the named English source page without changing the commercial specification.",
    fallbackUse: "Application confirmed during inquiry",
  },
  tr: {
    languageTag: "tr-TR",
    documentLabel: "TÜRKÇE MENŞE FÖYÜ",
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
  const sourceWidth = 930;
  drawCover(
    context,
    sourceImage,
    0,
    0,
    sourceWidth,
    canvas.height,
    seededFocus(seed, 1),
    seededFocus(seed, 2),
  );
  drawCover(
    context,
    processImage,
    sourceWidth + gutter,
    0,
    canvas.width - sourceWidth - gutter,
    canvas.height,
    seededFocus(seed, 3),
    seededFocus(seed, 4),
  );

  const sourceShade = context.createLinearGradient(0, 0, sourceWidth, 0);
  sourceShade.addColorStop(0, "rgba(8,36,29,.22)");
  sourceShade.addColorStop(0.68, "rgba(8,36,29,0)");
  sourceShade.addColorStop(1, "rgba(8,36,29,.14)");
  context.fillStyle = sourceShade;
  context.fillRect(0, 0, sourceWidth, canvas.height);

  const lowerShade = context.createLinearGradient(0, 390, 0, canvas.height);
  lowerShade.addColorStop(0, "rgba(8,36,29,0)");
  lowerShade.addColorStop(1, "rgba(8,36,29,.4)");
  context.fillStyle = lowerShade;
  context.fillRect(0, 390, canvas.width, canvas.height - 390);

  context.fillStyle = "#c78634";
  context.fillRect(sourceWidth + 6, 0, 8, canvas.height);
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
  const logoCanvas = createCanvas(420, 400);
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
    y: 614,
    width,
    height: 250,
  });
  page.drawRectangle({
    x: 0,
    y: 614,
    width: 382,
    height: 250,
    color: colors.green,
    opacity: 0.91,
  });
  page.drawRectangle({
    x: 0,
    y: 856,
    width,
    height: 8,
    color: colors.gold,
  });
  page.drawRectangle({
    x: 24,
    y: 794,
    width: 52,
    height: 50,
    color: colors.cream,
    opacity: 0.97,
  });
  page.drawImage(logo, {
    x: 28,
    y: 798,
    width: 44,
    height: 42,
  });
  page.drawText(copy.documentLabel, {
    x: 88,
    y: 828,
    size: 7.8,
    font: bold,
    color: colors.gold,
  });
  page.drawRectangle({
    x: 504,
    y: 806,
    width: 44,
    height: 30,
    color: colors.white,
    opacity: 0.96,
    borderColor: colors.gold,
    borderWidth: 0.7,
  });
  page.drawImage(flag, {
    x: 508,
    y: 809,
    width: 36,
    height: 24,
  });
  page.drawText(countryName.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en"), {
    x: 32,
    y: 778,
    size: 22,
    font: bold,
    color: colors.white,
  });
  drawFittedText(page, localizedGrade, {
    font: bold,
    size: 16.5,
    minimumSize: 10.5,
    x: 32,
    y: 742,
    maximumWidth: 322,
    color: colors.white,
    lineHeightRatio: 1.22,
    maximumLines: 3,
  });
  page.drawRectangle({
    x: 32,
    y: 630,
    width: 326,
    height: 44,
    color: colors.greenSoft,
    borderColor: rgb(0.24, 0.43, 0.36),
    borderWidth: 0.8,
  });
  drawFittedText(
    page,
    `${localize(specifications.type, language)}  •  ${localize(specifications.process, language)}`,
    {
      x: 44,
      y: 648,
      maximumWidth: 302,
      size: 9,
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
      y: 557,
      width: index === 2 ? 164 : 158,
      height: 42,
      color: index === 1 ? rgb(0.94, 0.9, 0.82) : colors.paper,
      borderColor: colors.line,
      borderWidth: 0.7,
    });
    page.drawText(label, {
      x: x + 10,
      y: 584,
      size: 5.7,
      font: bold,
      color: colors.gold,
    });
    drawFittedText(page, value, {
      x: x + 10,
      y: 570,
      maximumWidth: index === 2 ? 144 : 138,
      size: 8.2,
      minimumSize: 6.5,
      maximumLines: 2,
      font: bold,
      color: colors.green,
      lineHeightRatio: 1.1,
    });
  });

  page.drawRectangle({
    x: 32,
    y: 94,
    width: 248,
    height: 440,
    color: colors.paper,
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: 296,
    y: 94,
    width: 248,
    height: 440,
    color: colors.paper,
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  page.drawText(copy.technical, {
    x: 46,
    y: 510,
    size: 9,
    font: bold,
    color: colors.green,
  });
  page.drawText(copy.sensory, {
    x: 310,
    y: 510,
    size: 8.2,
    font: bold,
    color: colors.green,
  });
  page.drawLine({
    start: { x: 46, y: 499 },
    end: { x: 266, y: 499 },
    thickness: 1.3,
    color: colors.gold,
  });
  page.drawLine({
    start: { x: 310, y: 499 },
    end: { x: 530, y: 499 },
    thickness: 1.3,
    color: colors.gold,
  });

  const fields = [
    "defects",
    "aroma",
    "body",
    "acidity",
    "screen",
    "moisture",
    "packing",
  ];
  let fieldY = 479;
  for (const field of fields) {
    page.drawText(copy.fields[field].toLocaleUpperCase(language === "tr" ? "tr-TR" : "en"), {
      x: 46,
      y: fieldY,
      size: 5.8,
      font: bold,
      color: colors.gold,
    });
    const result = drawFittedText(page, localize(specifications[field], language), {
      font: normal,
      size: 8.5,
      minimumSize: 6.8,
      x: 46,
      y: fieldY - 12,
      maximumWidth: 220,
      color: colors.green,
      lineHeightRatio: 1.2,
      maximumLines: 2,
    });
    fieldY = result.bottom - 7;
    page.drawLine({
      start: { x: 46, y: fieldY + 2 },
      end: { x: 266, y: fieldY + 2 },
      thickness: 0.5,
      color: colors.line,
    });
  }

  let rightY = 479;
  const drawListSection = (title, values) => {
    page.drawText(title, {
      x: 310,
      y: rightY,
      size: 6.3,
      font: bold,
      color: colors.gold,
    });
    rightY -= 16;
    for (const value of values.slice(0, 5)) {
      page.drawCircle({
        x: 314,
        y: rightY + 3,
        size: 2.1,
        color: colors.gold,
      });
      const result = drawFittedText(page, localize(value, language), {
        font: normal,
        size: 8.4,
        minimumSize: 6.8,
        x: 324,
        y: rightY,
        maximumWidth: 202,
        color: colors.green,
        lineHeightRatio: 1.18,
        maximumLines: 2,
      });
      rightY = result.bottom - 2;
    }
    rightY -= 7;
  };

  drawListSection(
    copy.tasting,
    extracted.tastingNotes.length ? extracted.tastingNotes : [specifications.flavor],
  );
  drawListSection(
    copy.use,
    extracted.perfectFor.length ? extracted.perfectFor : [copy.fallbackUse],
  );

  page.drawText(copy.source, {
    x: 310,
    y: rightY,
    size: 6.3,
    font: bold,
    color: colors.gold,
  });
  rightY -= 16;
  const sourceResult = drawFittedText(
    page,
    `${copy.sourcePage}: ${sourceDocument} • ${sourcePage}`,
    {
      font: normal,
      size: 7.8,
      minimumSize: 6.5,
      x: 310,
      y: rightY,
      maximumWidth: 220,
      color: colors.green,
      maximumLines: 2,
    },
  );
  rightY = sourceResult.bottom - 4;
  const gradeResult = drawFittedText(
    page,
    `${copy.originalGrade}: ${specifications.grade}`,
    {
      font: normal,
      size: 7.2,
      minimumSize: 5.8,
      x: 310,
      y: rightY,
      maximumWidth: 220,
      color: colors.green,
      maximumLines: 3,
    },
  );
  rightY = gradeResult.bottom - 5;
  drawFittedText(page, copy.provenance, {
    font: normal,
    size: 6.8,
    minimumSize: 5.8,
    x: 310,
    y: rightY,
    maximumWidth: 220,
    color: colors.muted,
    lineHeightRatio: 1.22,
    maximumLines: 5,
  });
  drawFittedText(page, copy.visualProvenance, {
    font: normal,
    size: 6.2,
    minimumSize: 5.5,
    x: 310,
    y: 214,
    maximumWidth: 220,
    color: colors.muted,
    lineHeightRatio: 1.2,
    maximumLines: 4,
  });

  page.drawRectangle({
    x: 310,
    y: 112,
    width: 220,
    height: 54,
    color: rgb(0.94, 0.9, 0.82),
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  page.drawText(copy.status, {
    x: 322,
    y: 145,
    size: 5.8,
    font: bold,
    color: colors.gold,
  });
  drawFittedText(page, copy.quality, {
    x: 322,
    y: 130,
    maximumWidth: 196,
    size: 6.3,
    minimumSize: 5.5,
    maximumLines: 2,
    font: normal,
    color: colors.green,
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
    x: 424,
    y: 32,
    size: 7,
    font: bold,
    color: colors.white,
  });
  page.drawImage(logo, {
    x: 492,
    y: 15,
    width: 34,
    height: 32,
  });

  return Buffer.from(await document.save({
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: false,
    useObjectStreams: true,
  }));
}
