import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bean,
  Check,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  GitCompareArrows,
  Globe2,
  HandHeart,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Mountain,
  PackageCheck,
  Send,
  Ship,
  Sprout,
  Warehouse,
  X,
} from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigationType, useParams } from "react-router-dom";
import ExperienceLayer from "./components/ExperienceLayer";
import InquiryProgress from "./components/InquiryProgress";
import OriginAtlas from "./components/OriginAtlas";
import { Link, NavLink } from "./components/TransitionLink";
import { usePersistentState } from "./hooks/usePersistentState";
import { submitRequest } from "./lib/api";

const SITE_URL = String(import.meta.env.VITE_PUBLIC_STORE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const CONTACT_EMAIL = "coffee@coffendi.com";

const messages = {
  en: {
    language: "Language",
    nav: { home: "Home", coffees: "Coffees", origins: "Origins", compare: "Compare", impact: "Our approach", contact: "Contact" },
    inquiry: "Start an inquiry",
    menuOpen: "Open navigation",
    menuClose: "Close navigation",
    compareAction: "Compare profiles",
    addCompare: "Add to compare",
    removeCompare: "In comparison",
    comparisonEmpty: "Choose at least one profile to begin your comparison.",
    requestInfo: "Request information",
    learnMore: "View profile",
    backCoffees: "Back to coffees",
    sourceNote: "Reference information only. Current lots, samples, documentation and delivery terms are confirmed directly by Coffendi.",
    footerLine: "Green coffee information and inquiry pathways for roasters and partners.",
    form: {
      eyebrow: "Tell us what you need",
      title: "Begin with a clear coffee brief.",
      copy: "Share your preferred origin, process, cup direction and approximate volume. The Coffendi team will confirm what can be discussed next.",
      name: "Name",
      company: "Company",
      email: "Work email",
      country: "Country / market",
      volume: "Indicative volume",
      message: "Your coffee brief",
      consent: "I agree that Coffendi may use these details to respond to this inquiry.",
      submit: "Send inquiry",
      submitting: "Sending inquiry",
      success: "Thank you. Your inquiry has been recorded.",
      error: "The inquiry could not be sent. Please try again or email us directly.",
    },
  },
  tr: {
    language: "Dil",
    nav: { home: "Ana sayfa", coffees: "Kahveler", origins: "Menşeler", compare: "Karşılaştır", impact: "Yaklaşımımız", contact: "İletişim" },
    inquiry: "Talep oluştur",
    menuOpen: "Menüyü aç",
    menuClose: "Menüyü kapat",
    compareAction: "Profilleri karşılaştır",
    addCompare: "Karşılaştırmaya ekle",
    removeCompare: "Karşılaştırmada",
    comparisonEmpty: "Karşılaştırmaya başlamak için en az bir profil seçin.",
    requestInfo: "Bilgi talep et",
    learnMore: "Profili incele",
    backCoffees: "Kahvelere dön",
    sourceNote: "Yalnızca referans amaçlıdır. Güncel lotlar, numuneler, belgeler ve teslimat koşulları Coffendi tarafından doğrudan teyit edilir.",
    footerLine: "Kavurucular ve iş ortakları için yeşil kahve bilgileri ve talep kanalları.",
    form: {
      eyebrow: "İhtiyacınızı anlatın",
      title: "Net bir kahve özetiyle başlayın.",
      copy: "Tercih ettiğiniz menşeyi, işleme yöntemini, fincan yönünü ve yaklaşık hacmi paylaşın. Coffendi ekibi sonraki adımları sizinle teyit edecektir.",
      name: "Ad soyad",
      company: "Şirket",
      email: "İş e-postası",
      country: "Ülke / pazar",
      volume: "Tahmini hacim",
      message: "Kahve talebiniz",
      consent: "Coffendi'nin bu talebe yanıt vermek için bilgilerimi kullanmasını kabul ediyorum.",
      submit: "Talebi gönder",
      submitting: "Talep gönderiliyor",
      success: "Teşekkürler. Talebiniz kaydedildi.",
      error: "Talep gönderilemedi. Lütfen tekrar deneyin veya bize doğrudan e-posta gönderin.",
    },
  },
};

const coffeeProfiles = [
  {
    id: "ethiopia-washed",
    country: { en: "Ethiopia", tr: "Etiyopya" },
    name: { en: "Highland washed profile", tr: "Yüksek rakım yıkanmış profil" },
    region: "Sidama · Guji · Yirgacheffe",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Floral, citrus and tea-like clarity", tr: "Çiçeksi, narenciye ve çay benzeri berraklık" },
    use: { en: "Filter-led menus and bright components", tr: "Filtre odaklı menüler ve canlı bileşenler" },
    harvest: { en: "Typical main crop: October–January", tr: "Tipik ana hasat: Ekim–Ocak" },
    image: "/images/green-drying-beds.webp",
    srcSet: "/images/green-drying-beds-480.webp 480w, /images/green-drying-beds-720.webp 720w, /images/green-drying-beds-960.webp 960w, /images/green-drying-beds.webp 1200w",
    alt: { en: "Coffee drying on raised beds", tr: "Yükseltilmiş yataklarda kuruyan kahve" },
  },
  {
    id: "colombia-balanced",
    country: { en: "Colombia", tr: "Kolombiya" },
    name: { en: "Balanced regional profile", tr: "Dengeli bölgesel profil" },
    region: "Huila · Tolima · Nariño",
    process: { en: "Washed and selected processes", tr: "Yıkanmış ve seçili işlemler" },
    profile: { en: "Red fruit, caramel and rounded acidity", tr: "Kırmızı meyve, karamel ve yuvarlak asidite" },
    use: { en: "Flexible espresso and filter programs", tr: "Esnek espresso ve filtre programları" },
    harvest: { en: "Regional harvest windows vary", tr: "Bölgesel hasat dönemleri değişkenlik gösterir" },
    image: "/images/green-coffee-farmer.webp",
    srcSet: "/images/green-coffee-farmer-480.webp 480w, /images/green-coffee-farmer-720.webp 720w, /images/green-coffee-farmer-960.webp 960w, /images/green-coffee-farmer.webp 1200w",
    alt: { en: "Coffee producer among coffee plants", tr: "Kahve bitkileri arasında bir üretici" },
  },
  {
    id: "brazil-classic",
    country: { en: "Brazil", tr: "Brezilya" },
    name: { en: "Classic natural profile", tr: "Klasik natural profil" },
    region: "Cerrado · Mantiqueira",
    process: { en: "Natural", tr: "Natural" },
    profile: { en: "Chocolate, nuts and ripe-fruit sweetness", tr: "Çikolata, kuruyemiş ve olgun meyve tatlılığı" },
    use: { en: "Espresso foundations and approachable blends", tr: "Espresso temelleri ve erişilebilir harmanlar" },
    harvest: { en: "Typical main crop: May–September", tr: "Tipik ana hasat: Mayıs–Eylül" },
    image: "/images/green-green-beans-sack.webp",
    srcSet: "/images/green-green-beans-sack-480.webp 480w, /images/green-green-beans-sack-720.webp 720w, /images/green-green-beans-sack-960.webp 960w, /images/green-green-beans-sack.webp 1200w",
    alt: { en: "Unroasted green coffee beans in a sack", tr: "Çuval içinde kavrulmamış yeşil kahve çekirdekleri" },
  },
  {
    id: "guatemala-structured",
    country: { en: "Guatemala", tr: "Guatemala" },
    name: { en: "Structured highland profile", tr: "Yapılı yüksek rakım profili" },
    region: "Huehuetenango · Antigua",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Cocoa, citrus and structured sweetness", tr: "Kakao, narenciye ve yapılı tatlılık" },
    use: { en: "Single-origin releases and blend structure", tr: "Tek menşe sunumlar ve harman yapısı" },
    harvest: { en: "Typical main crop: November–March", tr: "Tipik ana hasat: Kasım–Mart" },
    image: "/images/green-farmer-guatemala.webp",
    srcSet: "/images/green-farmer-guatemala-480.webp 480w, /images/green-farmer-guatemala-720.webp 720w, /images/green-farmer-guatemala-960.webp 960w, /images/green-farmer-guatemala.webp 1200w",
    alt: { en: "Coffee producer examining coffee cherries", tr: "Kahve kirazlarını inceleyen üretici" },
  },
  {
    id: "kenya-vivid",
    country: { en: "Kenya", tr: "Kenya" },
    name: { en: "Vivid washed profile", tr: "Canlı yıkanmış profil" },
    region: "Kirinyaga · Nyeri",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Dark berries, grapefruit and black tea", tr: "Koyu meyveler, greyfurt ve siyah çay" },
    use: { en: "Distinctive seasonal filter selections", tr: "Ayırt edici sezonluk filtre seçkileri" },
    harvest: { en: "Typical main crop: October–December", tr: "Tipik ana hasat: Ekim–Aralık" },
    image: "/images/green-cherry-harvest.webp",
    srcSet: "/images/green-cherry-harvest-480.webp 480w, /images/green-cherry-harvest-720.webp 720w, /images/green-cherry-harvest-960.webp 960w, /images/green-cherry-harvest.webp 1200w",
    alt: { en: "Fresh red coffee cherries during harvest", tr: "Hasat sırasında taze kırmızı kahve kirazları" },
  },
  {
    id: "rwanda-sweet",
    country: { en: "Rwanda", tr: "Ruanda" },
    name: { en: "Sweet, composed profile", tr: "Tatlı ve dengeli profil" },
    region: "Karongi · Gakenke",
    process: { en: "Washed and honey", tr: "Yıkanmış ve honey" },
    profile: { en: "Stone fruit, tea and brown-sugar sweetness", tr: "Sert çekirdekli meyve, çay ve esmer şeker tatlılığı" },
    use: { en: "Elegant filter and lighter espresso programs", tr: "Zarif filtre ve açık kavrum espresso programları" },
    harvest: { en: "Typical main crop: March–July", tr: "Tipik ana hasat: Mart–Temmuz" },
    image: "/images/green-green-cherries.webp",
    srcSet: "/images/green-green-cherries-480.webp 480w, /images/green-green-cherries-720.webp 720w, /images/green-green-cherries-960.webp 960w, /images/green-green-cherries.webp 1200w",
    alt: { en: "Green coffee cherries growing on a branch", tr: "Dal üzerinde büyüyen yeşil kahve kirazları" },
  },
];

function localized(value, language) {
  return typeof value === "object" && value !== null ? value[language] : value;
}

function usePageMeta(title, description, path = "/") {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", `${SITE_URL}${path}`);
  }, [description, path, title]);
}

