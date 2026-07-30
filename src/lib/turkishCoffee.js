const TURKISH_COFFEE_TERMS = new Map([
  ["Arabica", "Arabica"],
  ["Robusta", "Robusta"],
  ["Liberica", "Liberica"],
  ["Híbrido de Timor", "Timor hibriti"],
  ["Washed", "Yıkanmış"],
  ["Fully Washed", "Tam yıkanmış"],
  ["Natural", "Doğal işlenmiş"],
  ["Pulped Natural", "Yarı yıkanmış (pulped natural)"],
  ["Honey", "Bal yöntemi"],
  ["Honey Processed", "Bal yöntemiyle işlenmiş"],
  ["Anaerobic", "Anaerobik"],
  ["Experimental", "Deneysel"],
  ["Decaffeinated", "Kafeinsiz"],
  ["Sun-dried", "Güneşte kurutulmuş"],
  ["Monsooned (Specialty)", "Musonlanmış (nitelikli)"],
  ["Washed (Parchment)", "Yıkanmış (parşömenli)"],
  ["Wet Hulled (Giling Basah)", "Islak kabuk ayırma (Giling Basah)"],
  ["Wet Polished", "Islak parlatılmış"],
  ["Yellow / Red / Black Honey", "Sarı / kırmızı / siyah bal yöntemi"],
  ["Decaffeinated / Washed", "Kafeinsiz / yıkanmış"],
  ["Experimental / Washed", "Deneysel / yıkanmış"],
  ["Honey / Anaerobic", "Bal yöntemi / anaerobik"],
  ["Natural / Pulped Natural", "Doğal işlenmiş / yarı yıkanmış"],
  ["Sun-dried / Washed", "Güneşte kurutulmuş / yıkanmış"],
  ["Washed / Anaerobic", "Yıkanmış / anaerobik"],
  ["Washed / Honey", "Yıkanmış / bal yöntemi"],
  ["Washed / Natural", "Yıkanmış / doğal işlenmiş"],
  ["Washed / Natural / Anaerobic", "Yıkanmış / doğal işlenmiş / anaerobik"],
  ["Wet Hulled / Washed", "Islak kabuk ayırma / yıkanmış"],
  ["Berry", "Orman meyveleri"],
  ["Caramel", "Karamel"],
  ["Chocolate", "Çikolata"],
  ["Citrus", "Narenciye"],
  ["Clean Finish", "Temiz bitiş"],
  ["Cocoa", "Kakao"],
  ["Dark Chocolate", "Bitter çikolata"],
  ["Dark Cocoa", "Yoğun kakao"],
  ["Smooth Finish", "Yumuşak bitiş"],
  ["Balanced Finish", "Dengeli bitiş"],
  ["High Acidity", "Yüksek asidite"],
  ["Wild", "Yabani karakter"],
  ["Complex Berry", "Kompleks orman meyveleri"],
  ["Wild, Complex Berry", "Yabani karakter ve kompleks orman meyveleri"],
  ["Fermented Fruit", "Fermente meyve"],
  ["Floral", "Çiçeksi"],
  ["Red Fruit", "Kırmızı meyve"],
  ["Roasted Nuts", "Kavrulmuş kuruyemiş"],
  ["Spice", "Baharat"],
  ["Tropical Fruit", "Tropikal meyve"],
  ["Cocoa, caramel and roasted nuts", "Kakao, karamel ve kavrulmuş kuruyemiş"],
  ["Cocoa, spice and roasted nuts", "Kakao, baharat ve kavrulmuş kuruyemiş"],
  ["Floral, clean and refined", "Çiçeksi, temiz ve zarif"],
  ["Fruit-forward, sweet and expressive", "Meyve odaklı, tatlı ve belirgin"],
  ["Sweet, balanced and gently aromatic", "Tatlı, dengeli ve zarif aromalı"],
  ["Sweet, fruity and cocoa-rich", "Tatlı, meyvemsi ve kakao yoğunluklu"],
  ["Filter Coffee", "Filtre kahve"],
  ["French Press", "French press"],
  ["Blends", "Harmanlar"],
  ["Milk Drinks", "Sütlü içecekler"],
  ["Cold Brew", "Soğuk demleme"],
  ["Pour Over", "Pour over"],
  ["Signature", "İmza içecekler"],
  ["Espresso", "Espresso"],
  ["Decaf", "Kafeinsiz kahve"],
  ["Medium", "Orta"],
  ["Full", "Dolgun"],
  ["Low", "Düşük"],
  ["High", "Yüksek"],
  ["Medium to Full", "Orta–dolgun"],
  ["Low to Medium", "Düşük–orta"],
  ["Medium to High", "Orta–yüksek"],
  ["Lot-specific", "Lota özel"],
]);

