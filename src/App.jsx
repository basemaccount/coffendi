import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bean,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  Factory,
  Filter,
  Globe2,
  HandHeart,
  Headphones,
  GitCompareArrows,
  Leaf,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  Menu,
  PackageCheck,
  Search,
  Send,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  ThermometerSun,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { geoEqualEarth, geoPath } from "d3-geo";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import CoffeeDetailPage from "./components/CoffeeDetailPage";
import CompareTray from "./components/CompareTray";
import { coffees, origins, stories, supplySteps } from "./data";
import { usePersistentState } from "./hooks/usePersistentState";
import { submitRequest } from "./lib/api";

const mapCountries = feature(worldData, worldData.objects.countries).features;

const mainNav = [
  { label: "Coffees", to: "/coffees" },
  { label: "Origins", to: "/origins" },
  { label: "For Roasters", to: "/roasters" },
  { label: "Our Impact", to: "/sustainability" },
  { label: "Stories", to: "/stories" },
];

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const coffee = pathname.startsWith("/coffees/")
      ? coffees.find((item) => pathname.endsWith(item.id))
      : null;
    const routeTitles = {
      "/": "Coffendi — Coffee with a clear origin",
      "/coffees": "Green Coffee Portfolio — Coffendi",
      "/origins": "Coffee Origins — Coffendi",
      "/availability": "Price & Availability — Coffendi",
      "/sustainability": "Responsible Sourcing — Coffendi",
      "/roasters": "For Roasters — Coffendi",
      "/stories": "Producer Stories — Coffendi",
      "/quality": "Quality & Cupping — Coffendi",
      "/contact": "Contact Coffendi",
    };
    document.title = coffee
      ? `${coffee.name} · ${coffee.country} — Coffendi`
      : routeTitles[pathname] || "Coffendi";
  }, [pathname]);

  return null;
}

function Logo({ compact = false }) {
  return (
    <Link className={`brand ${compact ? "brand--compact" : ""}`} to="/">
      <img src="/coffendi-logo.png" alt="Coffendi" />
      {!compact && (
        <span>
          <strong>Coffendi</strong>
          <small>Green coffee partners</small>
        </span>
      )}
    </Link>
  );
}

function Header({ sampleCount, onOpenSamples, onOpenFinder, onOpenSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <>
      <div className="market-bar">
        <span className="pulse-dot" />
        New crop Ethiopia and Colombia now available in Hamburg
        <Link to="/availability">
          View arrivals <ArrowRight size={14} />
        </Link>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {mainNav.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              type="button"
              onClick={onOpenSearch}
              aria-label="Search coffees and pages"
              title="Search"
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button sample-button"
              type="button"
              onClick={onOpenSamples}
              aria-label={`Sample request, ${sampleCount} coffees selected`}
              title="Sample request"
            >
              <ShoppingBag size={19} />
              {sampleCount > 0 && <span>{sampleCount}</span>}
            </button>
            <button
              className="button button--small button--dark desktop-only"
              type="button"
              onClick={onOpenFinder}
            >
              Find your coffee <Sparkles size={16} />
            </button>
            <button
              className="icon-button menu-button"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-label="Open navigation"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <nav aria-label="Mobile navigation">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
              <ArrowUpRight size={17} />
            </NavLink>
          ))}
          <NavLink to="/quality">
            Quality & cupping
            <ArrowUpRight size={17} />
          </NavLink>
          <NavLink to="/availability">
            Price & availability
            <ArrowUpRight size={17} />
          </NavLink>
          <NavLink to="/contact">
            Contact
            <ArrowUpRight size={17} />
          </NavLink>
          <button className="button button--gold" type="button" onClick={onOpenFinder}>
            Find your coffee <Sparkles size={17} />
          </button>
        </nav>
      </div>
    </>
  );
}

function MobileDock({ onOpenFinder }) {
  return (
    <nav className="mobile-dock" aria-label="Quick navigation">
      <NavLink to="/" end>
        <Coffee size={19} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/coffees">
        <Bean size={19} />
        <span>Coffees</span>
      </NavLink>
      <NavLink to="/origins">
        <Map size={19} />
        <span>Origins</span>
      </NavLink>
      <button type="button" onClick={onOpenFinder}>
        <Sparkles size={19} />
        <span>Match</span>
      </button>
      <NavLink to="/contact">
        <Send size={19} />
        <span>Contact</span>
      </NavLink>
    </nav>
  );
}

function SearchPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    document.body.classList.add("no-scroll");
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) onClose();
  }, [location.pathname]);

  const normalized = query.toLowerCase().trim();
  const coffeeResults = coffees
    .filter((coffee) =>
      [
        coffee.name,
        coffee.country,
        coffee.region,
        coffee.producer,
        coffee.process,
        ...coffee.flavor,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, normalized ? 6 : 4);
  const pageResults = [
    ["Price & availability", "/availability", "Live positions and warehouse stock"],
    ["Origin map", "/origins", "Regions, partners, and harvest windows"],
    ["Quality & cupping", "/quality", "Protocols, grading, and physical analysis"],
    ["For roasters", "/roasters", "Samples, matching, blends, and logistics"],
    ["Sustainability", "/sustainability", "Traceability and producer programs"],
  ].filter(([title, , copy]) => `${title} ${copy}`.toLowerCase().includes(normalized));

  return (
    <>
      <div className={`search-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <section
        className={`search-palette ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search Coffendi"
      >
        <div className="search-palette__input">
          <Search size={20} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Coffee, origin, producer, flavor, or page"
            aria-label="Search Coffendi"
          />
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close search">
            <X size={19} />
          </button>
        </div>
        <div className="search-palette__results">
          {coffeeResults.length > 0 && (
            <div>
              <p>Coffees</p>
              {coffeeResults.map((coffee) => (
                <Link key={coffee.id} to={`/coffees/${coffee.id}`}>
                  <img src={coffee.image} alt="" loading="lazy" decoding="async" />
                  <span>
                    <strong>{coffee.name}</strong>
                    <small>
                      {coffee.country} · {coffee.process} · {coffee.score} pts
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          )}
          {pageResults.length > 0 && (
            <div>
              <p>Explore</p>
              {pageResults.map(([title, path, copy]) => (
                <Link key={path} to={path}>
                  <span>
                    <strong>{title}</strong>
                    <small>{copy}</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          )}
          {!coffeeResults.length && !pageResults.length && (
            <div className="search-empty">
              <Bean size={25} />
              <strong>No result for “{query}”</strong>
              <span>Try a country, process, producer, or flavor note.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, copy, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {copy && <p className="section-copy">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusPill({ status }) {
  const className =
    status === "Limited"
      ? "status status--limited"
      : status === "Forward"
        ? "status status--forward"
        : "status";
  return <span className={className}>{status}</span>;
}

function CoffeeCard({
  coffee,
  isSelected,
  onToggleSample,
  isCompared,
  onToggleCompare,
}) {
  return (
    <article className="coffee-card">
      <div className="coffee-card__image">
        <Link to={`/coffees/${coffee.id}`} aria-label={`View ${coffee.name}`}>
          <img src={coffee.image} alt="" loading="lazy" decoding="async" />
        </Link>
        <StatusPill status={coffee.status} />
        <span className="score">
          <Award size={14} /> {coffee.score}
        </span>
      </div>
      <div className="coffee-card__body">
        <div className="coffee-card__origin">
          <span>{coffee.country}</span>
          <span>{coffee.region}</span>
        </div>
        <h3>
          <Link to={`/coffees/${coffee.id}`}>{coffee.name}</Link>
        </h3>
        <p className="producer">{coffee.producer}</p>
        <div className="flavor-list">
          {coffee.flavor.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <dl className="coffee-facts">
          <div>
            <dt>Process</dt>
            <dd>{coffee.process}</dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd>{coffee.bags ? `${coffee.bags} bags` : coffee.availability}</dd>
          </div>
          <div>
            <dt>Warehouse</dt>
            <dd>{coffee.warehouse}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{coffee.price}</dd>
          </div>
        </dl>
        <div className="coffee-card__actions">
          <button
            className={`button button--small ${isSelected ? "button--selected" : "button--dark"}`}
            type="button"
            onClick={() => onToggleSample(coffee.id)}
          >
            {isSelected ? <Check size={16} /> : <PackageCheck size={16} />}
            {isSelected ? "Sample added" : "Request sample"}
          </button>
          <button
            className={`icon-button compare-button ${isCompared ? "is-selected" : ""}`}
            type="button"
            onClick={() => onToggleCompare(coffee.id)}
            aria-label={`${isCompared ? "Remove" : "Add"} ${coffee.name} ${isCompared ? "from" : "to"} comparison`}
            title={isCompared ? "Remove from comparison" : "Compare coffee"}
          >
            {isCompared ? <Check size={16} /> : <GitCompareArrows size={16} />}
          </button>
          <Link className="text-button" to={`/coffees/${coffee.id}`}>
            View lot <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SupplyTimeline({ condensed = false }) {
  const visibleSteps = condensed ? supplySteps.slice(0, 4) : supplySteps;
  return (
    <div className={`supply-timeline ${condensed ? "supply-timeline--condensed" : ""}`}>
      {visibleSteps.map((step) => (
        <article key={step.number} className="supply-step">
          <span>{step.number}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </article>
      ))}
    </div>
  );
}

function OriginMap({ compact = false }) {
  const [selectedCountry, setSelectedCountry] = useState(origins[0].country);
  const selected =
    origins.find((origin) => origin.country === selectedCountry) || origins[0];
  const projection = useMemo(
    () =>
      geoEqualEarth()
        .translate([400, 215])
        .scale(compact ? 135 : 150),
    [compact],
  );
  const mapPath = geoPath(projection);

  return (
    <div className={`origin-map-layout ${compact ? "origin-map-layout--compact" : ""}`}>
      <div className="map-canvas">
        <svg viewBox="0 0 800 430" role="img" aria-label="Coffee origin map">
          <g className="map-countries">
            {mapCountries.map((country, index) => (
              <path key={`${country.id}-${index}`} d={mapPath(country)} />
            ))}
          </g>
          <g>
            {origins.map((origin) => {
              const [x, y] = projection(origin.coordinates);
              const selectOrigin = () => setSelectedCountry(origin.country);
              const labelPosition =
                {
                  Ethiopia: { x: 0, y: -15, anchor: "middle" },
                  Kenya: { x: 13, y: 7, anchor: "start" },
                  Rwanda: { x: -13, y: 7, anchor: "end" },
                }[origin.country] || { x: 0, y: -14, anchor: "middle" };
              return (
                <g
                  key={origin.country}
                  className="map-marker"
                  transform={`translate(${x} ${y})`}
                  onClick={selectOrigin}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") selectOrigin();
                  }}
                  role="button"
                  tabIndex="0"
                  aria-label={`Show ${origin.country}`}
                >
                <circle className="map-marker__hitbox" r={18} />
                <circle
                  r={selectedCountry === origin.country ? 8 : 6}
                  fill={selectedCountry === origin.country ? "#c9902f" : "#245243"}
                  stroke="#fffaf1"
                  strokeWidth={3}
                />
                {!compact && (
                  <text
                    textAnchor={labelPosition.anchor}
                    x={labelPosition.x}
                    y={labelPosition.y}
                    style={{
                      fontFamily: "Manrope, sans-serif",
                      fontSize: "11px",
                      fontWeight: 800,
                      fill: "#252b28",
                    }}
                  >
                    {origin.country}
                  </text>
                )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="map-legend">
          <span>
            <i />
            Active origin
          </span>
          <span>{origins.reduce((total, origin) => total + origin.lots, 0)} lots</span>
        </div>
      </div>
      <article className="origin-detail">
        <img src={selected.image} alt="" loading="lazy" decoding="async" />
        <div>
          <p className="eyebrow">Selected origin</p>
          <h3>{selected.country}</h3>
          <p>{selected.region}</p>
          <dl>
            <div>
              <dt>Live lots</dt>
              <dd>{selected.lots}</dd>
            </div>
            <div>
              <dt>Bags</dt>
              <dd>{selected.bags}</dd>
            </div>
            <div>
              <dt>Harvest</dt>
              <dd>{selected.harvest}</dd>
            </div>
          </dl>
          <p className="origin-profile">{selected.profile}</p>
          <Link className="text-link" to={`/coffees?origin=${selected.country}`}>
            View coffees from {selected.country} <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </div>
  );
}

function HomePage({
  selectedSamples,
  onToggleSample,
  compareIds,
  onToggleCompare,
  onOpenFinder,
}) {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-media" />
        <div className="hero-shade" />
        <div className="shell hero-content">
          <p className="eyebrow eyebrow--light">From farm relationships to roaster results</p>
          <h1>Coffee with a clear origin.</h1>
          <p>
            Exceptional green coffee, transparent supply, and hands-on support
            for roasters who care what happens before the roast.
          </p>
          <div className="hero-actions">
            <Link className="button button--gold" to="/coffees">
              Explore our coffees <ArrowRight size={18} />
            </Link>
            <Link className="button button--glass" to="/origins">
              View origins <Globe2 size={18} />
            </Link>
          </div>
        </div>
        <a className="hero-scroll" href="#featured">
          <span>Discover</span>
          <ArrowDown size={17} />
        </a>
      </section>

      <section className="sourcing-snapshot">
        <div className="shell snapshot-grid">
          <div>
            <span className="live-label">
              <i /> Live sourcing
            </span>
            <strong>34</strong>
            <small>available lots</small>
          </div>
          <div>
            <strong>7</strong>
            <small>origin countries</small>
          </div>
          <div>
            <strong>1,689</strong>
            <small>bags on spot</small>
          </div>
          <div>
            <strong>4</strong>
            <small>regional warehouses</small>
          </div>
          <Link to="/availability">
            Full availability <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <section className="section section--cream" id="featured">
        <div className="shell">
          <SectionHeading
            eyebrow="Fresh arrivals"
            title="Coffees ready to move"
            copy="Current spot positions with landed quality checks and samples available."
            action={
              <Link className="text-link desktop-only" to="/coffees">
                Browse every lot <ArrowRight size={17} />
              </Link>
            }
          />
          <div className="coffee-grid coffee-grid--featured">
            {coffees.slice(0, 3).map((coffee) => (
              <CoffeeCard
                key={coffee.id}
                coffee={coffee}
                isSelected={selectedSamples.includes(coffee.id)}
                onToggleSample={onToggleSample}
                isCompared={compareIds.includes(coffee.id)}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>
          <Link className="button button--outline mobile-only" to="/coffees">
            Browse every lot <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="section section--white">
        <div className="shell">
          <SectionHeading
            eyebrow="Connected at origin"
            title="Know where your coffee begins"
            copy="Explore live lots, producer relationships, and harvest windows across our sourcing network."
            action={
              <Link className="text-link desktop-only" to="/origins">
                Explore all origins <ArrowRight size={17} />
              </Link>
            }
          />
          <OriginMap compact />
        </div>
      </section>

      <section className="section section--green story-feature">
        <div className="shell story-feature__grid">
          <div className="story-feature__image">
            <img
              src="/images/farmer-guatemala.jpg"
              alt="Coffee producer harvesting ripe cherries"
              loading="lazy"
              decoding="async"
            />
            <span>Huehuetenango · Guatemala</span>
          </div>
          <div className="story-feature__copy">
            <p className="eyebrow eyebrow--gold">Producer story</p>
            <h2>A farm built for the next harvest, not just this one.</h2>
            <p>
              At San Patricio, selective picking, shade renewal, and careful
              water management are part of one long-term plan led by a new
              generation of the Ovalle family.
            </p>
            <blockquote>
              “Quality gives us a market. A lasting relationship gives us room
              to keep improving.”
            </blockquote>
            <Link className="button button--light" to="/stories">
              Meet the producers <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Farm to cup"
            title="One accountable supply chain"
            copy="Each handoff protects quality, clarity, and the producer relationship behind the lot."
          />
          <SupplyTimeline />
        </div>
      </section>

      <section className="section section--white">
        <div className="shell impact-preview">
          <div className="impact-preview__copy">
            <p className="eyebrow">Measured impact</p>
            <h2>Traceability that earns its place on the bag.</h2>
            <p>
              We connect every sustainability claim to farm-level programs,
              traceable volumes, and outcomes roasters can communicate clearly.
            </p>
            <div className="impact-stats">
              <div>
                <strong>82%</strong>
                <span>farm or cooperative traceable</span>
              </div>
              <div>
                <strong>1.8m</strong>
                <span>shade trees supported</span>
              </div>
              <div>
                <strong>14</strong>
                <span>long-term producer programs</span>
              </div>
            </div>
            <Link className="text-link" to="/sustainability">
              See our impact model <ArrowRight size={17} />
            </Link>
          </div>
          <div className="impact-preview__image">
            <img
              src="/images/drying-beds.jpg"
              alt="Coffee cherries drying on raised beds"
              loading="lazy"
              decoding="async"
            />
            <div className="impact-caption">
              <Leaf size={21} />
              <span>
                <strong>Climate-smart processing</strong>
                Water reduction and controlled drying at partner stations
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="match-band">
        <div className="shell match-band__inner">
          <div>
            <p className="eyebrow eyebrow--gold">Coffee matching</p>
            <h2>Your next coffee may already be in our warehouse.</h2>
            <p>
              Match profile, volume, budget, certification, and delivery needs
              against current Coffendi lots.
            </p>
          </div>
          <button className="button button--gold" type="button" onClick={onOpenFinder}>
            Find your coffee <Sparkles size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}

function FilterPanel({ filters, setFilters, onReset }) {
  const update = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="filter-panel">
      <div className="filter-panel__heading">
        <h2>Filter coffees</h2>
        <button className="text-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
      <label className="field">
        <span>Origin</span>
        <select value={filters.origin} onChange={(event) => update("origin", event.target.value)}>
          <option value="All">All origins</option>
          {[...new Set(coffees.map((coffee) => coffee.country))].map((country) => (
            <option key={country}>{country}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Process</span>
        <select value={filters.process} onChange={(event) => update("process", event.target.value)}>
          <option value="All">All processes</option>
          {[...new Set(coffees.map((coffee) => coffee.process))].map((process) => (
            <option key={process}>{process}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Quality</span>
        <select value={filters.quality} onChange={(event) => update("quality", event.target.value)}>
          <option value="All">All quality tiers</option>
          <option>Specialty</option>
          <option>Competition</option>
        </select>
      </label>
      <label className="field">
        <span>Flavor profile</span>
        <select value={filters.flavor} onChange={(event) => update("flavor", event.target.value)}>
          <option value="All">Any profile</option>
          <option value="Fruit">Fruit-forward</option>
          <option value="Floral">Floral & tea-like</option>
          <option value="Chocolate">Chocolate & nuts</option>
          <option value="Citrus">Citrus & bright</option>
        </select>
      </label>
      <label className="field">
        <span>Certification</span>
        <select
          value={filters.certification}
          onChange={(event) => update("certification", event.target.value)}
        >
          <option value="All">Any certification</option>
          <option>Organic</option>
          <option>Fairtrade</option>
          <option>Rainforest Alliance</option>
          <option>Verified traceable</option>
        </select>
      </label>
      <label className="field">
        <span>Availability</span>
        <select
          value={filters.availability}
          onChange={(event) => update("availability", event.target.value)}
        >
          <option value="All">Spot & forward</option>
          <option value="Spot">Spot only</option>
          <option value="Forward">Forward only</option>
          <option value="Limited">Limited lots</option>
        </select>
      </label>
      <div className="range-field">
        <div>
          <span>Maximum price</span>
          <strong>${filters.maxPrice.toFixed(2)}/lb</strong>
        </div>
        <input
          type="range"
          min="5"
          max="10"
          step="0.25"
          value={filters.maxPrice}
          onChange={(event) => update("maxPrice", Number(event.target.value))}
        />
      </div>
      <div className="range-field">
        <div>
          <span>Minimum score</span>
          <strong>{filters.minScore}+</strong>
        </div>
        <input
          type="range"
          min="84"
          max="88"
          step="0.25"
          value={filters.minScore}
          onChange={(event) => update("minScore", Number(event.target.value))}
        />
      </div>
    </div>
  );
}

const defaultFilters = {
  origin: "All",
  process: "All",
  quality: "All",
  flavor: "All",
  certification: "All",
  availability: "All",
  maxPrice: 10,
  minScore: 84,
};

function CoffeesPage({
  selectedSamples,
  onToggleSample,
  compareIds,
  onToggleCompare,
  onOpenFinder,
}) {
  const location = useLocation();
  const [filters, setFilters] = useState(() => {
    const origin = new URLSearchParams(location.search).get("origin");
    return { ...defaultFilters, origin: origin || "All" };
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [mobileFilters, setMobileFilters] = useState(false);

  const visibleCoffees = useMemo(() => {
    const profileTerms = {
      Fruit: ["fruit", "berry", "grape", "plum", "apricot", "fig", "pineapple"],
      Floral: ["jasmine", "rose", "tea"],
      Chocolate: ["chocolate", "cacao", "cocoa", "hazelnut", "almond", "praline"],
      Citrus: ["citrus", "orange", "grapefruit"],
    };
    const query = search.toLowerCase().trim();
    const filtered = coffees.filter((coffee) => {
      const searchText = [
        coffee.name,
        coffee.country,
        coffee.region,
        coffee.producer,
        ...coffee.flavor,
      ]
        .join(" ")
        .toLowerCase();
      const flavorMatches =
        filters.flavor === "All" ||
        coffee.flavor.some((note) =>
          profileTerms[filters.flavor].some((term) => note.toLowerCase().includes(term)),
        );
      return (
        (!query || searchText.includes(query)) &&
        (filters.origin === "All" || coffee.country === filters.origin) &&
        (filters.process === "All" || coffee.process === filters.process) &&
        (filters.quality === "All" || coffee.quality === filters.quality) &&
        (filters.certification === "All" ||
          coffee.certification.includes(filters.certification)) &&
        (filters.availability === "All" || coffee.status === filters.availability) &&
        coffee.priceValue <= filters.maxPrice &&
        coffee.score >= filters.minScore &&
        flavorMatches
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "price-low") return a.priceValue - b.priceValue;
      if (sort === "bags") return b.bags - a.bags;
      return b.score - a.score;
    });
  }, [filters, search, sort]);

  return (
    <main>
      <PageHero
        eyebrow="Current portfolio"
        title="Green coffees with the detail roasters need."
        copy="Compare cup profile, process, landed availability, and pricing across traceable specialty lots."
        image="/images/drying-beds.jpg"
        actions={
          <button className="button button--gold" type="button" onClick={onOpenFinder}>
            Match me with a coffee <Sparkles size={17} />
          </button>
        }
      />
      <section className="section section--cream catalog-section">
        <div className="shell">
          <div className="catalog-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search coffee, origin, producer, or flavor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              className="button button--outline filter-trigger"
              type="button"
              onClick={() => setMobileFilters(true)}
            >
              <Filter size={17} /> Filters
            </button>
            <label className="sort-field">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="score">Highest score</option>
                <option value="price-low">Lowest price</option>
                <option value="bags">Most available</option>
              </select>
            </label>
          </div>
          <div className="catalog-layout">
            <aside className="catalog-sidebar">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                onReset={() => setFilters(defaultFilters)}
              />
            </aside>
            <div className="catalog-results">
              <div className="result-summary">
                <p>
                  <strong>{visibleCoffees.length}</strong> coffees matched
                </p>
                <Link to="/availability">
                  Table view <BarChart3 size={16} />
                </Link>
              </div>
              {visibleCoffees.length ? (
                <div className="coffee-grid coffee-grid--catalog">
                  {visibleCoffees.map((coffee) => (
                    <CoffeeCard
                      key={coffee.id}
                      coffee={coffee}
                      isSelected={selectedSamples.includes(coffee.id)}
                      onToggleSample={onToggleSample}
                      isCompared={compareIds.includes(coffee.id)}
                      onToggleCompare={onToggleCompare}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bean size={30} />
                  <h2>No exact match</h2>
                  <p>Adjust your filters or send us the profile you need.</p>
                  <button
                    className="button button--dark"
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <div
        className={`sheet-backdrop ${mobileFilters ? "is-open" : ""}`}
        onClick={() => setMobileFilters(false)}
      />
      <aside className={`mobile-filter-sheet ${mobileFilters ? "is-open" : ""}`}>
        <div className="sheet-header">
          <span>
            <SlidersHorizontal size={18} /> Filters
          </span>
          <button
            className="icon-button"
            type="button"
            onClick={() => setMobileFilters(false)}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          onReset={() => setFilters(defaultFilters)}
        />
        <button className="button button--dark" type="button" onClick={() => setMobileFilters(false)}>
          Show {visibleCoffees.length} coffees
        </button>
      </aside>
    </main>
  );
}

function PageHero({ eyebrow, title, copy, image, actions, compact = false }) {
  return (
    <section className={`page-hero ${compact ? "page-hero--compact" : ""}`}>
      <img src={image} alt="" fetchpriority="high" decoding="async" />
      <div className="page-hero__shade" />
      <div className="shell page-hero__content">
        <p className="eyebrow eyebrow--light">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
        {actions && <div className="page-hero__actions">{actions}</div>}
      </div>
    </section>
  );
}

function OriginsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Global sourcing network"
        title="Every origin has a point of view."
        copy="Explore regions, harvest calendars, partner mills, and available Coffendi lots across the coffee belt."
        image="/images/coffee-farmer.jpg"
      />
      <section className="section section--white">
        <div className="shell">
          <SectionHeading
            eyebrow="Origin map"
            title="Trace coffee from country to warehouse"
            copy="Active origins connect producer relationships with live landed and forward positions."
          />
          <OriginMap />
        </div>
      </section>
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Origin calendar"
            title="Plan around fresh crop arrivals"
            copy="Harvest windows and logistics timing help roasters protect freshness and buying continuity."
          />
          <div className="origin-calendar">
            {origins.map((origin) => (
              <article key={origin.country}>
                <div>
                  <img src={origin.image} alt="" loading="lazy" decoding="async" />
                  <span>{origin.country.slice(0, 2).toUpperCase()}</span>
                </div>
                <h3>{origin.country}</h3>
                <p>{origin.region}</p>
                <dl>
                  <div>
                    <dt>Harvest</dt>
                    <dd>{origin.harvest}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{origin.bags} bags</dd>
                  </div>
                </dl>
                <Link to={`/coffees?origin=${origin.country}`}>
                  {origin.lots} live lots <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="origin-quote">
        <div className="shell">
          <MapPin size={27} />
          <blockquote>
            “Traceability is not a document at the end. It is the way a lot
            stays identifiable through every decision.”
          </blockquote>
          <p>Coffendi Origin Team</p>
        </div>
      </section>
    </main>
  );
}

function AvailabilityPage({ selectedSamples, onToggleSample }) {
  const [warehouse, setWarehouse] = useState("All");
  const visible =
    warehouse === "All"
      ? coffees
      : coffees.filter((coffee) => coffee.warehouse === warehouse);

  return (
    <main>
      <PageHero
        compact
        eyebrow="Updated 24 June 2026"
        title="Price & availability"
        copy="Live-style inventory view for spot and incoming Coffendi coffees. Final terms are confirmed at contract."
        image="/images/sun-drying.jpg"
      />
      <section className="section section--cream availability-section">
        <div className="shell">
          <div className="availability-toolbar">
            <div className="warehouse-tabs" role="group" aria-label="Filter by warehouse">
              {["All", "Hamburg", "Rotterdam", "Mersin", "Antwerp"].map((item) => (
                <button
                  className={warehouse === item ? "is-active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setWarehouse(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link className="button button--outline button--small" to="/contact">
              <Send size={16} /> Ask about a position
            </Link>
          </div>
          <div className="availability-table-wrap">
            <table className="availability-table">
              <thead>
                <tr>
                  <th>Coffee</th>
                  <th>Process</th>
                  <th>Score</th>
                  <th>Available</th>
                  <th>Warehouse</th>
                  <th>Price / status</th>
                  <th aria-label="Sample action" />
                </tr>
              </thead>
              <tbody>
                {visible.map((coffee) => (
                  <tr key={coffee.id}>
                    <td data-label="Coffee">
                      <strong>
                        <Link to={`/coffees/${coffee.id}`}>{coffee.name}</Link>
                      </strong>
                      <span>
                        {coffee.country} · {coffee.region}
                      </span>
                    </td>
                    <td data-label="Process">{coffee.process}</td>
                    <td data-label="Score">
                      <span className="table-score">{coffee.score}</span>
                    </td>
                    <td data-label="Available">
                      {coffee.bags ? `${coffee.bags} × ${coffee.bagSize}kg` : coffee.availability}
                    </td>
                    <td data-label="Warehouse">{coffee.warehouse}</td>
                    <td data-label="Price / status">
                      <strong>{coffee.price}</strong>
                      <StatusPill status={coffee.status} />
                    </td>
                    <td>
                      <button
                        className={`icon-button ${selectedSamples.includes(coffee.id) ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => onToggleSample(coffee.id)}
                        aria-label={`Request sample of ${coffee.name}`}
                        title="Request sample"
                      >
                        {selectedSamples.includes(coffee.id) ? (
                          <Check size={17} />
                        ) : (
                          <PackageCheck size={17} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="availability-note">
            Prices shown are indicative ex-warehouse green coffee prices. Freight,
            financing, duties, and applicable taxes are confirmed per contract.
          </p>
        </div>
      </section>
    </main>
  );
}

const impactPillars = [
  {
    icon: HandHeart,
    title: "Farmer partnerships",
    text: "Multi-year sourcing relationships, quality feedback, and shared planning beyond individual contracts.",
    metric: "14 active programs",
  },
  {
    icon: MapPin,
    title: "Traceability",
    text: "Lot-level records connect producer, processing, export, quality approval, warehouse, and roaster.",
    metric: "82% fully traceable",
  },
  {
    icon: Sprout,
    title: "Climate-smart farming",
    text: "Shade renewal, soil health, water efficiency, and climate-resilient variety trials at partner origins.",
    metric: "1.8m trees supported",
  },
  {
    icon: Users,
    title: "Community impact",
    text: "Programs shaped with cooperatives around youth, women’s leadership, technical training, and farm viability.",
    metric: "2,460 farm households",
  },
];

function SustainabilityPage() {
  return (
    <main>
      <PageHero
        eyebrow="Responsible sourcing"
        title="Better coffee needs resilient communities."
        copy="Our sustainability work starts with durable buying relationships and follows the evidence all the way to farm level."
        image="/images/sun-drying.jpg"
      />
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Our model"
            title="Four commitments, measured over time"
            copy="Sustainability is built into sourcing decisions, quality programs, and the way we report progress."
          />
          <div className="pillar-grid">
            {impactPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title}>
                  <Icon size={23} />
                  <h3>{pillar.title}</h3>
                  <p>{pillar.text}</p>
                  <strong>{pillar.metric}</strong>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section section--green">
        <div className="shell traceability-flow">
          <div>
            <p className="eyebrow eyebrow--gold">Traceability framework</p>
            <h2>Every claim follows the coffee.</h2>
            <p>
              Coffendi’s lot record brings commercial, quality, logistics, and
              impact information into one traceable chain.
            </p>
          </div>
          <div className="trace-chain">
            {[
              ["Farm", Sprout],
              ["Mill", Factory],
              ["Export", Ship],
              ["Warehouse", Warehouse],
              ["Roaster", Coffee],
            ].map(([label, Icon], index) => (
              <div key={label}>
                <span>
                  <Icon size={21} />
                </span>
                <strong>{label}</strong>
                {index < 4 && <ArrowRight size={18} />}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--white">
        <div className="shell impact-report">
          <div className="impact-report__image">
            <img
              src="/images/coffee-farmer.jpg"
              alt="Coffee farmer selecting cherries"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="impact-report__copy">
            <p className="eyebrow">2025 field note</p>
            <h2>Shade renewal in Sidama</h2>
            <p>
              Partner washing stations distributed native shade seedlings and
              trained producers on canopy planning across 620 hectares.
            </p>
            <div className="report-metrics">
              <div>
                <strong>84,000</strong>
                <span>seedlings planted</span>
              </div>
              <div>
                <strong>418</strong>
                <span>participating farms</span>
              </div>
              <div>
                <strong>72%</strong>
                <span>first-year survival</span>
              </div>
            </div>
            <Link className="text-link" to="/contact">
              Request impact data <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="certification-band">
        <div className="shell">
          <div>
            <p className="eyebrow">Certification access</p>
            <h2>Certified when your program requires it.</h2>
          </div>
          <div className="cert-list">
            <span>Organic</span>
            <span>Fairtrade</span>
            <span>Rainforest Alliance</span>
            <span>4C</span>
            <span>Women produced</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function InquiryForm({ type = "roaster", compact = false }) {
  const [status, setStatus] = useState("idle");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  if (status === "success") {
    return (
      <div className="form-success">
        <CheckCircle2 size={36} />
        <h3>Inquiry received</h3>
        <p>A Coffendi sourcing specialist will follow up within one business day.</p>
        <span className="submission-reference">Reference {reference}</span>
        <button className="text-button" type="button" onClick={() => setStatus("idle")}>
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form
      className={`inquiry-form ${compact ? "inquiry-form--compact" : ""}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("submitting");
        setError("");
        const form = new FormData(event.currentTarget);
        try {
          const result = await submitRequest("/api/inquiries", {
            name: form.get("name"),
            company: form.get("company"),
            email: form.get("email"),
            audience: type,
            volume: form.get("volume"),
            country: form.get("country"),
            message: form.get("message"),
            website: form.get("website"),
            source: window.location.pathname,
          });
          setReference(result.reference);
          setStatus("success");
        } catch (submissionError) {
          setError(submissionError.message);
          setStatus("error");
        }
      }}
    >
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex="-1" autoComplete="off" />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input name="name" placeholder="Your name" required />
        </label>
        <label className="field">
          <span>Company</span>
          <input name="company" placeholder="Company name" required />
        </label>
        <label className="field">
          <span>Work email</span>
          <input name="email" type="email" placeholder="name@company.com" required />
        </label>
        <label className="field">
          <span>{type === "producer" ? "Country" : "Roasting volume"}</span>
          {type === "producer" ? (
            <input name="country" placeholder="Origin country" required />
          ) : (
            <select name="volume" defaultValue="" required>
              <option value="" disabled>
                Select monthly volume
              </option>
              <option>Under 10 bags</option>
              <option>10–30 bags</option>
              <option>30–100 bags</option>
              <option>100+ bags</option>
            </select>
          )}
        </label>
      </div>
      <label className="field">
        <span>What can we help with?</span>
        <textarea
          name="message"
          rows={compact ? 3 : 5}
          placeholder={
            type === "producer"
              ? "Tell us about your coffee, harvest, volumes, and export readiness."
              : "Share target profile, timing, volume, warehouse, or coffees you want to sample."
          }
          required
        />
      </label>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <button className="button button--gold" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <>
            Saving inquiry <LoaderCircle className="spinner" size={17} />
          </>
        ) : (
          <>
            Send inquiry <Send size={17} />
          </>
        )}
      </button>
    </form>
  );
}

function RoastersPage({ onOpenFinder }) {
  return (
    <main>
      <PageHero
        eyebrow="Built for roasters"
        title="Sourcing support beyond a stock list."
        copy="From the first sample to release planning, Coffendi helps you buy coffees that fit your menu, margin, and production reality."
        image="/images/roaster-machine.jpg"
        actions={
          <>
            <button className="button button--gold" type="button" onClick={onOpenFinder}>
              Find a coffee <Sparkles size={17} />
            </button>
            <Link className="button button--glass" to="/availability">
              View availability <BarChart3 size={17} />
            </Link>
          </>
        }
      />
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Roaster services"
            title="A buying partner for every stage"
            copy="Practical support shaped around your quality goals, production scale, and delivery plan."
          />
          <div className="service-grid">
            {[
              {
                icon: PackageCheck,
                title: "Sample requests",
                text: "Offer, pre-shipment, landing, and current warehouse samples with lot context attached.",
              },
              {
                icon: Sparkles,
                title: "Coffee matching",
                text: "Shortlists based on cup, process, price, volume, certification, and arrival timing.",
              },
              {
                icon: ClipboardCheck,
                title: "Availability planning",
                text: "Spot, forward, and replacement positions aligned to your buying calendar.",
              },
              {
                icon: Bean,
                title: "Blending support",
                text: "Stable base components and seasonal alternatives evaluated for target cost and cup.",
              },
              {
                icon: ThermometerSun,
                title: "Roast feedback",
                text: "Green analysis and sample roasting support when a new coffee enters production.",
              },
              {
                icon: Headphones,
                title: "Logistics coordination",
                text: "Release timing, consolidation, warehouse options, and delivery visibility.",
              },
            ].map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title}>
                  <Icon size={22} />
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section section--white">
        <div className="shell roaster-path">
          <div>
            <p className="eyebrow">Sample to contract</p>
            <h2>A straightforward buying flow.</h2>
            <p>
              Clear checkpoints keep quality, commercial terms, and delivery
              expectations aligned.
            </p>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Build the brief</strong>
                <p>Profile, budget, use, volume, timing, and warehouse.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Cup the shortlist</strong>
                <p>Samples arrive with lot details and current position.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Approve & contract</strong>
                <p>Confirm quality, quantity, price, and release terms.</p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Release with support</strong>
                <p>Coordinate delivery and stay ahead of replacement needs.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <section className="section section--green">
        <div className="shell inquiry-layout">
          <div>
            <p className="eyebrow eyebrow--gold">Start a conversation</p>
            <h2>Tell us what you are trying to source.</h2>
            <p>
              Share a coffee you need to replace, a target profile, or a new
              program you are building.
            </p>
            <ul className="check-list">
              <li>
                <Check size={17} /> Sample-ready recommendations
              </li>
              <li>
                <Check size={17} /> Transparent landed positions
              </li>
              <li>
                <Check size={17} /> Response within one business day
              </li>
            </ul>
          </div>
          <InquiryForm compact />
        </div>
      </section>
    </main>
  );
}

function StoriesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Producer stories"
        title="The people behind every profile."
        copy="Meet the producers, cooperative leaders, mill teams, and origin partners whose decisions shape the cup."
        image="/images/farmer-guatemala.jpg"
      />
      <section className="section section--cream">
        <div className="shell">
          <div className="story-grid">
            {stories.map((story, index) => (
              <article className={index === 0 ? "story-card story-card--lead" : "story-card"} key={story.title}>
                <div className="story-card__image">
                  <img src={story.image} alt="" loading="lazy" decoding="async" />
                  <span>{story.metric}</span>
                </div>
                <div className="story-card__copy">
                  <p className="eyebrow">{story.category}</p>
                  <h2>{story.title}</h2>
                  <span className="story-location">
                    <MapPin size={15} /> {story.location}
                  </span>
                  <p>{story.excerpt}</p>
                  <button className="text-link" type="button">
                    Read the story <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="story-manifesto">
        <div className="shell">
          <p className="eyebrow eyebrow--gold">What we document</p>
          <h2>
            More than a name on a label: decisions, context, progress, and the
            work behind quality.
          </h2>
        </div>
      </section>
      <section className="section section--white">
        <div className="shell region-notes">
          <SectionHeading
            eyebrow="Field notes"
            title="Latest from origin"
            copy="Short updates from harvest, milling, quality selection, and partner programs."
          />
          <div className="region-note-grid">
            {[
              {
                date: "Jun 18",
                place: "Tolima, Colombia",
                title: "Main crop lot separation begins at El Vergel",
              },
              {
                date: "May 29",
                place: "Cerrado, Brazil",
                title: "First Yellow Bourbon selections reach the patios",
              },
              {
                date: "May 08",
                place: "Karongi, Rwanda",
                title: "Gitesi’s women producers close a strong picking cycle",
              },
            ].map((note) => (
              <article key={note.title}>
                <span>{note.date}</span>
                <p>{note.place}</p>
                <h3>{note.title}</h3>
                <ArrowUpRight size={18} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

const qualitySteps = [
  {
    icon: Coffee,
    title: "Cupping",
    text: "Offer, pre-shipment, landing, and warehouse samples are calibrated against a shared protocol.",
  },
  {
    icon: Award,
    title: "Grading",
    text: "Cup score, physical preparation, screen size, moisture, water activity, and density inform approval.",
  },
  {
    icon: ThermometerSun,
    title: "Sample roasting",
    text: "Consistent roast color and development create a fair view of each lot’s structure and potential.",
  },
  {
    icon: ClipboardCheck,
    title: "Defect checks",
    text: "Green and cup defects are recorded against contract tolerance before coffee is released.",
  },
  {
    icon: PackageCheck,
    title: "Landing approval",
    text: "Arrival quality is checked against the approved pre-shipment sample and documented by lot.",
  },
  {
    icon: BarChart3,
    title: "Quality monitoring",
    text: "Warehouse samples track condition over time and support release or replacement planning.",
  },
];

function QualityPage() {
  return (
    <main>
      <PageHero
        eyebrow="Quality & cupping"
        title="Quality protected at every handoff."
        copy="Our quality system connects calibrated sensory work with physical analysis, sample control, and clear approval records."
        image="/images/coffee-cup.jpg"
      />
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Quality protocol"
            title="From offer sample to warehouse release"
            copy="The same lot is checked repeatedly as risk, location, and responsibility change."
          />
          <div className="quality-grid">
            {qualitySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={23} />
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section section--green">
        <div className="shell quality-lab">
          <div className="quality-lab__image">
            <img
              src="/images/roaster-machine.jpg"
              alt="Coffee sample roasting equipment"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="quality-lab__copy">
            <p className="eyebrow eyebrow--gold">The Coffendi quality lab</p>
            <h2>One language for origin teams and roasters.</h2>
            <p>
              Calibration links our cuppers, producer partners, exporters, and
              roaster customers around repeatable quality decisions.
            </p>
            <dl>
              <div>
                <dt>Cupping protocol</dt>
                <dd>SCA-aligned</dd>
              </div>
              <div>
                <dt>Sample retention</dt>
                <dd>12 months</dd>
              </div>
              <div>
                <dt>Water reference</dt>
                <dd>150 ppm TDS</dd>
              </div>
              <div>
                <dt>Calibration</dt>
                <dd>Monthly</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <section className="section section--white">
        <div className="shell cup-report">
          <SectionHeading
            eyebrow="Sample cup report"
            title="Bensa Bombe · Natural"
            copy="A clear snapshot of how sensory and physical data appear together."
          />
          <div className="cup-report__grid">
            <div className="radar-placeholder" aria-label="Cup score breakdown">
              <div>
                <strong>88.25</strong>
                <span>total score</span>
              </div>
              <ul>
                <li>
                  <span>Fragrance</span>
                  <i style={{ width: "92%" }} />
                  <strong>8.75</strong>
                </li>
                <li>
                  <span>Flavor</span>
                  <i style={{ width: "89%" }} />
                  <strong>8.5</strong>
                </li>
                <li>
                  <span>Acidity</span>
                  <i style={{ width: "86%" }} />
                  <strong>8.25</strong>
                </li>
                <li>
                  <span>Body</span>
                  <i style={{ width: "82%" }} />
                  <strong>8.0</strong>
                </li>
              </ul>
            </div>
            <div className="physical-data">
              <h3>Physical analysis</h3>
              <dl>
                <div>
                  <dt>Moisture</dt>
                  <dd>10.4%</dd>
                </div>
                <div>
                  <dt>Water activity</dt>
                  <dd>0.54 aw</dd>
                </div>
                <div>
                  <dt>Density</dt>
                  <dd>742 g/L</dd>
                </div>
                <div>
                  <dt>Primary defects</dt>
                  <dd>0 / 350g</dd>
                </div>
                <div>
                  <dt>Screen</dt>
                  <dd>15+</dd>
                </div>
                <div>
                  <dt>Packaging</dt>
                  <dd>GrainPro</dd>
                </div>
              </dl>
              <p>
                <strong>Cup:</strong> Blueberry, jasmine, cacao nib. Syrupy body
                with a clean, floral finish.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactPage() {
  const [audience, setAudience] = useState("roaster");

  return (
    <main>
      <PageHero
        compact
        eyebrow="Contact Coffendi"
        title="Let’s talk coffee."
        copy="Reach the right team for sourcing, producer partnerships, logistics, or impact collaboration."
        image="/images/coffee-roastery.jpg"
      />
      <section className="section section--cream">
        <div className="shell contact-layout">
          <div className="contact-details">
            <p className="eyebrow">Start here</p>
            <h2>Choose the conversation that fits.</h2>
            <div className="contact-tabs" role="tablist" aria-label="Inquiry type">
              {[
                ["roaster", "I’m a roaster"],
                ["producer", "I’m a producer"],
                ["partner", "Partnerships"],
              ].map(([value, label]) => (
                <button
                  role="tab"
                  aria-selected={audience === value}
                  className={audience === value ? "is-active" : ""}
                  type="button"
                  key={value}
                  onClick={() => setAudience(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="contact-office-list">
              <div>
                <MapPin size={18} />
                <span>
                  <strong>Türkiye</strong>
                  Mersin · Regional office & warehouse
                </span>
              </div>
              <div>
                <Warehouse size={18} />
                <span>
                  <strong>Europe</strong>
                  Hamburg · Rotterdam · Antwerp
                </span>
              </div>
              <div>
                <Send size={18} />
                <span>
                  <strong>Email</strong>
                  coffee@coffendi.com
                </span>
              </div>
            </div>
          </div>
          <div className="contact-form-wrap">
            <InquiryForm type={audience} />
          </div>
        </div>
      </section>
    </main>
  );
}

function FinderDrawer({ open, onClose, onAddSample }) {
  const [form, setForm] = useState({
    budget: "6–8",
    volume: "20–60 bags",
    origin: "Open",
    flavor: "Fruit-forward",
    process: "Open",
    certification: "Any",
    delivery: "Mersin",
  });
  const [results, setResults] = useState(null);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    if (!open) return () => document.body.classList.remove("no-scroll");
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);

  const findMatches = () => {
    const budgetMax = form.budget === "Under 6" ? 6 : form.budget === "6–8" ? 8 : 11;
    const profileTerms = {
      "Fruit-forward": ["fruit", "berry", "grape", "plum", "apricot", "pineapple"],
      "Chocolate & nuts": ["chocolate", "cacao", "cocoa", "hazelnut", "almond", "praline"],
      "Floral & bright": ["jasmine", "rose", "tea", "citrus", "grapefruit"],
      Balanced: ["caramel", "toffee", "sugar", "apple"],
    };
    const scored = coffees
      .map((coffee) => {
        let score = 0;
        if (coffee.priceValue <= budgetMax) score += 3;
        if (form.origin === "Open" || coffee.country === form.origin) score += 2;
        if (form.process === "Open" || coffee.process === form.process) score += 2;
        if (
          form.certification === "Any" ||
          coffee.certification.includes(form.certification)
        )
          score += 2;
        if (
          coffee.flavor.some((note) =>
            profileTerms[form.flavor].some((term) => note.toLowerCase().includes(term)),
          )
        )
          score += 3;
        if (coffee.warehouse === form.delivery) score += 1;
        return { coffee, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ coffee }) => coffee);
    setResults(scored);
  };

  return (
    <>
      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside
        className={`finder-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Find your coffee"
        aria-hidden={!open}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Coffee matching</p>
            <h2>Find your coffee</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {!results ? (
          <div className="finder-form">
            <div className="finder-intro">
              <Sparkles size={19} />
              <p>
                Match your brief with Coffendi’s current and incoming positions.
              </p>
            </div>
            <div className="finder-grid">
              <label className="field">
                <span>Target budget</span>
                <select value={form.budget} onChange={(event) => update("budget", event.target.value)}>
                  <option>Under 6</option>
                  <option>6–8</option>
                  <option>8+</option>
                </select>
              </label>
              <label className="field">
                <span>Volume</span>
                <select value={form.volume} onChange={(event) => update("volume", event.target.value)}>
                  <option>Under 20 bags</option>
                  <option>20–60 bags</option>
                  <option>60+ bags</option>
                </select>
              </label>
              <label className="field">
                <span>Origin</span>
                <select value={form.origin} onChange={(event) => update("origin", event.target.value)}>
                  <option>Open</option>
                  {[...new Set(coffees.map((coffee) => coffee.country))].map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Flavor direction</span>
                <select value={form.flavor} onChange={(event) => update("flavor", event.target.value)}>
                  <option>Fruit-forward</option>
                  <option>Chocolate & nuts</option>
                  <option>Floral & bright</option>
                  <option>Balanced</option>
                </select>
              </label>
              <label className="field">
                <span>Process</span>
                <select value={form.process} onChange={(event) => update("process", event.target.value)}>
                  <option>Open</option>
                  <option>Washed</option>
                  <option>Natural</option>
                  <option>Honey</option>
                  <option>Anaerobic</option>
                </select>
              </label>
              <label className="field">
                <span>Certification</span>
                <select
                  value={form.certification}
                  onChange={(event) => update("certification", event.target.value)}
                >
                  <option>Any</option>
                  <option>Organic</option>
                  <option>Fairtrade</option>
                  <option>Rainforest Alliance</option>
                  <option>Verified traceable</option>
                </select>
              </label>
              <label className="field field--wide">
                <span>Preferred delivery warehouse</span>
                <select
                  value={form.delivery}
                  onChange={(event) => update("delivery", event.target.value)}
                >
                  <option>Mersin</option>
                  <option>Hamburg</option>
                  <option>Rotterdam</option>
                  <option>Antwerp</option>
                </select>
              </label>
            </div>
            <button className="button button--gold button--full" type="button" onClick={findMatches}>
              Show my matches <Sparkles size={17} />
            </button>
          </div>
        ) : (
          <div className="finder-results">
            <div className="match-summary">
              <CheckCircle2 size={23} />
              <div>
                <strong>{results.length} strong matches</strong>
                <p>
                  Based on {form.flavor.toLowerCase()}, {form.budget}/lb, and{" "}
                  {form.volume.toLowerCase()}.
                </p>
              </div>
            </div>
            <div className="match-list">
              {results.map((coffee, index) => (
                <article key={coffee.id}>
                  <span className="match-rank">0{index + 1}</span>
                  <div>
                    <p>
                      {coffee.country} · {coffee.process}
                    </p>
                    <h3>{coffee.name}</h3>
                    <div className="flavor-list">
                      {coffee.flavor.map((note) => (
                        <span key={note}>{note}</span>
                      ))}
                    </div>
                    <dl>
                      <div>
                        <dt>Score</dt>
                        <dd>{coffee.score}</dd>
                      </div>
                      <div>
                        <dt>Available</dt>
                        <dd>{coffee.bags} bags</dd>
                      </div>
                      <div>
                        <dt>Price</dt>
                        <dd>{coffee.price}</dd>
                      </div>
                    </dl>
                    <button
                      className="button button--small button--dark"
                      type="button"
                      onClick={() => onAddSample(coffee.id)}
                    >
                      <PackageCheck size={16} /> Add sample
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="finder-result-actions">
              <button className="text-button" type="button" onClick={() => setResults(null)}>
                <ArrowRight className="arrow-back" size={16} /> Change brief
              </button>
              <Link className="button button--outline" to="/contact" onClick={onClose}>
                Send full inquiry <Send size={16} />
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function SampleDrawer({ open, onClose, selectedIds, onRemove, onComplete }) {
  const selected = coffees.filter((coffee) => selectedIds.includes(coffee.id));
  const [status, setStatus] = useState("idle");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError("");
    }
    document.body.classList.toggle("no-scroll", open);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside
        className={`sample-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sample request"
        aria-hidden={!open}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Sample request</p>
            <h2>{selected.length} coffees selected</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {status === "success" ? (
          <div className="drawer-success">
            <CheckCircle2 size={42} />
            <h3>Sample request received</h3>
            <p>
              We’ll confirm sample availability and shipping details by email.
            </p>
            <span className="submission-reference">Reference {reference}</span>
            <button
              className="button button--dark"
              type="button"
              onClick={() => {
                onComplete();
                onClose();
              }}
            >
              Done
            </button>
          </div>
        ) : selected.length ? (
          <>
            <div className="sample-list">
              {selected.map((coffee) => (
                <article key={coffee.id}>
                  <img src={coffee.image} alt="" loading="lazy" decoding="async" />
                  <div>
                    <span>{coffee.country}</span>
                    <h3>{coffee.name}</h3>
                    <p>
                      {coffee.process} · {coffee.score} pts
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onRemove(coffee.id)}
                    aria-label={`Remove ${coffee.name}`}
                  >
                    <X size={17} />
                  </button>
                </article>
              ))}
            </div>
            <form
              className="sample-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setStatus("submitting");
                setError("");
                const form = new FormData(event.currentTarget);
                try {
                  const result = await submitRequest("/api/sample-requests", {
                    name: form.get("name"),
                    company: form.get("company"),
                    email: form.get("email"),
                    country: form.get("country"),
                    message: form.get("message"),
                    website: form.get("website"),
                    source: window.location.pathname,
                    coffeeIds: selected.map((coffee) => coffee.id),
                    coffeeNames: selected.map((coffee) => coffee.name),
                  });
                  setReference(result.reference);
                  setStatus("success");
                } catch (submissionError) {
                  setError(submissionError.message);
                  setStatus("error");
                }
              }}
            >
              <label className="bot-field" aria-hidden="true">
                Website
                <input name="website" tabIndex="-1" autoComplete="off" />
              </label>
              <label className="field">
                <span>Name</span>
                <input name="name" placeholder="Your name" autoComplete="name" required />
              </label>
              <label className="field">
                <span>Company</span>
                <input name="company" placeholder="Roastery name" autoComplete="organization" required />
              </label>
              <label className="field">
                <span>Work email</span>
                <input name="email" type="email" placeholder="name@roastery.com" autoComplete="email" required />
              </label>
              <label className="field">
                <span>Delivery country</span>
                <input name="country" placeholder="Country" autoComplete="country-name" required />
              </label>
              <label className="field">
                <span>Notes <small>Optional</small></span>
                <textarea name="message" rows="3" placeholder="Preferred delivery timing or sample notes" />
              </label>
              {error && (
                <div className="form-alert" role="alert">
                  {error}
                </div>
              )}
              <button
                className="button button--gold button--full"
                type="submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <>
                    Saving request <LoaderCircle className="spinner" size={17} />
                  </>
                ) : (
                  <>
                    Submit sample request <Send size={17} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state empty-state--drawer">
            <PackageCheck size={31} />
            <h3>No samples selected</h3>
            <p>Add coffees from the catalog or your match results.</p>
            <Link className="button button--dark" to="/coffees" onClick={onClose}>
              Explore coffees
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function NewsletterForm() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  if (status === "success") {
    return (
      <div className="newsletter-success">
        <CheckCircle2 size={19} />
        <span>
          <strong>You’re on the list.</strong>
          Fresh arrivals and field notes will land in your inbox.
        </span>
      </div>
    );
  }

  return (
    <form
      className="newsletter-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("submitting");
        setMessage("");
        const form = new FormData(event.currentTarget);
        try {
          await submitRequest("/api/subscriptions", {
            email: form.get("email"),
            consent: true,
            website: form.get("website"),
            source: window.location.pathname,
          });
          setStatus("success");
        } catch (submissionError) {
          setMessage(submissionError.message);
          setStatus("error");
        }
      }}
    >
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex="-1" autoComplete="off" />
      </label>
      <label htmlFor="newsletter-email">Fresh crop updates</label>
      <div>
        <Mail size={16} />
        <input
          id="newsletter-email"
          name="email"
          type="email"
          placeholder="Work email"
          aria-label="Email address"
          required
        />
        <button type="submit" aria-label="Subscribe" disabled={status === "submitting"}>
          {status === "submitting" ? (
            <LoaderCircle className="spinner" size={16} />
          ) : (
            <ArrowRight size={16} />
          )}
        </button>
      </div>
      <small>Monthly arrivals, producer notes, and buying windows.</small>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}

function Footer({ onOpenFinder }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Green coffee partnerships built on quality, transparency, and
            practical support from origin to roastery.
          </p>
          <button className="button button--gold button--small" type="button" onClick={onOpenFinder}>
            Find your coffee <Sparkles size={16} />
          </button>
        </div>
        <NewsletterForm />
        <div>
          <h3>Source</h3>
          <Link to="/coffees">Our coffees</Link>
          <Link to="/availability">Price & availability</Link>
          <Link to="/origins">Origin map</Link>
          <Link to="/roasters">For roasters</Link>
        </div>
        <div>
          <h3>About</h3>
          <Link to="/sustainability">Sustainability</Link>
          <Link to="/stories">Producer stories</Link>
          <Link to="/quality">Quality & cupping</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <h3>Regional access</h3>
          <p>Mersin · Hamburg</p>
          <p>Rotterdam · Antwerp</p>
          <a href="mailto:coffee@coffendi.com">coffee@coffendi.com</a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 Coffendi. All rights reserved.</span>
        <span>Green coffee. Clear relationships.</span>
      </div>
    </footer>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="shell">
        <Bean size={38} />
        <p className="eyebrow">404</p>
        <h1>This lot is no longer here.</h1>
        <p>The page may have moved, but the current coffee list is ready.</p>
        <Link className="button button--dark" to="/coffees">
          Browse coffees <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  );
}

function Toast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="app-toast" role="status">
      <CheckCircle2 size={17} />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        <X size={15} />
      </button>
    </div>
  );
}

export default function App() {
  const [finderOpen, setFinderOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedSamples, setSelectedSamples] = usePersistentState("coffendi-samples", []);
  const [compareIds, setCompareIds] = usePersistentState("coffendi-compare", []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3_000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const openSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  const toggleSample = (id) => {
    setSelectedSamples((current) =>
      current.includes(id)
        ? current.filter((coffeeId) => coffeeId !== id)
        : [...current, id],
    );
  };

  const addSample = (id) => {
    setSelectedSamples((current) => (current.includes(id) ? current : [...current, id]));
  };

  const toggleCompare = (id) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((coffeeId) => coffeeId !== id);
      if (current.length >= 3) {
        setNotice("Compare up to three coffees at a time.");
        return current;
      }
      setNotice("Coffee added to comparison.");
      return [...current, id];
    });
  };

  return (
    <>
      <ScrollToTop />
      <Header
        sampleCount={selectedSamples.length}
        onOpenSamples={() => setSampleDrawerOpen(true)}
        onOpenFinder={() => setFinderOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              selectedSamples={selectedSamples}
              onToggleSample={toggleSample}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              onOpenFinder={() => setFinderOpen(true)}
            />
          }
        />
        <Route
          path="/coffees"
          element={
            <CoffeesPage
              selectedSamples={selectedSamples}
              onToggleSample={toggleSample}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              onOpenFinder={() => setFinderOpen(true)}
            />
          }
        />
        <Route
          path="/coffees/:coffeeId"
          element={
            <CoffeeDetailPage
              selectedSamples={selectedSamples}
              onToggleSample={toggleSample}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
            />
          }
        />
        <Route path="/origins" element={<OriginsPage />} />
        <Route
          path="/availability"
          element={
            <AvailabilityPage
              selectedSamples={selectedSamples}
              onToggleSample={toggleSample}
            />
          }
        />
        <Route path="/sustainability" element={<SustainabilityPage />} />
        <Route
          path="/roasters"
          element={<RoastersPage onOpenFinder={() => setFinderOpen(true)} />}
        />
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/quality" element={<QualityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer onOpenFinder={() => setFinderOpen(true)} />
      <MobileDock onOpenFinder={() => setFinderOpen(true)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FinderDrawer
        open={finderOpen}
        onClose={() => setFinderOpen(false)}
        onAddSample={(id) => {
          addSample(id);
          setFinderOpen(false);
          setSampleDrawerOpen(true);
        }}
      />
      <SampleDrawer
        open={sampleDrawerOpen}
        onClose={() => setSampleDrawerOpen(false)}
        selectedIds={selectedSamples}
        onRemove={toggleSample}
        onComplete={() => setSelectedSamples([])}
      />
      <CompareTray
        ids={compareIds}
        onRemove={toggleCompare}
        onClear={() => setCompareIds([])}
        onAddSample={addSample}
        sampleIds={selectedSamples}
      />
      <Toast message={notice} onDismiss={() => setNotice("")} />
    </>
  );
}
