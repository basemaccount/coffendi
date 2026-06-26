import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bean,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
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
  MessageCircle,
  Menu,
  PackageCheck,
  Search,
  Send,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Target,
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
import {
  buildAssistantReply,
  buildSourcingItems,
  defaultSourcingBrief,
  formatSourcingBrief,
  recommendSourcingItems,
  scoreSourcingItem,
  sourcingCertifications,
  sourcingProcesses,
  sourcingProfiles,
  sourcingWarehouses,
  summarizeComparison,
} from "./lib/sourcing";
import {
  makendiCatalogMeta,
  makendiOriginSummary,
  makendiSearchIndex,
} from "./makendiSummary";

const mapCountries = feature(worldData, worldData.objects.countries).features;
const MakendiAtlasPage = lazy(() =>
  import("./components/MakendiAtlasPage").then((module) => ({
    default: module.MakendiAtlasPage,
  })),
);
const MakendiGradePage = lazy(() =>
  import("./components/MakendiAtlasPage").then((module) => ({
    default: module.MakendiGradePage,
  })),
);

const mainNav = [
  { label: "Sourcing", to: "/sourcing" },
  { label: "Coffees", to: "/coffees" },
  { label: "Atlas", to: "/atlas" },
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
    const atlasGrade = pathname.startsWith("/atlas/")
      ? makendiSearchIndex.find((item) => pathname.endsWith(item.id))
      : null;
    const routeTitles = {
      "/": "Coffendi — Coffee with a clear origin",
      "/sourcing": "AI Sourcing Desk — Coffendi",
      "/coffees": "Green Coffee Portfolio — Coffendi",
      "/atlas": "Makendi Grade Atlas — Coffendi",
      "/origins": "Coffee Origins — Coffendi",
      "/availability": "Price & Availability — Coffendi",
      "/sustainability": "Responsible Sourcing — Coffendi",
      "/roasters": "For Roasters — Coffendi",
      "/stories": "Producer Stories — Coffendi",
      "/quality": "Quality & Cupping — Coffendi",
      "/contact": "Contact Coffendi",
    };
    document.title = atlasGrade
      ? `${atlasGrade.shortGrade} · ${atlasGrade.country} — Coffendi Atlas`
      : coffee
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
        Makendi 117-grade source atlas is now live for roaster briefs
        <Link to="/atlas">
          Explore atlas <ArrowRight size={14} />
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

function SourcingFloatingAction({ onOpenFinder }) {
  return (
    <button
      className="sourcing-fab"
      type="button"
      onClick={onOpenFinder}
      aria-label="Open AI sourcing desk"
      title="AI sourcing desk"
    >
      <Bot size={18} />
      <span>Sourcing desk</span>
    </button>
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
  const atlasResults = makendiSearchIndex
    .filter((grade) =>
      grade.searchText
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, normalized ? 5 : 3);
  const pageResults = [
    ["Makendi grade atlas", "/atlas", "117 source profiles across 38 origins"],
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
          {atlasResults.length > 0 && (
            <div>
              <p>Atlas</p>
              {atlasResults.map((grade) => (
                <Link key={grade.id} to={`/atlas/${grade.id}`}>
                  <img src={grade.image} alt="" loading="lazy" decoding="async" />
                  <span>
                    <strong>{grade.shortGrade}</strong>
                    <small>
                      {grade.country} · {grade.coffeeType} · {grade.processDisplay}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          )}
          {!coffeeResults.length && !pageResults.length && !atlasResults.length && (
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

function RouteLoading({ label }) {
  return (
    <main className="route-loading">
      <div className="shell">
        <LoaderCircle className="spinner" size={22} />
        <span>{label}</span>
      </div>
    </main>
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
  const selectedAtlas = makendiOriginSummary.find(
    (origin) => origin.country === selected.country,
  );
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
            <div>
              <dt>Atlas</dt>
              <dd>{selectedAtlas ? `${selectedAtlas.gradeCount} profiles` : "On request"}</dd>
            </div>
          </dl>
          <p className="origin-profile">{selected.profile}</p>
          <div className="origin-detail__links">
            <Link className="text-link" to={`/coffees?origin=${selected.country}`}>
              View coffees <ArrowRight size={16} />
            </Link>
            {selectedAtlas && (
              <Link className="text-link" to={`/atlas?origin=${encodeURIComponent(selected.country)}`}>
                Atlas profiles <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function SourcingDeskPreview({ onOpenFinder }) {
  const topOrigins = makendiOriginSummary.slice(0, 3);

  return (
    <section className="section section--dark sourcing-desk-preview">
      <div className="shell sourcing-desk-preview__grid">
        <div className="sourcing-desk-preview__copy">
          <p className="eyebrow eyebrow--gold">AI sourcing desk</p>
          <h2>Ask for a profile. Get a shortlist, tradeoffs, and next steps.</h2>
          <p>
            A source-aware assistant now ranks live Coffendi lots against all
            {` ${makendiCatalogMeta.recordCount} `}Makendi grade profiles by cup,
            process, budget, volume, delivery point, and certification needs.
          </p>
          <div className="sourcing-desk-preview__actions">
            <button className="button button--gold" type="button" onClick={onOpenFinder}>
              Open sourcing desk <Bot size={17} />
            </button>
            <Link className="button button--glass" to="/availability">
              Check live stock <BarChart3 size={17} />
            </Link>
          </div>
        </div>
        <div className="sourcing-desk-preview__panel">
          <div className="assistant-card">
            <span>
              <Bot size={18} /> Assistant brief
            </span>
            <p>Find a washed Ethiopia or Kenya for bright filter, 20 bags, Hamburg.</p>
          </div>
          <div className="assistant-stack">
            {topOrigins.map((origin, index) => (
              <Link key={origin.country} to={`/atlas?origin=${encodeURIComponent(origin.country)}`}>
                <img src={origin.flag} alt="" loading="lazy" decoding="async" />
                <span>0{index + 1}</span>
                <strong>{origin.country}</strong>
                <small>{origin.gradeCount} Makendi profiles</small>
              </Link>
            ))}
          </div>
          <div className="assistant-metric-row">
            <div>
              <strong>3 modes</strong>
              <span>Match · Ask · Compare</span>
            </div>
            <div>
              <strong>{coffees.length + makendiSearchIndex.length}</strong>
              <span>searchable profiles</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SourcingAssistBand({ onOpenFinder, variant = "light" }) {
  return (
    <section className={`sourcing-assist-band sourcing-assist-band--${variant}`}>
      <div className="shell sourcing-assist-band__inner">
        <div>
          <p className="eyebrow">Sourcing intelligence</p>
          <h2>Need a faster shortlist?</h2>
          <p>
            Use the assistant to match budget, volume, process, flavor direction,
            delivery warehouse, live lots, and Makendi planning profiles.
          </p>
        </div>
        <div className="sourcing-assist-band__actions">
          <button className="button button--dark" type="button" onClick={onOpenFinder}>
            Ask assistant <MessageCircle size={17} />
          </button>
          <Link className="button button--outline" to="/atlas">
            Search atlas <Search size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AtlasOriginMatrix({ compact = false }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("coverage");
  const visibleOrigins = useMemo(() => {
    const searchTerm = query.toLowerCase().trim();
    const rows = makendiOriginSummary.filter((origin) =>
      [origin.country, ...origin.processes].join(" ").toLowerCase().includes(searchTerm),
    );
    return rows.sort((a, b) => {
      if (sort === "country") return a.country.localeCompare(b.country);
      if (sort === "process") return b.processes.length - a.processes.length || a.country.localeCompare(b.country);
      return b.gradeCount - a.gradeCount || a.country.localeCompare(b.country);
    });
  }, [query, sort]);
  const rows = compact ? visibleOrigins.slice(0, 12) : visibleOrigins;

  return (
    <div className="atlas-origin-matrix">
      <div className="atlas-origin-matrix__toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search 38 Makendi origins or processes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="sort-field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="coverage">Most profiles</option>
            <option value="country">Country A-Z</option>
            <option value="process">Process depth</option>
          </select>
        </label>
      </div>
      <div className="atlas-origin-matrix__grid">
        {rows.map((origin) => (
          <Link key={origin.country} to={`/atlas?origin=${encodeURIComponent(origin.country)}`}>
            <img src={origin.image} alt="" loading="lazy" decoding="async" />
            <span className="origin-matrix-flag">
              <img src={origin.flag} alt="" loading="lazy" decoding="async" />
              {origin.country}
            </span>
            <strong>{origin.gradeCount} profiles</strong>
            <small>{origin.processes.slice(0, 3).join(" · ")}</small>
            <i>
              Open profiles <ArrowRight size={14} />
            </i>
          </Link>
        ))}
      </div>
      {compact && visibleOrigins.length > rows.length && (
        <Link className="button button--outline" to="/origins">
          View all {makendiOriginSummary.length} origins <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}

function SourcingPage({ onOpenFinder }) {
  const recommended = useMemo(
    () =>
      recommendSourcingItems(
        coffees,
        makendiSearchIndex,
        {
          ...defaultSourcingBrief,
          flavor: "Classic espresso",
          use: "Espresso",
          channel: "Live + atlas",
        },
        4,
      ),
    [],
  );

  return (
    <main>
      <PageHero
        eyebrow="AI sourcing desk"
        title="Source coffee from a brief, not a spreadsheet."
        copy="Build a roaster-ready shortlist across live Coffendi inventory and 117 Makendi planning profiles, then send the brief with source-aware tradeoffs attached."
        image="/images/green-beans-sack.jpg"
        actions={
          <>
            <button className="button button--gold" type="button" onClick={onOpenFinder}>
              Open sourcing desk <Bot size={17} />
            </button>
            <Link className="button button--glass" to="/atlas">
              Browse Makendi atlas <ArrowRight size={17} />
            </Link>
          </>
        }
      />
      <section className="section section--cream sourcing-command-section">
        <div className="shell sourcing-command-grid">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Three tools for one buying decision.</h2>
            <p>
              Match finds the closest coffees, Ask translates natural language into
              buying criteria, and Compare shows commercial certainty against cup
              fit before the team follows up.
            </p>
            <button className="button button--dark" type="button" onClick={onOpenFinder}>
              Start a sourcing brief <Sparkles size={17} />
            </button>
          </div>
          <div className="sourcing-command-cards">
            {[
              [Target, "Match", "Rank by budget, volume, flavor, process, source mode, and delivery point."],
              [MessageCircle, "Ask", "Use free-form prompts like: washed East Africa, 20 bags, Hamburg, under $8."],
              [GitCompareArrows, "Compare", "See tradeoffs between priced live lots and Makendi inquiry-led profiles."],
            ].map(([Icon, title, text]) => (
              <article key={title}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--white">
        <div className="shell">
          <SectionHeading
            eyebrow="Example shortlist"
            title="A live-plus-atlas espresso brief"
            copy="These cards show how the desk distinguishes active stock from Makendi planning references."
          />
          <div className="sourcing-page-shortlist">
            {recommended.map((item) => (
              <article key={item.id}>
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <span>{item.sourceLabel}</span>
                <h3>{item.name}</h3>
                <p>{item.country} · {item.process} · {item.matchScore}% match</p>
                <ul>
                  {item.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>
                      <Check size={14} /> {reason}
                    </li>
                  ))}
                </ul>
                <Link to={item.href}>
                  Open profile <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Origin intelligence"
            title="Plan across all 38 Makendi origins"
            copy="Use this matrix for replacement planning, blend components, and origin expansion before a priced position is released."
          />
          <AtlasOriginMatrix compact />
        </div>
      </section>
    </main>
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
            <button className="button button--glass" type="button" onClick={onOpenFinder}>
              Ask AI sourcing desk <Bot size={18} />
            </button>
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

      <section className="section section--white home-atlas-preview">
        <div className="shell home-atlas-grid">
          <div className="home-atlas-copy">
            <p className="eyebrow">Makendi source atlas</p>
            <h2>Turn a 117-page origin catalog into a usable sourcing brief.</h2>
            <p>
              The full Makendi V5 grade set is now searchable by origin, coffee type,
              process, grade class, defect tolerance, cup direction, and intended use.
            </p>
            <div className="home-atlas-stats">
              <div>
                <strong>{makendiCatalogMeta.recordCount}</strong>
                <span>grade profiles</span>
              </div>
              <div>
                <strong>{makendiCatalogMeta.originCount}</strong>
                <span>producing origins</span>
              </div>
              <div>
                <strong>{makendiCatalogMeta.coffeeTypes.length}</strong>
                <span>coffee types</span>
              </div>
            </div>
            <Link className="button button--dark" to="/atlas">
              Explore the atlas <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-atlas-stack">
            {makendiOriginSummary.slice(0, 4).map((origin) => (
              <Link key={origin.country} to={`/atlas?origin=${encodeURIComponent(origin.country)}`}>
                <img src={origin.image} alt="" loading="lazy" decoding="async" />
                <span>
                  <img src={origin.flag} alt="" loading="lazy" decoding="async" />
                  {origin.country}
                </span>
                <strong>{origin.gradeCount} profiles</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SourcingDeskPreview onOpenFinder={onOpenFinder} />

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
      <SourcingAssistBand onOpenFinder={onOpenFinder} />
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
      <section className="section section--white origin-atlas-callout">
        <div className="shell origin-atlas-callout__inner">
          <div>
            <p className="eyebrow">Beyond live positions</p>
            <h2>Compare {makendiCatalogMeta.recordCount} grade profiles from the Makendi source deck.</h2>
            <p>
              Use the atlas when you are planning a replacement, building a blend, or
              exploring grades before a priced position is released.
            </p>
          </div>
          <Link className="button button--dark" to="/atlas">
            Open grade atlas <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section section--cream">
        <div className="shell">
          <SectionHeading
            eyebrow="Makendi origin coverage"
            title="All 38 atlas origins in one planning matrix"
            copy="Search by country or processing style, then open the matching Makendi grade profiles."
          />
          <AtlasOriginMatrix />
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

function AvailabilityPage({ selectedSamples, onToggleSample, onOpenFinder }) {
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
      <SourcingAssistBand onOpenFinder={onOpenFinder} variant="cream" />
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
      <section className="section section--white trace-proof-section">
        <div className="shell trace-proof-grid">
          <div>
            <p className="eyebrow">Traceability proof layer</p>
            <h2>Source data is separated from commercial assumptions.</h2>
            <p>
              The Makendi atlas contributes origin, grade, processing, and cup
              direction across {makendiCatalogMeta.recordCount} profiles. Price,
              shipment period, and basis stay inquiry-led when the source table
              does not provide them.
            </p>
          </div>
          <div className="trace-proof-cards">
            <article>
              <strong>{makendiCatalogMeta.originCount}</strong>
              <span>origins represented</span>
            </article>
            <article>
              <strong>{makendiCatalogMeta.provenanceCounts.source_pdf}</strong>
              <span>source PDF field flags</span>
            </article>
            <article>
              <strong>{makendiCatalogMeta.assetWarnings}</strong>
              <span>asset warnings kept visible</span>
            </article>
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
      <section className="section section--white story-atlas-section">
        <div className="shell">
          <SectionHeading
            eyebrow="Makendi origin notebook"
            title="Producer context from 38 sourcing countries"
            copy="Representative farmer and country imagery from the Makendi delivery now helps roasters scan potential origin stories before priced lots are released."
          />
          <div className="story-atlas-grid">
            {makendiOriginSummary.slice(0, 6).map((origin) => (
              <Link key={origin.country} to={`/atlas?origin=${encodeURIComponent(origin.country)}`}>
                <img src={origin.image} alt="" loading="lazy" decoding="async" />
                <span>
                  <img src={origin.flag} alt="" loading="lazy" decoding="async" />
                  {origin.country}
                </span>
                <strong>{origin.gradeCount} profiles</strong>
                <small>{origin.processes.slice(0, 3).join(" · ")}</small>
              </Link>
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
      <section className="section section--cream grade-intelligence-section">
        <div className="shell grade-intelligence-grid">
          <div>
            <p className="eyebrow">Makendi grade intelligence</p>
            <h2>Use grade language as a buying signal, not decoration.</h2>
            <p>
              The assistant reads grade classes, defect tolerances, screen
              references, process names, and cup direction from the Makendi
              source index. That lets a roaster compare live sensory data with
              planning-grade alternatives before asking for terms.
            </p>
            <Link className="button button--dark" to="/atlas">
              Open grade atlas <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grade-intelligence-stack">
            {makendiSearchIndex.slice(0, 4).map((grade) => (
              <Link key={grade.id} to={`/atlas/${grade.id}`}>
                <span>#{String(grade.sourceNumber).padStart(3, "0")}</span>
                <strong>{grade.shortGrade}</strong>
                <small>
                  {grade.country} · {grade.processDisplay} · {grade.tastingNotes.slice(0, 2).join(" / ")}
                </small>
              </Link>
            ))}
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

function SourcingItemCard({ item, onAddSample, onToggleCompare, compared }) {
  return (
    <article className="sourcing-item-card">
      <img src={item.image} alt="" loading="lazy" decoding="async" />
      <div>
        <span className="sourcing-item-card__meta">
          {item.sourceLabel} · {item.country} · {item.process}
        </span>
        <h3>
          <Link to={item.href}>{item.name}</Link>
        </h3>
        <div className="sourcing-score-line">
          <strong>{item.matchScore}%</strong>
          <span>{item.matchLabel}</span>
          <small>{item.price}</small>
        </div>
        <div className="flavor-list">
          {item.flavor.slice(0, 4).map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
        <ul className="sourcing-reasons">
          {item.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>
              <Check size={14} /> {reason}
            </li>
          ))}
        </ul>
        {item.cautions.length > 0 && (
          <p className="sourcing-caution">{item.cautions[0]}</p>
        )}
        <div className="sourcing-item-card__actions">
          <button className="button button--small button--dark" type="button" onClick={() => onAddSample(item.id)}>
            <PackageCheck size={16} /> {item.actionLabel}
          </button>
          <button
            className={`button button--small ${compared ? "button--selected" : "button--outline"}`}
            type="button"
            onClick={() => onToggleCompare(item.id)}
          >
            <GitCompareArrows size={16} /> {compared ? "Selected" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CompareLab({ allItems, scoredItems, compareIds, setCompareIds, onAddSample, brief }) {
  const selected = compareIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => scoreSourcingItem(item, brief));
  const summary = summarizeComparison(selected);

  const toggle = (id) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((itemId) => itemId !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  return (
    <div className="compare-lab">
      <div className="compare-lab__intro">
        <GitCompareArrows size={20} />
        <div>
          <strong>{summary.title}</strong>
          <p>{summary.copy}</p>
        </div>
      </div>
      <div className="compare-pick-list">
        {scoredItems.slice(0, 6).map((item) => (
          <button
            key={item.id}
            className={compareIds.includes(item.id) ? "is-selected" : ""}
            type="button"
            onClick={() => toggle(item.id)}
          >
            <img src={item.image} alt="" loading="lazy" decoding="async" />
            <span>
              <strong>{item.name}</strong>
              <small>{item.matchScore}% · {item.country}</small>
            </span>
            {compareIds.includes(item.id) ? <Check size={16} /> : <GitCompareArrows size={16} />}
          </button>
        ))}
      </div>
      {selected.length ? (
        <>
          <div className="compare-lab__rows">
            {summary.rows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="compare-lab__cards">
            {selected.map((item) => (
              <article key={item.id}>
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <span>{item.sourceLabel}</span>
                <h3>{item.name}</h3>
                <p>{item.reasons.slice(0, 2).join(" · ")}</p>
                <button className="button button--small button--dark" type="button" onClick={() => onAddSample(item.id)}>
                  <PackageCheck size={15} /> Add to brief
                </button>
              </article>
            ))}
          </div>
          <ul className="compare-lab__next">
            {summary.nextSteps.map((step) => (
              <li key={step}>
                <CheckCircle2 size={15} /> {step}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="empty-state empty-state--compact">
          <GitCompareArrows size={27} />
          <h3>Select two or three profiles</h3>
          <p>The lab will show tradeoffs across origin, process, price certainty, and source type.</p>
        </div>
      )}
    </div>
  );
}

function BriefSubmitPanel({ brief, recommendations }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const briefText = useMemo(
    () => formatSourcingBrief(brief, recommendations),
    [brief, recommendations],
  );

  if (status === "success") {
    return (
      <div className="brief-submit brief-submit--success">
        <CheckCircle2 size={24} />
        <div>
          <strong>Brief sent to Coffendi</strong>
          <p>Reference {reference}. A sourcing specialist can follow up with availability and sample timing.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="brief-submit">
      <button className="brief-submit__toggle" type="button" onClick={() => setOpen((current) => !current)}>
        <span>
          <Send size={16} />
          Send this sourcing brief
        </span>
        <ChevronDown className={open ? "is-open" : ""} size={17} />
      </button>
      {open && (
        <form
          className="brief-submit__form"
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
                audience: "roaster",
                volume: brief.volume,
                country: form.get("country"),
                message: briefText.slice(0, 2400),
                brief: briefText.slice(0, 1900),
                website: form.get("website"),
                source: `${window.location.pathname}:sourcing-desk`,
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
          <textarea className="brief-preview" readOnly rows="7" value={briefText} aria-label="Sourcing brief preview" />
          <div className="brief-submit__grid">
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
              <input name="country" placeholder="Country" autoComplete="country-name" />
            </label>
          </div>
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          <button className="button button--gold button--full" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? (
              <>
                Sending brief <LoaderCircle className="spinner" size={17} />
              </>
            ) : (
              <>
                Send brief <Send size={17} />
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
}

function FinderDrawer({ open, onClose, onAddSample }) {
  const [mode, setMode] = useState("match");
  const [form, setForm] = useState(defaultSourcingBrief);
  const [results, setResults] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Tell me a target cup, budget, volume, process, origin, or warehouse. I will rank live lots and Makendi atlas profiles with source-aware tradeoffs.",
      recommendations: [],
    },
  ]);
  const [compareDraftIds, setCompareDraftIds] = useState([]);
  const allItems = useMemo(() => buildSourcingItems(coffees, makendiSearchIndex), []);
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResults(null);
  };
  const scoredItems = useMemo(
    () => recommendSourcingItems(coffees, makendiSearchIndex, form, 8),
    [form],
  );
  const visibleResults = results || scoredItems.slice(0, 4);

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
    const nextResults = recommendSourcingItems(coffees, makendiSearchIndex, form, 6);
    setResults(nextResults);
    if (!compareDraftIds.length) setCompareDraftIds(nextResults.slice(0, 2).map((item) => item.id));
  };

  const askAssistant = (event) => {
    event.preventDefault();
    const question = prompt.trim();
    if (!question) return;
    const reply = buildAssistantReply(question, coffees, makendiSearchIndex, form);
    setForm(reply.brief);
    setResults(reply.recommendations);
    setCompareDraftIds(reply.recommendations.slice(0, 2).map((item) => item.id));
    setMessages((current) => [
      ...current,
      { role: "user", text: question, recommendations: [] },
      {
        role: "assistant",
        text: reply.answer,
        recommendations: reply.recommendations.slice(0, 3),
        nextQuestions: reply.nextQuestions,
      },
    ]);
    setPrompt("");
    setMode("assistant");
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
            <p className="eyebrow">AI sourcing desk</p>
            <h2>Find, ask, compare</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="sourcing-tabs" role="tablist" aria-label="Sourcing desk tools">
          {[
            ["match", "Match", Target],
            ["assistant", "Ask", MessageCircle],
            ["compare", "Compare", GitCompareArrows],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              className={mode === value ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {mode === "match" && (
          <div className="finder-form">
            <div className="finder-intro finder-intro--rich">
              <Sparkles size={19} />
              <p>
                The matcher scores live lots for immediate buying and Makendi atlas
                profiles for planning, replacements, and blend development.
              </p>
            </div>
            <div className="finder-grid">
              <label className="field">
                <span>Target budget</span>
                <select value={form.budget} onChange={(event) => update("budget", event.target.value)}>
                  <option>Under 6</option>
                  <option>6-8</option>
                  <option>8+</option>
                </select>
              </label>
              <label className="field">
                <span>Volume</span>
                <select value={form.volume} onChange={(event) => update("volume", event.target.value)}>
                  <option>Under 20 bags</option>
                  <option>20-60 bags</option>
                  <option>60+ bags</option>
                </select>
              </label>
              <label className="field">
                <span>Origin</span>
                <select value={form.origin} onChange={(event) => update("origin", event.target.value)}>
                  <option>Open</option>
                  {[...new Set([...coffees.map((coffee) => coffee.country), ...makendiSearchIndex.map((grade) => grade.country)])]
                    .sort()
                    .map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>Flavor direction</span>
                <select value={form.flavor} onChange={(event) => update("flavor", event.target.value)}>
                  {sourcingProfiles.map((profile) => (
                    <option key={profile}>{profile}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Process</span>
                <select value={form.process} onChange={(event) => update("process", event.target.value)}>
                  <option>Open</option>
                  {sourcingProcesses.map((process) => (
                    <option key={process}>{process}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Certification</span>
                <select
                  value={form.certification}
                  onChange={(event) => update("certification", event.target.value)}
                >
                  <option>Any</option>
                  {sourcingCertifications.map((certification) => (
                    <option key={certification}>{certification}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Preferred use</span>
                <select value={form.use} onChange={(event) => update("use", event.target.value)}>
                  <option>Filter coffee</option>
                  <option>Espresso</option>
                  <option>Milk drinks</option>
                  <option>Blend base</option>
                  <option>Cold brew</option>
                </select>
              </label>
              <label className="field">
                <span>Source mode</span>
                <select value={form.channel} onChange={(event) => update("channel", event.target.value)}>
                  <option>Live + atlas</option>
                  <option>Live lots only</option>
                  <option>Atlas planning only</option>
                </select>
              </label>
              <label className="field field--wide">
                <span>Preferred delivery warehouse</span>
                <select
                  value={form.delivery}
                  onChange={(event) => update("delivery", event.target.value)}
                >
                  {sourcingWarehouses.map((warehouse) => (
                    <option key={warehouse}>{warehouse}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button button--gold button--full" type="button" onClick={findMatches}>
              Show my matches <Sparkles size={17} />
            </button>
            <div className="finder-results finder-results--inline">
              <div className="match-summary">
                <CheckCircle2 size={23} />
                <div>
                  <strong>{visibleResults.length} ranked recommendations</strong>
                  <p>
                    Based on {form.flavor.toLowerCase()}, {form.budget}/lb,{" "}
                    {form.volume.toLowerCase()}, and {form.channel.toLowerCase()}.
                  </p>
                </div>
              </div>
              <div className="sourcing-result-list">
                {visibleResults.map((item) => (
                  <SourcingItemCard
                    key={item.id}
                    item={item}
                    onAddSample={onAddSample}
                    onToggleCompare={(id) =>
                      setCompareDraftIds((current) =>
                        current.includes(id)
                          ? current.filter((itemId) => itemId !== id)
                          : current.length >= 3
                            ? current
                            : [...current, id],
                      )
                    }
                    compared={compareDraftIds.includes(item.id)}
                  />
                ))}
              </div>
              <div className="finder-result-actions">
                <button className="text-button" type="button" onClick={() => setMode("compare")}>
                  Compare shortlist <GitCompareArrows size={16} />
                </button>
                <Link className="button button--outline" to="/contact" onClick={onClose}>
                  Send full inquiry <Send size={16} />
                </Link>
              </div>
              <BriefSubmitPanel brief={form} recommendations={visibleResults} />
            </div>
          </div>
        )}

        {mode === "assistant" && (
          <div className="ai-assistant-panel">
            <form className="ai-prompt-form" onSubmit={askAssistant}>
              <label className="field">
                <span>Ask the sourcing assistant</span>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows="3"
                  placeholder="Example: Find a washed East African coffee for bright filter, 20 bags, Hamburg, under $8/lb."
                />
              </label>
              <button className="button button--gold button--full" type="submit">
                Ask assistant <Bot size={17} />
              </button>
            </form>
            <div className="ai-quick-prompts">
              {[
                "Compare Brazil natural options for espresso blend base under $6.",
                "Find Organic or Fairtrade washed coffees for 30 bags in Rotterdam.",
                "Show fruit-forward Makendi planning profiles for filter.",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setPrompt(question)}
                >
                  <Compass size={14} /> {question}
                </button>
              ))}
            </div>
            <div className="ai-chat-log">
              {messages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`ai-message ai-message--${message.role}`}>
                  <span>{message.role === "assistant" ? <Bot size={16} /> : <Users size={16} />}</span>
                  <div>
                    <p>{message.text}</p>
                    {message.recommendations?.length > 0 && (
                      <div className="ai-recommendation-strip">
                        {message.recommendations.map((item) => (
                          <button key={item.id} type="button" onClick={() => onAddSample(item.id)}>
                            <strong>{item.matchScore}%</strong>
                            <span>{item.name}</span>
                            <small>{item.country} · {item.sourceLabel}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <BriefSubmitPanel brief={form} recommendations={visibleResults} />
          </div>
        )}

        {mode === "compare" && (
          <div className="finder-results">
            <CompareLab
              allItems={allItems}
              scoredItems={visibleResults.length ? visibleResults : scoredItems}
              compareIds={compareDraftIds}
              setCompareIds={setCompareDraftIds}
              onAddSample={onAddSample}
              brief={form}
            />
            <BriefSubmitPanel
              brief={form}
              recommendations={allItems
                .filter((item) => compareDraftIds.includes(item.id))
                .map((item) => scoreSourcingItem(item, form))}
            />
          </div>
        )}
      </aside>
    </>
  );
}

function SampleDrawer({ open, onClose, selectedIds, onRemove, onComplete }) {
  const sampleCatalog = useMemo(
    () => [
      ...coffees.map((coffee) => ({
        id: coffee.id,
        name: coffee.name,
        country: coffee.country,
        process: coffee.process,
        scoreLabel: `${coffee.score} pts`,
        image: coffee.image,
        kind: "Live lot",
      })),
      ...makendiSearchIndex.map((grade) => ({
        id: grade.id,
        name: grade.shortGrade,
        country: grade.country,
        process: grade.processDisplay,
        scoreLabel: `Source #${String(grade.sourceNumber).padStart(3, "0")}`,
        image: grade.image,
        kind: "Atlas profile",
      })),
    ],
    [],
  );
  const selected = sampleCatalog.filter((coffee) => selectedIds.includes(coffee.id));
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
                    <span>{coffee.kind} · {coffee.country}</span>
                    <h3>{coffee.name}</h3>
                    <p>
                      {coffee.process} · {coffee.scoreLabel}
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
                    recommendationSource: "coffendi-sourcing-desk",
                    brief: selected
                      .map(
                        (coffee) =>
                          `${coffee.kind}: ${coffee.name} (${coffee.country}, ${coffee.process}, ${coffee.scoreLabel})`,
                      )
                      .join("\n"),
                    coffeeIds: selected.map((coffee) => coffee.id),
                    coffeeNames: selected.map((coffee) => coffee.name),
                    coffeeKinds: selected.map((coffee) => coffee.kind),
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
          <Link to="/sourcing">AI sourcing desk</Link>
          <Link to="/coffees">Our coffees</Link>
          <Link to="/availability">Price & availability</Link>
          <Link to="/atlas">Makendi grade atlas</Link>
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
          path="/sourcing"
          element={<SourcingPage onOpenFinder={() => setFinderOpen(true)} />}
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
              onOpenFinder={() => setFinderOpen(true)}
            />
          }
        />
        <Route
          path="/atlas"
          element={
            <Suspense fallback={<RouteLoading label="Loading Makendi atlas" />}>
              <MakendiAtlasPage
                selectedSamples={selectedSamples}
                onToggleSample={toggleSample}
                onOpenFinder={() => setFinderOpen(true)}
              />
            </Suspense>
          }
        />
        <Route
          path="/atlas/:gradeId"
          element={
            <Suspense fallback={<RouteLoading label="Loading atlas profile" />}>
              <MakendiGradePage
                selectedSamples={selectedSamples}
                onToggleSample={toggleSample}
                onOpenFinder={() => setFinderOpen(true)}
              />
            </Suspense>
          }
        />
        <Route path="/origins" element={<OriginsPage />} />
        <Route
          path="/availability"
          element={
            <AvailabilityPage
              selectedSamples={selectedSamples}
              onToggleSample={toggleSample}
              onOpenFinder={() => setFinderOpen(true)}
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
      <SourcingFloatingAction onOpenFinder={() => setFinderOpen(true)} />
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