function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());
  const currentKey = useRef(location.key);
  const ignoreScrollEvents = useRef(false);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    const rememberPosition = () => {
      if (!ignoreScrollEvents.current) positions.current.set(currentKey.current, window.scrollY);
    };
    const rememberBeforeNavigation = () => {
      positions.current.set(currentKey.current, window.scrollY);
      ignoreScrollEvents.current = true;
    };
    const restoreAfterCache = (event) => {
      if (!event.persisted) return;
      ignoreScrollEvents.current = false;
      document.documentElement.classList.remove("is-restoring-scroll", "route-changing");
      positions.current.set(currentKey.current, window.scrollY);
    };

    window.history.scrollRestoration = "manual";
    window.addEventListener("scroll", rememberPosition, { passive: true });
    window.addEventListener("pagehide", rememberPosition);
    window.addEventListener("pageshow", restoreAfterCache);
    window.addEventListener("popstate", rememberBeforeNavigation);
    window.addEventListener("app:before-navigation", rememberBeforeNavigation);

    return () => {
      positions.current.set(currentKey.current, window.scrollY);
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("scroll", rememberPosition);
      window.removeEventListener("pagehide", rememberPosition);
      window.removeEventListener("pageshow", restoreAfterCache);
      window.removeEventListener("popstate", rememberBeforeNavigation);
      window.removeEventListener("app:before-navigation", rememberBeforeNavigation);
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    const savedPosition = navigationType === "POP" ? positions.current.get(location.key) : 0;
    const top = Number.isFinite(savedPosition) ? savedPosition : 0;
    const root = document.documentElement;
    root.classList.add("is-restoring-scroll");
    let settleFrame = 0;
    let remainingSettleFrames = navigationType === "POP" ? 4 : 1;
    const settlePosition = () => {
      window.scrollTo({ top, left: 0, behavior: "instant" });
      positions.current.set(location.key, top);
      remainingSettleFrames -= 1;
      if (remainingSettleFrames > 0) settleFrame = window.requestAnimationFrame(settlePosition);
    };
    settlePosition();
    const releaseTimer = window.setTimeout(() => {
      root.classList.remove("is-restoring-scroll");
      ignoreScrollEvents.current = false;
      positions.current.set(currentKey.current, window.scrollY);
    }, 700);

    return () => {
      window.clearTimeout(releaseTimer);
      if (settleFrame) window.cancelAnimationFrame(settleFrame);
      root.classList.remove("is-restoring-scroll");
    };
  }, [location.key, navigationType]);

  return null;
}

