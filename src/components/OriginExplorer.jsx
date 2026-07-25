import { useEffect, useRef, useState } from "react";
import { ArrowRight, Crosshair, Map, MapPin, Sprout } from "lucide-react";
import OriginFilters, { useOriginProfileFilters } from "./OriginFilters";
import OriginFlag from "./OriginFlag";

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

function CoffeeBeltMap({ profiles, activeId, onSelect, language }) {
  const viewport = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = viewport.current;
      const active = profiles.find(({ id }) => id === activeId);
      if (!element || !active || element.scrollWidth <= element.clientWidth) return;
      const desired = (element.scrollWidth * active.map.x / 100) - (element.clientWidth / 2);
      const left = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, desired));
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollTo({ left, behavior: reduceMotion || !element.dataset.mapReady ? "auto" : "smooth" });
      element.dataset.mapReady = "true";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, profiles]);

  return (
    <div ref={viewport} className="coffee-map__viewport">
      <div className="coffee-map__canvas">
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
          <rect className="coffee-map__belt" x="0" y="205" width="1000" height="185" rx="34" fill="url(#coffee-belt-fill)" />
          <path className="coffee-map__land" d="M87 100c42-54 108-71 167-42 29 14 46 42 68 58 32 23 48 48 35 72-12 22-50 23-65 49-17 30-7 65-35 86-25 19-48 5-65-22-25-40-31-93-59-126-19-23-69-39-46-75Z" />
          <path className="coffee-map__land" d="M258 303c38-18 91-5 122 27 26 27 16 61-2 88-22 33-42 72-75 75-28 2-36-45-48-73-15-36-35-98 3-117Z" />
          <path className="coffee-map__land" d="M445 94c42-22 84-10 119-3 34 6 65-17 101-15 53 4 84 44 134 57 40 10 93 8 112 44 18 33-39 48-70 50-44 4-78-15-117-5-28 8-34 38-66 38-27 0-39-29-66-37-31-9-70 8-91-15-18-20 3-45-6-69-8-21-78-21-50-45Z" />
          <path className="coffee-map__land" d="M519 238c38-27 91-20 123 11 35 34 28 89 7 133-18 39-43 94-84 91-37-3-37-61-55-98-21-43-31-108 9-137Z" />
          <path className="coffee-map__land" d="M825 351c28-19 75-17 93 12 16 27-9 57-37 64-29 7-72 0-79-29-4-18 8-37 23-47Z" />
          <path className="coffee-map__equator" d="M0 297H1000" />
        </svg>

        {profiles.map((profile, index) => (
          <button
            key={profile.id}
            className={`coffee-map__pin ${profile.id === activeId ? "is-active" : ""}`}
            type="button"
            style={{ left: `${profile.map.x}%`, top: `${profile.map.y}%`, "--pin-index": index }}
            onClick={() => onSelect(profile.id)}
            aria-pressed={profile.id === activeId}
            aria-label={`${language === "tr" ? "Haritada seç" : "Select on map"}: ${local(profile.country, language)}`}
          >
            <OriginFlag profile={profile} size="map" />
            <strong>{local(profile.country, language)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OriginExplorer({ profiles, language, LinkComponent }) {
  const { filters, filteredProfiles, updateFilter, resetFilters, hasFilters } = useOriginProfileFilters(profiles, language);
  const [activeId, setActiveId] = useState(profiles[0]?.id || "");
  const active = filteredProfiles.find(({ id }) => id === activeId) || filteredProfiles[0];
  const copy = language === "tr"
    ? {
      eyebrow: "Etkileşimli menşe haritası",
      title: "Kahve kuşağında altı başlangıç noktası.",
      intro: "Haritadaki bayrağı veya aşağıdaki bayrak filtresini seçin. Filtreler, aynı menşe sistemini ülke, bölge ve işleme odağına göre daraltır.",
      mapLabel: "Temsili Coffendi kahve menşeleri haritası",
      orientation: "Yönlendirme haritasıdır; canlı stok, lojistik kapsam veya tedarik garantisi değildir.",
      directions: "Temsili kahve yönleri",
      profile: "Temsili profili aç",
      empty: "Bu filtrelerle eşleşen menşe bulunamadı.",
      emptyCopy: "Başka bir bayrak, bölge veya işleme odağı deneyin.",
      mobileCue: "Haritayı yatay kaydırabilir veya aşağıdaki düğmeleri kullanabilirsiniz.",
    }
    : {
      eyebrow: "Interactive origin map",
      title: "Six starting points across the coffee belt.",
      intro: "Choose a flag on the map or in the flag filter below. Filters narrow the same origin system by country, region and process focus.",
      mapLabel: "Map of representative Coffendi coffee origins",
      orientation: "Orientation map only—not live stock, logistics coverage or a sourcing guarantee.",
      directions: "Representative coffee directions",
      profile: "Open representative profile",
      empty: "No origins match these filters.",
      emptyCopy: "Try another flag, region or process focus.",
      mobileCue: "Scroll the map horizontally or use the buttons below.",
    };

  useEffect(() => {
    if (filteredProfiles.length && !filteredProfiles.some(({ id }) => id === activeId)) setActiveId(filteredProfiles[0].id);
  }, [activeId, filteredProfiles]);

  return (
    <section className="section origin-explorer" aria-labelledby="origin-explorer-title">
      <div className="shell">
        <div className="origin-explorer__heading">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="origin-explorer-title">{copy.title}</h2>
          </div>
          <p>{copy.intro}</p>
        </div>

        <OriginFilters profiles={profiles} language={language} filters={filters} onChange={updateFilter} onReset={resetFilters} hasFilters={hasFilters} resultCount={filteredProfiles.length} idPrefix="map-origin" />

        {active ? (
          <div className="origin-explorer__workspace">
            <div className="coffee-map" role="group" aria-label={copy.mapLabel}>
              <div className="coffee-map__topline"><span><Map aria-hidden="true" />{copy.mapLabel}</span><strong>{String(filteredProfiles.length).padStart(2, "0")}</strong></div>
              <CoffeeBeltMap profiles={filteredProfiles} activeId={active.id} onSelect={setActiveId} language={language} />
              <p className="coffee-map__mobile-cue">{copy.mobileCue}</p>
              <p className="coffee-map__note"><MapPin aria-hidden="true" />{copy.orientation}</p>
            </div>

            <article key={active.id} className="origin-explorer__readout" aria-live="polite">
              <div className="origin-explorer__identity"><OriginFlag profile={active} size="large" /><span><small>{active.zone === "africa" ? language === "tr" ? "Afrika" : "Africa" : language === "tr" ? "Latin Amerika" : "Latin America"}</small><strong>{local(active.country, language)}</strong></span><Crosshair aria-hidden="true" /></div>
              <p className="eyebrow eyebrow--gold">{active.region}</p>
              <h3>{local(active.name, language)}</h3>
              <p>{local(active.profile, language)}</p>
              <div className="origin-explorer__directions">
                <strong>{copy.directions}</strong>
                <ol>{active.directions.map((direction, index) => <li key={direction.name}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{direction.name}</b><small>{local(direction.process, language)} · {local(direction.cup, language)}</small></div></li>)}</ol>
              </div>
              <LinkComponent className="button button--gold" to={`/coffees/${active.id}`}>{copy.profile}<ArrowRight aria-hidden="true" /></LinkComponent>
            </article>
          </div>
        ) : (
          <div className="empty-state origin-explorer__empty"><Sprout aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyCopy}</p><button className="button button--dark" type="button" onClick={resetFilters}>{language === "tr" ? "Tüm menşeleri göster" : "Show all origins"}</button></div>
        )}

      </div>
    </section>
  );
}