const TURKISH_GRADE_PHRASES = [
  ["Pulped Natural (Semi-washed)", "Yarı yıkanmış (pulped natural)"],
  ["Highlands & Morobe Smallholder Regional Lots", "Yüksek Bölgeler ve Morobe küçük üretici bölgesel lotları"],
  ["Plantation Estate", "plantasyon çiftliği"],
  ["Strictly Soft Fine Cup", "Kesin yumuşak, nitelikli fincan"],
  ["Western Highlands", "Batı Yüksek Bölgeleri"],
  ["Highlands & Morobe", "Yüksek Bölgeler ve Morobe"],
  ["Pink Bourbon / Caturra Micro-lot", "Pink Bourbon / Caturra mikro lotu"],
  ["Central Valley Specialty Honey", "Central Valley nitelikli bal yöntemi"],
  ["Wild, complex berry", "Yabani karakter, kompleks orman meyveleri"],
  ["Commercial natural", "Ticari doğal işlenmiş"],
  ["Traceable Blends", "İzlenebilir harmanlar"],
  ["Coffee Plantation Estate", "kahve plantasyonu çiftliği"],
  ["Direct NKG Farm", "Doğrudan NKG çiftliği"],
  ["Premium Profile", "Üst sınıf profil"],
  ["Pulped Natural", "Yarı yıkanmış (pulped natural)"],
  ["Northern Province", "Kuzey Bölgesi"],
  ["Bolavens Plateau", "Bolavens Platosu"],
  ["Bolaven Plateau", "Bolaven Platosu"],
  ["Boquete Valley", "Boquete Vadisi"],
  ["Pu'er Region", "Pu’er Bölgesi"],
  ["East Coast", "Doğu Kıyısı"],
  ["Elite Grade", "Elit sınıf"],
  ["High Quality", "Yüksek kalite"],
  ["Large Screen", "İri elek"],
  ["Black/Broken", "siyah/kırık"],
  ["Shade-Grown", "Gölgede yetiştirilmiş"],
  ["Super Fine", "Süper nitelikli"],
  ["Extra Bold", "Ekstra iri"],
  ["Extra Prima", "Ekstra Prima"],
  ["Monsooned", "Musonlanmış"],
  ["Parchment", "Parşömen"],
  ["Tanzanian", "Tanzanya"],
  ["Micro-lot", "Mikro lot"],
  ["Plateau", "Platosu"],
  ["Highlands", "Yüksek bölgeler"],
  ["Hills", "Tepeleri"],
  ["Valley", "Vadisi"],
  ["Lots", "Lotları"],
  ["Direct NKG Corporate Farm", "Doğrudan NKG kurumsal çiftliği"],
  ["Traceable Smallholder Cooperatives", "İzlenebilir küçük üretici kooperatifleri"],
  ["Proprietary Sugarcane Process Decaf", "Tescilli şeker kamışı yöntemiyle kafeinsizleştirilmiş"],
  ["Rainforest Alliance", "Rainforest Alliance"],
  ["High density, high floral", "Yüksek yoğunluk, yoğun çiçeksilik"],
  ["Highland Specialty Yeast & Anaerobic Lots", "Yüksek rakım nitelikli maya ve anaerobik lotları"],
  ["Standard Smallholder, formerly PSC", "Standart küçük üretici, eski adı PSC"],
  ["Screen 17+ / 6.75mm, formerly PLT", "Elek 17+ / 6,75 mm, eski adı PLT"],
  ["Screen 15+ Premium", "Elek 15+ üst sınıf"],
  ["Screen 18+ / 7mm Premium", "Elek 18+ / 7 mm üst sınıf"],
  ["Screen 17/18, 7.14mm", "Elek 17/18, 7,14 mm"],
  ["Screen 15/16, 6.35mm", "Elek 15/16, 6,35 mm"],
  ["Screen 17/18, European Prep", "Elek 17/18, Avrupa hazırlığı"],
  ["Screen 15/16, Standard Export", "Elek 15/16, standart ihracat"],
  ["Screen 15/16", "Elek 15/16"],
  ["Screen 17/18", "Elek 17/18"],
  ["Screen 19, Unwashed", "Elek 19, yıkanmamış"],
  ["Screen 19, Premium", "Elek 19, üst sınıf"],
  ["Screen 18, No defects", "Elek 18, kusursuz"],
  ["Screen 18+ Clean", "Elek 18+ temiz"],
  ["Screen 18+", "Elek 18+"],
  ["Screen 17+", "Elek 17+"],
  ["Screen 16+ Premium Profile", "Elek 16+ üst sınıf profil"],
  ["Screen 16 Extra", "Elek 16 ekstra"],
  ["Screen 15+ class", "Elek 15+ sınıf"],
  ["Screen 15+", "Elek 15+"],
  ["Screen 14+", "Elek 14+"],
  ["Highland Catimor", "Yüksek rakım Catimor"],
  ["Single-Origin Specialty", "Tek menşe nitelikli"],
  ["Single Origin Specialty", "Tek menşe nitelikli"],
  ["High Mountain Honey", "Yüksek dağ bal yöntemi"],
  ["Strictly Hard Bean", "Kesin sert çekirdek"],
  ["High Grown", "Yüksek rakımda yetişmiş"],
  ["Premium Smallholder Coffee", "Üst sınıf küçük üretici kahvesi"],
  ["Premium bold line", "Üst sınıf iri çekirdek serisi"],
  ["Regional Selected Lots", "Seçilmiş bölgesel lotlar"],
  ["Regional Selects", "Bölgesel seçkiler"],
  ["Regional Blends", "Bölgesel harmanlar"],
  ["Regional Lots", "Bölgesel lotlar"],
  ["Regional Specialty", "Bölgesel nitelikli"],
  ["Micro-lot Specialty", "Nitelikli mikro lot"],
  ["Specialty micro-lot", "Nitelikli mikro lot"],
  ["Commercial grading block", "Ticari sınıflandırma grubu"],
  ["Lowland commercial", "Alçak rakım ticari sınıf"],
  ["Standard export class", "Standart ihracat sınıfı"],
  ["Standard export", "Standart ihracat"],
  ["Standard Export", "Standart ihracat"],
  ["Main Crop Export Classifications", "Ana hasat ihracat sınıfları"],
  ["Government Estate", "Devlet çiftliği"],
  ["Estate Quality", "Çiftlik kalitesi"],
  ["Certified Estate", "Sertifikalı çiftlik"],
  ["Certified Grade", "Sertifikalı sınıf"],
  ["Certified Quality", "Sertifikalı kalite"],
  ["European Prep", "Avrupa hazırlığı"],
  ["Double Picked", "Çift seçilmiş"],
  ["Color/Magnetically Sorted", "Renk ve mıknatısla ayrıştırılmış"],
  ["Cardamom & Pepper Intercropped", "Kakule ve karabiberle birlikte yetiştirilmiş"],
  ["Exposed to monsoon winds", "Muson rüzgârlarına maruz bırakılmış"],
  ["Dried Uganda Arabica, Rwenzori", "Kurutulmuş Uganda Arabica, Rwenzori"],
  ["Washed Uganda Arabica, Mt. Elgon", "Yıkanmış Uganda Arabica, Elgon Dağı"],
  ["Elephant Bean, massive size fusion", "Fil çekirdeği, çok iri boy"],
  ["Elephant Bean", "Fil çekirdeği"],
  ["Peaberry, round mutated sorting", "Peaberry, yuvarlak doğal mutasyon seçimi"],
  ["dry-milled pods", "kuru yöntemle ayrılmış kabuklu çekirdek"],
  ["Volcanic soil class", "Volkanik toprak sınıfı"],
  ["High acidity lot", "Yüksek asiditeli lot"],
  ["Semi-washed", "Yarı yıkanmış"],
  ["Fully Washed", "Tam yıkanmış"],
  ["Washed", "Yıkanmış"],
  ["Unwashed", "Yıkanmamış"],
  ["Natural", "Doğal işlenmiş"],
  ["Organic", "Organik"],
  ["Specialty", "Nitelikli"],
  ["Commercial", "Ticari"],
  ["Premium", "Üst sınıf"],
  ["Standard", "Standart"],
  ["Regional", "Bölgesel"],
  ["Highland", "Yüksek rakım"],
  ["Highlands", "Yüksek rakımlar"],
  ["Smallholder", "Küçük üretici"],
  ["Plantation", "Plantasyon"],
  ["Estate", "Çiftlik"],
  ["Blend", "Harman"],
  ["Blends", "Harmanlar"],
  ["Grade", "Sınıf"],
  ["Class", "Sınıf"],
  ["Screen", "Elek"],
  ["Clean", "Temiz"],
  ["Genuine", "Özgün"],
  ["Fine Cup", "Nitelikli fincan"],
  ["Good Cup", "İyi fincan"],
];

