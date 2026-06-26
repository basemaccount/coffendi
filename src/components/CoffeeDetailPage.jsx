import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Factory,
  GitCompareArrows,
  MapPin,
  PackageCheck,
  Route,
  Share2,
  ShieldCheck,
  Ship,
  Sparkles,
  Sprout,
  Warehouse,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { coffees } from "../data";

const varietyByCountry = {
  Ethiopia: "74110 · 74112 · local landraces",
  Colombia: "Java",
  Brazil: "Yellow Bourbon",
  Guatemala: "Caturra · Bourbon",
  Kenya: "SL28 · SL34 · Ruiru 11",
  Rwanda: "Red Bourbon",
  Peru: "Caturra · Typica",
  Honduras: "Catuai · IHCAFE 90",
  Indonesia: "Andungsari · Sigarar Utang",
};

const lotPrefix = {
  Ethiopia: "ETH",
  Colombia: "COL",
  Brazil: "BRA",
  Guatemala: "GTM",
  Kenya: "KEN",
  Rwanda: "RWA",
  Peru: "PER",
  Honduras: "HND",
  Indonesia: "IDN",
};

function DetailNotFound() {
  return (
    <main className="not-found">
      <div className="shell">
        <p className="eyebrow">Lot unavailable</p>
        <h1>We could not find this coffee.</h1>
        <p>The position may have closed or the lot link may have changed.</p>
        <Link className="button button--dark" to="/coffees">
          <ArrowLeft size={17} /> Return to coffees
        </Link>
      </div>
    </main>
  );
}

