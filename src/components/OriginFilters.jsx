import { useEffect, useMemo, useRef, useState } from "react";
import { Globe2, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { normalizeCoffeeSearch } from "../lib/turkishCoffee";
import OriginFlag from "./OriginFlag";

const EMPTY_FILTERS = { query: "", zone: "all", process: "all", country: "all", sort: "atlas" };

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

export function useCompactOriginLayout() {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

function searchableText(profile) {
  return [
    local(profile.country, "en"),
    local(profile.country, "tr"),
    local(profile.name, "en"),
    local(profile.name, "tr"),
    profile.region,
    local(profile.process, "en"),
    local(profile.process, "tr"),
    local(profile.profile, "en"),
    local(profile.profile, "tr"),
    local(profile.use, "en"),
    local(profile.use, "tr"),
    ...profile.directions.flatMap((direction) => [
      local(direction.name, "en"),
      local(direction.name, "tr"),
      local(direction.process, "en"),
      local(direction.process, "tr"),
      local(direction.cup, "en"),
      local(direction.cup, "tr"),
    ]),
  ].join(" ");
}

export function filterOriginProfiles(profiles, filters, language) {
  const query = normalizeCoffeeSearch(filters.query);
  const results = profiles.filter((profile) => (
    (filters.zone === "all" || profile.zone === filters.zone)
    && (filters.process === "all" || profile.processFamily === filters.process)
    && (filters.country === "all" || profile.id === filters.country)
    && (!query || normalizeCoffeeSearch(searchableText(profile)).includes(query))
  ));
  if (filters.sort === "country") return results.toSorted((a, b) => local(a.country, language).localeCompare(local(b.country, language), language));
  if (filters.sort === "process") return results.toSorted((a, b) => a.processFamily.localeCompare(b.processFamily) || local(a.country, language).localeCompare(local(b.country, language), language));
  return results;
}

export function useOriginProfileFilters(profiles, language) {
  const location = useLocation();
  const navigate = useNavigate();
  const readFilters = (search) => {
    const params = new URLSearchParams(search);
    const zones = new Set(profiles.map(({ zone }) => zone));
    const countries = new Set(profiles.map(({ id }) => id));
    const zone = params.get("zone") || "all";
    const process = params.get("process") || "all";
    const country = params.get("country") || "all";
    const sort = params.get("sort") || "atlas";
    return {
      query: (params.get("q") || "").slice(0, 120),
      zone: zone === "all" || zones.has(zone) ? zone : "all",
      process: ["all", "washed", "natural", "mixed"].includes(process) ? process : "all",
      country: country === "all" || countries.has(country) ? country : "all",
      sort: ["atlas", "country", "process"].includes(sort) ? sort : "atlas",
    };
  };
  const [filters, setFilters] = useState(() => readFilters(location.search));
  const filteredProfiles = useMemo(
    () => filterOriginProfiles(profiles, filters, language),
    [filters, language, profiles],
  );
  const persistFilters = (next, replace = false) => {
    const params = new URLSearchParams(location.search);
    ["q", "zone", "process", "country", "sort", "focus"].forEach((key) => params.delete(key));
    if (next.query) params.set("q", next.query);
    if (next.zone !== "all") params.set("zone", next.zone);
    if (next.process !== "all") params.set("process", next.process);
    if (next.country !== "all") params.set("country", next.country);
    if (next.sort !== "atlas") params.set("sort", next.sort);
    navigate(
      { pathname: location.pathname, search: params.toString() ? `?${params}` : "" },
      { replace, preventScrollReset: true },
    );
  };
  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    persistFilters(next, key === "query");
  };
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    persistFilters(EMPTY_FILTERS);
  };
  const hasFilters = Object.entries(filters).some(([key, value]) => value !== EMPTY_FILTERS[key]);

  useEffect(() => {
    const next = readFilters(location.search);
    if (Object.keys(EMPTY_FILTERS).some((key) => next[key] !== filters[key])) setFilters(next);
    // The URL is the external source of truth for browser Back/Forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return { filters, filteredProfiles, updateFilter, resetFilters, hasFilters };
}

export default function OriginFilters({
  profiles,
  language,
  filters,
  onChange,
  onReset,
  hasFilters,
  resultCount,
  idPrefix = "origin",
  compact = false,
}) {
  const compactLayout = useCompactOriginLayout();
  const [advancedOpen, setAdvancedOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 760px)").matches);
  const flagRail = useRef(null);
  const copy = language === "tr"
    ? {
      eyebrow: "Menşe filtreleri",
      title: "Aradığınız ülkeye ve kahve profiline daha hızlı ulaşın.",
      search: "Ülke veya profil ara",
      searchPlaceholder: "Örn. Etiyopya, Cerrado veya kakao",
      region: "Coğrafi bölge",
      process: "İşleme yöntemi",
      sort: "Sıralama",
      flag: "Ülkeye göre daralt",
      all: "Tümü",
      africa: "Afrika",
      latinAmerica: "Latin Amerika",
      asia: "Asya",
      pacific: "Pasifik",
      middleEast: "Orta Doğu",
      washed: "Yıkanmış",
      natural: "Doğal işlenmiş",
      mixed: "Birden fazla yöntem",
      atlas: "Atlas sırası",
      country: "Ülke adına göre (A–Z)",
      processOrder: "İşleme yöntemine göre",
      results: `${resultCount} menşe bulundu`,
      reset: "Tüm filtreleri temizle",
      showAdvanced: "Arama ve filtreleri aç",
      hideAdvanced: "Arama ve filtreleri kapat",
      active: "Etkin filtreler",
      remove: "Filtreyi kaldır",
    }
    : {
      eyebrow: "Smart origin filters",
      title: "Explore by flag, region or process.",
      search: "Search origins",
      searchPlaceholder: "Country, region or cup direction",
      region: "Region",
      process: "Process focus",
      sort: "Order",
      flag: "Filter by flag",
      all: "All",
      africa: "Africa",
      latinAmerica: "Latin America",
      asia: "Asia",
      pacific: "Pacific",
      middleEast: "Middle East",
      washed: "Washed",
      natural: "Natural",
      mixed: "Multi-process",
      atlas: "Atlas order",
      country: "Country A–Z",
      processOrder: "By process",
      results: `${resultCount} ${resultCount === 1 ? "origin" : "origins"} showing`,
      reset: "Reset filters",
      showAdvanced: "Search and advanced filters",
      hideAdvanced: "Hide advanced filters",
      active: "Active filters",
      remove: "Remove filter",
    };
  const availableZones = new Set(profiles.map((profile) => profile.zone));
  const zones = [
    ["all", copy.all],
    ["africa", copy.africa],
    ["latin-america", copy.latinAmerica],
    ["asia", copy.asia],
    ["pacific", copy.pacific],
    ["middle-east", copy.middleEast],
  ].filter(([value]) => value === "all" || availableZones.has(value));
  const advancedId = `${idPrefix}-advanced-filters`;
  const zoneLabels = Object.fromEntries(zones);
  const processLabels = { washed: copy.washed, natural: copy.natural, mixed: copy.mixed };
  const sortLabels = { country: copy.country, process: copy.processOrder };
  const activeFilters = [
    filters.query && ["query", `"${filters.query}"`],
    filters.country !== "all" && ["country", local(profiles.find(({ id }) => id === filters.country)?.country, language)],
    filters.zone !== "all" && ["zone", zoneLabels[filters.zone]],
    filters.process !== "all" && ["process", processLabels[filters.process]],
    filters.sort !== "atlas" && ["sort", sortLabels[filters.sort]],
  ].filter(Boolean);
  const clearFilter = (key) => onChange(key, EMPTY_FILTERS[key]);

  useEffect(() => {
    setAdvancedOpen(!compactLayout);
  }, [compactLayout]);

  useEffect(() => {
    const rail = flagRail.current;
    const active = rail?.querySelector('[aria-pressed="true"]');
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    const left = Math.max(0, active.offsetLeft - ((rail.clientWidth - active.offsetWidth) / 2));
    rail.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [filters.country]);

  const fields = (
    <div id={advancedId} className="origin-filter-panel__fields" hidden={compactLayout && !advancedOpen} style={compactLayout && !advancedOpen ? { display: "none" } : undefined}>
      <label className="origin-search">
        <span>{copy.search}</span>
        <div><Search aria-hidden="true" /><input type="search" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder={copy.searchPlaceholder} /></div>
      </label>
      <label className="origin-select">
        <span>{copy.process}</span>
        <select value={filters.process} onChange={(event) => onChange("process", event.target.value)}>
          <option value="all">{copy.all}</option>
          <option value="washed">{copy.washed}</option>
          <option value="natural">{copy.natural}</option>
          <option value="mixed">{copy.mixed}</option>
        </select>
      </label>
      <label className="origin-select origin-sort">
        <span>{copy.sort}</span>
        <select value={filters.sort} onChange={(event) => onChange("sort", event.target.value)}>
          <option value="atlas">{copy.atlas}</option>
          <option value="country">{copy.country}</option>
          <option value="process">{copy.processOrder}</option>
        </select>
      </label>
      <div className="origin-zone-filter" role="group" aria-labelledby={`${idPrefix}-region-label`}>
        <span id={`${idPrefix}-region-label`}>{copy.region}</span>
        <div>
          {zones.map(([value, label]) => <button key={value} type="button" className={filters.zone === value ? "is-active" : ""} onClick={() => onChange("zone", value)} aria-pressed={filters.zone === value}>{label}</button>)}
        </div>
      </div>
    </div>
  );

  const flagFilters = (
    <div className="origin-flag-filter">
      <span id={`${idPrefix}-flag-label`}>{copy.flag}</span>
      <div ref={flagRail} role="group" aria-labelledby={`${idPrefix}-flag-label`}>
        <button type="button" className={filters.country === "all" ? "is-active" : ""} onClick={() => onChange("country", "all")} aria-pressed={filters.country === "all"}><span className="origin-flag origin-flag--small" aria-hidden="true"><Globe2 style={{ width: "46%", height: "46%", color: "var(--green)" }} /></span><strong>{copy.all}</strong></button>
        {profiles.map((profile) => (
          <button key={profile.id} type="button" className={filters.country === profile.id ? "is-active" : ""} onClick={() => onChange("country", filters.country === profile.id ? "all" : profile.id)} aria-pressed={filters.country === profile.id}>
            <OriginFlag profile={profile} size="small" />
            <strong>{local(profile.country, language)}</strong>
          </button>
        ))}
      </div>
      <button className="origin-filter-panel__reset" type="button" onClick={onReset} disabled={!hasFilters}><RotateCcw aria-hidden="true" />{copy.reset}</button>
    </div>
  );

  return (
    <section className={`origin-filter-panel ${compact ? "origin-filter-panel--compact" : ""}`} aria-labelledby={`${idPrefix}-filter-title`}>
      <div className="origin-filter-panel__heading">
        <span><SlidersHorizontal aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id={`${idPrefix}-filter-title`}>{copy.title}</h2>
        </div>
        <p className="origin-filter-panel__count" role="status" aria-live="polite">{copy.results}</p>
      </div>

      {compactLayout && (
        <button
          type="button"
          className={`button button--outline origin-filter-panel__mobile-toggle ${advancedOpen ? "is-open" : ""}`}
          style={{ width: "100%", minHeight: 48, justifyContent: "space-between", marginTop: 17, paddingInline: 14 }}
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><SlidersHorizontal aria-hidden="true" />{advancedOpen ? copy.hideAdvanced : copy.showAdvanced}</span>
          <strong aria-hidden="true" style={{ fontSize: 18 }}>{advancedOpen ? "−" : "+"}</strong>
        </button>
      )}
      {fields}
      {activeFilters.length > 0 && (
        <div className="origin-filter-panel__active" aria-label={copy.active}>
          <span className="eyebrow">{copy.active}</span>
          <div>
            {activeFilters.map(([key, label]) => (
              <button key={key} className="button button--outline" type="button" onClick={() => clearFilter(key)} aria-label={`${copy.remove}: ${label}`}>
                <span>{label}</span>
                <X aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
      {flagFilters}
    </section>
  );
}
