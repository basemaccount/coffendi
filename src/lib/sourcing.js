const PROFILE_GROUPS = {
  "Fruit-forward": ["fruit", "berry", "grape", "plum", "apricot", "pineapple", "tropical", "red fruit"],
  "Chocolate & nuts": ["chocolate", "cacao", "cocoa", "hazelnut", "almond", "praline", "nut", "dark cocoa"],
  "Floral & bright": ["jasmine", "rose", "tea", "citrus", "grapefruit", "floral", "clean finish"],
  Balanced: ["caramel", "toffee", "sugar", "apple", "balanced", "clean"],
  "Classic espresso": ["cocoa", "chocolate", "roasted nuts", "spice", "caramel", "dark chocolate"],
};

const PROCESS_ALIASES = {
  Washed: ["washed", "fully washed"],
  Natural: ["natural", "dry processed", "unwashed"],
  Honey: ["honey", "pulped natural"],
  Anaerobic: ["anaerobic", "yeast", "fermentation", "experimental"],
};

const WAREHOUSES = ["Mersin", "Hamburg", "Rotterdam", "Antwerp"];

const CERTIFICATIONS = [
  "Organic",
  "Fairtrade",
  "Rainforest Alliance",
  "Verified traceable",
  "Women produced",
];

export const sourcingProfiles = Object.keys(PROFILE_GROUPS);
export const sourcingProcesses = Object.keys(PROCESS_ALIASES);
export const sourcingWarehouses = WAREHOUSES;
export const sourcingCertifications = CERTIFICATIONS;

export const defaultSourcingBrief = {
  budget: "6-8",
  volume: "20-60 bags",
  origin: "Open",
  flavor: "Fruit-forward",
  process: "Open",
  certification: "Any",
  delivery: "Mersin",
  use: "Filter coffee",
  channel: "Live + atlas",
};

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function budgetMax(value) {
  if (value === "Under 6") return 6;
  if (value === "6-8" || value === "6–8") return 8;
  if (value === "8+") return 12;
  const numeric = clean(value).match(/(\d+(?:\.\d+)?)/g);
  if (!numeric?.length) return 12;
  return Math.max(...numeric.map(Number));
}

function volumeFloor(value) {
  const numeric = clean(value).match(/(\d+)/g);
  if (!numeric?.length) return 1;
  if (clean(value).toLowerCase().includes("under")) return 1;
  return Math.min(...numeric.map(Number));
}

export function buildSourcingItems(coffees, atlasProfiles) {
  const liveItems = coffees.map((coffee) => ({
    id: coffee.id,
    sourceType: "live",
    sourceLabel: "Live lot",
    name: coffee.name,
    country: coffee.country,
    region: coffee.region,
    process: coffee.process,
    quality: coffee.quality,
    flavor: coffee.flavor,
    tastingText: coffee.flavor.join(" "),
    certifications: coffee.certification,
    scoreLabel: `${coffee.score} pts`,
    scoreValue: coffee.score,
    bags: coffee.bags,
    bagSize: coffee.bagSize,
    warehouse: coffee.warehouse,
    deliveryLabel: coffee.warehouse,
    price: coffee.price,
    priceValue: coffee.priceValue,
    status: coffee.status,
    availability: coffee.availability,
    image: coffee.image,
    href: `/coffees/${coffee.id}`,
    actionLabel: "Request sample",
    searchText: [
      coffee.name,
      coffee.country,
      coffee.region,
      coffee.producer,
      coffee.process,
      coffee.quality,
      coffee.status,
      coffee.availability,
      coffee.warehouse,
      coffee.price,
      ...coffee.flavor,
      ...coffee.certification,
    ].join(" "),
  }));

  const atlasItems = atlasProfiles.map((grade) => ({
    id: grade.id,
    sourceType: "atlas",
    sourceLabel: "Makendi atlas",
    name: grade.shortGrade,
    country: grade.country,
    region: "Source profile",
    process: grade.processDisplay,
    quality: grade.coffeeType,
    flavor: grade.tastingNotes,
    tastingText: grade.tastingNotes.join(" "),
    certifications: [],
    scoreLabel: `Source #${String(grade.sourceNumber).padStart(3, "0")}`,
    scoreValue: null,
    bags: null,
    bagSize: null,
    warehouse: "Inquiry led",
    deliveryLabel: "Confirm by inquiry",
    price: "Request commercial terms",
    priceValue: null,
    status: "Planning",
    availability: "Grade profile",
    image: grade.image,
    href: `/atlas/${grade.id}`,
    actionLabel: "Add to brief",
    searchText: grade.searchText,
    sourceNumber: grade.sourceNumber,
  }));

  return [...liveItems, ...atlasItems];
}

