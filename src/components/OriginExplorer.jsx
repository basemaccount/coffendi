import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Crosshair, Globe2, Layers3, LocateFixed, Map, MapPin, Radar, Sprout } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import OriginFilters, { useCompactOriginLayout, useOriginProfileFilters } from "./OriginFilters";
import OriginFlag from "./OriginFlag";
import OriginMapAnchors, { originPinPosition } from "./OriginMapAnchors";

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

const styles = {
  metrics: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 20 },
  metric: { paddingTop: 10, borderTop: "1px solid var(--line)" },
  metricValue: { color: "var(--green)", fontFamily: "var(--serif)", fontSize: 25, lineHeight: 1 },
  metricLabel: { marginTop: 5, color: "var(--muted)", fontSize: 7, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" },
  thread: { fill: "none", stroke: "rgba(239,201,121,.42)", strokeWidth: 1.5, strokeDasharray: "5 10", vectorEffect: "non-scaling-stroke", animation: "origin-thread-flow 9s linear infinite" },
  lenses: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 8px 10px" },
  lensLabel: { display: "flex", alignItems: "center", gap: 7, color: "#aabfb5", fontSize: 7, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" },
  lensIcon: { width: 15, color: "var(--gold-light)" },
  lensGroup: { flex: "1 1 280px", display: "flex", gap: 4, padding: 3, border: "1px solid rgba(255,255,255,.13)", borderRadius: 9, background: "rgba(9,35,27,.4)" },
  lensButton: { minHeight: 44, flex: 1, padding: "6px 10px", border: 0, borderRadius: 6, fontSize: 8, fontWeight: 800 },
  stepper: { minHeight: 50, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "7px 5px 0" },
  stepButton: { minHeight: 44, display: "inline-flex", alignItems: "center", gap: 7, padding: 6, border: 0, background: "transparent", color: "#b5c8be", fontSize: 8, fontWeight: 800, textTransform: "uppercase" },
  stepIcon: { width: 17 },
  stepCount: { color: "#93ada1", fontSize: 8, letterSpacing: ".08em" },
  stepCurrent: { color: "var(--gold-light)", fontFamily: "var(--serif)", fontSize: 19 },
  passport: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: ".45fr .55fr 1.35fr", gap: 1, marginTop: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", borderRadius: 9, background: "rgba(255,255,255,.14)" },
  passportCell: { minWidth: 0, padding: 10, background: "rgba(15,48,39,.92)" },
  passportTerm: { color: "#8faaa0", fontSize: 6, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" },
  passportValue: { marginTop: 4, overflow: "hidden", color: "var(--white)", fontSize: 9, fontWeight: 800, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  signals: { position: "relative", zIndex: 1, marginTop: 18 },
  signalTitle: { display: "flex", alignItems: "center", gap: 7, color: "var(--gold-light)", fontSize: 7, letterSpacing: ".1em", textTransform: "uppercase" },
  signalIcon: { width: 14 },
  signalList: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 },
  signal: { padding: "5px 7px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 999, background: "rgba(255,255,255,.06)", color: "#cfdbd5", fontSize: 7 },
  actions: { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 8, marginTop: "auto", paddingTop: 22 },
  countryIndex: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7, marginTop: 12 },
  countryButton: { minWidth: 0, minHeight: 74, display: "grid", gridTemplateColumns: "auto 1fr", alignContent: "center", alignItems: "center", gap: "2px 8px", padding: 9, border: "1px solid var(--line)", borderRadius: 10, color: "var(--green)", textAlign: "left", transition: "scale 220ms var(--ease),filter 180ms ease" },
  countryIndexHeader: { display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, marginTop: 25, paddingInline: 2 },
  countryIndexTitle: { display: "block", color: "var(--green)", fontFamily: "var(--serif)", fontSize: 23, fontWeight: 400 },
  countryIndexCue: { display: "block", maxWidth: 210, marginTop: 4, color: "var(--muted)", fontSize: 8, lineHeight: 1.45 },
  countryIndexCount: { flex: "0 0 auto", color: "var(--gold-ink)", fontSize: 8, fontWeight: 800, letterSpacing: ".08em" },
  hiddenIndex: { position: "absolute", opacity: 0 },
  countryName: { overflow: "hidden", fontFamily: "var(--serif)", fontSize: 15, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  countryMeta: { overflow: "hidden", color: "var(--muted)", fontSize: 6, fontWeight: 800, textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" },
  mapScale: { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 9, marginBottom: 8, padding: "3px 1px 0" },
  mapScaleCopy: { minWidth: 0, display: "grid", gap: 2 },
  mapScaleLabel: { color: "#8faaa0", fontSize: 6, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" },
  mapScaleValue: { overflow: "hidden", color: "var(--white)", fontFamily: "var(--serif)", fontSize: 14, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  mapScaleGroup: { display: "flex", gap: 3, padding: 3, border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, background: "rgba(9,35,27,.55)" },
  mapScaleButton: { minWidth: 47, minHeight: 44, display: "inline-grid", gridTemplateColumns: "16px auto", placeItems: "center", gap: 5, padding: "6px 8px", border: 0, borderRadius: 7, fontSize: 7, fontWeight: 800 },
  mapScaleIcon: { width: 15 },
};

function lensValue(profile, lens, language) {
  if (lens === "process") return local(profile.process, language);
  if (lens === "profile") return `${profile.directions.length} ${language === "tr" ? "kahve seçeneği" : "coffee directions"}`;
  const zones = language === "tr"
    ? { africa: "Afrika", "latin-america": "Latin Amerika", asia: "Asya", pacific: "Pasifik", "middle-east": "Orta Doğu" }
    : { africa: "Africa", "latin-america": "Latin America", asia: "Asia", pacific: "Pacific", "middle-east": "Middle East" };
  return zones[profile.zone] || profile.zone;
}

function CoffeeBeltMap({ profiles, activeId, onSelect, language, lens, compact }) {
  const viewport = useRef(null);
  const countryRail = useRef(null);
  const [viewMode, setViewMode] = useState("focus");
  const constellationPoints = profiles.map(({ map }) => `${map.x * 10},${map.y * 5.2}`).join(" ");
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const active = profiles.find(({ id }) => id === activeId) || profiles[0];
  const overview = compact && viewMode === "overview";
  const viewCopy = language === "tr"
    ? { label: "Harita görünümü", overview: "Dünya", focus: "Odak", overviewHint: "Kahve kuşağının tamamı", focusHint: "Seçili ülke" }
    : { label: "Map scale", overview: "World", focus: "Focus", overviewHint: "Full coffee-belt context", focusHint: "Detailed flag view" };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = viewport.current;
      const active = profiles.find(({ id }) => id === activeId);
      if (!element || !active) return;
      if (compact && viewMode === "overview") {
        element.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      if (element.scrollWidth <= element.clientWidth) return;
      const desired = (element.scrollWidth * originPinPosition(active).x / 100) - (element.clientWidth / 2);
      const left = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, desired));
      element.scrollTo({ left, behavior: reduceMotion || !element.dataset.mapReady ? "auto" : "smooth" });
      element.dataset.mapReady = "true";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, compact, profiles, reduceMotion, viewMode]);

  useEffect(() => {
    const rail = countryRail.current;
    const active = rail?.querySelector('[aria-pressed="true"]');
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    const left = Math.max(0, active.offsetLeft - ((rail.clientWidth - active.offsetWidth) / 2));
    rail.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [activeId]);

  return (
    <>
      {compact && (
        <div
          ref={countryRail}
          className="coffee-map__country-rail"
          role="group"
          aria-label={language === "tr" ? "Haritada odaklanılacak menşeyi seçin" : "Choose an origin to focus on the map"}
          style={{ display: "flex", gap: 7, margin: "0 -1px 8px", padding: "1px 1px 6px", overflowX: "auto", overscrollBehaviorInline: "contain", scrollSnapType: "x proximity", scrollbarWidth: "none" }}
        >
          {profiles.map((profile, index) => {
            const selected = profile.id === activeId;
            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(profile.id)}
                style={{ minWidth: 119, minHeight: 54, flex: "0 0 119px", display: "grid", gridTemplateColumns: "34px 1fr", alignItems: "center", gap: 8, padding: 7, border: `1px solid ${selected ? "var(--gold-light)" : "rgba(255,255,255,.14)"}`, borderRadius: 10, background: selected ? "var(--gold-light)" : "rgba(255,255,255,.06)", color: selected ? "var(--green)" : "var(--white)", textAlign: "left", scrollSnapAlign: "center" }}
              >
                <OriginFlag profile={profile} size="small" />
                <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
                  <strong style={{ overflow: "hidden", fontFamily: "var(--serif)", fontSize: 13, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{local(profile.country, language)}</strong>
                  <small style={{ color: selected ? "var(--green-2)" : "#9fb8ad", fontSize: 6, fontWeight: 800, letterSpacing: ".08em" }}>{String(index + 1).padStart(2, "0")} · {profile.iso}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {compact && active && (
        <div className="coffee-map__scale" style={styles.mapScale}>
          <span style={styles.mapScaleCopy}>
            <small style={styles.mapScaleLabel}>{viewCopy.label}</small>
            <strong style={styles.mapScaleValue}>{viewMode === "overview" ? viewCopy.overviewHint : `${viewCopy.focusHint} · ${local(active.country, language)}`}</strong>
          </span>
          <div style={styles.mapScaleGroup} role="group" aria-label={viewCopy.label}>
            {[["overview", viewCopy.overview, Globe2], ["focus", viewCopy.focus, LocateFixed]].map(([value, label, Icon]) => {
              const selected = viewMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  style={{ ...styles.mapScaleButton, background: selected ? "var(--gold-light)" : "transparent", color: selected ? "var(--green)" : "#b8cbc1", boxShadow: selected ? "0 7px 18px rgba(0,0,0,.18)" : "none" }}
                  onClick={() => setViewMode(value)}
                  aria-pressed={selected}
                >
                  <Icon style={styles.mapScaleIcon} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div ref={viewport} className="coffee-map__viewport" style={compact ? { scrollbarWidth: "none", overscrollBehaviorInline: "contain", touchAction: "manipulation" } : undefined} tabIndex="0" role="region" aria-label={language === "tr" ? "Yatay kaydırılabilen menşe haritası" : "Horizontally scrollable origin map"}>
        <div
          className={`coffee-map__canvas ${overview ? "is-overview" : "is-focus"}`}
          data-map-view={overview ? "overview" : "focus"}
          style={compact ? { minWidth: overview ? "100%" : 700, transition: reduceMotion ? "none" : "min-width 420ms var(--ease)" } : undefined}
        >
        <img className="origin-map-artwork" data-map-geometry="natural-earth-110m" src="/images/maps/coffee-world.svg" alt="" width="1000" height="520" loading="lazy" decoding="async" draggable="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <svg className="coffee-map__art" viewBox="0 0 1000 520" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <linearGradient id="coffee-belt-fill" x1="0" x2="1">
              <stop offset="0" stopColor="#d8a746" stopOpacity=".04" />
              <stop offset=".5" stopColor="#d8a746" stopOpacity=".2" />
              <stop offset="1" stopColor="#d8a746" stopOpacity=".04" />
            </linearGradient>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity=".08" />
            </pattern>
          </defs>
          <rect width="1000" height="520" fill="url(#map-grid)" />
          <rect className="coffee-map__belt" x="0" y="190" width="1000" height="140" rx="28" fill="url(#coffee-belt-fill)" />
          <path className="coffee-map__equator" d="M0 260H1000" />
          <OriginMapAnchors profiles={profiles} />
          {profiles.length > 1 && <polyline className="coffee-map__thread" style={{ ...styles.thread, display: "none", animation: "none" }} points={constellationPoints} />}
        </svg>

        {profiles.map((profile) => {
          const pin = originPinPosition(profile);
          const selected = profile.id === activeId;
          return <button
            key={profile.id}
            type="button"
            className={`coffee-map__pin ${selected ? "is-active" : ""}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            data-origin-pin={profile.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(profile.id);
            }}
            aria-label={`${local(profile.country, language)} · ${lensValue(profile, lens, language)}`}
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
          >
            <OriginFlag profile={profile} size={overview ? selected ? "small" : "tiny" : compact && !selected ? "small" : "map"} style={compact && !selected ? { opacity: overview ? 0.72 : 0.84 } : undefined} />
            {selected ? <span className="coffee-map__pin-label"><strong>{local(profile.country, language)}</strong><small>{lensValue(profile, lens, language)}</small></span> : <span className="coffee-map__pin-code" aria-hidden="true">{profile.iso}</span>}
          </button>;
        })}
      </div>
    </div>
    </>
  );
}

export default function OriginExplorer({ profiles, language, LinkComponent }) {
  const compactLayout = useCompactOriginLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, filteredProfiles, updateFilter, resetFilters, hasFilters } = useOriginProfileFilters(profiles, language);
  const originCount = profiles.length;
  const sourceSheetCount = profiles.reduce((total, profile) => total + (profile.sheetCount || 0), 0);
  const requestedFocus = new URLSearchParams(location.search).get("focus");
  const [activeId, setActiveIdState] = useState(() => (
    profiles.some(({ id }) => id === requestedFocus) ? requestedFocus : profiles[0]?.id || ""
  ));
  const [lens, setLens] = useState("geography");
  const readout = useRef(null);
  const countryIndex = useRef(null);
  const revealCountry = useRef(false);
  const active = filteredProfiles.find(({ id }) => id === activeId) || filteredProfiles[0];
  const activeIndex = active ? filteredProfiles.findIndex(({ id }) => id === active.id) : -1;
  const signals = useMemo(() => active
    ? [...new Set(active.directions.flatMap((direction) => local(direction.cup, language).split(" · ")))].slice(0, 6)
    : [], [active, language]);
  const copy = language === "tr"
    ? {
      eyebrow: "Etkileşimli menşe haritası",
      title: `${originCount} kahve menşesini tek atlas üzerinde keşfedin.`,
      intro: `Harita, dizin veya bayrak şeridinden seçim yapın; ${originCount} ülkeyi bölge, işleme yöntemi, fincan profili ve ${sourceSheetCount} kaynak sayfasına göre daraltın.`,
      mapLabel: "Temsili Coffendi kahve menşeleri haritası",
      orientation: "Keşif amaçlıdır; bayraklar okunabilirlik için hafifçe kaydırılabilir. Canlı stok veya lojistik kapsam göstermez.",
      directions: "Temsili kahve seçenekleri",
      profile: "Ülke profilini aç",
      empty: "Bu filtrelerle eşleşen menşe bulunamadı.",
      emptyCopy: "Arama ifadenizi değiştirin veya etkin filtrelerden birini kaldırın.",
      mobileCue: "Dünya görünümü genel bağlamı, Odak görünümü seçili ülkeyi gösterir. Ayrıntılı haritayı yatay kaydırabilirsiniz.",
      lenses: "Bilgi katmanı",
      geography: "Coğrafya",
      processLens: "İşleme yöntemi",
      profileLens: "Kahve profili",
      previous: "Önceki menşe",
      next: "Sonraki menşe",
      previousShort: "Önceki",
      nextShort: "Sonraki",
      passport: "Menşe özeti",
      regionNodes: "Bölge odağı",
      signals: "Fincan notaları",
      countries: "menşe ülke",
      regions: "coğrafi bölge",
      directionsCount: "kahve seçeneği",
      countryIndex: "Filtrelenmiş menşe listesi",
      continueTitle: "Diğer menşeleri keşfedin",
      continueCue: "Listeyi kaydırın; ayrıntısını görmek istediğiniz ülkeye dokunun.",
      inquiry: "Bu menşe için bilgi alın",
    }
    : {
      eyebrow: "Interactive origin map",
      title: `${originCount} traceable origins across the coffee belt.`,
      intro: `Choose from the map, index, or flag rail. Narrow ${originCount} countries by region, process, cup direction, and ${sourceSheetCount} source sheets.`,
      mapLabel: "Map of representative Coffendi coffee origins",
      orientation: "For discovery only; flags may be offset for legibility. Not live stock or logistics coverage.",
      directions: "Representative coffee directions",
      profile: "Open representative profile",
      empty: "No origins match these filters.",
      emptyCopy: "Try another flag, region or process focus.",
      mobileCue: "World shows context; Focus shows detail. Choose a flag above, then swipe the Focus map.",
      lenses: "Map lens",
      geography: "Geography",
      processLens: "Process",
      profileLens: "Profile",
      previous: "Previous origin",
      next: "Next origin",
      previousShort: "Previous",
      nextShort: "Next",
      passport: "Origin passport",
      regionNodes: "Regional focus",
      signals: "Cup signals",
      countries: "countries",
      regions: "regional clusters",
      directionsCount: "coffee directions",
      countryIndex: "Filtered origin passports",
      continueTitle: "Continue across the coffee belt",
      continueCue: "Swipe, then tap to bring a passport into view.",
      inquiry: "Ask about this origin",
    };
  const lenses = [["geography", copy.geography], ["process", copy.processLens], ["profile", copy.profileLens]];
  const selectOrigin = (id) => {
    setActiveIdState(id);
    const params = new URLSearchParams(location.search);
    if (params.get("focus") === id) return;
    params.set("focus", id);
    navigate(
      { pathname: location.pathname, search: `?${params}` },
      { replace: true, preventScrollReset: true },
    );
  };
  const stepOrigin = (offset) => {
    if (!filteredProfiles.length) return;
    const nextIndex = (activeIndex + offset + filteredProfiles.length) % filteredProfiles.length;
    selectOrigin(filteredProfiles[nextIndex].id);
  };

  useEffect(() => {
    if (filteredProfiles.length && !filteredProfiles.some(({ id }) => id === activeId)) setActiveIdState(filteredProfiles[0].id);
    // Keep a URL-selected map focus synchronized with browser Back/Forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, filteredProfiles, requestedFocus]);

  useEffect(() => {
    if (
      requestedFocus
      && requestedFocus !== activeId
      && filteredProfiles.some(({ id }) => id === requestedFocus)
    ) setActiveIdState(requestedFocus);
    // location.search is the external source of truth for focus restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, filteredProfiles, requestedFocus]);

  useEffect(() => {
    const rail = countryIndex.current;
    const selected = rail?.querySelector('[aria-pressed="true"]');
    if (compactLayout && rail && selected && rail.scrollWidth > rail.clientWidth) {
      const left = Math.max(0, selected.offsetLeft - ((rail.clientWidth - selected.offsetWidth) / 2));
      rail.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    if (compactLayout && revealCountry.current && readout.current) {
      readout.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    revealCountry.current = false;
  }, [activeId, compactLayout]);

  const selectFromCountryIndex = (id) => {
    revealCountry.current = compactLayout;
    selectOrigin(id);
  };

  return (
    <section className="section origin-explorer" aria-labelledby="origin-explorer-title">
      <div className="shell">
        <div className="origin-explorer__heading">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="origin-explorer-title">{copy.title}</h2>
          </div>
          <div><p style={{ maxWidth: 540, color: "var(--muted)", fontSize: "clamp(13px,1.05vw,15px)" }}>{copy.intro}</p><dl className="origin-explorer__metrics" style={styles.metrics}><div style={styles.metric}><dt style={styles.metricValue}>{profiles.length}</dt><dd style={styles.metricLabel}>{copy.countries}</dd></div><div style={styles.metric}><dt style={styles.metricValue}>{new Set(profiles.map(({ zone }) => zone)).size}</dt><dd style={styles.metricLabel}>{copy.regions}</dd></div><div style={styles.metric}><dt style={styles.metricValue}>{profiles.reduce((total, profile) => total + profile.directions.length, 0)}</dt><dd style={styles.metricLabel}>{copy.directionsCount}</dd></div></dl></div>
        </div>

        <OriginFilters profiles={profiles} language={language} filters={filters} onChange={updateFilter} onReset={resetFilters} hasFilters={hasFilters} resultCount={filteredProfiles.length} idPrefix="map-origin" />

        {active ? (
          <div className="origin-explorer__workspace">
            <div className="coffee-map" role="group" aria-label={copy.mapLabel}>
              <div className="coffee-map__topline"><span><Map aria-hidden="true" />{copy.mapLabel}</span><strong>{String(filteredProfiles.length).padStart(2, "0")}</strong></div>
              <div className="coffee-map__lenses" style={styles.lenses} role="group" aria-label={copy.lenses}>
                <span style={styles.lensLabel}><Layers3 style={styles.lensIcon} aria-hidden="true" />{copy.lenses}</span>
                <div style={styles.lensGroup}>{lenses.map(([value, label]) => {
                  const activeLens = lens === value;
                  return <button key={value} type="button" className={activeLens ? "is-active" : ""} style={{ ...styles.lensButton, background: activeLens ? "var(--gold-light)" : "transparent", color: activeLens ? "var(--green)" : "#b8cbc1", boxShadow: activeLens ? "0 7px 18px rgba(0,0,0,.18)" : "none" }} onClick={() => setLens(value)} aria-pressed={activeLens}>{label}</button>;
                })}</div>
              </div>
              <CoffeeBeltMap profiles={filteredProfiles} activeId={active.id} onSelect={selectOrigin} language={language} lens={lens} compact={compactLayout} />
              <div className="coffee-map__stepper" style={styles.stepper}>
                <button type="button" style={styles.stepButton} onClick={() => stepOrigin(-1)} aria-label={copy.previous}><ChevronLeft style={styles.stepIcon} aria-hidden="true" /><span>{compactLayout ? copy.previousShort : copy.previous}</span></button>
                <strong style={styles.stepCount}><span style={styles.stepCurrent}>{String(activeIndex + 1).padStart(2, "0")}</span> / {String(filteredProfiles.length).padStart(2, "0")}</strong>
                <button type="button" style={{ ...styles.stepButton, justifySelf: "end" }} onClick={() => stepOrigin(1)} aria-label={copy.next}><span>{compactLayout ? copy.nextShort : copy.next}</span><ChevronRight style={styles.stepIcon} aria-hidden="true" /></button>
              </div>
              <p className="coffee-map__mobile-cue">{copy.mobileCue}</p>
              <p className="coffee-map__note"><MapPin aria-hidden="true" />{copy.orientation}</p>
            </div>

            <article ref={readout} key={active.id} className="origin-explorer__readout" style={{ scrollMarginTop: 84 }} aria-live="polite">
              <div className="origin-explorer__identity"><OriginFlag profile={active} size="large" /><span><small>{copy.passport} · {active.iso}</small><strong>{local(active.country, language)}</strong></span><Crosshair aria-hidden="true" /></div>
              <p className="eyebrow eyebrow--gold">{active.region}</p>
              <h3>{local(active.name, language)}</h3>
              <p>{local(active.profile, language)}</p>
              <dl className="origin-explorer__passport" style={styles.passport}>
                <div style={styles.passportCell}><dt style={styles.passportTerm}>ISO</dt><dd style={styles.passportValue}>{active.iso}</dd></div>
                <div style={styles.passportCell}><dt style={styles.passportTerm}>{copy.regionNodes}</dt><dd style={styles.passportValue}>{active.region.split(" · ").length}</dd></div>
                <div style={styles.passportCell}><dt style={styles.passportTerm}>{copy.processLens}</dt><dd style={styles.passportValue}>{local(active.process, language)}</dd></div>
              </dl>
              <div className="origin-explorer__signals" style={styles.signals}><strong style={styles.signalTitle}><Radar style={styles.signalIcon} aria-hidden="true" />{copy.signals}</strong><div style={styles.signalList}>{signals.map((signal) => <span key={signal} style={styles.signal}>{signal}</span>)}</div></div>
              <div className="origin-explorer__directions">
                <strong>{copy.directions}</strong>
                <ol>{active.directions.map((direction, index) => <li key={direction.name}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{direction.name}</b><small>{local(direction.process, language)} · {local(direction.cup, language)}</small></div></li>)}</ol>
              </div>
              <div className="origin-explorer__actions" style={styles.actions}><LinkComponent className="button button--gold" to={`/origins/${active.slug}`} state={{ originSearch: location.search }}>{copy.profile}<ArrowRight aria-hidden="true" /></LinkComponent><LinkComponent className="button button--glass" to="/contact">{copy.inquiry}</LinkComponent></div>
            </article>
          </div>
        ) : (
          <div className="empty-state origin-explorer__empty"><Sprout aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyCopy}</p><button className="button button--dark" type="button" onClick={resetFilters}>{language === "tr" ? "Tüm menşeleri göster" : "Show all origins"}</button></div>
        )}

        {filteredProfiles.length > 0 && (
          <>
            {compactLayout && (
              <div className="origin-explorer__country-index-heading" style={styles.countryIndexHeader}>
                <span style={{ minWidth: 0, display: "grid" }}><strong style={styles.countryIndexTitle}>{copy.continueTitle}</strong><small style={styles.countryIndexCue}>{copy.continueCue}</small></span>
                <strong style={styles.countryIndexCount}>{String(activeIndex + 1).padStart(2, "0")} / {String(filteredProfiles.length).padStart(2, "0")}</strong>
              </div>
            )}
            <div
              ref={countryIndex}
              className="origin-explorer__country-index"
              style={compactLayout ? { ...styles.countryIndex, display: "flex", overflowX: "auto", padding: "2px 2px 10px", scrollPaddingInline: 2, scrollSnapType: "x mandatory", overscrollBehaviorInline: "contain", scrollbarWidth: "none" } : styles.countryIndex}
              role="group"
              aria-label={copy.countryIndex}
            >
              {filteredProfiles.map((profile, index) => {
                const isActive = profile.id === active.id;
                return <button key={profile.id} type="button" className={isActive ? "is-active" : ""} style={{ ...styles.countryButton, minWidth: compactLayout ? "min(76vw,270px)" : 0, flex: compactLayout ? "0 0 min(76vw,270px)" : undefined, scrollSnapAlign: compactLayout ? "center" : undefined, background: isActive ? "var(--green-3)" : "rgba(255,255,255,.38)", boxShadow: isActive ? "inset 0 -3px var(--gold),0 10px 24px rgba(23,61,49,.08)" : "none" }} onClick={() => selectFromCountryIndex(profile.id)} aria-pressed={isActive}><span style={styles.hiddenIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><OriginFlag profile={profile} size="small" style={{ gridRow: "1 / 3" }} /><strong style={styles.countryName}>{local(profile.country, language)}</strong><small style={styles.countryMeta}>{profile.iso} · {profile.region.split(" · ").length} {language === "tr" ? "bölge" : "regions"}</small></button>;
              })}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
