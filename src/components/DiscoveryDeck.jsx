import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Gauge, Search, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router";
import { Link } from "./TransitionLink";
import "../discovery-deck.css";

const STORAGE_KEY = "coffendi-experience-motion";
const RECENT_KEY = "coffendi-recent-destinations";

const pageItems = {
  en: [
    ["Home", "Origin intelligence at a glance", "/"],
    ["Coffee profiles", "Browse 117 technical sheets", "/coffees"],
    ["Origin atlas", "Explore all 38 producing countries", "/origins"],
    ["Compare profiles", "Place up to three coffees side by side", "/compare"],
    ["Our approach", "Sourcing and coordination principles", "/approach"],
    ["Start an inquiry", "Share a green-coffee brief", "/contact"],
  ],
  tr: [
    ["Ana sayfa", "Menşe bilgilerine genel bakış", "/"],
    ["Kahve profilleri", "117 teknik föyü inceleyin", "/coffees"],
    ["Menşe atlası", "38 üretici ülkeyi keşfedin", "/origins"],
    ["Profilleri karşılaştır", "Üç kahveyi yan yana inceleyin", "/compare"],
    ["Yaklaşımımız", "Tedarik ve koordinasyon ilkeleri", "/approach"],
    ["Talep oluştur", "Yeşil kahve ihtiyacınızı paylaşın", "/contact"],
  ],
};

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en");
}