export function normalizeSourcingBrief(brief = {}) {
  return {
    ...defaultSourcingBrief,
    ...brief,
    budget: brief.budget || defaultSourcingBrief.budget,
    volume: brief.volume || defaultSourcingBrief.volume,
    origin: brief.origin || "Open",
    flavor: brief.flavor || defaultSourcingBrief.flavor,
    process: brief.process || "Open",
    certification: brief.certification || "Any",
    delivery: brief.delivery || defaultSourcingBrief.delivery,
    use: brief.use || defaultSourcingBrief.use,
    channel: brief.channel || defaultSourcingBrief.channel,
  };
}

function scoreFlavor(item, flavor) {
  const terms = PROFILE_GROUPS[flavor] || PROFILE_GROUPS.Balanced;
  const text = `${item.tastingText} ${item.searchText}`;
  const hits = terms.filter((term) => lower(text).includes(lower(term)));
  return {
    points: hits.length ? Math.min(22, 10 + hits.length * 4) : 0,
    hits: unique(hits.slice(0, 3)),
  };
}

function scoreProcess(item, process) {
  if (process === "Open") return { points: 6, reason: "process kept open" };
  const terms = PROCESS_ALIASES[process] || [process];
  return includesAny(item.process, terms) || includesAny(item.searchText, terms)
    ? { points: 12, reason: `${process.toLowerCase()} process fit` }
    : { points: 0, reason: "" };
}

function scoreBudget(item, brief) {
  const max = budgetMax(brief.budget);
  if (item.sourceType === "atlas") {
    return {
      points: brief.channel === "Live lots only" ? 0 : 5,
      reason: "commercial terms need confirmation",
      caution: "Makendi source rows do not include price or shipment terms.",
    };
  }
  if (item.priceValue <= max) {
    return { points: 14, reason: `${item.price} fits the budget ceiling` };
  }
  const overage = item.priceValue - max;
  return {
    points: overage <= 1 ? 5 : 0,
    reason: overage <= 1 ? "slightly above target budget" : "",
    caution: overage > 1 ? `${item.price} is above the selected budget.` : "",
  };
}

function scoreVolume(item, brief) {
  const floor = volumeFloor(brief.volume);
  if (item.sourceType === "atlas") {
    return {
      points: brief.channel === "Live lots only" ? 0 : 5,
      reason: "useful for forward planning",
      caution: "Available bags must be confirmed by Coffendi.",
    };
  }
  if ((item.bags || 0) >= floor) {
    return { points: 10, reason: `${item.bags} bags supports the requested volume` };
  }
  if (item.status === "Forward") {
    return { points: 5, reason: "forward position can be discussed for volume planning" };
  }
  return {
    points: 1,
    reason: "",
    caution: `${item.bags || 0} bags may be below the requested volume.`,
  };
}

function scoreOrigin(item, origin) {
  if (origin === "Open") return { points: 7, reason: "origin kept open" };
  return item.country === origin
    ? { points: 13, reason: `${origin} origin match` }
    : { points: 0, reason: "" };
}

