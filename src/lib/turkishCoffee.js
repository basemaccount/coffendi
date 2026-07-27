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
  ["Medium", "Orta"],
  ["Full", "Dolgun"],
  ["Low", "Düşük"],
  ["High", "Yüksek"],
  ["Medium to Full", "Orta–dolgun"],
  ["Low to Medium", "Düşük–orta"],
  ["Medium to High", "Orta–yüksek"],
  ["Lot-specific", "Lota özel"],
]);

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
    return value.includes("/300g") ? `300 g'da ${amount} kusur` : `${amount} kusur`;
  }

  const moisture = value.match(/^([≤<]?\s*\d+(?:\.\d+)?)%\s+target$/i);
  if (moisture) return `Hedef ${moisture[1].replace(".", ",").replace(/\s+/g, "")}%`;

  const moistureLimit = value.match(/^([≤<>]?\s*\d+(?:\.\d+)?)%$/i);
  if (moistureLimit) return `${moistureLimit[1].replace(".", ",").replace(/\s+/g, "")}%`;

  const packing = value.match(/^(\d+)\s*Kg\s+GrainPro-lined sack$/i);
  if (packing) return `GrainPro astarlı ${packing[1]} kg çuval`;

  return value;
}

export function translateCoffeeValue(value, language) {
  if (language !== "tr" || typeof value !== "string" || !value.trim()) return value;
  return translateDelimited(value.trim());
}

export function translateCoffeeList(values = [], language = "tr") {
  return values.map((value) => translateCoffeeValue(value, language));
}

export function localizeCatalogWebsiteProfile(catalog) {
  const profile = catalog.websiteProfile;
  const country = catalog.country.tr;
  const sheetCount = catalog.sheetCount;
  const types = translateCoffeeList(catalog.types);
  const flavors = translateCoffeeList(catalog.flavors);
  const typeSummary = new Intl.ListFormat("tr-TR", {
    style: "long",
    type: "conjunction",
  }).format(types);
  const sheetLabel = sheetCount === 1 ? "teknik föy" : "teknik föy";
  const flavorSummary = flavors.length
    ? ` Öne çıkan fincan notaları: ${flavors.join(" · ")}.`
    : "";

  return {
    ...profile,
    name: {
      ...profile.name,
      tr: `${country} yeşil kahve portföyü`,
    },
    process: {
      ...profile.process,
      tr: translateCoffeeValue(profile.process.en, "tr"),
    },
    profile: {
      ...profile.profile,
      tr: `${typeSummary} kategorisinde kaynağı belgelenmiş ${sheetCount} ${sheetLabel}.${flavorSummary}`,
    },
    use: {
      ...profile.use,
      tr: translateCoffeeValue(profile.use.en, "tr"),
    },
    directions: profile.directions.map((direction) => ({
      ...direction,
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
