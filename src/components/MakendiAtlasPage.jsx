import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bean,
  Bot,
  Check,
  CheckCircle2,
  Filter,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  makendiCatalogMeta,
  makendiGrades,
  makendiOrigins,
} from "../makendiCatalog";

const defaultAtlasFilters = {
  origin: "All",
  type: "All",
  process: "All",
  profile: "All",
  use: "All",
};

const profileFamilies = {
  "Bright & floral": ["citrus", "floral", "clean", "high acidity"],
  "Chocolate & spice": ["cocoa", "chocolate", "spice", "roasted nuts", "dark"],
  "Fruit & fermentation": ["red fruit", "tropical", "berry", "fermented", "caramel"],
  "Classic blender": ["balanced", "smooth", "clean", "cocoa", "nuts"],
};

function sourceBadge(grade) {
  const sourceFields = grade.provenance.sourcePdfFields;
  if (sourceFields >= 6) return "Source-backed";
  if (sourceFields >= 4) return "Source + parsed";
  return "Display copy";
}

function AtlasCard({ grade, selected, onToggleSample }) {
  return (
    <article className="atlas-card">
      <div className="atlas-card__media">
        <Link to={`/atlas/${grade.id}`} aria-label={`View ${grade.grade}`}>
          <img src={grade.image} alt="" loading="lazy" decoding="async" />
        </Link>
        <img className="atlas-flag" src={grade.flag} alt="" loading="lazy" decoding="async" />
        <span className="atlas-source-number">#{String(grade.sourceNumber).padStart(3, "0")}</span>
      </div>
      <div className="atlas-card__body">
        <div className="atlas-card__meta">
          <span>{grade.country}</span>
          <span>{grade.coffeeType}</span>
        </div>
        <h3>
          <Link to={`/atlas/${grade.id}`}>{grade.shortGrade}</Link>
        </h3>
        <p>{grade.tagline}</p>
        <div className="atlas-card__chips">
          <span>{grade.processDisplay}</span>
          <span>{grade.gradeClass}</span>
          <span>{sourceBadge(grade)}</span>
        </div>
        <dl className="atlas-mini-specs">
          <div>
            <dt>Defects</dt>
            <dd>{grade.defects}</dd>
          </div>
          <div>
            <dt>Screen</dt>
            <dd>{grade.screenSize}</dd>
          </div>
        </dl>
        <div className="flavor-list">
          {grade.tastingNotes.slice(0, 4).map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
        <div className="atlas-card__actions">
          <button
            className={`button button--small ${selected ? "button--selected" : "button--dark"}`}
            type="button"
            onClick={() => onToggleSample(grade.id)}
          >
            {selected ? <Check size={16} /> : <PackageCheck size={16} />}
            {selected ? "In brief" : "Add to brief"}
          </button>
          <Link className="text-button" to={`/atlas/${grade.id}`}>
            Full profile <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function AtlasHero({ onOpenFinder }) {
  const featured = makendiGrades.find((grade) => grade.country === "Brazil") || makendiGrades[0];
  return (
    <section className="atlas-hero">
      <div className="atlas-hero__image">
        <img src={featured.productImage} alt="" fetchPriority="high" decoding="async" />
      </div>
      <div className="shell atlas-hero__grid">
        <div className="atlas-hero__copy">
          <p className="eyebrow eyebrow--gold">Makendi source atlas</p>
          <h1>117 green coffee grade profiles, rebuilt for digital sourcing.</h1>
          <p>
            Explore the full Makendi V5 catalog as searchable origin intelligence:
            grade classes, defect tolerances, processing methods, cup direction,
            applications, and country imagery adapted for Coffendi’s buying workflow.
          </p>
          <div className="atlas-hero__actions">
            <a className="button button--gold" href="#atlas-results">
              Search profiles <Search size={17} />
            </a>
            {onOpenFinder && (
              <button className="button button--glass" type="button" onClick={onOpenFinder}>
                Ask sourcing desk <Bot size={17} />
              </button>
            )}
            <Link className="button button--glass" to="/contact">
              Request sourcing support <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        <div className="atlas-hero__panel">
          <div>
            <span>Records</span>
            <strong>{makendiCatalogMeta.recordCount}</strong>
          </div>
          <div>
            <span>Origins</span>
            <strong>{makendiCatalogMeta.originCount}</strong>
          </div>
          <div>
            <span>Types</span>
            <strong>{makendiCatalogMeta.coffeeTypes.length}</strong>
          </div>
          <div>
            <span>Source field flags</span>
            <strong>{makendiCatalogMeta.provenanceCounts.source_pdf}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MakendiAtlasPage({ selectedSamples, onToggleSample, onOpenFinder }) {
  const location = useLocation();
  const initialOrigin = new URLSearchParams(location.search).get("origin") || "All";
  const [filters, setFilters] = useState({ ...defaultAtlasFilters, origin: initialOrigin });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("source");
  const [mobileFilters, setMobileFilters] = useState(false);

  const origins = useMemo(() => makendiOrigins.map((origin) => origin.country), []);
  const types = useMemo(() => [...new Set(makendiGrades.map((grade) => grade.coffeeType))], []);
  const processes = useMemo(
    () => [...new Set(makendiGrades.map((grade) => grade.processDisplay))].sort(),
    [],
  );
  const uses = useMemo(
    () => [...new Set(makendiGrades.flatMap((grade) => grade.perfectFor))].sort(),
    [],
  );

  const visibleGrades = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = makendiGrades.filter((grade) => {
      const searchable = [
        grade.country,
        grade.coffeeType,
        grade.grade,
        grade.description,
        grade.process,
        grade.flavorProfile,
        grade.gradeClass,
        ...grade.tastingNotes,
        ...grade.perfectFor,
      ]
        .join(" ")
        .toLowerCase();
      const profileMatches =
        filters.profile === "All" ||
        profileFamilies[filters.profile].some((term) => searchable.includes(term));
      const useMatches =
        filters.use === "All" || grade.perfectFor.some((item) => item === filters.use);

      return (
        (!query || searchable.includes(query)) &&
        (filters.origin === "All" || grade.country === filters.origin) &&
        (filters.type === "All" || grade.coffeeType === filters.type) &&
        (filters.process === "All" || grade.processDisplay === filters.process) &&
        profileMatches &&
        useMatches
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "origin") return a.country.localeCompare(b.country) || a.sourceNumber - b.sourceNumber;
      if (sort === "type") return a.coffeeType.localeCompare(b.coffeeType) || a.sourceNumber - b.sourceNumber;
      return a.sourceNumber - b.sourceNumber;
    });
  }, [filters, search, sort]);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setFilters(defaultAtlasFilters);
    setSearch("");
  };

  const filterPanel = (
    <div className="atlas-filter-panel">
      <div className="filter-panel__heading">
        <h2>Atlas filters</h2>
        <button className="text-button" type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <label className="field">
        <span>Origin</span>
        <select value={filters.origin} onChange={(event) => update("origin", event.target.value)}>
          <option value="All">All origins</option>
          {origins.map((origin) => (
            <option key={origin}>{origin}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Coffee type</span>
        <select value={filters.type} onChange={(event) => update("type", event.target.value)}>
          <option value="All">All types</option>
          {types.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Process</span>
        <select value={filters.process} onChange={(event) => update("process", event.target.value)}>
          <option value="All">All processes</option>
          {processes.map((process) => (
            <option key={process}>{process}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Profile</span>
        <select value={filters.profile} onChange={(event) => update("profile", event.target.value)}>
          <option value="All">Any profile</option>
          {Object.keys(profileFamilies).map((profile) => (
            <option key={profile}>{profile}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Best use</span>
        <select value={filters.use} onChange={(event) => update("use", event.target.value)}>
          <option value="All">Any use</option>
          {uses.map((use) => (
            <option key={use}>{use}</option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <main>
      <AtlasHero onOpenFinder={onOpenFinder} />
      <section className="section section--cream atlas-origin-strip">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Origin intelligence</p>
              <h2>38 producing origins in one searchable system</h2>
              <p className="section-copy">
                The source deck’s country imagery, flags, farmer scenes, and grade rows are now
                linked to web-native profiles.
              </p>
            </div>
            <Link className="text-link desktop-only" to="/origins">
              Compare with live origin map <ArrowRight size={17} />
            </Link>
          </div>
          <div className="atlas-origin-grid">
            {makendiOrigins.slice(0, 8).map((origin) => (
              <Link key={origin.country} to={`/atlas?origin=${encodeURIComponent(origin.country)}`}>
                <img src={origin.image} alt="" loading="lazy" decoding="async" />
                <span>
                  <img src={origin.flag} alt="" loading="lazy" decoding="async" />
                  {origin.country}
                </span>
                <strong>{origin.gradeCount} profiles</strong>
                <small>{origin.processes.slice(0, 2).join(" · ")}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white atlas-catalog" id="atlas-results">
        <div className="shell">
          <div className="atlas-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search origin, grade, process, defect spec, or tasting note"
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
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort atlas profiles"
              >
                <option value="source">Source order</option>
                <option value="origin">Origin</option>
                <option value="type">Coffee type</option>
              </select>
            </label>
          </div>
          <div className="atlas-layout">
            <aside className="atlas-sidebar">{filterPanel}</aside>
            <div className="atlas-results">
              <div className="result-summary">
                <p>
                  <strong>{visibleGrades.length}</strong> of {makendiGrades.length} profiles matched
                </p>
                <span>
                  <ShieldCheck size={15} /> Source table preserved
                </span>
              </div>
              {visibleGrades.length ? (
                <div className="atlas-card-grid">
                  {visibleGrades.map((grade) => (
                    <AtlasCard
                      key={grade.id}
                      grade={grade}
                      selected={selectedSamples.includes(grade.id)}
                      onToggleSample={onToggleSample}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bean size={30} />
                  <h2>No profile matched</h2>
                  <p>Relax one filter or search a broader grade family.</p>
                  <button className="button button--dark" type="button" onClick={reset}>
                    Reset atlas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="atlas-integrity">
        <div className="shell atlas-integrity__grid">
          <div>
            <p className="eyebrow eyebrow--gold">Source integrity</p>
            <h2>The atlas does not invent missing trade terms.</h2>
            <p>
              The Makendi source table has origin, type, grade, profile, processing method, and
              extraction confidence. Shipment period, price, and basis were empty across all 117
              rows, so this atlas keeps those as inquiry-led commercial details.
            </p>
          </div>
          <div className="atlas-integrity__stats">
            <div>
              <strong>{makendiCatalogMeta.provenanceCounts.source_pdf}</strong>
              <span>source PDF field flags</span>
            </div>
            <div>
              <strong>{makendiCatalogMeta.provenanceCounts.parsed_from_description}</strong>
              <span>parsed spec fields</span>
            </div>
            <div>
              <strong>{makendiCatalogMeta.provenanceCounts.generated_marketing}</strong>
              <span>generated display fields</span>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`sheet-backdrop ${mobileFilters ? "is-open" : ""}`}
        onClick={() => setMobileFilters(false)}
      />
      <aside
        className={`mobile-filter-sheet ${mobileFilters ? "is-open" : ""}`}
        aria-hidden={!mobileFilters}
        inert={!mobileFilters}
      >
        <div className="sheet-header">
          <span>
            <Filter size={18} /> Atlas filters
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
        {filterPanel}
        <button className="button button--dark" type="button" onClick={() => setMobileFilters(false)}>
          Show {visibleGrades.length} profiles
        </button>
      </aside>
    </main>
  );
}

function GradeNotFound() {
  return (
    <main className="not-found">
      <div className="shell">
        <p className="eyebrow">Profile unavailable</p>
        <h1>This atlas record could not be found.</h1>
        <p>The source row may have changed during an import.</p>
        <Link className="button button--dark" to="/atlas">
          <ArrowLeft size={17} /> Return to atlas
        </Link>
      </div>
    </main>
  );
}

export function MakendiGradePage({ selectedSamples, onToggleSample, onOpenFinder }) {
  const { gradeId } = useParams();
  const grade = makendiGrades.find((item) => item.id === gradeId);

  const related = useMemo(
    () =>
      grade
        ? makendiGrades
            .filter(
              (item) =>
                item.id !== grade.id &&
                (item.country === grade.country ||
                  item.coffeeType === grade.coffeeType ||
                  item.processDisplay === grade.processDisplay),
            )
            .slice(0, 4)
        : [],
    [grade],
  );

  if (!grade) return <GradeNotFound />;

  const selected = selectedSamples.includes(grade.id);
  const cupRows = [
    ["Aroma", grade.cupProfile.aroma],
    ["Body", grade.cupProfile.body],
    ["Acidity", grade.cupProfile.acidity],
    ["Sweetness", grade.cupProfile.sweetness],
  ];

  return (
    <main className="grade-page">
      <section className="grade-hero">
        <div className="shell grade-breadcrumbs">
          <Link to="/atlas">
            <ArrowLeft size={15} /> Atlas
          </Link>
          <span>/</span>
          <span>Source #{String(grade.sourceNumber).padStart(3, "0")}</span>
        </div>
        <div className="shell grade-hero__grid">
          <div className="grade-product-card">
            <img src={grade.productImage} alt="" fetchPriority="high" decoding="async" />
            <span>
              <img src={grade.flag} alt="" />
              {grade.country} {grade.coffeeType}
            </span>
          </div>
          <div className="grade-hero__content">
            <p className="eyebrow eyebrow--gold">
              {grade.country} · {grade.coffeeType} · {grade.processDisplay}
            </p>
            <h1>{grade.grade}</h1>
            <p>{grade.tagline}</p>
            <div className="grade-hero__spec-line">
              <span>{grade.gradeClass}</span>
              <span>{grade.defects}</span>
              <span>{grade.flavorProfile}</span>
            </div>
            <div className="grade-hero__actions">
              <button
                className={`button ${selected ? "button--selected" : "button--gold"}`}
                type="button"
                onClick={() => onToggleSample(grade.id)}
              >
                {selected ? <Check size={17} /> : <PackageCheck size={17} />}
                {selected ? "Added to sourcing brief" : "Add to sourcing brief"}
              </button>
              <Link className="button button--glass" to="/contact">
                Ask about availability <ArrowRight size={17} />
              </Link>
              {onOpenFinder && (
                <button className="button button--glass" type="button" onClick={onOpenFinder}>
                  Ask assistant <Bot size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="shell grade-spec-grid">
          <div className="grade-spec-panel">
            <p className="eyebrow">Specifications</p>
            <dl>
              {[
                ["Origin", grade.country],
                ["Coffee type", grade.coffeeType],
                ["Grade", grade.gradeClass],
                ["Defects", grade.defects],
                ["Processing", grade.process],
                ["Screen size", grade.screenSize],
                ["Moisture", grade.moistureContent],
                ["Packing", grade.packing],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grade-story-panel">
            <div>
              <img src={grade.image} alt="" loading="lazy" decoding="async" />
              <span>
                <MapPin size={15} /> {grade.country}
              </span>
            </div>
            <p className="eyebrow">Origin profile</p>
            <h2>{grade.originParagraph}</h2>
            <p>{grade.description}</p>
            <div className="grade-feature-row">
              {grade.topFeatures.map((feature) => (
                <article key={feature.title}>
                  <CheckCircle2 size={17} />
                  <strong>{feature.title}</strong>
                  <span>{feature.body}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="shell grade-quality-grid">
          <div className="grade-cup-card">
            <p className="eyebrow">Cup profile</p>
            {cupRows.map(([label, value]) => (
              <div key={label} className="grade-bean-row">
                <span>{label}</span>
                <i>
                  {Array.from({ length: 5 }, (_, index) => (
                    <b key={index} className={index < value ? "is-filled" : ""} />
                  ))}
                </i>
              </div>
            ))}
          </div>
          <div className="grade-notes-card">
            <p className="eyebrow">Tasting notes</p>
            <div className="grade-note-list">
              {grade.tastingNotes.map((note) => (
                <span key={note}>
                  <Bean size={14} /> {note}
                </span>
              ))}
            </div>
            <p>
              <strong>Aroma:</strong> {grade.aroma}. <strong>Body:</strong> {grade.body}.{" "}
              <strong>Acidity:</strong> {grade.acidity}.
            </p>
          </div>
          <div className="grade-use-card">
            <p className="eyebrow">Perfect for</p>
            <div>
              {grade.perfectFor.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--green">
        <div className="shell grade-source-grid">
          <div className="grade-farmer-card">
            <img src={grade.farmerImage} alt="" loading="lazy" decoding="async" />
            <blockquote>{grade.farmerQuote}</blockquote>
          </div>
          <div className="grade-source-copy">
            <p className="eyebrow eyebrow--gold">Source trace</p>
            <h2>Auditable back to the Makendi source row.</h2>
            <p>
              This profile is generated from source page {grade.source.page}, row{" "}
              {grade.source.rows}, with {grade.source.confidence} extraction confidence.
            </p>
            <div className="grade-source-facts">
              <div>
                <span>Source PDF fields</span>
                <strong>{grade.provenance.sourcePdfFields}</strong>
              </div>
              <div>
                <span>Parsed spec fields</span>
                <strong>{grade.provenance.parsedFields}</strong>
              </div>
              <div>
                <span>Display fields</span>
                <strong>{grade.provenance.generatedFields}</strong>
              </div>
            </div>
            <ul className="check-list">
              {grade.whyChoose.map((reason) => (
                <li key={reason}>
                  <Check size={17} /> {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section--cream">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Related atlas profiles</p>
                <h2>Keep building the brief</h2>
              </div>
              <Link className="text-link" to="/atlas">
                Full atlas <ArrowRight size={16} />
              </Link>
            </div>
            <div className="atlas-related-grid">
              {related.map((item) => (
                <Link key={item.id} to={`/atlas/${item.id}`}>
                  <img src={item.image} alt="" loading="lazy" decoding="async" />
                  <span>{item.country} · {item.processDisplay}</span>
                  <h3>{item.shortGrade}</h3>
                  <p>{item.tastingNotes.join(" · ")}</p>
                  <strong>
                    View profile <ArrowRight size={15} />
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
