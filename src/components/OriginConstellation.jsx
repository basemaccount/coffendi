import { useEffect, useRef, useState } from "react";
import { GitCompareArrows, Globe2, LocateFixed, Map, Orbit } from "lucide-react";
import { useCompactOriginLayout } from "./OriginFilters";
import OriginFlag from "./OriginFlag";
import OriginMapAnchors, { originPinPosition } from "./OriginMapAnchors";

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

const styles = {
  section: { paddingBlock: "clamp(60px,6vw,76px)", overflow: "hidden", background: "linear-gradient(180deg,var(--paper),rgba(229,221,205,.46))" },
  header: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,430px),1fr))", alignItems: "end", gap: "clamp(16px,4vw,60px)" },
  heading: { maxWidth: 760, marginTop: 13, color: "var(--green)", fontSize: "clamp(38px,4.2vw,58px)" },
  note: { display: "flex", alignItems: "flex-start", gap: 9, color: "var(--muted)", fontSize: 11 },
  noteIcon: { width: 18, flex: "0 0 auto", color: "var(--gold-ink)" },
  board: { marginTop: 25, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", borderRadius: "var(--radius)", background: "var(--green)", boxShadow: "0 26px 74px rgba(23,61,49,.16)", color: "var(--white)" },
  topline: { minHeight: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", color: "#b8cbc1", fontSize: 7, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" },
  toplineLabel: { display: "flex", alignItems: "center", gap: 8 },
  gold: { color: "var(--gold-light)" },
  mapIcon: { width: 17, color: "var(--gold-light)" },
  viewport: { overflowX: "auto", borderBlock: "1px solid rgba(255,255,255,.12)", background: "#12372d" },
  map: { position: "relative", minWidth: "min(700px,167vw)", aspectRatio: "1000/520", overflow: "hidden" },
  art: { position: "absolute", inset: 0, width: "100%", height: "100%", color: "#dce8e1" },
  equator: { fill: "none", stroke: "rgba(239,201,121,.35)", strokeDasharray: "6 9", vectorEffect: "non-scaling-stroke" },
  thread: { fill: "none", stroke: "rgba(239,201,121,.34)", strokeWidth: 1.5, strokeDasharray: "5 9", vectorEffect: "non-scaling-stroke", animation: "origin-thread-flow 10s linear infinite" },
  pin: { position: "absolute", width: 44, height: 44, display: "grid", justifyItems: "center", gap: 1, padding: 2, border: 0, borderRadius: 10, textDecoration: "none", transform: "translate(-50%,-50%)", transition: "scale 240ms var(--ease),background-color 180ms ease,opacity 180ms ease" },
  pinCode: { fontSize: 6, fontWeight: 800, letterSpacing: ".08em" },
  rail: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1, background: "rgba(255,255,255,.12)" },
  railItem: { minWidth: 0, minHeight: 72, display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 9, padding: 10, border: 0, color: "var(--white)", textAlign: "left", textDecoration: "none", transition: "background-color 180ms ease" },
  railCopy: { minWidth: 0, display: "grid", gap: 3 },
  railSmall: { overflow: "hidden", fontSize: 6, fontWeight: 800, textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" },
  railStrong: { overflow: "hidden", fontFamily: "var(--serif)", fontSize: 15, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  compareIcon: { width: 15, color: "var(--gold-light)" },
  viewControls: { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 9, padding: "7px 8px", borderTop: "1px solid rgba(255,255,255,.1)", background: "rgba(9,35,27,.28)" },
  viewCopy: { minWidth: 0, display: "grid", gap: 2 },
  viewLabel: { color: "#8faaa0", fontSize: 6, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" },
  viewValue: { overflow: "hidden", color: "var(--white)", fontFamily: "var(--serif)", fontSize: 13, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  viewGroup: { display: "flex", gap: 3, padding: 3, border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, background: "rgba(9,35,27,.55)" },
  viewButton: { minWidth: 47, minHeight: 44, display: "inline-grid", gridTemplateColumns: "16px auto", placeItems: "center", gap: 5, padding: "6px 8px", border: 0, borderRadius: 7, fontSize: 7, fontWeight: 800 },
  viewIcon: { width: 15 },
};

function MapArt({ profiles }) {
  const points = profiles.map(({ map }) => `${map.x * 10},${map.y * 5.2}`).join(" ");
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <svg className="origin-constellation__art" style={styles.art} viewBox="0 0 1000 520" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="constellation-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity=".1" />
        </pattern>
      </defs>
      <rect width="1000" height="520" fill="url(#constellation-grid)" />
      <path className="origin-constellation__equator" style={styles.equator} d="M0 260H1000" />
      <OriginMapAnchors profiles={profiles} />
      {profiles.length > 1 && <polyline className="origin-constellation__thread" style={{ ...styles.thread, display: "none", animation: "none" }} points={points} />}
    </svg>
  );
}

export default function OriginConstellation({
  profiles,
  language,
  LinkComponent,
  activeId,
  selectedIds = [],
  onToggle,
  comparisonFull = false,
  mode = "navigate",
}) {
  const compact = useCompactOriginLayout();
  const viewport = useRef(null);
  const rail = useRef(null);
  const [viewMode, setViewMode] = useState("focus");
  const comparing = mode === "compare";
  const selected = new Set(comparing ? selectedIds : [activeId]);
  const selectedKey = selectedIds.join("|");
  const focusId = activeId || selectedIds[0] || profiles[0]?.id;
  const overview = compact && viewMode === "overview";
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const copy = language === "tr"
    ? {
      eyebrow: comparing ? "Coğrafi karşılaştırma" : "Menşe takımyıldızı",
      title: comparing ? "Seçiminizi kahve kuşağında görün." : "Kahve kuşağında bir sonraki alan notuna geçin.",
      note: "Noktalar temsili menşeleri bağlayan görsel bir indekstir; ticaret veya lojistik rotası değildir.",
      map: "Temsili menşelerin mekânsal görünümü",
      select: "Karşılaştırmayı değiştir",
      open: "Menşe profilini aç",
      selected: `${selectedIds.length}/3 seçildi`,
      viewLabel: "Harita ölçeği",
      world: "Dünya",
      focus: "Odak",
      worldHint: "Kahve kuşağının tamamı",
      focusHint: "Seçili menşe ayrıntısı",
    }
    : {
      eyebrow: comparing ? "Geographic comparison" : "Origin constellation",
      title: comparing ? "See your selection across the coffee belt." : "Move to the next field note across the coffee belt.",
      note: "The points form a visual index of representative origins—not a trade or logistics route.",
      map: "Spatial view of representative origins",
      select: "Change comparison",
      open: "Open origin profile",
      selected: `${selectedIds.length}/3 selected`,
      viewLabel: "Map scale",
      world: "World",
      focus: "Focus",
      worldHint: "Full coffee-belt context",
      focusHint: "Selected-origin detail",
    };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = viewport.current;
      const focus = profiles.find(({ id }) => id === focusId);
      if (!element || !focus) return;
      if (compact && viewMode === "overview") {
        element.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      if (element.scrollWidth <= element.clientWidth) return;
      const desired = (element.scrollWidth * originPinPosition(focus).x / 100) - (element.clientWidth / 2);
      element.scrollTo({ left: Math.max(0, Math.min(element.scrollWidth - element.clientWidth, desired)), behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compact, focusId, profiles, reduceMotion, viewMode]);

  useEffect(() => {
    const element = rail.current;
    const active = element?.querySelector(".is-active");
    if (!compact || !element || !active || element.scrollWidth <= element.clientWidth) return;
    const left = Math.max(0, active.offsetLeft - ((element.clientWidth - active.offsetWidth) / 2));
    element.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeId, compact, reduceMotion, selectedKey]);

  return (
    <section id={mode === "navigate" ? "origin-network" : undefined} className={`origin-constellation origin-constellation--${mode}`} style={styles.section} aria-labelledby={`origin-constellation-${mode}-title`}>
      <div className="shell">
        <div className="origin-constellation__header" style={styles.header}>
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id={`origin-constellation-${mode}-title`} style={styles.heading}>{copy.title}</h2>
          </div>
          <p style={styles.note}><Orbit style={styles.noteIcon} aria-hidden="true" />{copy.note}</p>
        </div>

        <div className="origin-constellation__board" style={styles.board} role="group" aria-label={copy.map}>
          <div className="origin-constellation__topline" style={styles.topline}>
            <span style={styles.toplineLabel}><Map style={styles.mapIcon} aria-hidden="true" />{copy.map}</span>
            <strong style={styles.gold}>{comparing ? copy.selected : `${String(profiles.findIndex(({ id }) => id === activeId) + 1).padStart(2, "0")} / ${String(profiles.length).padStart(2, "0")}`}</strong>
          </div>
          {compact && (
            <div className="origin-constellation__view-controls" style={styles.viewControls}>
              <span style={styles.viewCopy}>
                <small style={styles.viewLabel}>{copy.viewLabel}</small>
                <strong style={styles.viewValue}>{viewMode === "overview" ? copy.worldHint : copy.focusHint}</strong>
              </span>
              <div style={styles.viewGroup} role="group" aria-label={copy.viewLabel}>
                {[["overview", copy.world, Globe2], ["focus", copy.focus, LocateFixed]].map(([value, label, Icon]) => {
                  const activeView = viewMode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      style={{ ...styles.viewButton, background: activeView ? "var(--gold-light)" : "transparent", color: activeView ? "var(--green)" : "#b8cbc1", boxShadow: activeView ? "0 7px 18px rgba(0,0,0,.18)" : "none" }}
                      onClick={() => setViewMode(value)}
                      aria-pressed={activeView}
                    >
                      <Icon style={styles.viewIcon} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div ref={viewport} className="origin-constellation__viewport" style={{ ...styles.viewport, scrollbarWidth: compact ? "none" : undefined, overscrollBehaviorInline: compact ? "contain" : undefined, touchAction: compact ? "pan-x" : undefined }} tabIndex="0" role="region" aria-label={language === "tr" ? "Yatay kaydırılabilir menşe haritası" : "Horizontally scrollable origin map"}>
            <div className="origin-constellation__map" data-map-view={overview ? "overview" : "focus"} style={{ ...styles.map, minWidth: compact ? overview ? "100%" : "min(700px,167vw)" : styles.map.minWidth, transition: reduceMotion ? "none" : "min-width 420ms var(--ease)" }}>
              <img className="origin-map-artwork" data-map-geometry="natural-earth-110m" src="/images/maps/coffee-world.svg" alt="" width="1000" height="520" loading="lazy" decoding="async" draggable="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
              <MapArt profiles={profiles} />
              {profiles.map((profile, index) => {
              const isSelected = selected.has(profile.id);
              const unavailable = comparing && comparisonFull && !isSelected;
              const pin = originPinPosition(profile);
              const shared = {
                className: `origin-constellation__pin ${isSelected ? "is-active" : ""} ${unavailable ? "is-unavailable" : ""}`.trim(),
                style: {
                  ...styles.pin,
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  zIndex: isSelected ? 3 : 2,
                  background: isSelected ? "var(--gold-light)" : overview ? "transparent" : "rgba(15,48,39,.7)",
                  color: isSelected ? "var(--green)" : "#9db5a9",
                  boxShadow: isSelected ? "0 0 0 5px rgba(239,201,121,.14),0 14px 30px rgba(0,0,0,.25)" : "none",
                  opacity: unavailable ? .4 : 1,
                  pointerEvents: "none",
                  "--constellation-index": index,
                },
              };

                return (
                  <span key={profile.id} {...shared} aria-hidden="true">
                    <OriginFlag profile={profile} size={overview && !isSelected ? "tiny" : "small"} />
                    <span style={styles.pinCode}>{profile.iso}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div ref={rail} className="origin-constellation__rail" style={compact ? { ...styles.rail, display: "flex", gap: 7, overflowX: "auto", padding: "7px 8px 9px", scrollPaddingInline: 8, scrollSnapType: "x mandatory", overscrollBehaviorInline: "contain", scrollbarWidth: "none", background: "#12372d" } : styles.rail} role="group" aria-label={language === "tr" ? "Menşe ülkeleri" : "Origin countries"}>
            {profiles.map((profile) => {
              const isSelected = selected.has(profile.id);
              const unavailable = comparing && comparisonFull && !isSelected;
              const content = <><OriginFlag profile={profile} size="small" /><span style={styles.railCopy}><small style={{ ...styles.railSmall, color: isSelected ? "#f7e8cf" : "#9eb7ab" }}>{profile.iso} · {profile.region.split(" · ").length} {language === "tr" ? "bölge" : "regions"}</small><strong style={styles.railStrong}>{local(profile.country, language)}</strong></span>{comparing && <GitCompareArrows style={styles.compareIcon} aria-hidden="true" />}</>;
              const itemStyle = {
                ...styles.railItem,
                minWidth: compact ? "min(73vw,260px)" : 0,
                flex: compact ? "0 0 min(73vw,260px)" : undefined,
                border: compact ? "1px solid rgba(255,255,255,.12)" : 0,
                borderRadius: compact ? 10 : 0,
                scrollSnapAlign: compact ? "center" : undefined,
                background: isSelected ? "var(--green-2)" : "var(--green)",
                boxShadow: isSelected ? "inset 0 -3px var(--gold)" : "none",
                opacity: unavailable ? .42 : 1,
              };

              return comparing ? (
                <button key={profile.id} type="button" className={isSelected ? "is-active" : ""} style={itemStyle} onClick={() => onToggle(profile.id)} aria-pressed={isSelected} disabled={unavailable}>{content}</button>
              ) : (
                <LinkComponent key={profile.id} className={isSelected ? "is-active" : ""} style={itemStyle} to={`/origins/${profile.slug}`} aria-current={isSelected ? "page" : undefined}>{content}</LinkComponent>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
