const clientEnvironment = import.meta.env || {};

function readPrice(key) {
  const value = Number(clientEnvironment[key]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export const storeCurrency = clientEnvironment.VITE_STORE_CURRENCY || "USD";

export const products = [
  {
    id: "spray-dried",
    number: "01",
    name: "Spray dried coffee",
    shortName: "Spray dried",
    image: "/images/instant-spray-dried.webp",
    alt: "Fine spray-dried instant coffee powder in a cream ceramic bowl",
    priceCents: readPrice("VITE_PRICE_SPRAY_DRIED_CENTS"),
    descriptor: "Fine · adaptable · efficient",
    intro:
      "A smooth, free-flowing soluble coffee powder designed for dependable preparation and flexible flavour development.",
    story:
      "Concentrated coffee extract is atomised into a stream of heated air. The fine droplets dry rapidly into an even powder that is straightforward to dose, blend and pack.",
    profile: "A practical canvas for balanced, classic and milk-friendly coffee profiles.",
    cupDirection: "Balanced & milk-friendly",
    decisionCue: "Versatility & efficiency",
    format: "Fine, uniform powder",
    idealFor: "Everyday cups, food service, vending, mixes and recipe development",
    processLabel: "Atomised and dried with hot air",
    tone: "clay",
  },
  {
    id: "agglomerated",
    number: "02",
    name: "Agglomerated coffee",
    shortName: "Agglomerated",
    image: "/images/instant-agglomerated.webp",
    alt: "Rounded porous agglomerated instant coffee granules in a smoked-glass bowl",
    priceCents: readPrice("VITE_PRICE_AGGLOMERATED_CENTS"),
    descriptor: "Granulated · inviting · easy to dose",
    intro:
      "Rounded, porous granules with a familiar premium appearance and an easy-pouring format for the everyday cup.",
    story:
      "Fine soluble coffee particles are carefully moistened and brought together into larger clusters, then dried again to create their distinctive porous granulated structure.",
    profile: "A polished middle ground between fine powder and premium freeze-dried crystals.",
    cupDirection: "Smooth & familiar",
    decisionCue: "Everyday premium",
    format: "Rounded, porous granules",
    idealFor: "Retail jars, hospitality, office coffee and private-label concepts",
    processLabel: "Fine particles clustered into granules",
    tone: "caramel",
  },
  {
    id: "freeze-dried",
    number: "03",
    name: "Freeze dried coffee",
    shortName: "Freeze dried",
    image: "/images/instant-freeze-dried.webp",
    alt: "Large angular freeze-dried instant coffee crystals in an amber-glass bowl",
    priceCents: readPrice("VITE_PRICE_FREEZE_DRIED_CENTS"),
    descriptor: "Crystalline · aromatic · premium",
    intro:
      "Large, angular crystals made for an elevated cup experience, with a distinctive appearance and aromatic focus.",
    story:
      "Coffee extract is frozen before water is removed under vacuum by sublimation. The low-temperature drying route produces the format’s recognisable airy crystals.",
    profile: "The premium choice when aroma, visual texture and a refined cup are the priority.",
    cupDirection: "Aromatic & refined",
    decisionCue: "Premium presentation",
    format: "Large, irregular crystals",
    idealFor: "Premium retail, gifting, hospitality and elevated private-label ranges",
    processLabel: "Frozen, then dried under vacuum",
    tone: "espresso",
  },
];

export function getProduct(id) {
  return products.find((product) => product.id === id);
}

export function formatPrice(priceCents) {
  if (!priceCents) return "Price confirmed at checkout";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: storeCurrency,
  }).format(priceCents / 100);
}

export const learningCards = [
  {
    label: "Coffee, made soluble",
    title: "From roasted bean to instant cup",
    copy: "Follow selection, roasting, extraction, concentration and the final drying decision.",
    to: "/learn#how-it-is-made",
  },
  {
    label: "Texture matters",
    title: "Powder, granule or crystal?",
    copy: "See how the three formats differ in appearance, handling and market position.",
    to: "/learn#compare-formats",
  },
  {
    label: "A better brief",
    title: "What to specify for bulk",
    copy: "Build a useful request around format, cup direction, packaging, volume and destination.",
    to: "/bulk",
  },
];

export const sustainabilityPillars = [
  {
    id: "climate",
    title: "Climate & energy",
    copy: "Map energy sources, production emissions and practical reduction plans across processing.",
  },
  {
    id: "water",
    title: "Water stewardship",
    copy: "Measure water intensity, treatment and reuse where extraction and cleaning make it material.",
  },
  {
    id: "supply",
    title: "Responsible supply",
    copy: "Set clear expectations for origin traceability, supplier due diligence and human rights.",
  },
  {
    id: "circularity",
    title: "Circular packaging",
    copy: "Prioritise right-sized formats, recyclable structures and less waste across retail and bulk.",
  },
];