function translateDelimited(value) {
  if (TURKISH_COFFEE_TERMS.has(value)) return TURKISH_COFFEE_TERMS.get(value);

  if (value.includes(" · ")) {
    return value.split(" · ").map(translateDelimited).join(" · ");
  }
  if (value.includes(", ")) {
    return value.split(", ").map(translateDelimited).join(", ");
  }

  const screen = value.match(/^Screen\s+(.+)$/i);
  if (screen) return `Elek ${screen[1]}`;

  const defects = value.match(/^([≤<>]?\s*\d+(?:-\d+)?)\s+(?:defects|imperfections)(?:\/300g)?$/i);
  if (defects) {
    const amount = defects[1].replace(/\s+/g, "");
    const number = amount.replace(/^[≤<>]/, "");
    const localizedAmount = amount.startsWith("≤")
      ? `en fazla ${number}`
      : amount.startsWith("<")
        ? `${number}’den az`
        : amount.startsWith(">")
          ? `${number}’den fazla`
          : number;
    return value.includes("/300g")
      ? `300 g’da ${localizedAmount} kusur`
      : `${localizedAmount} kusur`;
  }

  const moisture = value.match(/^([≤<]?\s*\d+(?:\.\d+)?)%\s+target$/i);
  if (moisture) {
    const amount = moisture[1].replace(".", ",").replace(/\s+/g, "");
    const number = amount.replace(/^[≤<]/, "");
    return amount.startsWith("≤")
      ? `Hedef: en fazla %${number}`
      : amount.startsWith("<")
        ? `Hedef: %${number}’den az`
        : `Hedef: %${number}`;
  }

  const moistureLimit = value.match(/^([≤<>]?\s*\d+(?:\.\d+)?)%$/i);
  if (moistureLimit) {
    const amount = moistureLimit[1].replace(".", ",").replace(/\s+/g, "");
    const number = amount.replace(/^[≤<>]/, "");
    if (amount.startsWith("≤")) return `En fazla %${number}`;
    if (amount.startsWith("<")) return `%${number}’den az`;
    if (amount.startsWith(">")) return `%${number}’den fazla`;
    return `%${number}`;
  }

  const packing = value.match(/^(\d+)\s*Kg\s+GrainPro-lined sack$/i);
  if (packing) return `GrainPro astarlı ${packing[1]} kg çuval`;

  return value;
}