function scoreCertification(item, certification) {
  if (certification === "Any") return { points: 5, reason: "no certification constraint" };
  if (item.certifications.includes(certification)) {
    return { points: 10, reason: `${certification} available` };
  }
  if (item.sourceType === "atlas") {
    return {
      points: 1,
      reason: "",
      caution: `${certification} is not stated in the Makendi grade row.`,
    };
  }
  return { points: 0, reason: "", caution: `${certification} is not listed for this lot.` };
}

function scoreDelivery(item, delivery) {
  if (!delivery || delivery === "Open") return { points: 4, reason: "delivery location open" };
  if (item.sourceType === "atlas") {
    return { points: 2, reason: "warehouse to be confirmed" };
  }
  if (item.warehouse === delivery) {
    return { points: 8, reason: `${delivery} warehouse fit` };
  }
  return { points: 1, reason: "", caution: `Held in ${item.warehouse}, not ${delivery}.` };
}

function scoreChannel(item, channel) {
  if (channel === "Live lots only") return item.sourceType === "live" ? 7 : -30;
  if (channel === "Atlas planning only") return item.sourceType === "atlas" ? 7 : -12;
  return item.sourceType === "live" ? 6 : 4;
}

function scoreUse(item, use) {
  const text = `${item.searchText} ${item.tastingText}`;
  if (!use || use === "Open") return { points: 3, reason: "" };
  const terms = {
    "Filter coffee": ["filter", "pour over", "floral", "citrus", "clean", "tea"],
    Espresso: ["espresso", "cocoa", "chocolate", "body", "caramel"],
    "Milk drinks": ["milk", "dark cocoa", "roasted nuts", "spice", "robusta"],
    "Blend base": ["blend", "classic", "balanced", "cocoa", "nuts"],
    "Cold brew": ["cold brew", "dark chocolate", "smooth", "low acidity"],
  }[use] || [use];
  return includesAny(text, terms)
    ? { points: 8, reason: `${use.toLowerCase()} role fit` }
    : { points: 0, reason: "" };
}

export function scoreSourcingItem(item, briefInput) {
  const brief = normalizeSourcingBrief(briefInput);
  const reasons = [];
  const cautions = [];
  let points = 18;

  const checks = [
    scoreOrigin(item, brief.origin),
    scoreProcess(item, brief.process),
    scoreFlavor(item, brief.flavor),
    scoreBudget(item, brief),
    scoreVolume(item, brief),
    scoreCertification(item, brief.certification),
    scoreDelivery(item, brief.delivery),
    scoreUse(item, brief.use),
    { points: scoreChannel(item, brief.channel), reason: item.sourceLabel },
  ];

  for (const check of checks) {
    points += check.points || 0;
    if (check.reason) reasons.push(check.reason);
    if (check.caution) cautions.push(check.caution);
    if (check.hits?.length) reasons.push(`${check.hits.join(", ")} cup alignment`);
  }

  if (item.status === "Spot") {
    points += 4;
    reasons.push("spot position");
  } else if (item.status === "Limited") {
    points += 2;
    cautions.push("Limited lot - confirm quickly.");
  } else if (item.status === "Forward") {
    points += 1;
    cautions.push("Forward arrival - confirm timing.");
  }

  const matchScore = Math.max(0, Math.min(100, Math.round(points)));

  return {
    ...item,
    matchScore,
    matchLabel: matchScore >= 84 ? "Strong fit" : matchScore >= 68 ? "Good fit" : "Needs review",
    reasons: unique(reasons).slice(0, 5),
    cautions: unique(cautions).slice(0, 3),
  };
}

