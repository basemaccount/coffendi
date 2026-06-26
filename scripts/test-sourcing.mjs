import assert from "node:assert/strict";
import { coffees } from "../src/data.js";
import { makendiSearchIndex } from "../src/makendiSummary.js";
import {
  buildAssistantReply,
  buildSourcingItems,
  formatSourcingBrief,
  recommendSourcingItems,
  summarizeComparison,
} from "../src/lib/sourcing.js";

const allItems = buildSourcingItems(coffees, makendiSearchIndex);
assert.equal(allItems.length, coffees.length + makendiSearchIndex.length);

const liveOnly = recommendSourcingItems(
  coffees,
  makendiSearchIndex,
  {
    budget: "Under 6",
    volume: "60+ bags",
    origin: "Brazil",
    flavor: "Chocolate & nuts",
    process: "Natural",
    certification: "Rainforest Alliance",
    delivery: "Mersin",
    use: "Espresso",
    channel: "Live lots only",
  },
  5,
);

assert.ok(liveOnly.length > 0, "expected at least one live recommendation");
assert.equal(liveOnly[0].sourceType, "live");
assert.equal(liveOnly[0].country, "Brazil");
assert.ok(liveOnly[0].reasons.some((reason) => reason.toLowerCase().includes("budget")));

const atlasPlanning = recommendSourcingItems(
  coffees,
  makendiSearchIndex,
  {
    budget: "8+",
    volume: "20-60 bags",
    origin: "Vietnam",
    flavor: "Classic espresso",
    process: "Open",
    certification: "Any",
    delivery: "Hamburg",
    use: "Milk drinks",
    channel: "Atlas planning only",
  },
  4,
);

assert.ok(atlasPlanning.length > 0, "expected Makendi planning recommendations");
assert.equal(atlasPlanning[0].sourceType, "atlas");
assert.equal(atlasPlanning[0].country, "Vietnam");
assert.ok(atlasPlanning[0].cautions.some((warning) => warning.includes("confirm")));

const reply = buildAssistantReply(
  "Find a washed East African coffee for bright filter, 20 bags, Hamburg, under $8.",
  coffees,
  makendiSearchIndex,
);

assert.equal(reply.brief.process, "Washed");
assert.equal(reply.brief.use, "Filter coffee");
assert.ok(reply.recommendations.length > 0);
assert.match(reply.answer, /match|translated|strongest/i);

const comparison = summarizeComparison(atlasPlanning.slice(0, 2));
assert.match(comparison.title, /shortlist/);
assert.ok(comparison.rows.length >= 4);
assert.ok(comparison.nextSteps.length >= 3);

const briefText = formatSourcingBrief(reply.brief, reply.recommendations);
assert.match(briefText, /Coffendi sourcing brief/);
assert.match(briefText, /Recommended shortlist/);
assert.match(briefText, /Commercial note/);
assert.ok(briefText.length < 2_500);

console.log("Sourcing recommendation, assistant, and comparison tests passed.");
