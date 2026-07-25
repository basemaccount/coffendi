import { useEffect, useRef } from "react";
import { GitCompareArrows, Map, Orbit } from "lucide-react";
import OriginFlag from "./OriginFlag";

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
  map: { position: "relative", minWidth: "min(700px,167vw)", aspectRatio: "1000/400", overflow: "hidden" },
  art: { position: "absolute", inset: 0, width: "100%", height: "100%", color: "#dce8e1" },
  land: { fill: "rgba(225,233,223,.1)", stroke: "rgba(225,233,223,.24)", strokeWidth: 2, vectorEffect: "non-scaling-stroke" },
  equator: { fill: "none", stroke: "rgba(239,201,121,.35)", strokeDasharray: "6 9", vectorEffect: "non-scaling-stroke" },
  thread: { fill: "none", stroke: "rgba(239,201,121,.34)", strokeWidth: 1.5, strokeDasharray: "5 9", vectorEffect: "non-scaling-stroke", animation: "origin-thread-flow 10s linear infinite" },
  pin: { position: "absolute", width: 52, height: 58, display: "grid", justifyItems: "center", gap: 1, padding: 5, border: 0, borderRadius: 10, textDecoration: "none", transform: "translate(-50%,-50%)", transition: "scale 240ms var(--ease),background-color 180ms ease,opacity 180ms ease" },
  pinCode: { fontSize: 6, fontWeight: 800, letterSpacing: ".08em" },
  rail: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1, background: "rgba(255,255,255,.12)" },
  railItem: { minWidth: 0, minHeight: 72, display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 9, padding: 10, border: 0, color: "var(--white)", textAlign: "left", textDecoration: "none", transition: "background-color 180ms ease" },
  railCopy: { minWidth: 0, display: "grid", gap: 3 },
  railSmall: { overflow: "hidden", fontSize: 6, fontWeight: 800, textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" },
  railStrong: { overflow: "hidden", fontFamily: "var(--serif)", fontSize: 15, fontWeight: 400, textOverflow: "ellipsis", whiteSpace: "nowrap" },
  compareIcon: { width: 15, color: "var(--gold-light)" },
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
      <path className="origin-constellation__land" style={styles.land} d="M87 100c42-54 108-71 167-42 62 30 112 90 70 147-20 27-63 27-73 69-8 34-19 56-48 38-34-21-40-93-70-137-19-28-69-39-46-75ZM258 303c38-18 91-5 122 27 43 45-29 161-77 163-44 1-81-172-45-190ZM445 94c42-22 84-10 119-3 80 15 121-34 206 17 48 29 126 30 141 69 12 31-48 52-93 49-85-7-119 43-170 27-46-14-66-40-115-35-61 7-109-94-88-124ZM519 238c38-27 91-20 123 11 58 56 0 226-77 224-69-2-91-189-46-235ZM825 351c28-19 75-17 93 12 31 51-70 89-108 51-18-18-3-50 15-63Z" />
      <path className="origin-constellation__equator" style={styles.equator} d="M0 297H1000" />
      {profiles.length > 1 && <polyline className="origin-constellation__thread" style={{ ...styles.thread, animation: reduceMotion ? "none" : styles.thread.animation }} points={points} />}
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
  const viewport = useRef(null);
  const comparing = mode === "compare";
  const selected = new Set(comparing ? selectedIds : [activeId]);
  const focusId = activeId || selectedIds[0] || profiles[0]?.id;
  const copy = language === "tr"
    ? {
      eyebrow: comparing ? "Coğrafi karşılaştırma" : "Menşe takımyıldızı",
      title: comparing ? "Seçiminizi kahve kuşağında görün." : "Kahve kuşağında bir sonraki alan notuna geçin.",
      note: "Noktalar temsili menşeleri bağlayan görsel bir indekstir; ticaret veya lojistik rotası değildir.",
      map: "Temsili menşelerin mekânsal görünümü",
      select: "Karşılaştırmayı değiştir",
      open: "Menşe profilini aç",
      selected: `${selectedIds.length}/3 seçildi`,
    }
    : {
      eyebrow: comparing ? "Geographic comparison" : "Origin constellation",
      title: comparing ? "See your selection across the coffee belt." : "Move to the next field note across the coffee belt.",
      note: "The points form a visual index of representative origins—not a trade or logistics route.",
      map: "Spatial view of representative origins",
      select: "Change comparison",
      open: "Open origin profile",
      selected: `${selectedIds.length}/3 selected`,
    };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = viewport.current;
      const focus = profiles.find(({ id }) => id === focusId);
      if (!element || !focus || element.scrollWidth <= element.clientWidth) return;
      const desired = (element.scrollWidth * focus.map.x / 100) - (element.clientWidth / 2);
      element.scrollTo({ left: Math.max(0, Math.min(element.scrollWidth - element.clientWidth, desired)), behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusId, profiles]);

  return (
    <section className={`origin-constellation origin-constellation--${mode}`} style={styles.section} aria-labelledby={`origin-constellation-${mode}-title`}>
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
          <div ref={viewport} className="origin-constellation__viewport" style={styles.viewport}>
            <div className="origin-constellation__map" style={styles.map}>
              <MapArt profiles={profiles} />
              {profiles.map((profile, index) => {
              const isSelected = selected.has(profile.id);
              const unavailable = comparing && comparisonFull && !isSelected;
              const shared = {
                className: `origin-constellation__pin ${isSelected ? "is-active" : ""} ${unavailable ? "is-unavailable" : ""}`.trim(),
                style: {
                  ...styles.pin,
                  left: `${profile.map.x}%`,
                  top: `${profile.map.y}%`,
                  zIndex: isSelected ? 3 : 2,
                  background: isSelected ? "var(--gold-light)" : "rgba(15,48,39,.7)",
                  color: isSelected ? "var(--green)" : "#9db5a9",
                  boxShadow: isSelected ? "0 0 0 5px rgba(239,201,121,.14),0 14px 30px rgba(0,0,0,.25)" : "none",
                  opacity: unavailable ? .4 : 1,
                  "--constellation-index": index,
                },
                "aria-label": `${comparing ? copy.select : copy.open}: ${local(profile.country, language)}`,
              };

                return comparing ? (
                  <button key={profile.id} {...shared} type="button" onClick={() => onToggle(profile.id)} aria-pressed={isSelected} disabled={unavailable}>
                    <OriginFlag profile={profile} size="small" />
                    <span style={styles.pinCode}>{profile.iso}</span>
                  </button>
                ) : (
                  <LinkComponent key={profile.id} {...shared} to={`/coffees/${profile.id}`} aria-current={profile.id === activeId ? "page" : undefined}>
                    <OriginFlag profile={profile} size="small" />
                    <span style={styles.pinCode}>{profile.iso}</span>
                  </LinkComponent>
                );
              })}
            </div>
          </div>

          <div className="origin-constellation__rail" style={styles.rail} aria-label={language === "tr" ? "Menşe ülkeleri" : "Origin countries"}>
            {profiles.map((profile) => {
              const isSelected = selected.has(profile.id);
              const unavailable = comparing && comparisonFull && !isSelected;
              const content = <><OriginFlag profile={profile} size="small" /><span style={styles.railCopy}><small style={{ ...styles.railSmall, color: isSelected ? "#f7e8cf" : "#9eb7ab" }}>{profile.iso} · {profile.region.split(" · ").length} {language === "tr" ? "bölge" : "regions"}</small><strong style={styles.railStrong}>{local(profile.country, language)}</strong></span>{comparing && <GitCompareArrows style={styles.compareIcon} aria-hidden="true" />}</>;
              const itemStyle = {
                ...styles.railItem,
                background: isSelected ? "var(--green-2)" : "var(--green)",
                boxShadow: isSelected ? "inset 0 -3px var(--gold)" : "none",
                opacity: unavailable ? .42 : 1,
              };

              return comparing ? (
                <button key={profile.id} type="button" className={isSelected ? "is-active" : ""} style={itemStyle} onClick={() => onToggle(profile.id)} aria-pressed={isSelected} disabled={unavailable}>{content}</button>
              ) : (
                <LinkComponent key={profile.id} className={isSelected ? "is-active" : ""} style={itemStyle} to={`/coffees/${profile.id}`} aria-current={isSelected ? "page" : undefined}>{content}</LinkComponent>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