function Header({ language, setLanguage, copy }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef(null);
  const navigation = useRef(null);
  const menuWasOpen = useRef(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const restoreFromCache = () => setMenuOpen(false);
    window.addEventListener("app:pageshow", restoreFromCache);
    return () => window.removeEventListener("app:pageshow", restoreFromCache);
  }, []);
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.classList.toggle("no-scroll", menuOpen);
    if (menuOpen) {
      document.addEventListener("keydown", handleEscape);
      requestAnimationFrame(() => navigation.current?.querySelector("a")?.focus());
    }
    return () => {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const pageRegions = [document.querySelector("#main-content"), document.querySelector(".site-footer")].filter(Boolean);
    pageRegions.forEach((region) => { region.inert = menuOpen; });
    if (!menuOpen && menuWasOpen.current) menuButton.current?.focus();
    menuWasOpen.current = menuOpen;
    return () => pageRegions.forEach((region) => { region.inert = false; });
  }, [menuOpen]);

  const nav = [
    [copy.nav.coffees, "/coffees"],
    [copy.nav.origins, "/origins"],
    [copy.nav.compare, "/compare"],
    [copy.nav.impact, "/approach"],
  ];

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Coffendi home">
          <img src="/coffendi-logo-160.webp" alt="" width="160" height="152" />
          <span><strong>Coffendi</strong><small>Green coffee · clearly connected</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <div className="header-actions">
          <div className="language-switcher" aria-label={copy.language}>
            {['en', 'tr'].map((code) => (
              <button key={code} className={language === code ? "is-active" : ""} type="button" onClick={() => setLanguage(code)} aria-pressed={language === code}>{code.toUpperCase()}</button>
            ))}
          </div>
          <Link className="button button--dark header-cta" to="/contact">{copy.inquiry}<ArrowRight aria-hidden="true" /></Link>
          <button ref={menuButton} className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? copy.menuClose : copy.menuOpen}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
      </header>
      <div ref={navigation} id="mobile-navigation" className={`mobile-navigation ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen ? true : undefined}>
        <nav aria-label="Mobile navigation">
          {nav.map(([label, to], index) => <NavLink key={to} to={to}><span>0{index + 1}</span>{label}<ArrowRight aria-hidden="true" /></NavLink>)}
          <NavLink to="/contact"><span>05</span>{copy.nav.contact}<ArrowRight aria-hidden="true" /></NavLink>
        </nav>
        <div className="mobile-navigation__foot"><Mail aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
      </div>
    </>
  );
}

function SectionHeading({ eyebrow, title, copy, action }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{(copy || action) && <div className="section-heading__aside">{copy && <p>{copy}</p>}{action}</div>}</div>;
}

function ProfileCard({ profile, language, selected, onToggle, copy }) {
  return (
    <article className="profile-card">
      <Link className="profile-card__image" to={`/coffees/${profile.id}`}>
        <img src={profile.image} srcSet={profile.srcSet} sizes="(max-width: 820px) calc(100vw - 34px), (max-width: 1100px) calc(50vw - 36px), 390px" alt={localized(profile.alt, language)} width="1200" height="800" loading="lazy" decoding="async" style={{ viewTransitionName: `coffee-${profile.id}` }} />
        <span>{localized(profile.process, language)}</span>
      </Link>
      <div className="profile-card__content">
        <p className="eyebrow">{localized(profile.country, language)}</p>
        <h3><Link to={`/coffees/${profile.id}`}>{localized(profile.name, language)}</Link></h3>
        <p>{localized(profile.profile, language)}</p>
        <dl><div><dt>{language === "tr" ? "Bölge" : "Region"}</dt><dd>{profile.region}</dd></div><div><dt>{language === "tr" ? "Kullanım yönü" : "Program direction"}</dt><dd>{localized(profile.use, language)}</dd></div></dl>
        <div className="profile-card__actions">
          <button className={`button button--compare ${selected ? "is-selected" : ""}`} type="button" onClick={() => onToggle(profile.id)} aria-pressed={selected}>{selected ? <Check aria-hidden="true" /> : <GitCompareArrows aria-hidden="true" />}{selected ? copy.removeCompare : copy.addCompare}</button>
          <Link className="circle-link" to={`/coffees/${profile.id}`} aria-label={`${copy.learnMore}: ${localized(profile.name, language)}`}><ArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

function HomePage({ language, copy, selected, onToggle }) {
  usePageMeta(
    language === "tr" ? "Coffendi — Menşeden kavurucuya yeşil kahve" : "Coffendi — Green coffee, from origin to roaster",
    language === "tr" ? "Yeşil kahve menşelerini, profilleri ve Coffendi talep yolunu keşfedin." : "Explore green coffee origins, representative profiles and the Coffendi inquiry pathway.",
  );
  const featured = coffeeProfiles.slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--gold">{language === "tr" ? "Menşeden kavurucuya" : "From origin to roaster"}</p>
            <h1>{language === "tr" ? "Daha net bağlantılarla başlayan yeşil kahve." : "Green coffee begins with clearer connections."}</h1>
            <p>{language === "tr" ? "Menşeleri keşfedin, temsili profilleri karşılaştırın ve doğru kahve görüşmesini başlatmak için ihtiyacınızı paylaşın." : "Explore origins, compare representative profiles and share the brief that starts the right coffee conversation."}</p>
            <div className="hero__actions"><Link className="button button--gold" to="/coffees">{language === "tr" ? "Kahveleri keşfet" : "Explore coffees"}<ArrowRight aria-hidden="true" /></Link><Link className="button button--glass" to="/contact">{copy.inquiry}</Link></div>
            <div className="hero__proof"><span><Globe2 aria-hidden="true" />{language === "tr" ? "Menşe odaklı" : "Origin-led"}</span><span><GitCompareArrows aria-hidden="true" />{language === "tr" ? "Net karşılaştırma" : "Clear comparison"}</span><span><ClipboardCheck aria-hidden="true" />{language === "tr" ? "Teyitli sonraki adımlar" : "Confirmed next steps"}</span></div>
          </div>
          <div className="hero__media" data-optical>
            <img src="/images/instant-bulk-beans-1280.webp" srcSet="/images/instant-bulk-beans-640.webp 640w, /images/instant-bulk-beans-960.webp 960w, /images/instant-bulk-beans-1280.webp 1280w" sizes="(max-width: 800px) calc(100vw - 34px), 48vw" alt={language === "tr" ? "Çuvalda yeşil kahve çekirdekleri" : "Green coffee beans in a jute sack"} width="1280" height="960" fetchPriority="high" decoding="async" />
            <span className="material-lens" aria-hidden="true"><Sprout /></span>
            <div className="hero__card"><Sprout aria-hidden="true" /><span>{language === "tr" ? "Kahve kimliği menşede başlar" : "Coffee identity starts at origin"}</span></div>
          </div>
        </div>
      </section>

      <section className="service-strip"><div className="shell"><div><MapPin aria-hidden="true" /><span>{language === "tr" ? "Menşe bağlamı" : "Origin context"}</span></div><div><Coffee aria-hidden="true" /><span>{language === "tr" ? "Fincan yönü" : "Cup direction"}</span></div><div><PackageCheck aria-hidden="true" /><span>{language === "tr" ? "Belge teyidi" : "Document confirmation"}</span></div><div><Ship aria-hidden="true" /><span>{language === "tr" ? "Talebe göre lojistik" : "Logistics by inquiry"}</span></div></div></section>

      <OriginAtlas profiles={coffeeProfiles} language={language} LinkComponent={Link} />

      <section className="section shell">
        <SectionHeading eyebrow={language === "tr" ? "Başlangıç profilleri" : "Starting profiles"} title={language === "tr" ? "Önce fincan yönünü bulun." : "Find the cup direction first."} copy={language === "tr" ? "Bunlar canlı stok veya fiyat teklifi değil, ilk görüşmeyi netleştiren temsili menşe profilleridir." : "These are representative origin profiles—not live stock or offers—designed to make the first conversation more precise."} action={<Link className="text-link" to="/coffees">{language === "tr" ? "Tüm profiller" : "All profiles"}<ArrowRight aria-hidden="true" /></Link>} />
        <div className="profile-grid">{featured.map((profile) => <ProfileCard key={profile.id} profile={profile} language={language} selected={selected.includes(profile.id)} onToggle={onToggle} copy={copy} />)}</div>
      </section>

      <section className="section section--green">
        <div className="shell story-grid">
          <div><p className="eyebrow eyebrow--gold">{language === "tr" ? "Daha iyi bir talep yolu" : "A better inquiry pathway"}</p><h2>{language === "tr" ? "Kahveyi yalnızca bir isim olarak değil, bir karar dizisi olarak görün." : "See coffee as a sequence of decisions, not only a name."}</h2><p>{language === "tr" ? "Menşe, işleme, fincan hedefi, hacim, zamanlama ve belgeler aynı görüşmede ele alınmalıdır." : "Origin, process, cup goal, volume, timing and documentation belong in the same conversation."}</p><Link className="button button--light" to="/approach">{language === "tr" ? "Yaklaşımı incele" : "Explore the approach"}<ArrowRight aria-hidden="true" /></Link></div>
          <ol className="story-steps"><li><span>01</span><div><strong>{language === "tr" ? "Profil" : "Profile"}</strong><p>{language === "tr" ? "Fincan ve kullanım yönünü tanımlayın." : "Define the cup and program direction."}</p></div></li><li><span>02</span><div><strong>{language === "tr" ? "Uygunluk" : "Fit"}</strong><p>{language === "tr" ? "Hacim, takvim ve pazar bağlamını paylaşın." : "Share volume, timing and market context."}</p></div></li><li><span>03</span><div><strong>{language === "tr" ? "Teyit" : "Confirm"}</strong><p>{language === "tr" ? "Numune, belge ve koşulları doğrudan doğrulayın." : "Verify samples, documents and terms directly."}</p></div></li></ol>
        </div>
      </section>

      <section className="section comparison-teaser"><div className="shell"><div><GitCompareArrows aria-hidden="true" /><p className="eyebrow">{language === "tr" ? "Karşılaştırma masası" : "Comparison desk"}</p><h2>{language === "tr" ? "Profilleri yan yana görün." : "Put the profiles side by side."}</h2><p>{language === "tr" ? "Menşe, süreç, fincan yönü ve kullanım amacını tek bir görünümde karşılaştırın." : "Compare origin, process, cup direction and intended use in one focused view."}</p></div><Link className="button button--dark" to="/compare">{copy.compareAction}<ArrowRight aria-hidden="true" /></Link></div></section>
    </>
  );
}

function CoffeesPage({ language, copy, selected, onToggle }) {
  usePageMeta(language === "tr" ? "Yeşil kahve profilleri — Coffendi" : "Green coffee profiles — Coffendi", language === "tr" ? "Temsili Coffendi yeşil kahve profillerini keşfedin ve karşılaştırın." : "Explore and compare representative Coffendi green coffee profiles.", "/coffees");
  return <><PageHero eyebrow={language === "tr" ? "Yeşil kahve kütüphanesi" : "Green coffee library"} title={language === "tr" ? "Kahve seçimi net bir yönle başlar." : "Coffee selection starts with a clear direction."} copy={language === "tr" ? "Temsili profilleri keşfedin. Güncel ürün, kalite, miktar ve lojistik ayrıntıları her talepte ayrıca teyit edilir." : "Explore representative profiles. Current product, quality, quantity and logistics details are confirmed separately for every inquiry."} marker={`0${coffeeProfiles.length}`} /><section className="section shell"><div className="catalog-note"><Bean aria-hidden="true" /><p>{copy.sourceNote}</p></div><div className="profile-grid profile-grid--catalog">{coffeeProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} language={language} selected={selected.includes(profile.id)} onToggle={onToggle} copy={copy} />)}</div></section></>;
}

function CoffeePage({ language, copy, selected, onToggle }) {
  const { coffeeId } = useParams();
  const profile = coffeeProfiles.find(({ id }) => id === coffeeId);
  usePageMeta(
    profile ? `${localized(profile.name, language)} — Coffendi` : "Green coffee — Coffendi",
    profile ? localized(profile.profile, language) : "Explore Coffendi green coffee profiles.",
    profile ? `/coffees/${profile.id}` : "/coffees",
  );
  if (!profile) return <Navigate to="/coffees" replace />;
  return <><section className="profile-detail"><div className="shell profile-detail__grid"><div className="profile-detail__media"><img src={profile.image} alt={localized(profile.alt, language)} width="960" height="720" fetchPriority="high" decoding="async" style={{ viewTransitionName: `coffee-${profile.id}` }} /><span>{localized(profile.country, language)}</span></div><div className="profile-detail__copy"><Link className="breadcrumbs" to="/coffees">{copy.backCoffees}<ChevronRight aria-hidden="true" /></Link><p className="eyebrow">{profile.region}</p><h1>{localized(profile.name, language)}</h1><p className="profile-detail__lede">{localized(profile.profile, language)}</p><dl className="detail-facts"><div><dt>{language === "tr" ? "Menşe" : "Origin"}</dt><dd>{localized(profile.country, language)}</dd></div><div><dt>{language === "tr" ? "Bölge odağı" : "Regional focus"}</dt><dd>{profile.region}</dd></div><div><dt>{language === "tr" ? "İşleme" : "Process"}</dt><dd>{localized(profile.process, language)}</dd></div><div><dt>{language === "tr" ? "Program yönü" : "Program direction"}</dt><dd>{localized(profile.use, language)}</dd></div><div><dt>{language === "tr" ? "Hasat bağlamı" : "Harvest context"}</dt><dd>{localized(profile.harvest, language)}</dd></div></dl><div className="detail-actions"><button className={`button button--compare ${selected.includes(profile.id) ? "is-selected" : ""}`} type="button" onClick={() => onToggle(profile.id)} aria-pressed={selected.includes(profile.id)}>{selected.includes(profile.id) ? <Check aria-hidden="true" /> : <GitCompareArrows aria-hidden="true" />}{selected.includes(profile.id) ? copy.removeCompare : copy.addCompare}</button><Link className="button button--dark" to="/contact">{copy.requestInfo}<ArrowRight aria-hidden="true" /></Link></div><p className="source-note">{copy.sourceNote}</p></div></div></section><section className="section shell"><SectionHeading eyebrow={language === "tr" ? "Karar çerçevesi" : "Decision framework"} title={language === "tr" ? "Bir sonraki görüşmede neyi teyit etmelisiniz?" : "What should the next conversation confirm?"} /><div className="decision-grid"><article><Coffee aria-hidden="true" /><h3>{language === "tr" ? "Fincan" : "Cup"}</h3><p>{language === "tr" ? "Numuneyi hedef kavurma ve demleme yaklaşımıyla değerlendirin." : "Evaluate a sample against the intended roast and brewing approach."}</p></article><article><ClipboardCheck aria-hidden="true" /><h3>{language === "tr" ? "Belge" : "Documentation"}</h3><p>{language === "tr" ? "Menşe, süreç ve gereken belgeleri sözleşmeden önce teyit edin." : "Confirm origin, process and required documents before any agreement."}</p></article><article><Ship aria-hidden="true" /><h3>{language === "tr" ? "Lojistik" : "Logistics"}</h3><p>{language === "tr" ? "Hacim, teslim noktası ve zamanlamayı gerçek taleple eşleştirin." : "Align volume, destination and timing with the actual brief."}</p></article></div></section></>;
}

function OriginsPage({ language }) {
  usePageMeta(language === "tr" ? "Yeşil kahve menşeleri — Coffendi" : "Green coffee origins — Coffendi", language === "tr" ? "Coffendi'nin yeşil kahve menşe yaklaşımını keşfedin." : "Explore Coffendi’s green coffee origin framework.", "/origins");
  return <><PageHero eyebrow={language === "tr" ? "Menşe bağlamı" : "Origin context"} title={language === "tr" ? "Her menşe, tek bir tat tanımından daha fazlasıdır." : "Every origin is more than one flavour description."} copy={language === "tr" ? "Bölge, çeşit, işleme, hasat, üretici yapısı ve lojistik birlikte değerlendirilmelidir." : "Region, variety, process, harvest, producer structure and logistics should be considered together."} marker={language === "tr" ? "Küresel" : "Global"} /><section className="section shell"><div className="origin-grid">{coffeeProfiles.map((profile, index) => <article key={profile.id} className={index === 0 ? "origin-card origin-card--lead" : "origin-card"}><img src={profile.image} alt="" loading="lazy" decoding="async" width="720" height="540" /><div><span>0{index + 1}</span><p className="eyebrow">{profile.region}</p><h2>{localized(profile.country, language)}</h2><p>{localized(profile.profile, language)}</p><Link className="text-link" to={`/coffees/${profile.id}`}>{language === "tr" ? "Temsili profili gör" : "See representative profile"}<ArrowRight aria-hidden="true" /></Link></div></article>)}</div></section></>;
}

function ComparePage({ language, copy, selected, onToggle }) {
  usePageMeta(language === "tr" ? "Yeşil kahve karşılaştırması — Coffendi" : "Green coffee comparison — Coffendi", language === "tr" ? "Temsili yeşil kahve profillerini yan yana karşılaştırın." : "Compare representative green coffee profiles side by side.", "/compare");
  const profiles = coffeeProfiles.filter(({ id }) => selected.includes(id));
  return <><PageHero eyebrow={language === "tr" ? "Karşılaştırma masası" : "Comparison desk"} title={language === "tr" ? "Farkları tek bakışta görün." : "See the differences in one view."} copy={language === "tr" ? "En fazla üç profili seçin; menşe, süreç, fincan yönü ve kullanım amacını karşılaştırın." : "Choose up to three profiles and compare origin, process, cup direction and intended use."} marker={`${selected.length}/3`} /><section className="section shell"><div className="compare-picker" aria-label={language === "tr" ? "Karşılaştırma profilleri" : "Comparison profiles"}>{coffeeProfiles.map((profile) => <button key={profile.id} type="button" className={selected.includes(profile.id) ? "is-selected" : ""} onClick={() => onToggle(profile.id)} aria-pressed={selected.includes(profile.id)}><span>{localized(profile.country, language)}</span><strong>{localized(profile.name, language)}</strong>{selected.includes(profile.id) && <Check aria-hidden="true" />}</button>)}</div>{profiles.length ? <div className="compare-table" style={{ "--comparison-columns": profiles.length }} role="table" aria-label={language === "tr" ? "Yeşil kahve profil karşılaştırması" : "Green coffee profile comparison"}><div className="compare-table__row compare-table__row--head" role="row"><span role="columnheader">{language === "tr" ? "Kriter" : "Attribute"}</span>{profiles.map((profile) => <strong key={profile.id} role="columnheader">{localized(profile.country, language)}</strong>)}</div>{[[language === "tr" ? "Profil" : "Profile", "name"], [language === "tr" ? "Bölge" : "Region", "region"], [language === "tr" ? "İşleme" : "Process", "process"], [language === "tr" ? "Fincan yönü" : "Cup direction", "profile"], [language === "tr" ? "Program yönü" : "Program direction", "use"], [language === "tr" ? "Hasat bağlamı" : "Harvest context", "harvest"]].map(([label, key]) => <div className="compare-table__row" role="row" key={key}><span role="rowheader">{label}</span>{profiles.map((profile) => <p role="cell" data-label={label} key={profile.id}>{localized(profile[key], language)}</p>)}</div>)}</div> : <div className="empty-state"><GitCompareArrows aria-hidden="true" /><h2>{copy.comparisonEmpty}</h2></div>}<p className="catalog-note catalog-note--plain">{copy.sourceNote}</p></section></>;
}

function ApproachPage({ language }) {
  usePageMeta(language === "tr" ? "Yaklaşımımız — Coffendi" : "Our approach — Coffendi", language === "tr" ? "Coffendi'nin bilgi, teyit ve sorumlu yeşil kahve görüşmesi yaklaşımı." : "Coffendi’s framework for information, confirmation and responsible green coffee conversations.", "/approach");
  const pillars = language === "tr" ? [["Bağlam", "Menşe ve profil bilgisi, güncel ürün iddiasından ayrı tutulur."], ["Teyit", "Numune, kalite, miktar, belgeler ve teslimat koşulları doğrudan doğrulanır."], ["İzlenebilirlik", "Yalnızca destekleyici kayıtları olan bilgiler yayımlanır."], ["İlerleme", "Sürdürülebilirlik iddiaları ölçülebilir kapsam ve kanıt gerektirir."]] : [["Context", "Origin and profile information stays separate from current-product claims."], ["Confirmation", "Samples, quality, quantity, documents and delivery terms are verified directly."], ["Traceability", "Only information supported by the appropriate records should be published."], ["Progress", "Sustainability claims require measurable scope and evidence."]];
  return <><section className="approach-hero"><div className="shell"><p className="eyebrow eyebrow--gold">{language === "tr" ? "Sorumlu bilgi" : "Responsible information"}</p><h1>{language === "tr" ? "Güven, neyin bilindiğini ve neyin teyit edilmesi gerektiğini açıkça söylemekle başlar." : "Trust starts by stating what is known—and what still needs confirmation."}</h1><p>{language === "tr" ? "Coffendi, menşe keşfi ile ticari teyit arasındaki sınırı görünür tutar." : "Coffendi keeps the boundary between origin discovery and commercial confirmation visible."}</p></div></section><section className="section shell"><div className="pillar-grid">{pillars.map(([title, text], index) => <article key={title}><span>0{index + 1}</span>{[Globe2, ClipboardCheck, HandHeart, Leaf].map((Icon, iconIndex) => iconIndex === index && <Icon key={title} aria-hidden="true" />)}<h2>{title}</h2><p>{text}</p></article>)}</div></section><section className="section section--cream"><div className="shell approach-feature"><img src="/images/coffee-roastery.jpg" alt={language === "tr" ? "Kavurma ekipmanı ve kalite çalışma alanı" : "Roasting equipment and a quality workspace"} loading="lazy" decoding="async" width="960" height="720" /><div><p className="eyebrow">{language === "tr" ? "Her görüşmede" : "In every conversation"}</p><h2>{language === "tr" ? "Fincandan evraka kadar aynı netlik." : "The same clarity from cup to documentation."}</h2><ul><li><Check aria-hidden="true" />{language === "tr" ? "Numune ve duyusal hedef" : "Sample and sensory target"}</li><li><Check aria-hidden="true" />{language === "tr" ? "Menşe ve süreç kaydı" : "Origin and process record"}</li><li><Check aria-hidden="true" />{language === "tr" ? "Hacim ve zamanlama" : "Volume and timing"}</li><li><Check aria-hidden="true" />{language === "tr" ? "Gerekli belge ve teslim bağlamı" : "Required documentation and delivery context"}</li></ul></div></div></section></>;
}

function InquiryForm({ language, copy }) {
  const [state, setState] = useState({ status: "idle", message: "" });
  const formRef = useRef(null);
  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState({ status: "submitting", message: "" });
    try {
      await submitRequest("/api/inquiries", { name: data.get("name"), company: data.get("company"), email: data.get("email"), country: data.get("country"), volume: data.get("volume"), message: data.get("message"), audience: "roaster", consent: data.get("consent") === "on", source: `coffendi-green-${language}`, website: data.get("website") || "" });
      form.reset();
      setState({ status: "success", message: copy.form.success });
    } catch {
      setState({ status: "error", message: copy.form.error });
    }
  };
  return <form ref={formRef} className="inquiry-form" onSubmit={handleSubmit} aria-busy={state.status === "submitting"}><InquiryProgress formRef={formRef} language={language} /><div className="form-grid"><label><span>{copy.form.name}</span><input name="name" autoComplete="name" minLength="2" maxLength="80" required /></label><label><span>{copy.form.company}</span><input name="company" autoComplete="organization" minLength="2" maxLength="120" required /></label><label><span>{copy.form.email}</span><input name="email" type="email" autoComplete="email" maxLength="160" required /></label><label><span>{copy.form.country}</span><input name="country" autoComplete="country-name" maxLength="100" /></label><label className="form-grid__wide"><span>{copy.form.volume}</span><input name="volume" maxLength="80" placeholder={language === "tr" ? "Örn. numune, 20 çuval, yıllık program" : "For example: sample, 20 bags, annual program"} /></label><label className="form-grid__wide"><span>{copy.form.message}</span><textarea name="message" rows="6" minLength="10" maxLength="2500" required /></label><label className="consent-field form-grid__wide"><input name="consent" type="checkbox" required /><span>{copy.form.consent} <Link to="/privacy">{language === "tr" ? "Gizlilik" : "Privacy"}</Link></span></label><label className="bot-field" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label></div><div className="form-submit"><button className="button button--gold" type="submit" disabled={state.status === "submitting"}>{state.status === "submitting" ? copy.form.submitting : copy.form.submit}<Send aria-hidden="true" /></button>{state.message && <p className={`form-status is-${state.status}`} role="status">{state.message}</p>}</div></form>;
}

function ContactPage({ language, copy }) {
  usePageMeta(language === "tr" ? "İletişim — Coffendi" : "Contact — Coffendi", language === "tr" ? "Yeşil kahve talebinizi Coffendi ile paylaşın." : "Share your green coffee inquiry with Coffendi.", "/contact");
  return <><PageHero eyebrow={language === "tr" ? "İletişim ve talepler" : "Contact and inquiries"} title={language === "tr" ? "Doğru görüşme, net bir özetle başlar." : "The right conversation starts with a clear brief."} copy={language === "tr" ? "Genel sorular için iletişim bilgilerini kullanın; kahve talepleri için formu doldurun." : "Use the contact details for general questions, or complete the form for a coffee inquiry."} marker={language === "tr" ? "İnsan desteği" : "Human follow-up"} /><section className="section shell contact-layout"><aside><div className="contact-card"><Mail aria-hidden="true" /><p className="eyebrow eyebrow--gold">Email</p><h2>{language === "tr" ? "Doğrudan iletişim" : "Direct contact"}</h2><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div><div className="contact-note"><Warehouse aria-hidden="true" /><p>{language === "tr" ? "Ofis, telefon ve operasyon bilgileri doğrulandıktan sonra burada yayımlanacaktır." : "Office, phone and operating details will be published here after owner confirmation."}</p></div></aside><div className="form-panel"><p className="eyebrow">{copy.form.eyebrow}</p><h2>{copy.form.title}</h2><p>{copy.form.copy}</p><InquiryForm language={language} copy={copy} /></div></section></>;
}

function PrivacyPage({ language }) {
  usePageMeta(language === "tr" ? "Gizlilik — Coffendi" : "Privacy — Coffendi", language === "tr" ? "Coffendi gizlilik bilgileri." : "Coffendi privacy information.", "/privacy");
  return <section className="section shell policy"><p className="eyebrow">{language === "tr" ? "Gizlilik" : "Privacy"}</p><h1>{language === "tr" ? "Talep bilgileri yalnızca yanıt vermek için kullanılır." : "Inquiry details are used only to respond."}</h1><p>{language === "tr" ? "Formda paylaştığınız ad, şirket, e-posta ve kahve talebi bilgileri, talebinizi değerlendirmek ve sizinle iletişim kurmak amacıyla işlenir. Ödeme bilgisi toplanmaz." : "The name, company, email and coffee-brief information submitted through the form is processed to evaluate your inquiry and contact you. No payment information is collected."}</p><p>{language === "tr" ? "Saklama süresi, veri sorumlusu ve diğer yasal ayrıntılar işletme sahibi tarafından onaylandıktan sonra bu sayfada güncellenecektir." : "Retention periods, controller details and other required legal information will be updated here after confirmation by the business owner."}</p><a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}<ArrowRight aria-hidden="true" /></a></section>;
}

function PageHero({ eyebrow, title, copy, marker }) {
  return <section className="page-hero"><div className="shell page-hero__grid"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div><span>{marker}</span><p>{copy}</p></div></div></section>;
}

function Footer({ language, copy }) {
  return <footer className="site-footer"><div className="shell footer-lead"><div><p className="eyebrow eyebrow--gold">{language === "tr" ? "Bir sonraki kahve görüşmesi" : "The next coffee conversation"}</p><h2>{language === "tr" ? "Menşeden başlayın. İhtiyaçla netleştirin." : "Start with origin. Make it precise with the brief."}</h2></div><Link className="button button--gold" to="/contact">{copy.inquiry}<ArrowRight aria-hidden="true" /></Link></div><div className="shell footer-grid"><div className="footer-brand"><img src="/coffendi-logo-256.webp" alt="" width="256" height="243" loading="lazy" /><p>{copy.footerLine}</p></div><div><strong>{language === "tr" ? "Keşfet" : "Explore"}</strong><Link to="/coffees">{copy.nav.coffees}</Link><Link to="/origins">{copy.nav.origins}</Link><Link to="/compare">{copy.nav.compare}</Link></div><div><strong>{language === "tr" ? "Coffendi" : "Coffendi"}</strong><Link to="/approach">{copy.nav.impact}</Link><Link to="/contact">{copy.nav.contact}</Link><Link to="/privacy">{language === "tr" ? "Gizlilik" : "Privacy"}</Link></div><div><strong>{language === "tr" ? "İletişim" : "Contact"}</strong><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><span>{language === "tr" ? "Telefon ve ofis bilgileri teyit bekliyor" : "Phone and office details awaiting confirmation"}</span></div></div><div className="shell footer-base"><span>© {new Date().getFullYear()} Coffendi</span><span>{language === "tr" ? "Bilgilendirme sitesi · Çevrimiçi satış yoktur" : "Informational website · No online sales"}</span></div></footer>;
}

function NotFound({ language }) {
  return <section className="section shell not-found"><span>404</span><h1>{language === "tr" ? "Bu sayfa bulunamadı." : "This page could not be found."}</h1><Link className="button button--dark" to="/">{language === "tr" ? "Ana sayfaya dön" : "Return home"}</Link></section>;
}

export default function App() {
  const [language, setLanguage] = usePersistentState("coffendi-language", "en");
  const [selected, setSelected] = usePersistentState("coffendi-green-comparison", ["ethiopia-washed", "brazil-classic"]);
  const copy = messages[language] || messages.en;
  const safeSelected = useMemo(() => Array.isArray(selected) ? selected.filter((id) => coffeeProfiles.some((profile) => profile.id === id)).slice(0, 3) : [], [selected]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const toggleCompare = (id) => {
    setSelected((current) => {
      const safe = Array.isArray(current) ? current.filter((value) => coffeeProfiles.some((profile) => profile.id === value)).slice(0, 3) : [];
      if (safe.includes(id)) return safe.filter((value) => value !== id);
      return safe.length < 3 ? [...safe, id] : [...safe.slice(1), id];
    });
  };

  return <div className="app-shell"><a className="skip-link" href="#main-content">{language === "tr" ? "İçeriğe geç" : "Skip to content"}</a><ScrollManager /><ExperienceLayer language={language} /><Header language={language} setLanguage={setLanguage} copy={copy} /><main id="main-content"><Routes><Route path="/" element={<HomePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} />} /><Route path="/coffees" element={<CoffeesPage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} />} /><Route path="/coffees/:coffeeId" element={<CoffeePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} />} /><Route path="/origins" element={<OriginsPage language={language} />} /><Route path="/compare" element={<ComparePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} />} /><Route path="/approach" element={<ApproachPage language={language} />} /><Route path="/contact" element={<ContactPage language={language} copy={copy} />} /><Route path="/privacy" element={<PrivacyPage language={language} />} /><Route path="*" element={<NotFound language={language} />} /></Routes></main><Footer language={language} copy={copy} /></div>;
}