function localValue(value, language) {
  return value && typeof value === "object" ? value[language] || value.en || "" : value || "";
}

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function DiscoveryDeck({ language = "en", profiles = [] }) {
  const location = useLocation();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const resultRefs = useRef([]);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [motion, setMotion] = useState(() => readStored(STORAGE_KEY, "full"));
  const systemCalm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = useMemo(() => {
    const pages = pageItems[language].map(([label, detail, to], index) => ({
      id: `page-${to}`,
      label,
      detail,
      to,
      type: language === "tr" ? "Sayfa" : "Page",
      featured: index < 4,
      search: `${label} ${detail}`,
    }));
    const origins = profiles.map((profile) => ({
      id: `origin-${profile.slug}`,
      label: localValue(profile.country, language),
      detail: language === "tr" ? `${profile.sheetCount || profile.directions?.length || 0} teknik föy · ${localValue(profile.process, language)}` : `${profile.sheetCount || profile.directions?.length || 0} technical sheets · ${localValue(profile.process, language)}`,
      to: `/origins/${profile.slug}`,
      type: language === "tr" ? "Menşe" : "Origin",
      flag: profile.iso ? `/images/flags/${profile.iso.toLowerCase()}.svg` : "",
      featured: location.pathname.startsWith("/origins") && location.pathname !== `/origins/${profile.slug}`,
      search: `${localValue(profile.country, "en")} ${localValue(profile.country, "tr")} ${localValue(profile.process, language)} ${profile.region || ""}`,
    }));
    const sheets = profiles.flatMap((profile) => (profile.directions || []).map((direction, index) => ({
      id: `sheet-${profile.slug}-${direction.sheetId || index}`,
      label: localValue(direction.name, language),
      detail: [localValue(profile.country, language), localValue(direction.process, language), localValue(direction.cup, language)].filter(Boolean).join(" · "),
      to: `/origins/${profile.slug}`,
      type: language === "tr" ? "Teknik föy" : "Technical sheet",
      flag: profile.iso ? `/images/flags/${profile.iso.toLowerCase()}.svg` : "",
      featured: false,
      search: `${localValue(direction.name, "en")} ${localValue(direction.name, "tr")} ${localValue(profile.country, "en")} ${localValue(profile.country, "tr")} ${localValue(direction.process, language)} ${localValue(direction.cup, language)}`,
    })));
    return [...pages, ...origins, ...sheets];
  }, [language, location.pathname, profiles]);

  const results = useMemo(() => {
    const term = normalise(query.trim());
    if (term) return items.filter((item) => normalise(`${item.label} ${item.detail} ${item.search}`).includes(term)).slice(0, 10);
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch { /* Recents are optional. */ }
    const recentItems = recent.map((path) => items.find((item) => item.to === path)).filter(Boolean);
    const contextual = items.filter((item) => item.featured && item.to !== location.pathname);
    const fallback = items.filter((item) => item.featured && item.to !== location.pathname);
    return [...new Map([...recentItems, ...contextual, ...fallback].map((item) => [item.id, item])).values()].slice(0, 8);
  }, [items, location.pathname, query]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = systemCalm || motion === "calm" ? "calm" : "full";
    return () => delete root.dataset.motion;
  }, [motion, systemCalm]);

  useEffect(() => {
    const show = (event) => {
      triggerRef.current = event.detail?.trigger || document.activeElement;
      setOpen(true);
    };
    const onKeyDown = (event) => {
      const target = event.target;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show(event);
      } else if (!editing && event.key === "/") {
        event.preventDefault();
        show(event);
      }
    };
    const beforeNavigation = () => setOpen(false);
    window.addEventListener("app:open-discovery", show);
    window.addEventListener("app:before-navigation", beforeNavigation);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("app:open-discovery", show);
      window.removeEventListener("app:before-navigation", beforeNavigation);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("discovery-open");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.body.classList.remove("discovery-open");
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open, language]);

  const close = () => setOpen(false);
  const remember = (path) => {
    try {
      const previous = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      localStorage.setItem(RECENT_KEY, JSON.stringify([path, ...previous.filter((item) => item !== path)].slice(0, 4)));
    } catch {
      // Navigation remains available when storage is blocked.
    }
    close();
  };
  const toggleMotion = () => {
    if (systemCalm) return;
    const next = motion === "calm" ? "full" : "calm";
    setMotion(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* preference remains active for this visit */ }
  };
  const focusResult = (index) => resultRefs.current[Math.max(0, Math.min(results.length - 1, index))]?.focus();

  return (
    <dialog
      ref={dialogRef}
      className="discovery-deck"
      aria-labelledby="discovery-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={() => {
        setOpen(false);
        document.body.classList.remove("discovery-open");
        triggerRef.current?.focus?.({ preventScroll: true });
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="discovery-deck__surface">
        <header className="discovery-deck__header">
          <div><span><Sparkles aria-hidden="true" />{language === "tr" ? "Coffendi menşe merceği" : "Coffendi origin lens"}</span><h2 id="discovery-title">{language === "tr" ? "Bir ülkeye, profile veya sayfaya gidin." : "Jump to an origin, profile or page."}</h2></div>
          <button type="button" className="discovery-deck__close" onClick={close} aria-label={language === "tr" ? "Keşif panelini kapat" : "Close discovery deck"}><X aria-hidden="true" /></button>
        </header>
        <label className="discovery-deck__search">
          <Search aria-hidden="true" />
          <span className="sr-only">{language === "tr" ? "Coffendi'de ara" : "Search Coffendi"}</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); focusResult(0); } }}
            placeholder={language === "tr" ? "Ülke, proses, sınıf veya sayfa ara…" : "Search country, process, grade or page…"}
            autoComplete="off"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="discovery-deck__meta"><span>{language === "tr" ? "38 menşe · 117 teknik föy" : "38 origins · 117 technical sheets"}</span><span>{query ? `${results.length} ${language === "tr" ? "sonuç" : "results"}` : language === "tr" ? "Önerilen ve son görüntülenenler" : "Suggested and recently viewed"}</span></div>
        <div className="discovery-deck__results" role="list">
          {results.map((item, index) => (
            <Link
              ref={(node) => { resultRefs.current[index] = node; }}
              key={item.id}
              to={item.to}
              role="listitem"
              onClick={() => remember(item.to)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); focusResult(index + 1); }
                if (event.key === "ArrowUp") { event.preventDefault(); index === 0 ? inputRef.current?.focus() : focusResult(index - 1); }
              }}
            >
              <span className="discovery-deck__visual">{open && item.flag ? <img src={item.flag} alt="" width="34" height="24" /> : <Search aria-hidden="true" />}</span>
              <span className="discovery-deck__copy"><small>{item.type}</small><strong>{item.label}</strong><em>{item.detail}</em></span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
          {!results.length && <div className="discovery-deck__empty"><Search aria-hidden="true" /><strong>{language === "tr" ? "Eşleşme bulunamadı." : "No match found."}</strong><span>{language === "tr" ? "Başka bir ülke, proses veya kahve sınıfı deneyin." : "Try another country, process or coffee grade."}</span></div>}
        </div>
        <footer className="discovery-deck__footer">
          <button type="button" onClick={toggleMotion} disabled={systemCalm} aria-pressed={systemCalm || motion === "calm"}><Gauge aria-hidden="true" /><span><strong>{language === "tr" ? "Hareket" : "Motion"}</strong><small>{systemCalm ? (language === "tr" ? "Sistem: sakin" : "System: calm") : motion === "calm" ? (language === "tr" ? "Sakin" : "Calm") : (language === "tr" ? "Tam" : "Full")}</small></span></button>
          <p><kbd>↑</kbd><kbd>↓</kbd>{language === "tr" ? "gezin" : "navigate"}<kbd>Esc</kbd>{language === "tr" ? "kapat" : "close"}</p>
        </footer>
      </div>
    </dialog>
  );
}