export default function CoffeeDetailPage({
  selectedSamples,
  onToggleSample,
  compareIds,
  onToggleCompare,
  onOpenFinder,
}) {
  const { coffeeId } = useParams();
  const [copied, setCopied] = useState(false);
  const coffee = coffees.find((item) => item.id === coffeeId);
  const related = useMemo(
    () =>
      coffee
        ? coffees
            .filter(
              (item) =>
                item.id !== coffee.id &&
                (item.country === coffee.country || item.process === coffee.process),
            )
            .slice(0, 3)
        : [],
    [coffee],
  );

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!coffee) return <DetailNotFound />;

  const selected = selectedSamples.includes(coffee.id);
  const compared = compareIds.includes(coffee.id);
  const code = `CF-${lotPrefix[coffee.country]}-${coffee.harvest.slice(2, 4)}-${String(
    coffees.indexOf(coffee) + 1,
  ).padStart(2, "0")}`;
  const cupBars = [
    ["Sweetness", Math.min(96, 72 + (coffee.score - 84) * 5)],
    ["Acidity", coffee.process === "Washed" ? 90 : 78],
    ["Body", coffee.process === "Natural" || coffee.process === "Honey" ? 91 : 82],
    ["Clarity", coffee.score >= 87 ? 94 : 85],
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="lot-page">
      <section className="lot-hero">
        <div className="shell lot-breadcrumbs">
          <Link to="/coffees">
            <ArrowLeft size={15} /> Coffees
          </Link>
          <span>/</span>
          <span>{code}</span>
        </div>
        <div className="shell lot-hero__grid">
          <div className="lot-hero__image">
            <img
              src={coffee.image}
              alt={`${coffee.name} coffee origin`}
              fetchpriority="high"
              decoding="async"
            />
            <div className="lot-image-badge">
              <CheckCircle2 size={17} /> Landing sample approved
            </div>
          </div>
          <div className="lot-hero__content">
            <div className="lot-title-row">
              <div>
                <p className="eyebrow">
                  {coffee.country} · {coffee.region}
                </p>
                <h1>{coffee.name}</h1>
                <p className="lot-producer">{coffee.producer}</p>
              </div>
              <button className="icon-button" type="button" onClick={copyLink} title="Copy lot link">
                {copied ? <Check size={18} /> : <Share2 size={18} />}
              </button>
            </div>
            <div className="lot-flavor-line">
              {coffee.flavor.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
            <div className="lot-primary-facts">
              <div>
                <span>SCA score</span>
                <strong>{coffee.score}</strong>
              </div>
              <div>
                <span>Process</span>
                <strong>{coffee.process}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{coffee.bags ? `${coffee.bags} bags` : coffee.availability}</strong>
              </div>
              <div>
                <span>Ex-warehouse</span>
                <strong>{coffee.price}</strong>
              </div>
            </div>
            <div className="lot-hero__actions">
              <button
                className={`button ${selected ? "button--selected" : "button--dark"}`}
                type="button"
                onClick={() => onToggleSample(coffee.id)}
              >
                {selected ? <Check size={17} /> : <PackageCheck size={17} />}
                {selected ? "Added to samples" : "Request a sample"}
              </button>
              <button
                className={`button ${compared ? "button--selected" : "button--outline"}`}
                type="button"
                onClick={() => onToggleCompare(coffee.id)}
              >
                <GitCompareArrows size={17} />
                {compared ? "In comparison" : "Add to compare"}
              </button>
              {onOpenFinder && (
                <button className="button button--outline" type="button" onClick={onOpenFinder}>
                  <Bot size={17} /> Ask for alternatives
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <nav className="lot-anchor-nav" aria-label="Lot sections">
        <div className="shell">
          <a href="#overview">Overview</a>
          <a href="#traceability">Traceability</a>
          <a href="#quality">Quality</a>
          <a href="#logistics">Logistics</a>
        </div>
      </nav>

      <section className="section section--cream" id="overview">
        <div className="shell lot-overview-grid">
          <div className="lot-story-copy">
            <p className="eyebrow">Lot overview</p>
            <h2>A distinct lot with a clear role on the menu.</h2>
            <p>
              {coffee.name} is selected for its {coffee.flavor.join(", ").toLowerCase()} profile,
              reliable physical preparation, and clarity across filter and light espresso roasting.
              The lot is held separately from origin intake through warehouse release.
            </p>
            <p>
              Coffendi’s origin and quality teams approved the pre-shipment and landing samples
              against the same reference roast, keeping the contracted profile accountable through
              the supply chain.
            </p>
          </div>
          <dl className="lot-specs">
            <div>
              <dt>Lot ID</dt>
              <dd>{code}</dd>
            </div>
            <div>
              <dt>Variety</dt>
              <dd>{varietyByCountry[coffee.country]}</dd>
            </div>
            <div>
              <dt>Altitude</dt>
              <dd>{coffee.altitude}</dd>
            </div>
            <div>
              <dt>Harvest</dt>
              <dd>{coffee.harvest}</dd>
            </div>
            <div>
              <dt>Bag format</dt>
              <dd>{coffee.bagSize}kg GrainPro-lined jute</dd>
            </div>
            <div>
              <dt>Certifications</dt>
              <dd>{coffee.certification.join(" · ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section section--white" id="traceability">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Traceability passport</p>
              <h2>Four verified custody points</h2>
              <p className="section-copy">
                Named ownership and quality checks follow this lot from production to release.
              </p>
            </div>
            <div className="traceability-seal">
              <ShieldCheck size={22} /> Lot-level traceable
            </div>
          </div>
          <div className="lot-trace-grid">
            {[
              [Sprout, "Production", coffee.producer, `${coffee.region}, ${coffee.country}`],
              [Factory, "Processing", `${coffee.process} lot separation`, "Moisture and density approved"],
              [Ship, "Export", "Protective-lined shipment", "Pre-shipment sample approved"],
              [Warehouse, "Arrival", coffee.warehouse, "Landing sample approved"],
            ].map(([Icon, label, title, copy], index) => (
              <article key={label}>
                <span className="trace-index">0{index + 1}</span>
                <Icon size={22} />
                <p>{label}</p>
                <h3>{title}</h3>
                <small>{copy}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--green" id="quality">
        <div className="shell lot-quality-grid">
          <div>
            <p className="eyebrow eyebrow--gold">Quality profile</p>
            <h2>Built around sweetness and clarity.</h2>
            <p>
              Calibrated on a light sample roast with SCA-aligned cupping water and retained
              reference samples at origin and destination.
            </p>
            <div className="quality-notes">
              <Award size={21} />
              <span>
                <strong>{coffee.score} points</strong>
                {coffee.flavor.join(" · ")}
              </span>
            </div>
          </div>
          <div className="quality-bars">
            {cupBars.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <b style={{ width: `${value}%` }} />
                </i>
                <strong>{Math.round(value)}</strong>
              </div>
            ))}
            <dl>
              <div>
                <dt>Moisture</dt>
                <dd>{coffee.process === "Natural" ? "10.4%" : "10.7%"}</dd>
              </div>
              <div>
                <dt>Water activity</dt>
                <dd>{coffee.process === "Natural" ? "0.54 aw" : "0.56 aw"}</dd>
              </div>
              <div>
                <dt>Primary defects</dt>
                <dd>0 / 350g</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section section--cream" id="logistics">
        <div className="shell lot-logistics-grid">
          <div>
            <p className="eyebrow">Logistics</p>
            <h2>Ready for a practical release plan.</h2>
            <p>
              Current position data, bag format, and warehouse location are shown before sample
              approval so commercial and sensory decisions can happen together.
            </p>
          </div>
          <div className="logistics-route">
            {[
              [MapPin, `${coffee.region}, ${coffee.country}`, "Origin"],
              [Route, "Export and consolidation", "Transit"],
              [Warehouse, coffee.warehouse, coffee.availability],
            ].map(([Icon, title, label], index) => (
              <div key={title}>
                <span>
                  <Icon size={20} />
                </span>
                <p>{label}</p>
                <strong>{title}</strong>
                {index < 2 && <ArrowRight size={17} />}
              </div>
            ))}
          </div>
          <div className="lot-release-box">
            <div>
              <Clipboard size={20} />
              <span>
                <strong>{coffee.bags || "Forward"} bags</strong>
                {coffee.bagSize}kg each · {coffee.warehouse}
              </span>
            </div>
            <button className="button button--dark" type="button" onClick={() => onToggleSample(coffee.id)}>
              <PackageCheck size={17} /> Request sample
            </button>
          </div>
        </div>
      </section>

      {onOpenFinder && (
        <section className="lot-ai-strip">
          <div className="shell lot-ai-strip__inner">
            <div>
              <p className="eyebrow">Alternative finder</p>
              <h2>Compare this lot with live and Makendi planning profiles.</h2>
              <p>
                Ask the sourcing desk for replacements by cup role, budget,
                process, warehouse, or certification.
              </p>
            </div>
            <button className="button button--gold" type="button" onClick={onOpenFinder}>
              Open sourcing desk <Sparkles size={17} />
            </button>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section section--white">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Related positions</p>
                <h2>Continue the shortlist</h2>
              </div>
              <Link className="text-link" to="/coffees">
                All coffees <ArrowRight size={16} />
              </Link>
            </div>
            <div className="related-lot-grid">
              {related.map((item) => (
                <Link key={item.id} to={`/coffees/${item.id}`}>
                  <img src={item.image} alt="" loading="lazy" decoding="async" />
                  <span>{item.country} · {item.process}</span>
                  <h3>{item.name}</h3>
                  <p>{item.flavor.join(" · ")}</p>
                  <strong>
                    View lot <ArrowRight size={15} />
                  </strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
