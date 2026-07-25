import { useMemo, useState } from "react";
import { Globe2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import OriginFlag from "./OriginFlag";

const EMPTY_FILTERS = { query: "", zone: "all", process: "all", country: "all" };

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

function searchableText(profile, language) {
  return [
    local(profile.country, language),
    local(profile.name, language),
    profile.region,
    local(profile.process, language),
    local(profile.profile, language),
    local(profile.use, language),
    ...profile.directions.flatMap((direction) => [direction.name, local(direction.process, language), local(direction.cup, language)]),
  ].join(" ").toLocaleLowerCase(language === "tr" ? "tr-TR" : "en");
}

export function filterOriginProfiles(profiles, filters, language) {
  const query = filters.query.trim().toLocaleLowerCase(language === "tr" ? "tr-TR" : "en");
  return profiles.filter((profile) => (
    (filters.zone === "all" || profile.zone === filters.zone)
    && (filters.process === "all" || profile.processFamily === filters.process)
    && (filters.country === "all" || profile.id === filters.country)
    && (!query || searchableText(profile, language).includes(query))
  ));
}

export function useOriginProfileFilters(profiles, language) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const filteredProfiles = useMemo(
    () => filterOriginProfiles(profiles, filters, language),
    [filters, language, profiles],
  );
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const hasFilters = Object.entries(filters).some(([key, value]) => value !== EMPTY_FILTERS[key]);

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
  const copy = language === "tr"
    ? {
      eyebrow: "Akıllı menşe filtreleri",
      title: "Bayrak, bölge veya işleme göre keşfedin.",
      search: "Menşe ara",
      searchPlaceholder: "Ülke, bölge veya fincan yönü",
      region: "Bölge",
      process: "İşleme odağı",
      flag: "Bayrağa göre filtrele",
      all: "Tümü",
      africa: "Afrika",
      latinAmerica: "Latin Amerika",
      washed: "Yıkanmış",
      natural: "Natural",
      mixed: "Çoklu süreç",
      results: `${resultCount} menşe gösteriliyor`,
      reset: "Filtreleri sıfırla",
    }
    : {
      eyebrow: "Smart origin filters",
      title: "Explore by flag, region or process.",
      search: "Search origins",
      searchPlaceholder: "Country, region or cup direction",
      region: "Region",
      process: "Process focus",
      flag: "Filter by flag",
      all: "All",
      africa: "Africa",
      latinAmerica: "Latin America",
      washed: "Washed",
      natural: "Natural",
      mixed: "Multi-process",
      results: `${resultCount} ${resultCount === 1 ? "origin" : "origins"} showing`,
      reset: "Reset filters",
    };
  const zones = [["all", copy.all], ["africa", copy.africa], ["latin-america", copy.latinAmerica]];

  return (
    <div className={`origin-filter-panel ${compact ? "origin-filter-panel--compact" : ""}`}>
      <div className="origin-filter-panel__heading">
        <span><SlidersHorizontal aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id={`${idPrefix}-filter-title`}>{copy.title}</h2>
        </div>
        <p className="origin-filter-panel__count" role="status" aria-live="polite">{copy.results}</p>
      </div>

      <div className="origin-filter-panel__fields">
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
        <div className="origin-zone-filter" role="group" aria-labelledby={`${idPrefix}-region-label`}>
          <span id={`${idPrefix}-region-label`}>{copy.region}</span>
          <div>
            {zones.map(([value, label]) => <button key={value} type="button" className={filters.zone === value ? "is-active" : ""} onClick={() => onChange("zone", value)} aria-pressed={filters.zone === value}>{label}</button>)}
          </div>
        </div>
      </div>

      <div className="origin-flag-filter">
        <span id={`${idPrefix}-flag-label`}>{copy.flag}</span>
        <div role="group" aria-labelledby={`${idPrefix}-flag-label`}>
          <button type="button" className={filters.country === "all" ? "is-active" : ""} onClick={() => onChange("country", "all")} aria-pressed={filters.country === "all"}><span className="origin-flag origin-flag--small" aria-hidden="true"><Globe2 /></span><strong>{copy.all}</strong></button>
          {profiles.map((profile) => (
            <button key={profile.id} type="button" className={filters.country === profile.id ? "is-active" : ""} onClick={() => onChange("country", filters.country === profile.id ? "all" : profile.id)} aria-pressed={filters.country === profile.id}>
              <OriginFlag profile={profile} size="small" />
              <strong>{local(profile.country, language)}</strong>
            </button>
          ))}
        </div>
        <button className="origin-filter-panel__reset" type="button" onClick={onReset} disabled={!hasFilters}><RotateCcw aria-hidden="true" />{copy.reset}</button>
      </div>
    </div>
  );
}