export function recommendSourcingItems(coffees, atlasProfiles, briefInput, limit = 6) {
  const brief = normalizeSourcingBrief(briefInput);
  return buildSourcingItems(coffees, atlasProfiles)
    .map((item) => scoreSourcingItem(item, brief))
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function findSourcingItems(coffees, atlasProfiles, query, limit = 8) {
  const terms = lower(query)
    .split(/\s+/)
    .filter((term) => term.length > 1);
  if (!terms.length) return [];

  return buildSourcingItems(coffees, atlasProfiles)
    .map((item) => {
      const searchable = lower(`${item.name} ${item.country} ${item.process} ${item.searchText}`);
      const hits = terms.filter((term) => searchable.includes(term)).length;
      return { ...item, searchScore: hits };
    })
    .filter((item) => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function deriveBriefFromPrompt(prompt, currentBrief = {}, countries = []) {
  const text = lower(prompt);
  const next = normalizeSourcingBrief(currentBrief);

  if (/\bunder\s*\$?\s*6|\bbelow\s*\$?\s*6|max\s*\$?\s*6/.test(text)) next.budget = "Under 6";
  else if (/\$?\s*8\s*\+|above\s*\$?\s*8|premium|competition/.test(text)) next.budget = "8+";
  else if (/\$?\s*6\s*(?:-|to|–)\s*\$?\s*8|mid.?range/.test(text)) next.budget = "6-8";

  const volume = text.match(/(\d{1,4})\s*(?:bags|bag|sacks|sack)/);
  if (volume) {
    const count = Number(volume[1]);
    if (count < 20) next.volume = "Under 20 bags";
    else if (count <= 60) next.volume = "20-60 bags";
    else next.volume = "60+ bags";
  }

  const country = countries.find((item) => text.includes(lower(item)));
  if (country) next.origin = country;

  for (const process of sourcingProcesses) {
    if (PROCESS_ALIASES[process].some((term) => text.includes(term))) next.process = process;
  }

  if (/\bespresso|milk|base|body|classic/.test(text)) {
    next.use = text.includes("milk") ? "Milk drinks" : "Espresso";
    next.flavor = "Classic espresso";
  } else if (/\bfilter|pour.?over|v60|bright|floral/.test(text)) {
    next.use = "Filter coffee";
    next.flavor = "Floral & bright";
  } else if (/\bcold brew/.test(text)) {
    next.use = "Cold brew";
    next.flavor = "Chocolate & nuts";
  } else if (/\bblend|blending/.test(text)) {
    next.use = "Blend base";
    next.flavor = "Balanced";
  } else if (/\bfruit|berry|tropical|ferment/.test(text)) {
    next.flavor = "Fruit-forward";
  } else if (/\bchocolate|cocoa|nut|caramel/.test(text)) {
    next.flavor = "Chocolate & nuts";
  }

  const warehouse = WAREHOUSES.find((item) => text.includes(lower(item)));
  if (warehouse) next.delivery = warehouse;

  const certification = CERTIFICATIONS.find((item) => text.includes(lower(item)));
  if (certification) next.certification = certification;

  if (/\blive|spot|available now|warehouse/.test(text)) next.channel = "Live lots only";
  if (/\batlas|makendi|grade profile|planning|future|forward/.test(text)) next.channel = "Live + atlas";

  return next;
}

export function buildAssistantReply(prompt, coffees, atlasProfiles, currentBrief = {}) {
  const countries = unique([
    ...coffees.map((coffee) => coffee.country),
    ...atlasProfiles.map((grade) => grade.country),
  ]);
  const brief = deriveBriefFromPrompt(prompt, currentBrief, countries);
  const recommendations = recommendSourcingItems(coffees, atlasProfiles, brief, 5);
  const directMatches = findSourcingItems(coffees, atlasProfiles, prompt, 4);
  const top = recommendations[0];
  const askedComparison = /\bcompare|versus|vs\.?|difference|alternative/.test(lower(prompt));
  const askedSamples = /\bsample|cup|cupping|evaluate/.test(lower(prompt));

  let answer = "I translated your request into a sourcing brief and ranked Coffendi live lots plus Makendi atlas profiles against it.";
  if (top) {
    answer = `${top.name} is the strongest match at ${top.matchScore}%. The main reasons are ${top.reasons.slice(0, 3).join(", ")}.`;
  }
  if (askedSamples) {
    answer += " For samples, shortlist no more than four coffees so the cupping table stays focused and feedback is useful.";
  }
  if (askedComparison && recommendations.length > 1) {
    answer += ` Compare ${recommendations[0].name} against ${recommendations[1].name} to see the tradeoff between ${recommendations[0].sourceLabel.toLowerCase()} certainty and ${recommendations[1].sourceLabel.toLowerCase()} planning range.`;
  }

  return {
    answer,
    brief,
    recommendations,
    directMatches,
    nextQuestions: [
      "Do you want spot coffee only or forward planning too?",
      "Should the cup lean fruit-forward, chocolate/nut, or bright/floral?",
      "What warehouse or delivery country should the shortlist prioritize?",
    ],
  };
}

export function summarizeComparison(items) {
  if (!items.length) {
    return {
      title: "No coffees selected",
      copy: "Choose two or three coffees to see sourcing tradeoffs.",
      rows: [],
      nextSteps: [],
    };
  }

  const liveCount = items.filter((item) => item.sourceType === "live").length;
  const atlasCount = items.length - liveCount;
  const origins = unique(items.map((item) => item.country));
  const processes = unique(items.map((item) => item.process));
  const priced = items.filter((item) => typeof item.priceValue === "number");
  const averagePrice = priced.length
    ? priced.reduce((sum, item) => sum + item.priceValue, 0) / priced.length
    : null;
  const highestMatch = [...items].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0];

  return {
    title: `${items.length} coffee shortlist`,
    copy: `${liveCount} live lot${liveCount === 1 ? "" : "s"} and ${atlasCount} Makendi planning profile${atlasCount === 1 ? "" : "s"} across ${origins.length} origin${origins.length === 1 ? "" : "s"}.`,
    rows: [
      ["Best fit", highestMatch ? `${highestMatch.name} (${highestMatch.matchScore || "n/a"}%)` : "Select coffees"],
      ["Origin spread", origins.join(" · ") || "None"],
      ["Process spread", processes.join(" · ") || "None"],
      ["Priced average", averagePrice ? `$${averagePrice.toFixed(2)}/lb across live lots` : "Inquiry-led"],
      ["Commercial certainty", atlasCount ? "Mixes priced stock with unpriced Makendi profiles" : "All selected coffees are live lots"],
    ],
    nextSteps: [
      "Request samples for sensory confirmation.",
      "Confirm warehouse, bag count, and release timing before contract.",
      "Use atlas profiles as replacement or blend-planning references when no live position exists.",
    ],
  };
}

export function formatSourcingBrief(briefInput, recommendations = []) {
  const brief = normalizeSourcingBrief(briefInput);
  const lines = [
    "Coffendi sourcing brief",
    `Budget: ${brief.budget}/lb`,
    `Volume: ${brief.volume}`,
    `Origin: ${brief.origin}`,
    `Flavor direction: ${brief.flavor}`,
    `Process: ${brief.process}`,
    `Certification: ${brief.certification}`,
    `Delivery warehouse: ${brief.delivery}`,
    `Use case: ${brief.use}`,
    `Source mode: ${brief.channel}`,
  ];

  if (recommendations.length) {
    lines.push("", "Recommended shortlist:");
    for (const item of recommendations.slice(0, 6)) {
      lines.push(
        `- ${item.name} | ${item.sourceLabel} | ${item.country} | ${item.process} | ${item.matchScore ?? "n/a"}% match | ${item.price}`,
      );
      if (item.reasons?.length) lines.push(`  Reasons: ${item.reasons.slice(0, 3).join("; ")}`);
      if (item.cautions?.length) lines.push(`  Check: ${item.cautions.slice(0, 2).join("; ")}`);
    }
  }

  lines.push(
    "",
    "Commercial note: live lots can carry current stock and price context; Makendi atlas profiles are planning references until Coffendi confirms availability, shipment period, price, and basis.",
  );

  return lines.join("\n");
}
