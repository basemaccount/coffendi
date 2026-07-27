import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, Coffee, MapPin, Sprout } from "lucide-react";
import { Link as RouterLink } from "react-router";
import OriginFlag from "./OriginFlag";

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

export default function OriginAtlas({ profiles, language, LinkComponent = RouterLink }) {
  const [activeId, setActiveId] = useState(profiles[0]?.id);
  const [pendingId, setPendingId] = useState(null);
  const imageCache = useRef(new Map());
  const selectionRequest = useRef(0);
  const selectionTimer = useRef(0);
  const mounted = useRef(true);
  const visual = useRef(null);
  const activeIndex = Math.max(0, profiles.findIndex(({ id }) => id === activeId));
  const active = profiles[activeIndex] || profiles[0];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionRequest.current += 1;
      window.clearTimeout(selectionTimer.current);
    };
  }, []);

  if (!active) return null;

  const warmProfile = (profile) => {
    if (!profile || profile.id === active.id) return Promise.resolve();
    if (imageCache.current.has(profile.id)) return imageCache.current.get(profile.id);

    const load = new Promise((resolve, reject) => {
      const image = new Image();
      image.sizes = "(max-width: 760px) calc(100vw - 34px), 46vw";
      image.srcset = profile.srcSet;
      image.onload = () => {
        if (typeof image.decode === "function") image.decode().catch(() => {}).then(resolve);
        else resolve();
      };
      image.onerror = reject;
      image.src = profile.image;
    }).catch((error) => {
      imageCache.current.delete(profile.id);
      throw error;
    });

    imageCache.current.set(profile.id, load);
    return load;
  };

  const selectProfile = (profile) => {
    if (profile.id === active.id) return;
    const request = ++selectionRequest.current;
    setPendingId(profile.id);
    window.clearTimeout(selectionTimer.current);
    const deadline = new Promise((resolve) => {
      selectionTimer.current = window.setTimeout(resolve, 420);
    });
    Promise.race([warmProfile(profile).catch(() => undefined), deadline])
      .then(() => {
        if (!mounted.current || request !== selectionRequest.current) return;
        window.clearTimeout(selectionTimer.current);
        let committed = false;
        const commitSelection = () => {
          if (committed || !mounted.current || request !== selectionRequest.current) return;
          committed = true;
          setActiveId(profile.id);
          setPendingId(null);
        };
        const transitionRoot = visual.current;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!reduceMotion && typeof transitionRoot?.startViewTransition === "function") {
          try {
            transitionRoot.activeViewTransition?.skipTransition?.();
            const transition = transitionRoot.startViewTransition(() => flushSync(commitSelection));
            transition?.ready?.catch(() => {});
            transition?.updateCallbackDone?.catch(() => {});
            transition?.finished?.catch(() => {});
            return;
          } catch {
            commitSelection();
            return;
          }
        }

        commitSelection();
      })
      .catch(() => {
        if (mounted.current && request === selectionRequest.current) setPendingId(null);
      });
  };

  return (
    <section className="section origin-atlas" aria-labelledby="origin-atlas-title">
      <div className="shell">
        <div className="origin-atlas__header">
          <div>
            <p className="eyebrow">{language === "tr" ? "Ülkeler ve kahveler atlası" : "Country and coffee atlas"}</p>
            <h2 id="origin-atlas-title">{language === "tr" ? "Her menşe, farklı kahve seçenekleri sunar." : "One country. More than one coffee direction."}</h2>
            <LinkComponent className="origin-atlas__map-link text-link" style={{ marginTop: 20 }} to="/origins">{language === "tr" ? "Etkileşimli dünya haritasını aç" : "Open the interactive world map"}<ArrowRight aria-hidden="true" /></LinkComponent>
          </div>
          <div className="origin-atlas__intro">
            <span>01—0{profiles.length}</span>
            <p>{language === "tr" ? "Bir ülke seçerek o menşeye ait temsili kahveleri, işleme yöntemlerini ve fincan karakterlerini birlikte inceleyin." : "Choose a flag and country to explore several representative coffee directions, processes and cup characters within that origin."}</p>
          </div>
        </div>

        <div className="origin-atlas__workspace" aria-busy={Boolean(pendingId)}>
          <div className="origin-atlas__controls" role="group" aria-label={language === "tr" ? "Bir menşe seçin" : "Choose an origin"}>
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                className={`${profile.id === active.id ? "is-active" : ""} ${profile.id === pendingId ? "is-pending" : ""}`.trim()}
                type="button"
                aria-pressed={profile.id === active.id}
                aria-busy={profile.id === pendingId}
                onPointerEnter={() => warmProfile(profile).catch(() => {})}
                onFocus={() => warmProfile(profile).catch(() => {})}
                onTouchStart={() => warmProfile(profile).catch(() => {})}
                onClick={() => selectProfile(profile)}
              >
                <OriginFlag profile={profile} size="small" className="origin-atlas__flag" />
                <span className="origin-atlas__control-index" aria-hidden="true">0{index + 1}</span>
                <strong>{local(profile.country, language)}</strong>
                <small>{Math.min(3, profile.directions.length)} {language === "tr" ? "öne çıkan kahve" : "featured coffees"}</small>
                <i className="origin-atlas__control-status" aria-hidden="true" />
              </button>
            ))}
          </div>
          <span className="origin-atlas__swipe-cue" aria-hidden="true" />

          <div ref={visual} className="origin-atlas__visual" data-optical>
            <img key={active.id} src={active.image} srcSet={active.srcSet} sizes="(max-width: 760px) calc(100vw - 34px), 46vw" alt={local(active.alt, language)} width="1200" height="800" loading="lazy" decoding="async" />
            <span className="material-lens" aria-hidden="true"><Sprout /></span>
            <div className="origin-atlas__location"><MapPin aria-hidden="true" /><span><strong>{local(active.country, language)}</strong><small>{active.iso} · {active.region}</small></span></div>
            <span className="origin-atlas__number" aria-hidden="true">0{activeIndex + 1}</span>
          </div>

          <div key={active.id} className="origin-atlas__readout" aria-live="polite">
            <div className="origin-atlas__readout-top"><Coffee aria-hidden="true" /><span>{language === "tr" ? "Menşeye ait kahve seçenekleri" : "Origin coffee directions"}</span><OriginFlag profile={active} size="medium" className="origin-atlas__readout-flag" style={{ marginLeft: "auto" }} /></div>
            <p className="eyebrow eyebrow--gold">{local(active.process, language)}</p>
            <h3>{local(active.name, language)}</h3>
            <p>{local(active.profile, language)}</p>
            <div className="origin-atlas__directions">
              <div><strong>{language === "tr" ? "Temsili kahveler" : "Representative coffees"}</strong><small>{language === "tr" ? "Stok bilgisi değildir" : "Not live inventory"}</small></div>
              <ul>
                {active.directions.slice(0, 3).map((direction, index) => (
                  <li key={direction.name}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{direction.name}</strong><small>{local(direction.process, language)} · {local(direction.cup, language)}</small></div>
                  </li>
                ))}
              </ul>
            </div>
            <dl>
              <div><dt>{language === "tr" ? "Bölge odağı" : "Regional focus"}</dt><dd>{active.region}</dd></div>
              <div><dt>{language === "tr" ? "Önerilen kullanım" : "Program direction"}</dt><dd>{local(active.use, language)}</dd></div>
            </dl>
            <LinkComponent className="button button--gold" to={`/origins/${active.slug}`}>{language === "tr" ? "Menşe profilini aç" : "Open origin profile"}<ArrowRight aria-hidden="true" /></LinkComponent>
          </div>
        </div>
      </div>
    </section>
  );
}
