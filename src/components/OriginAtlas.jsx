import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, Coffee, MapPin, Sprout } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const local = (value, language) => typeof value === "object" && value !== null ? value[language] : value;

export default function OriginAtlas({ profiles, language, LinkComponent = RouterLink }) {
  const [activeId, setActiveId] = useState(profiles[0]?.id);
  const [pendingId, setPendingId] = useState(null);
  const imageCache = useRef(new Map());
  const selectionRequest = useRef(0);
  const mounted = useRef(true);
  const visual = useRef(null);
  const activeIndex = Math.max(0, profiles.findIndex(({ id }) => id === activeId));
  const active = profiles[activeIndex] || profiles[0];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionRequest.current += 1;
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
    warmProfile(profile)
      .then(() => {
        if (!mounted.current || request !== selectionRequest.current) return;
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
            <p className="eyebrow">{language === "tr" ? "Etkileşimli menşe atlası" : "Interactive origin atlas"}</p>
            <h2 id="origin-atlas-title">{language === "tr" ? "Ülke bir başlangıçtır, sonuç değil." : "A country is the beginning, not the conclusion."}</h2>
          </div>
          <div className="origin-atlas__intro">
            <span>01—0{profiles.length}</span>
            <p>{language === "tr" ? "Tam profili açmadan önce bölgeyi, işlemi, fincan yönünü ve program amacını ilişkilendirmek için bir menşeye dokunun." : "Touch an origin to connect region, process, cup direction and program intent before opening the full profile."}</p>
          </div>
        </div>

        <div className="origin-atlas__workspace" aria-busy={Boolean(pendingId)}>
          <div className="origin-atlas__controls" aria-label={language === "tr" ? "Bir menşe seçin" : "Choose an origin"}>
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                className={`${profile.id === active.id ? "is-active" : ""} ${profile.id === pendingId ? "is-pending" : ""}`.trim()}
                type="button"
                aria-pressed={profile.id === active.id}
                onPointerEnter={() => warmProfile(profile).catch(() => {})}
                onFocus={() => warmProfile(profile).catch(() => {})}
                onTouchStart={() => warmProfile(profile).catch(() => {})}
                onClick={() => selectProfile(profile)}
              >
                <span>0{index + 1}</span>
                <strong>{local(profile.country, language)}</strong>
                <small>{local(profile.process, language)}</small>
                <i className="origin-atlas__control-status" aria-hidden="true" />
              </button>
            ))}
          </div>
          <span className="origin-atlas__swipe-cue" aria-hidden="true" />

          <div ref={visual} className="origin-atlas__visual" data-optical>
            <img key={active.id} src={active.image} srcSet={active.srcSet} sizes="(max-width: 760px) calc(100vw - 34px), 46vw" alt={local(active.alt, language)} width="1200" height="800" loading="lazy" decoding="async" />
            <span className="material-lens" aria-hidden="true"><Sprout /></span>
            <div className="origin-atlas__location"><MapPin aria-hidden="true" /><span><strong>{local(active.country, language)}</strong><small>{active.region}</small></span></div>
            <span className="origin-atlas__number" aria-hidden="true">0{activeIndex + 1}</span>
          </div>

          <div key={active.id} className="origin-atlas__readout" aria-live="polite">
            <div className="origin-atlas__readout-top"><Coffee aria-hidden="true" /><span>{language === "tr" ? "Menşe alan notu" : "Origin field note"}</span></div>
            <p className="eyebrow eyebrow--gold">{local(active.process, language)}</p>
            <h3>{local(active.name, language)}</h3>
            <p>{local(active.profile, language)}</p>
            <dl>
              <div><dt>{language === "tr" ? "Bölge odağı" : "Regional focus"}</dt><dd>{active.region}</dd></div>
              <div><dt>{language === "tr" ? "Program yönü" : "Program direction"}</dt><dd>{local(active.use, language)}</dd></div>
            </dl>
            <LinkComponent className="button button--gold" to={`/coffees/${active.id}`}>{language === "tr" ? "Alan notunu aç" : "Open field note"}<ArrowRight aria-hidden="true" /></LinkComponent>
          </div>
        </div>
      </div>
    </section>
  );
}