export function translateCoffeeValue(value, language) {
  if (language !== "tr" || typeof value !== "string" || !value.trim()) return value;
  return translateDelimited(value.trim());
}

export function translateCoffeeGrade(value, language) {
  if (language !== "tr" || typeof value !== "string" || !value.trim()) return value;
  return [...TURKISH_GRADE_PHRASES]
    .sort(([sourceA], [sourceB]) => sourceB.length - sourceA.length)
    .reduce(
    (translated, [source, target]) => translated.replaceAll(source, target),
    value.trim(),
  )
    .replace(/(\d)\.(\d)/g, "$1,$2")
    .replace(/\s+&\s+/g, " ve ")
    .replace(/\s{2,}/g, " ");
}

export function translateCoffeeList(values = [], language = "tr") {
  return values.map((value) => translateCoffeeValue(value, language));
}

export function normalizeCoffeeSearch(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[’']/g, "");
}

export function localizeCatalogWebsiteProfile(catalog) {
  const profile = catalog.websiteProfile;
  const sheetCount = catalog.sheetCount;
  const types = translateCoffeeList(catalog.types);
  const flavors = translateCoffeeList(catalog.flavors);
  const typeSummary = new Intl.ListFormat("tr-TR", {
    style: "long",
    type: "conjunction",
  }).format(types);
  const flavorSummary = flavors.length
    ? ` Öne çıkan fincan notaları: ${flavors.join(" · ")}.`
    : "";

  return {
    ...profile,
    name: {
      ...profile.name,
      tr: `${typeSummary} menşe portföyü`,
    },
    process: {
      ...profile.process,
      tr: translateCoffeeValue(profile.process.en, "tr"),
    },
    profile: {
      ...profile.profile,
      tr: `Bu ülkenin kaynak arşivinde ${typeSummary} kategorisinde ${sheetCount} teknik föy bulunur.${flavorSummary}`,
    },
    use: {
      ...profile.use,
      tr: translateCoffeeValue(profile.use.en, "tr"),
    },
    directions: profile.directions.map((direction) => ({
      ...direction,
      name: typeof direction.name === "object"
        ? direction.name
        : {
          en: direction.name,
          tr: direction.name,
        },
      process: {
        ...direction.process,
        tr: translateCoffeeValue(direction.process.en, "tr"),
      },
      cup: {
        ...direction.cup,
        tr: translateCoffeeValue(direction.cup.en, "tr"),
      },
    })),
  };
}
