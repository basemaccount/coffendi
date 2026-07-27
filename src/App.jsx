import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bean,
  Check,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  GitCompareArrows,
  Globe2,
  Leaf,
  Mail,
  MapPin,
  Menu,
  PackageCheck,
  PhoneCall,
  Send,
  Ship,
  Sprout,
  Warehouse,
  X,
} from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigationType, useParams } from "react-router";
import ExperienceLayer from "./components/ExperienceLayer";
import InquiryProgress from "./components/InquiryProgress";
import OriginAtlas from "./components/OriginAtlas";
import OriginConstellation from "./components/OriginConstellation";
import OriginExplorer from "./components/OriginExplorer";
import OriginFilters, { useOriginProfileFilters } from "./components/OriginFilters";
import OriginFlag from "./components/OriginFlag";
import { Link, NavLink } from "./components/TransitionLink";
import { usePersistentState } from "./hooks/usePersistentState";
import { submitRequest } from "./lib/api";
import { localizeCatalogWebsiteProfile } from "./lib/turkishCoffee";
import { originCatalogIndexUrl, originCatalogMeta } from "./originCatalog";

const SITE_URL = String(import.meta.env.VITE_PUBLIC_STORE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");
const CONTACT_EMAIL = "info@makendi.com";
const CONTACT_PHONE = "+90 216 340 70 28";
const CONTACT_PHONE_HREF = "+902163407028";
const CONTACT_WEBSITE = "www.coffendi.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/images/green-green-beans-sack.webp`;
const DEFAULT_SHARE_IMAGE_ALT = "Green coffee beans in a jute sack";
const OriginDocumentLibrary = lazy(() => import("./components/OriginDocumentLibrary"));

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
    comparisonFull: "Comparison full",
    comparisonFullHint: "Remove one profile before adding another.",
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
      success: "Thank you. Your inquiry has been recorded. You can also send the prepared email for immediate direct follow-up.",
      error: "The inquiry could not be sent. Please try again or email us directly.",
    },
  },
  tr: {
    language: "Dil",
    nav: { home: "Ana sayfa", coffees: "Kahve profilleri", origins: "Menşeler", compare: "Karşılaştır", impact: "Yaklaşımımız", contact: "İletişim" },
    inquiry: "Talep oluştur",
    menuOpen: "Menüyü aç",
    menuClose: "Menüyü kapat",
    compareAction: "Profilleri karşılaştır",
    addCompare: "Karşılaştırmaya ekle",
    removeCompare: "Karşılaştırmada",
    comparisonFull: "Karşılaştırma dolu",
    comparisonFullHint: "Başka bir profil eklemek için önce bir profili kaldırın.",
    comparisonEmpty: "Karşılaştırmaya başlamak için en az bir profil seçin.",
    requestInfo: "Bilgi talep et",
    learnMore: "Profili incele",
    backCoffees: "Kahvelere dön",
    sourceNote: "Yalnızca referans amaçlıdır. Güncel lotlar, numuneler, belgeler ve teslimat koşulları Coffendi tarafından doğrudan teyit edilir.",
    footerLine: "Kavurucular ve iş ortakları için yeşil kahve bilgileri ve talep kanalları.",
    form: {
      eyebrow: "İhtiyacınızı anlatın",
      title: "Net bir kahve özetiyle başlayın.",
      copy: "Tercih ettiğiniz menşeyi, işleme yöntemini, fincan profilini ve yaklaşık hacmi paylaşın. Coffendi ekibi uygun seçenekleri ve sonraki adımları sizinle teyit edecektir.",
      name: "Ad soyad",
      company: "Şirket",
      email: "İş e-postası",
      country: "Ülke / pazar",
      volume: "Tahmini hacim",
      message: "Kahve talebiniz",
      consent: "Coffendi'nin bu talebe yanıt vermek için bilgilerimi kullanmasını kabul ediyorum.",
      submit: "Talebi gönder",
      submitting: "Talep gönderiliyor",
      success: "Teşekkürler. Talebiniz kaydedildi. Dilerseniz e-posta taslağını açarak talebinizi doğrudan da iletebilirsiniz.",
      error: "Talep gönderilemedi. Lütfen tekrar deneyin veya bize doğrudan e-posta gönderin.",
    },
  },
};

const baseCoffeeProfiles = [
  {
    id: "ethiopia-washed",
    iso: "ET",
    flag: "🇪🇹",
    zone: "africa",
    processFamily: "washed",
    map: { x: 59.9, y: 46.4 },
    pin: { x: 64, y: 40 },
    country: { en: "Ethiopia", tr: "Etiyopya" },
    name: { en: "Highland washed profile", tr: "Yüksek rakımlı yıkanmış profil" },
    region: "Sidamo · Guji · Yirgacheffe",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Floral, citrus and tea-like clarity", tr: "Çiçeksi, narenciye ve çay benzeri berraklık" },
    use: { en: "Filter-led menus and bright components", tr: "Filtre menüleri ve canlı harman bileşenleri" },
    harvest: { en: "Typical main crop: October–January", tr: "Tipik ana hasat: Ekim–Ocak" },
    image: "/images/green-drying-beds.webp",
    srcSet: "/images/green-drying-beds-480.webp 480w, /images/green-drying-beds-720.webp 720w, /images/green-drying-beds-960.webp 960w, /images/green-drying-beds.webp 1200w",
    alt: { en: "Coffee drying on raised beds", tr: "Yükseltilmiş yataklarda kuruyan kahve" },
    directions: [
      { name: "Yirgacheffe Grade 1", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · floral · cocoa", tr: "Narenciye · çiçeksi · kakao" } },
      { name: "Guji Grade 1", process: { en: "Natural", tr: "Doğal işlenmiş" }, cup: { en: "Floral · ripe fruit", tr: "Çiçeksi · olgun meyve" } },
      { name: "Sidamo Grade 2", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · tea · cocoa", tr: "Narenciye · çay · kakao" } },
    ],
  },
  {
    id: "colombia-balanced",
    iso: "CO",
    flag: "🇨🇴",
    zone: "latin-america",
    processFamily: "mixed",
    map: { x: 30.5, y: 48.4 },
    pin: { x: 30, y: 52 },
    country: { en: "Colombia", tr: "Kolombiya" },
    name: { en: "Balanced regional profile", tr: "Dengeli bölgesel profil" },
    region: "Huila · Tolima · Nariño",
    process: { en: "Washed and selected processes", tr: "Yıkanmış ve farklı işleme yöntemleri" },
    profile: { en: "Red fruit, caramel and rounded acidity", tr: "Kırmızı meyve, karamel ve dengeli asidite" },
    use: { en: "Flexible espresso and filter programs", tr: "Esnek espresso ve filtre programları" },
    harvest: { en: "Regional harvest windows vary", tr: "Bölgesel hasat dönemleri değişkenlik gösterir" },
    image: "/images/green-coffee-farmer.webp",
    srcSet: "/images/green-coffee-farmer-480.webp 480w, /images/green-coffee-farmer-720.webp 720w, /images/green-coffee-farmer-960.webp 960w, /images/green-coffee-farmer.webp 1200w",
    alt: { en: "Coffee producer among coffee plants", tr: "Kahve bitkileri arasında bir üretici" },
    directions: [
      { name: "Bochica Blend", process: { en: "Fully washed", tr: "Tam yıkanmış" }, cup: { en: "Citrus · floral · cocoa", tr: "Narenciye · çiçeksi · kakao" } },
      { name: "Sugarcane Decaf", process: { en: "Decaffeinated · washed", tr: "Kafeinsiz · yıkanmış" }, cup: { en: "Cocoa · caramel · roasted nuts", tr: "Kakao · karamel · kavrulmuş kuruyemiş" } },
      { name: "Huila Regional", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Red fruit · rounded acidity", tr: "Kırmızı meyve · yuvarlak asidite" } },
    ],
  },
  {
    id: "brazil-classic",
    iso: "BR",
    flag: "🇧🇷",
    zone: "latin-america",
    processFamily: "natural",
    map: { x: 38.3, y: 61.2 },
    pin: { x: 39, y: 64 },
    country: { en: "Brazil", tr: "Brezilya" },
    name: { en: "Classic natural profile", tr: "Klasik doğal işlenmiş profil" },
    region: "Cerrado · Mantiqueira",
    process: { en: "Natural", tr: "Doğal işlenmiş" },
    profile: { en: "Chocolate, nuts and ripe-fruit sweetness", tr: "Çikolata, kuruyemiş ve olgun meyve tatlılığı" },
    use: { en: "Espresso foundations and approachable blends", tr: "Espresso bazları ve dengeli harmanlar" },
    harvest: { en: "Typical main crop: May–September", tr: "Tipik ana hasat: Mayıs–Eylül" },
    image: "/images/green-green-beans-sack.webp",
    srcSet: "/images/green-green-beans-sack-480.webp 480w, /images/green-green-beans-sack-720.webp 720w, /images/green-green-beans-sack-960.webp 960w, /images/green-green-beans-sack.webp 1200w",
    alt: { en: "Unroasted green coffee beans in a sack", tr: "Çuval içinde kavrulmamış yeşil kahve çekirdekleri" },
    directions: [
      { name: "Santos NY2", process: { en: "Natural", tr: "Doğal işlenmiş" }, cup: { en: "Red fruit · chocolate", tr: "Kırmızı meyve · çikolata" } },
      { name: "Cerrado Regional", process: { en: "Natural", tr: "Doğal işlenmiş" }, cup: { en: "Chocolate · nuts · ripe fruit", tr: "Çikolata · kuruyemiş · olgun meyve" } },
      { name: "Pulped Natural", process: { en: "Pulped natural", tr: "Yarı yıkanmış (pulped natural)" }, cup: { en: "Caramel · rounded sweetness", tr: "Karamel · dengeli tatlılık" } },
    ],
  },
  {
    id: "guatemala-structured",
    iso: "GT",
    flag: "🇬🇹",
    zone: "latin-america",
    processFamily: "washed",
    map: { x: 26.7, y: 41.2 },
    pin: { x: 26, y: 40 },
    country: { en: "Guatemala", tr: "Guatemala" },
    name: { en: "Structured highland profile", tr: "Belirgin yapılı yüksek rakım profili" },
    region: "Huehuetenango · Antigua",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Cocoa, citrus and structured sweetness", tr: "Kakao, narenciye ve katmanlı tatlılık" },
    use: { en: "Single-origin releases and blend structure", tr: "Tek menşe sunumları ve harman yapısı" },
    harvest: { en: "Typical main crop: November–March", tr: "Tipik ana hasat: Kasım–Mart" },
    image: "/images/green-farmer-guatemala.webp",
    srcSet: "/images/green-farmer-guatemala-480.webp 480w, /images/green-farmer-guatemala-720.webp 720w, /images/green-farmer-guatemala-960.webp 960w, /images/green-farmer-guatemala.webp 1200w",
    alt: { en: "Coffee producer examining coffee cherries", tr: "Kahve kirazlarını inceleyen üretici" },
    directions: [
      { name: "Huehuetenango Micro-lot", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · floral · cocoa", tr: "Narenciye · çiçeksi · kakao" } },
      { name: "SHB Huehuetenango", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Cocoa · structured sweetness", tr: "Kakao · yapılı tatlılık" } },
      { name: "SHB Antigua", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · cocoa · clean finish", tr: "Narenciye · kakao · temiz bitiş" } },
    ],
  },
  {
    id: "kenya-vivid",
    iso: "KE",
    flag: "🇰🇪",
    zone: "africa",
    processFamily: "washed",
    map: { x: 59.6, y: 50.2 },
    pin: { x: 65, y: 53 },
    country: { en: "Kenya", tr: "Kenya" },
    name: { en: "Vivid washed profile", tr: "Canlı karakterli yıkanmış profil" },
    region: "Kirinyaga · Nyeri",
    process: { en: "Washed", tr: "Yıkanmış" },
    profile: { en: "Dark berries, grapefruit and black tea", tr: "Koyu renkli orman meyveleri, greyfurt ve siyah çay" },
    use: { en: "Distinctive seasonal filter selections", tr: "Ayırt edici sezonluk filtre seçkileri" },
    harvest: { en: "Typical main crop: October–December", tr: "Tipik ana hasat: Ekim–Aralık" },
    image: "/images/green-cherry-harvest.webp",
    srcSet: "/images/green-cherry-harvest-480.webp 480w, /images/green-cherry-harvest-720.webp 720w, /images/green-cherry-harvest-960.webp 960w, /images/green-cherry-harvest.webp 1200w",
    alt: { en: "Fresh red coffee cherries during harvest", tr: "Hasat sırasında taze kırmızı kahve kirazları" },
    directions: [
      { name: "Kenya AA", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Dark berries · grapefruit", tr: "Koyu meyveler · greyfurt" } },
      { name: "Kenya AB", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · floral · black tea", tr: "Narenciye · çiçeksi · siyah çay" } },
      { name: "Peaberry", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Berry · vivid acidity", tr: "Orman meyvesi · canlı asidite" } },
    ],
  },
  {
    id: "rwanda-sweet",
    iso: "RW",
    flag: "🇷🇼",
    zone: "africa",
    processFamily: "mixed",
    map: { x: 57.7, y: 51 },
    pin: { x: 54, y: 55 },
    country: { en: "Rwanda", tr: "Ruanda" },
    name: { en: "Sweet, composed profile", tr: "Tatlı ve dengeli profil" },
    region: "Karongi · Gakenke",
    process: { en: "Washed and honey", tr: "Yıkanmış ve bal yöntemi" },
    profile: { en: "Stone fruit, tea and brown-sugar sweetness", tr: "Sert çekirdekli meyve, çay ve esmer şeker tatlılığı" },
    use: { en: "Elegant filter and lighter espresso programs", tr: "Zarif filtre kahveler ve açık kavrum espresso programları" },
    harvest: { en: "Typical main crop: March–July", tr: "Tipik ana hasat: Mart–Temmuz" },
    image: "/images/green-green-cherries.webp",
    srcSet: "/images/green-green-cherries-480.webp 480w, /images/green-green-cherries-720.webp 720w, /images/green-green-cherries-960.webp 960w, /images/green-green-cherries.webp 1200w",
    alt: { en: "Green coffee cherries growing on a branch", tr: "Dal üzerinde büyüyen yeşil kahve kirazları" },
    directions: [
      { name: "Fully Washed Bourbon", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Citrus · floral · cocoa", tr: "Narenciye · çiçeksi · kakao" } },
      { name: "Karongi Regional", process: { en: "Washed", tr: "Yıkanmış" }, cup: { en: "Stone fruit · tea", tr: "Sert çekirdekli meyve · çay" } },
      { name: "Honey-process direction", process: { en: "Honey", tr: "Bal yöntemi" }, cup: { en: "Brown sugar · composed sweetness", tr: "Esmer şeker · dengeli tatlılık" } },
    ],
  },
];

const baseIsoCodes = new Set(baseCoffeeProfiles.map((profile) => profile.iso));

function mergeCatalogCountry(profile, catalog) {
  if (!catalog) {
    return {
      ...profile,
      slug: profile.country.en.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      featured: true,
      sheets: [],
      sheetCount: 0,
      catalogDataUrl: "",
      bundleUrl: "",
      bundleDownloadUrl: "",
    };
  }

  const catalogProfile = localizeCatalogWebsiteProfile(catalog);
  return {
    ...profile,
    slug: catalogProfile.slug,
    featured: true,
    zone: catalogProfile.zone,
    processFamily: catalogProfile.processFamily,
    map: catalogProfile.map,
    pin: catalogProfile.pin,
    directions: catalogProfile.directions,
    sheets: [],
    sheetCount: catalogProfile.sheetCount,
    catalogDataUrl: catalogProfile.catalogDataUrl,
    bundleUrl: catalogProfile.bundleUrl,
    bundleDownloadUrl: catalogProfile.bundleDownloadUrl,
    catalogRevision: originCatalogMeta.revision,
  };
}

function createCatalogProfile(catalog) {
  return {
    ...localizeCatalogWebsiteProfile(catalog),
    featured: false,
  };
}

function buildCoffeeProfiles(originCatalogCountries = []) {
  const catalogByIso = new Map(originCatalogCountries.map((country) => [country.iso, country]));
  return [
    ...baseCoffeeProfiles.map((profile) => mergeCatalogCountry(profile, catalogByIso.get(profile.iso))),
    ...originCatalogCountries
      .filter((catalog) => !baseIsoCodes.has(catalog.iso))
      .map(createCatalogProfile),
  ];
}

function localized(value, language) {
  return typeof value === "object" && value !== null ? value[language] : value;
}

function inquiryEmailHref(data, language) {
  const subject = language === "tr" ? "Coffendi yeşil kahve talebi" : "Coffendi green coffee inquiry";
  const labels = language === "tr"
    ? { name: "Ad soyad", company: "Şirket", email: "E-posta", country: "Ülke / pazar", volume: "Tahmini hacim", message: "Talep özeti" }
    : { name: "Name", company: "Company", email: "Email", country: "Country / market", volume: "Indicative volume", message: "Coffee brief" };
  const body = ["name", "company", "email", "country", "volume", "message"]
    .map((field) => `${labels[field]}: ${String(data.get(field) || "—").trim() || "—"}`)
    .join("\n\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function usePageMeta(title, description, path = "/", language = "en", options = {}) {
  const {
    image = DEFAULT_SHARE_IMAGE,
    imageAlt = DEFAULT_SHARE_IMAGE_ALT,
    indexable = true,
  } = options;

  useLayoutEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`;
    const setMeta = (selector, content) => document.querySelector(selector)?.setAttribute("content", content);

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[name="robots"]', indexable ? "index,follow" : "noindex,follow");
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:image:alt"]', imageAlt);
    setMeta('meta[property="og:locale"]', language === "tr" ? "tr_TR" : "en_US");
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', image);
    setMeta('meta[name="twitter:image:alt"]', imageAlt);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  }, [description, image, imageAlt, indexable, language, path, title]);
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
    const desktop = window.matchMedia("(min-width: 1101px)");
    const closeAtDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    closeAtDesktop();
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);
  useEffect(() => {
    const handleMenuKeys = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const header = menuButton.current?.closest(".site-header");
      const focusable = [header, navigation.current]
        .filter(Boolean)
        .flatMap((region) => Array.from(region.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')))
        .filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    if (menuOpen && scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.toggle("no-scroll", menuOpen);
    if (menuOpen) {
      document.addEventListener("keydown", handleMenuKeys);
      requestAnimationFrame(() => navigation.current?.querySelector("a")?.focus());
    }
    return () => {
      document.body.classList.remove("no-scroll");
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleMenuKeys);
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
        <Link className="brand" to="/" aria-label={language === "tr" ? "Coffendi ana sayfa" : "Coffendi home"}>
          <img src="/coffendi-logo-160.webp" srcSet="/coffendi-logo-160.webp 160w, /coffendi-logo-256.webp 256w" sizes="54px" alt="" width="160" height="152" decoding="async" />
          <span><strong>Coffendi</strong><small>Green coffee · clearly connected</small></span>
        </Link>
        <nav className="desktop-nav" aria-label={language === "tr" ? "Ana menü" : "Primary navigation"}>
          {nav.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <div className="header-actions">
          <div className="language-switcher" role="group" aria-label={copy.language}>
            {['en', 'tr'].map((code) => (
              <button key={code} className={language === code ? "is-active" : ""} type="button" onClick={() => setLanguage(code)} aria-pressed={language === code}>{code.toUpperCase()}</button>
            ))}
          </div>
          <Link className="button button--dark header-cta" to="/contact">{copy.inquiry}<ArrowRight aria-hidden="true" /></Link>
          <button ref={menuButton} className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? copy.menuClose : copy.menuOpen}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
      </header>
      <div ref={navigation} id="mobile-navigation" className={`mobile-navigation ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen ? true : undefined} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <nav aria-label={language === "tr" ? "Mobil menü" : "Mobile navigation"}>
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

function ProfileCard({ profile, language, selected, onToggle, copy, comparisonFull = false }) {
  const unavailable = comparisonFull && !selected;
  const deferredDocumentImage = profile.heroKind === "document";
  const imageContainer = useRef(null);
  const [shouldLoadImage, setShouldLoadImage] = useState(!deferredDocumentImage);

  useEffect(() => {
    if (!deferredDocumentImage || shouldLoadImage) return undefined;
    const element = imageContainer.current;
    if (!element || !("IntersectionObserver" in window)) {
      setShouldLoadImage(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoadImage(true);
      observer.disconnect();
    }, { rootMargin: "240px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [deferredDocumentImage, shouldLoadImage]);

  return (
    <article ref={imageContainer} className="profile-card">
      <Link className={`profile-card__image ${profile.heroKind === "document" ? "profile-card__image--document" : ""}`} to={`/origins/${profile.slug}`}>
        {shouldLoadImage ? (
          <img src={profile.cardImage || profile.image} srcSet={profile.cardImage ? undefined : profile.srcSet} sizes="(max-width: 820px) calc(100vw - 34px), (max-width: 1100px) calc(50vw - 36px), 390px" alt={localized(profile.alt, language)} width={profile.heroKind === "document" ? "360" : "1200"} height={profile.heroKind === "document" ? "540" : "800"} loading="lazy" decoding="async" style={{ viewTransitionName: `coffee-${profile.id}` }} />
        ) : (
          <i className="profile-card__image-placeholder" aria-hidden="true" />
        )}
        <span className="profile-card__process"><OriginFlag profile={profile} size="small" /><span>{localized(profile.process, language)}</span></span>
      </Link>
      <div className="profile-card__content">
        <p className="eyebrow profile-card__origin"><OriginFlag profile={profile} size="tiny" />{localized(profile.country, language)}</p>
        <h3><Link to={`/origins/${profile.slug}`}>{localized(profile.name, language)}</Link></h3>
        <p>{localized(profile.profile, language)}</p>
        <dl><div><dt>{language === "tr" ? "Bölge" : "Region"}</dt><dd>{profile.region}</dd></div><div><dt>{language === "tr" ? "Önerilen kullanım" : "Program direction"}</dt><dd>{localized(profile.use, language)}</dd></div></dl>
        <div className="profile-card__actions">
          <button className={`button button--compare ${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`} type="button" onClick={() => onToggle(profile.id)} aria-pressed={selected} disabled={unavailable} title={unavailable ? copy.comparisonFullHint : undefined}>{selected ? <Check aria-hidden="true" /> : <GitCompareArrows aria-hidden="true" />}{selected ? copy.removeCompare : unavailable ? copy.comparisonFull : copy.addCompare}</button>
          <Link className="circle-link" to={`/origins/${profile.slug}`} aria-label={`${copy.learnMore}: ${localized(profile.name, language)}`}><ArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

function HomePage({ language, copy, selected, onToggle, comparisonFull, profiles }) {
  usePageMeta(
    language === "tr" ? "Coffendi — Menşeden kavurucuya yeşil kahve" : "Coffendi — Green coffee, from origin to roaster",
    language === "tr" ? "Yeşil kahve menşelerini, temsili profilleri ve Coffendi talep sürecini keşfedin." : "Explore green coffee origins, representative profiles and the Coffendi inquiry pathway.",
    "/",
    language,
  );
  const featured = profiles.slice(0, 3);
  const atlasProfiles = profiles.filter(({ featured: isFeatured }) => isFeatured);
  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--gold">{language === "tr" ? "Menşeden kavurucuya" : "From origin to roaster"}</p>
            <h1>{language === "tr" ? "Yeşil kahvede doğru bağlantı menşede başlar." : "Green coffee begins with clearer connections."}</h1>
            <p>{language === "tr" ? "Menşeleri keşfedin, temsili profilleri karşılaştırın ve ihtiyacınıza uygun kahveyi konuşmak için talebinizi paylaşın." : "Explore origins, compare representative profiles and share the brief that starts the right coffee conversation."}</p>
            <div className="hero__actions"><Link className="button button--gold" to="/coffees">{language === "tr" ? "Kahve profillerini keşfet" : "Explore coffees"}<ArrowRight aria-hidden="true" /></Link><Link className="button button--glass" to="/contact">{copy.inquiry}</Link></div>
            <div className="hero__proof"><span><Globe2 aria-hidden="true" />{language === "tr" ? "Menşe odaklı" : "Origin-led"}</span><span><GitCompareArrows aria-hidden="true" />{language === "tr" ? "Açık karşılaştırma" : "Clear comparison"}</span><span><ClipboardCheck aria-hidden="true" />{language === "tr" ? "Teyit edilen ayrıntılar" : "Confirmed next steps"}</span></div>
          </div>
          <div className="hero__media" data-optical>
            <img src="/images/instant-bulk-beans-1280.webp" srcSet="/images/instant-bulk-beans-640.webp 640w, /images/instant-bulk-beans-960.webp 960w, /images/instant-bulk-beans-1280.webp 1280w" sizes="(max-width: 800px) calc(100vw - 34px), 48vw" alt={language === "tr" ? "Çuvalda yeşil kahve çekirdekleri" : "Green coffee beans in a jute sack"} width="1280" height="960" fetchPriority="high" decoding="async" />
            <span className="material-lens" aria-hidden="true"><Sprout /></span>
            <div className="hero__card"><Sprout aria-hidden="true" /><span>{language === "tr" ? "Kahve kimliği menşede başlar" : "Coffee identity starts at origin"}</span></div>
          </div>
        </div>
      </section>

      <section className="service-strip"><div className="shell"><div><MapPin aria-hidden="true" /><span>{language === "tr" ? "Menşe bilgisi" : "Origin context"}</span></div><div><Coffee aria-hidden="true" /><span>{language === "tr" ? "Fincan profili" : "Cup direction"}</span></div><div><PackageCheck aria-hidden="true" /><span>{language === "tr" ? "Belge kontrolü" : "Document confirmation"}</span></div><div><Ship aria-hidden="true" /><span>{language === "tr" ? "İhtiyaca göre lojistik" : "Logistics by inquiry"}</span></div></div></section>

      <OriginAtlas profiles={atlasProfiles} language={language} LinkComponent={Link} />

      <section className="section shell">
        <SectionHeading eyebrow={language === "tr" ? "Öne çıkan profiller" : "Starting profiles"} title={language === "tr" ? "Önce aradığınız fincan profilini belirleyin." : "Find the cup direction first."} copy={language === "tr" ? "Bu içerikler canlı stok veya fiyat teklifi değildir; ilk görüşmeyi netleştirmek için hazırlanan temsili menşe profilleridir." : "These are representative origin profiles—not live stock or offers—designed to make the first conversation more precise."} action={<Link className="text-link" to="/coffees">{language === "tr" ? "Tüm profilleri gör" : "All profiles"}<ArrowRight aria-hidden="true" /></Link>} />
        <div className="profile-grid">{featured.map((profile) => <ProfileCard key={profile.id} profile={profile} language={language} selected={selected.includes(profile.id)} onToggle={onToggle} copy={copy} comparisonFull={comparisonFull} />)}</div>
      </section>

      <section className="section section--green">
        <div className="shell story-grid">
          <div><p className="eyebrow eyebrow--gold">{language === "tr" ? "Daha açık bir talep süreci" : "A better inquiry pathway"}</p><h2>{language === "tr" ? "Kahveyi yalnızca bir ad değil, birbirini tamamlayan kararlar bütünü olarak ele alın." : "See coffee as a sequence of decisions, not only a name."}</h2><p>{language === "tr" ? "Menşe, işleme yöntemi, fincan hedefi, hacim, zamanlama ve belgeler aynı görüşmede değerlendirilmelidir." : "Origin, process, cup goal, volume, timing and documentation belong in the same conversation."}</p><Link className="button button--light" to="/approach">{language === "tr" ? "Yaklaşımımızı incele" : "Explore the approach"}<ArrowRight aria-hidden="true" /></Link></div>
          <ol className="story-steps"><li><span>01</span><div><strong>{language === "tr" ? "Profil" : "Profile"}</strong><p>{language === "tr" ? "Fincan profilini ve kullanım alanını tanımlayın." : "Define the cup and program direction."}</p></div></li><li><span>02</span><div><strong>{language === "tr" ? "Uygunluk" : "Fit"}</strong><p>{language === "tr" ? "Hacim, takvim ve hedef pazar bilgisini paylaşın." : "Share volume, timing and market context."}</p></div></li><li><span>03</span><div><strong>{language === "tr" ? "Teyit" : "Confirm"}</strong><p>{language === "tr" ? "Numuneyi, belgeleri ve ticari koşulları doğrudan doğrulayın." : "Verify samples, documents and terms directly."}</p></div></li></ol>
        </div>
      </section>

      <section className="section comparison-teaser"><div className="shell"><div><GitCompareArrows aria-hidden="true" /><p className="eyebrow">{language === "tr" ? "Profil karşılaştırması" : "Comparison desk"}</p><h2>{language === "tr" ? "Profilleri yan yana değerlendirin." : "Put the profiles side by side."}</h2><p>{language === "tr" ? "Menşe, işleme yöntemi, fincan profili ve önerilen kullanım alanlarını tek görünümde karşılaştırın." : "Compare origin, process, cup direction and intended use in one focused view."}</p></div><Link className="button button--dark" to="/compare">{copy.compareAction}<ArrowRight aria-hidden="true" /></Link></div></section>
    </>
  );
}

function CoffeesPage({ language, copy, selected, onToggle, comparisonFull, profiles }) {
  usePageMeta(language === "tr" ? "Yeşil kahve profilleri — Coffendi" : "Green coffee profiles — Coffendi", language === "tr" ? "Temsili Coffendi yeşil kahve profillerini keşfedin ve karşılaştırın." : "Explore and compare representative Coffendi green coffee profiles.", "/coffees", language);
  const { filters, filteredProfiles, updateFilter, resetFilters, hasFilters } = useOriginProfileFilters(profiles, language);
  return (
    <>
      <PageHero eyebrow={language === "tr" ? "Yeşil kahve kütüphanesi" : "Green coffee library"} title={language === "tr" ? "Doğru kahve seçimi, açık bir profille başlar." : "Coffee selection starts with a clear direction."} copy={language === "tr" ? "Temsili profilleri keşfedin. Güncel ürün, kalite, miktar ve lojistik ayrıntıları her talep için ayrıca teyit edilir." : "Explore representative profiles. Current product, quality, quantity and logistics details are confirmed separately for every inquiry."} marker={String(profiles.length).padStart(2, "0")} />
      <section className="section shell coffee-library" aria-labelledby="coffee-library-title">
        <h2 id="coffee-library-title" className="visually-hidden">{language === "tr" ? "Filtrelenebilir yeşil kahve profilleri" : "Filterable green coffee profiles"}</h2>
        <div className="catalog-note"><Bean aria-hidden="true" /><p>{copy.sourceNote}</p></div>
        <OriginFilters profiles={profiles} language={language} filters={filters} onChange={updateFilter} onReset={resetFilters} hasFilters={hasFilters} resultCount={filteredProfiles.length} idPrefix="library-origin" compact />
        {filteredProfiles.length ? (
          <div className="profile-grid profile-grid--catalog" aria-live="polite">{filteredProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} language={language} selected={selected.includes(profile.id)} onToggle={onToggle} copy={copy} comparisonFull={comparisonFull} />)}</div>
        ) : (
          <div className="empty-state filter-empty"><Sprout aria-hidden="true" /><h2>{language === "tr" ? "Bu filtrelerle eşleşen bir profil bulunamadı." : "No profiles match these filters."}</h2><p>{language === "tr" ? "Farklı bir ülke, bölge veya işleme yöntemi seçin." : "Try another flag, region or process focus."}</p><button className="button button--dark" type="button" onClick={resetFilters}>{language === "tr" ? "Tüm profilleri göster" : "Show all profiles"}</button></div>
        )}
      </section>
    </>
  );
}

function OriginLocalNavigation({ profile, language }) {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && setActiveSection(entry.target.id));
    }, { rootMargin: "-150px 0px -60%" });
    ["overview", "catalog", "origin-network"].forEach((id) => observer.observe(document.getElementById(id)));
    return () => observer.disconnect();
  }, []);

  const links = [
    ["overview", language === "tr" ? "Ülke özeti" : "Overview"],
    ["catalog", language === "tr" ? "Belge arşivi" : "Documents"],
    ["origin-network", language === "tr" ? "Diğer menşeler" : "More origins"],
  ];

  return (
    <nav className="origin-local-nav" aria-label={language === "tr" ? "Menşe profili bölümleri" : "Origin profile sections"}>
      <div className="shell">
        <span><OriginFlag profile={profile} size="small" /><strong>{localized(profile.country, language)}</strong></span>
        <div>
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeSection === id ? "location" : undefined}
            >
              {label}
            </a>
          ))}
          <Link to="/contact">{language === "tr" ? "Bilgi talebi" : "Inquiry"}</Link>
        </div>
      </div>
    </nav>
  );
}

function CoffeePage({ language, copy, selected, onToggle, comparisonFull, profiles }) {
  const routeLocation = useLocation();
  const { coffeeId, countrySlug } = useParams();
  const profile = countrySlug
    ? profiles.find(({ slug }) => slug === countrySlug)
    : profiles.find(({ id }) => id === coffeeId);
  const canonicalPath = profile ? `/origins/${profile.slug}` : "/origins";
  const originReturnSearch = routeLocation.state?.originSearch || "";
  const returnParameters = new URLSearchParams(originReturnSearch);
  const hasDiscoveryFilters = ["q", "zone", "process", "country", "sort"].some((key) => returnParameters.has(key));
  const originsReturnTarget = { pathname: "/origins", search: originReturnSearch };
  usePageMeta(
    profile
      ? language === "tr"
        ? `${localized(profile.country, language)} yeşil kahve menşesi — Coffendi`
        : `${localized(profile.country, language)} green coffee origin — Coffendi`
      : "Green coffee — Coffendi",
    profile ? localized(profile.profile, language) : "Explore Coffendi green coffee profiles.",
    canonicalPath,
    language,
    profile ? {
      image: `${SITE_URL}${profile.image}`,
      imageAlt: localized(profile.alt, language),
    } : undefined,
  );
  if (!profile) return <Navigate to="/origins" replace />;
  const selectedProfile = selected.includes(profile.id);
  const unavailable = comparisonFull && !selectedProfile;
  return (
    <>
      <section id="overview" className={`profile-detail ${profile.heroKind === "document" ? "profile-detail--document" : ""}`}>
        <div className="shell profile-detail__grid">
          <div className="profile-detail__media">
            <img
              src={profile.image}
              srcSet={profile.srcSet}
              sizes="(max-width: 760px) calc(100vw - 34px), (max-width: 1100px) min(820px, 95vw), 580px"
              alt={localized(profile.alt, language)}
              width={profile.heroKind === "document" ? "1080" : "1200"}
              height={profile.heroKind === "document" ? "1620" : "800"}
              fetchPriority="high"
              decoding="async"
              style={{ viewTransitionName: `coffee-${profile.id}` }}
            />
            <span className="profile-detail__origin-badge">
              <OriginFlag profile={profile} size="medium" />
              <span>
                {localized(profile.country, language)}
                {profile.sheetCount > 0 && (
                  <small>
                    {profile.sheetCount} {language === "tr"
                      ? "teknik föy"
                      : profile.sheetCount === 1 ? "reference sheet" : "reference sheets"}
                  </small>
                )}
              </span>
            </span>
          </div>
          <div className="profile-detail__copy">
            <div className="profile-detail__intro">
              <Link className="breadcrumbs" to={originsReturnTarget}>
                {language === "tr"
                  ? hasDiscoveryFilters ? "Filtrelenmiş atlasa dön" : "Menşe atlasına dön"
                  : hasDiscoveryFilters ? "Back to filtered atlas" : "Back to origins"}
                <ChevronRight aria-hidden="true" />
              </Link>
              <p className="eyebrow profile-detail__region"><OriginFlag profile={profile} size="tiny" />{profile.region}</p>
              <h1>{localized(profile.country, language)}</h1>
              <p className="profile-detail__descriptor">{localized(profile.name, language)}</p>
              <p className="profile-detail__lede">{localized(profile.profile, language)}</p>
            </div>
            <dl className="detail-facts">
              <div><dt>{language === "tr" ? "Menşe" : "Origin"}</dt><dd className="detail-facts__origin"><OriginFlag profile={profile} size="small" />{localized(profile.country, language)}</dd></div>
              <div><dt>{language === "tr" ? "Bölge ve üretim alanları" : "Regional focus"}</dt><dd>{profile.region}</dd></div>
              <div><dt>{language === "tr" ? "Kahve işleme yöntemleri" : "Process"}</dt><dd>{localized(profile.process, language)}</dd></div>
              <div><dt>{language === "tr" ? "Önerilen kullanım alanları" : "Program direction"}</dt><dd>{localized(profile.use, language)}</dd></div>
              <div><dt>{language === "tr" ? "Tipik hasat dönemi" : "Harvest context"}</dt><dd>{localized(profile.harvest, language)}</dd></div>
              <div><dt>{language === "tr" ? "Belge arşivi" : "Catalogue"}</dt><dd>{profile.sheetCount > 0 ? `${profile.sheetCount} ${language === "tr" ? "teknik föy" : profile.sheetCount === 1 ? "reference sheet" : "reference sheets"}` : language === "tr" ? "Talep sırasında teyit edilir" : "Confirmed on request"}</dd></div>
            </dl>
            <div className="detail-actions">
              {profile.sheetCount > 0 && <a className="button button--gold" href="#catalog"><Bean aria-hidden="true" />{language === "tr" ? "Kaynak föyleri incele" : "Browse sheets"}</a>}
              <button className={`button button--compare ${selectedProfile ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`} type="button" onClick={() => onToggle(profile.id)} aria-pressed={selectedProfile} disabled={unavailable} title={unavailable ? copy.comparisonFullHint : undefined}>{selectedProfile ? <Check aria-hidden="true" /> : <GitCompareArrows aria-hidden="true" />}{selectedProfile ? copy.removeCompare : unavailable ? copy.comparisonFull : copy.addCompare}</button>
              <Link className="button button--dark" to="/contact">{copy.requestInfo}<ArrowRight aria-hidden="true" /></Link>
            </div>
            <p className="source-note">{copy.sourceNote}</p>
          </div>
        </div>
      </section>
      <Suspense fallback={(
        <section id="catalog" className="section" aria-busy="true">
          <div className="shell catalog-note"><Bean aria-hidden="true" /><p>{language === "tr" ? "Ülke kataloğu hazırlanıyor." : "Preparing the country catalogue."}</p></div>
        </section>
      )}>
        <OriginLocalNavigation profile={profile} language={language} />
        <OriginDocumentLibrary profile={profile} language={language} />
      </Suspense>
      <OriginConstellation profiles={profiles} language={language} LinkComponent={Link} activeId={profile.id} originSearch={originReturnSearch} />
      <section className="section shell">
        <SectionHeading eyebrow={language === "tr" ? "Karar çerçevesi" : "Decision framework"} title={language === "tr" ? "Bir sonraki görüşmede neyi teyit etmelisiniz?" : "What should the next conversation confirm?"} />
        <div className="decision-grid">
          <article><Coffee aria-hidden="true" /><h3>{language === "tr" ? "Fincan" : "Cup"}</h3><p>{language === "tr" ? "Numuneyi hedef kavurma ve demleme yaklaşımıyla değerlendirin." : "Evaluate a sample against the intended roast and brewing approach."}</p></article>
          <article><ClipboardCheck aria-hidden="true" /><h3>{language === "tr" ? "Belge" : "Documentation"}</h3><p>{language === "tr" ? "Menşe, süreç ve gereken belgeleri sözleşmeden önce teyit edin." : "Confirm origin, process and required documents before any agreement."}</p></article>
          <article><Ship aria-hidden="true" /><h3>{language === "tr" ? "Lojistik" : "Logistics"}</h3><p>{language === "tr" ? "Hacim, teslim noktası ve zamanlamayı gerçek taleple eşleştirin." : "Align volume, destination and timing with the actual brief."}</p></article>
        </div>
      </section>
    </>
  );
}

function OriginsPage({ language, profiles }) {
  usePageMeta(
    language === "tr" ? `${originCatalogMeta.countryCount} yeşil kahve menşesi — Coffendi` : `${originCatalogMeta.countryCount} green coffee origins — Coffendi`,
    language === "tr" ? `Coffendi'nin ${originCatalogMeta.countryCount} ülkelik menşe atlasını ve ${originCatalogMeta.sheetCount} kaynak sayfasını keşfedin.` : `Explore Coffendi’s ${originCatalogMeta.countryCount}-country origin atlas and ${originCatalogMeta.sheetCount} source-backed reference sheets.`,
    "/origins",
    language,
  );
  return (
    <>
      <PageHero
        eyebrow={language === "tr" ? "Kahve menşeleri atlası" : "Global origin atlas"}
        title={language === "tr" ? `${originCatalogMeta.countryCount} ülkenin kahve profili, ${originCatalogMeta.sheetCount} kaynak sayfası.` : `${originCatalogMeta.countryCount} countries. ${originCatalogMeta.sheetCount} source sheets. One clear atlas.`}
        copy={language === "tr" ? "Ülkeye, bölgeye, işleme yöntemine veya fincan profiline göre keşfedin. Ardından seçtiğiniz menşenin kaynak föylerini okuyun, büyütün ve indirin." : "Explore by country, region, process, or cup direction, then review and download only the sheets related to the selected origin."}
        marker={String(profiles.length).padStart(2, "0")}
      />
      <OriginExplorer profiles={profiles} language={language} LinkComponent={Link} />
    </>
  );
}

function ComparePage({ language, copy, selected, onToggle, onClear, profiles: allProfiles }) {
  usePageMeta(language === "tr" ? "Yeşil kahve karşılaştırması — Coffendi" : "Green coffee comparison — Coffendi", language === "tr" ? "Temsili yeşil kahve profillerini yan yana karşılaştırın." : "Compare representative green coffee profiles side by side.", "/compare", language);
  const profiles = allProfiles.filter(({ id }) => selected.includes(id));
  const comparisonFull = selected.length >= 3;
  const selectionStatus = comparisonFull
    ? language === "tr" ? "Üç profil seçildi. Başka bir profil eklemek için önce birini kaldırın." : "Three profiles selected. Remove one before adding another."
    : language === "tr" ? `${3 - selected.length} profil daha seçebilirsiniz.` : `You can select ${3 - selected.length} more ${3 - selected.length === 1 ? "profile" : "profiles"}.`;
  const comparisonRows = [
    [language === "tr" ? "Profil" : "Profile", "name"],
    [language === "tr" ? "Bölge" : "Region", "region"],
    [language === "tr" ? "İşleme yöntemi" : "Process", "process"],
    [language === "tr" ? "Fincan profili" : "Cup direction", "profile"],
    [language === "tr" ? "Önerilen kullanım" : "Program direction", "use"],
    [language === "tr" ? "Hasat bilgisi" : "Harvest context", "harvest"],
  ];

  return (
    <>
      <PageHero
        eyebrow={language === "tr" ? "Profil karşılaştırması" : "Comparison desk"}
        title={language === "tr" ? "Farkları tek bakışta görün." : "See the differences in one view."}
        copy={language === "tr" ? "En fazla üç profil seçerek menşe, işleme yöntemi, fincan profili ve önerilen kullanım alanlarını karşılaştırın." : "Choose up to three profiles and compare origin, process, cup direction and intended use."}
        marker={`${selected.length}/3`}
      />
      <OriginConstellation profiles={allProfiles} language={language} selectedIds={selected} onToggle={onToggle} comparisonFull={comparisonFull} mode="compare" />
      <section className="section shell compare-workbench">
        <div className="compare-toolbar">
          <div>
            <p className="eyebrow">{language === "tr" ? "Karşılaştırmanızı oluşturun" : "Build your comparison"}</p>
            <h2>{language === "tr" ? "En anlamlı üç profili seçin." : "Choose the three profiles that matter most."}</h2>
          </div>
          <div id="comparison-selection-status" className={`compare-toolbar__status ${comparisonFull ? "is-full" : ""}`} role="status" aria-live="polite" aria-atomic="true">
            <strong>{selected.length}<span> / 3</span></strong>
            <p>{selectionStatus}</p>
          </div>
          {selected.length > 0 && <button className="compare-toolbar__clear" type="button" onClick={onClear}><X aria-hidden="true" />{language === "tr" ? "Seçimi temizle" : "Clear selection"}</button>}
        </div>
        <div className="compare-picker" role="group" aria-label={language === "tr" ? "Karşılaştırma profilleri" : "Comparison profiles"}>
          {allProfiles.map((profile, index) => {
            const isSelected = selected.includes(profile.id);
            const unavailable = comparisonFull && !isSelected;
            return (
              <button key={profile.id} type="button" className={`${isSelected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`} onClick={() => onToggle(profile.id)} aria-pressed={isSelected} aria-describedby="comparison-selection-status" disabled={unavailable}>
                <span className="compare-picker__index" aria-hidden="true">0{index + 1}</span>
                <span className="compare-picker__country"><OriginFlag profile={profile} size="small" />{localized(profile.country, language)}</span>
                <strong>{localized(profile.name, language)}</strong>
                {isSelected && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {profiles.length ? (
          <div className="compare-table" style={{ "--comparison-columns": profiles.length }} role="table" aria-label={language === "tr" ? "Yeşil kahve profil karşılaştırması" : "Green coffee profile comparison"}>
            <div className="compare-table__row compare-table__row--head" role="row">
              <span role="columnheader">{language === "tr" ? "Kriter" : "Attribute"}</span>
              {profiles.map((profile) => <strong className="compare-table__origin" key={profile.id} role="columnheader"><OriginFlag profile={profile} size="small" />{localized(profile.country, language)}</strong>)}
            </div>
            {comparisonRows.map(([label, key]) => (
              <div className="compare-table__row" role="row" key={key}>
                <span role="rowheader">{label}</span>
                {profiles.map((profile) => <p role="cell" data-label={localized(profile.country, language)} key={profile.id}>{localized(profile[key], language)}</p>)}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><GitCompareArrows aria-hidden="true" /><h2>{copy.comparisonEmpty}</h2></div>
        )}
        <p className="catalog-note catalog-note--plain">{copy.sourceNote}</p>
      </section>
    </>
  );
}

function ApproachPage({ language }) {
  usePageMeta(language === "tr" ? "Yaklaşımımız — Coffendi" : "Our approach — Coffendi", language === "tr" ? "Coffendi'nin bilgi, teyit ve sorumlu yeşil kahve görüşmesi yaklaşımı." : "Coffendi’s framework for information, confirmation and responsible green coffee conversations.", "/approach", language);
  const pillars = language === "tr" ? [["Bağlam", "Menşe ve profil bilgisi, güncel ürün iddiasından ayrı tutulur."], ["Teyit", "Numune, kalite, miktar, belgeler ve teslimat koşulları doğrudan doğrulanır."], ["İzlenebilirlik", "Yalnızca destekleyici kayıtları olan bilgiler yayımlanır."], ["İlerleme", "Sürdürülebilirlik iddiaları ölçülebilir kapsam ve kanıt gerektirir."]] : [["Context", "Origin and profile information stays separate from current-product claims."], ["Confirmation", "Samples, quality, quantity, documents and delivery terms are verified directly."], ["Traceability", "Only information supported by the appropriate records should be published."], ["Progress", "Sustainability claims require measurable scope and evidence."]];
  const pillarIcons = [Globe2, ClipboardCheck, Sprout, Leaf];

  return (
    <>
      <section className="approach-hero">
        <div className="shell">
          <p className="eyebrow eyebrow--gold">{language === "tr" ? "Sorumlu bilgi" : "Responsible information"}</p>
          <h1>{language === "tr" ? "Güven, neyin bilindiğini ve neyin teyit edilmesi gerektiğini açıkça söylemekle başlar." : "Trust starts by stating what is known—and what still needs confirmation."}</h1>
          <p>{language === "tr" ? "Coffendi, menşe keşfi ile ticari teyit arasındaki sınırı görünür tutar." : "Coffendi keeps the boundary between origin discovery and commercial confirmation visible."}</p>
        </div>
      </section>
      <section className="section shell">
        <div className="pillar-grid">
          {pillars.map(([title, text], index) => {
            const Icon = pillarIcons[index];
            return <article key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h2>{title}</h2><p>{text}</p></article>;
          })}
        </div>
      </section>
      <section className="section section--cream">
        <div className="shell approach-feature">
          <img
            src="/images/green-coffee-roastery.webp"
            srcSet="/images/green-coffee-roastery-480.webp 480w, /images/green-coffee-roastery-720.webp 720w, /images/green-coffee-roastery-960.webp 960w, /images/green-coffee-roastery.webp 1200w"
            sizes="(max-width: 760px) calc(100vw - 34px), 50vw"
            alt={language === "tr" ? "Bir hazırlık tezgâhının üzerinde üç kişinin tuttuğu kahve içecekleri" : "Three people holding coffee drinks above a preparation counter"}
            loading="lazy"
            decoding="async"
            width="1200"
            height="800"
          />
          <div>
            <p className="eyebrow">{language === "tr" ? "Her görüşmede" : "In every conversation"}</p>
            <h2>{language === "tr" ? "Fincandan evraka kadar aynı netlik." : "The same clarity from cup to documentation."}</h2>
            <ul>
              <li><Check aria-hidden="true" />{language === "tr" ? "Numune ve duyusal hedef" : "Sample and sensory target"}</li>
              <li><Check aria-hidden="true" />{language === "tr" ? "Menşe ve süreç kaydı" : "Origin and process record"}</li>
              <li><Check aria-hidden="true" />{language === "tr" ? "Hacim ve zamanlama" : "Volume and timing"}</li>
              <li><Check aria-hidden="true" />{language === "tr" ? "Gerekli belge ve teslim bağlamı" : "Required documentation and delivery context"}</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function InquiryForm({ language, copy }) {
  const [state, setState] = useState({ status: "idle", message: "", emailHref: "" });
  const formRef = useRef(null);
  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const emailHref = inquiryEmailHref(data, language);
    setState({ status: "submitting", message: "", emailHref: "" });
    try {
      await submitRequest("/api/inquiries", { name: data.get("name"), company: data.get("company"), email: data.get("email"), country: data.get("country"), volume: data.get("volume"), message: data.get("message"), audience: "roaster", consent: data.get("consent") === "on", source: `coffendi-green-${language}`, website: data.get("website") || "" });
      form.reset();
      setState({ status: "success", message: copy.form.success, emailHref });
    } catch {
      setState({ status: "error", message: copy.form.error, emailHref });
    }
  };
  return (
    <form ref={formRef} className="inquiry-form" onSubmit={handleSubmit} aria-busy={state.status === "submitting"}>
      <InquiryProgress formRef={formRef} language={language} />
      <div className="form-grid">
        <label><span>{copy.form.name}</span><input name="name" autoComplete="name" minLength="2" maxLength="80" required /></label>
        <label><span>{copy.form.company}</span><input name="company" autoComplete="organization" minLength="2" maxLength="120" required /></label>
        <label><span>{copy.form.email}</span><input name="email" type="email" autoComplete="email" maxLength="160" required /></label>
        <label><span>{copy.form.country}</span><input name="country" autoComplete="country-name" maxLength="100" /></label>
        <label className="form-grid__wide"><span>{copy.form.volume}</span><input name="volume" maxLength="80" placeholder={language === "tr" ? "Örn. numune, 20 çuval, yıllık program" : "For example: sample, 20 bags, annual program"} /></label>
        <label className="form-grid__wide"><span>{copy.form.message}</span><textarea name="message" rows="6" minLength="10" maxLength="2500" required /></label>
        <label className="consent-field form-grid__wide"><input name="consent" type="checkbox" required /><span>{copy.form.consent} <Link to="/privacy">{language === "tr" ? "Gizlilik" : "Privacy"}</Link></span></label>
        <label className="bot-field" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
      </div>
      <div className="form-submit">
        <button className="button button--gold" type="submit" disabled={state.status === "submitting"}>{state.status === "submitting" ? copy.form.submitting : copy.form.submit}<Send aria-hidden="true" /></button>
        {state.message && <p className={`form-status is-${state.status}`} role={state.status === "error" ? "alert" : "status"} aria-live={state.status === "error" ? "assertive" : "polite"} aria-atomic="true">{state.message}</p>}
      </div>
      {state.emailHref && (
        <div className="inquiry-fallback" role="group" aria-label={language === "tr" ? "Doğrudan takip seçenekleri" : "Direct follow-up options"}>
          <a className="button button--dark" href={state.emailHref}><Mail aria-hidden="true" />{language === "tr" ? "E-posta taslağını aç" : "Send prepared email"}</a>
          <a className="button button--outline" href={`tel:${CONTACT_PHONE_HREF}`}><PhoneCall aria-hidden="true" />{language === "tr" ? "Telefonla ara" : "Call Coffendi"}</a>
        </div>
      )}
    </form>
  );
}

function ContactChannels({ language }) {
  return <div className="contact-channels"><a className="contact-channel" href={`mailto:${CONTACT_EMAIL}`}><Mail aria-hidden="true" /><span><small>{language === "tr" ? "E-posta" : "Email"}</small><strong>{CONTACT_EMAIL}</strong></span></a><a className="contact-channel" href={`tel:${CONTACT_PHONE_HREF}`}><PhoneCall aria-hidden="true" /><span><small>{language === "tr" ? "Telefon" : "Telephone"}</small><strong>{CONTACT_PHONE}</strong></span></a><div className="contact-channel"><Globe2 aria-hidden="true" /><span><small>{language === "tr" ? "Web sitesi" : "Website"}</small><strong>{CONTACT_WEBSITE}</strong></span></div></div>;
}

function ContactPage({ language, copy }) {
  usePageMeta(language === "tr" ? "İletişim — Coffendi" : "Contact — Coffendi", language === "tr" ? "Yeşil kahve talebinizi Coffendi ile paylaşın." : "Share your green coffee inquiry with Coffendi.", "/contact", language);
  return <><PageHero eyebrow={language === "tr" ? "İletişim ve talepler" : "Contact and inquiries"} title={language === "tr" ? "Doğru kahveyi konuşmak, net bir taleple başlar." : "The right conversation starts with a clear brief."} copy={language === "tr" ? "Genel sorularınız için doğrudan iletişime geçin; kahve talepleriniz için formu doldurun." : "Use the contact details for general questions, or complete the form for a coffee inquiry."} marker={language === "tr" ? "Doğrudan destek" : "Human follow-up"} /><section className="section shell contact-layout"><aside><div className="contact-card"><p className="eyebrow eyebrow--gold">{language === "tr" ? "Doğrudan iletişim" : "Direct contact"}</p><h2>{language === "tr" ? "Size uygun iletişim kanalını seçin." : "Choose the channel that works for you."}</h2><ContactChannels language={language} /></div><div className="contact-note"><Warehouse aria-hidden="true" /><p>{language === "tr" ? "Talebiniz kaydedildikten sonra ekibimiz sizinle iletişime geçer. Dilerseniz hazırlanan e-postayı göndererek talebinizi doğrudan da iletebilirsiniz." : "After your inquiry is recorded, our team can follow up with you. You can also send the prepared email for a direct follow-up route."}</p></div></aside><div className="form-panel"><p className="eyebrow">{copy.form.eyebrow}</p><h2>{copy.form.title}</h2><p>{copy.form.copy}</p><InquiryForm language={language} copy={copy} /></div></section></>;
}

function PrivacyPage({ language }) {
  usePageMeta(language === "tr" ? "Gizlilik — Coffendi" : "Privacy — Coffendi", language === "tr" ? "Coffendi gizlilik bilgileri." : "Coffendi privacy information.", "/privacy", language);
  return <section className="section shell policy"><p className="eyebrow">{language === "tr" ? "Gizlilik" : "Privacy"}</p><h1>{language === "tr" ? "Talep bilgileri yalnızca yanıt vermek için kullanılır." : "Inquiry details are used only to respond."}</h1><p>{language === "tr" ? "Formda paylaştığınız ad, şirket, e-posta ve kahve talebi bilgileri, talebinizi değerlendirmek ve sizinle iletişim kurmak amacıyla işlenir. Ödeme bilgisi toplanmaz." : "The name, company, email and coffee-brief information submitted through the form is processed to evaluate your inquiry and contact you. No payment information is collected."}</p><p>{language === "tr" ? "Saklama süresi, veri sorumlusu ve diğer yasal ayrıntılar işletme sahibi tarafından onaylandıktan sonra bu sayfada güncellenecektir." : "Retention periods, controller details and other required legal information will be updated here after confirmation by the business owner."}</p><a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}<ArrowRight aria-hidden="true" /></a></section>;
}

function PageHero({ eyebrow, title, copy, marker }) {
  return <section className="page-hero"><div className="shell page-hero__grid"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div><span>{marker}</span><p>{copy}</p></div></div></section>;
}

function Footer({ language, copy }) {
  return <footer className="site-footer"><div className="shell footer-lead"><div><p className="eyebrow eyebrow--gold">{language === "tr" ? "Bir sonraki kahve görüşmeniz" : "The next coffee conversation"}</p><h2>{language === "tr" ? "Menşeyi keşfedin, ihtiyacınızı birlikte netleştirelim." : "Start with origin. Make it precise with the brief."}</h2></div><Link className="button button--gold" to="/contact">{copy.inquiry}<ArrowRight aria-hidden="true" /></Link></div><div className="shell footer-grid"><div className="footer-brand"><img src="/coffendi-logo-256.webp" srcSet="/coffendi-logo-160.webp 160w, /coffendi-logo-256.webp 256w" sizes="118px" alt="Coffendi" width="256" height="243" loading="lazy" decoding="async" /><p>{copy.footerLine}</p></div><div><strong>{language === "tr" ? "Keşfet" : "Explore"}</strong><Link to="/coffees">{copy.nav.coffees}</Link><Link to="/origins">{copy.nav.origins}</Link><Link to="/compare">{copy.nav.compare}</Link></div><div><strong>Coffendi</strong><Link to="/approach">{copy.nav.impact}</Link><Link to="/contact">{copy.nav.contact}</Link><Link to="/privacy">{language === "tr" ? "Gizlilik" : "Privacy"}</Link></div><div><strong>{language === "tr" ? "İletişim" : "Contact"}</strong><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><a href={`tel:${CONTACT_PHONE_HREF}`}>{CONTACT_PHONE}</a><span>{CONTACT_WEBSITE}</span></div></div><div className="shell footer-base"><span>© {new Date().getFullYear()} Coffendi</span><span>{language === "tr" ? "Bilgilendirme sitesidir · Çevrimiçi satış yapılmaz" : "Informational website · No online sales"}</span></div></footer>;
}

function NotFound({ language }) {
  const { pathname } = useLocation();
  usePageMeta(
    language === "tr" ? "Sayfa bulunamadı — Coffendi" : "Page not found — Coffendi",
    language === "tr" ? "İstenen Coffendi sayfası bulunamadı." : "The requested Coffendi page could not be found.",
    pathname,
    language,
    { indexable: false },
  );
  return <section className="section shell not-found"><span>404</span><h1>{language === "tr" ? "Bu sayfa bulunamadı." : "This page could not be found."}</h1><Link className="button button--dark" to="/">{language === "tr" ? "Ana sayfaya dön" : "Return home"}</Link></section>;
}

function CatalogStatusPage({ language, path, error, onRetry }) {
  const title = error
    ? language === "tr" ? "Menşe kataloğu şu anda yüklenemiyor." : "The origin catalogue could not be loaded."
    : language === "tr" ? "Küresel menşe kataloğu hazırlanıyor." : "Preparing the global origin catalogue.";
  const description = error
    ? language === "tr" ? `Bağlantınızı kontrol edin ve ${originCatalogMeta.countryCount} ülkelik kataloğu yeniden deneyin.` : `Check your connection and retry the ${originCatalogMeta.countryCount}-country catalogue.`
    : language === "tr" ? `${originCatalogMeta.countryCount} ülke ve ${originCatalogMeta.sheetCount} doğrulanmış kaynak sayfa yükleniyor.` : `Loading ${originCatalogMeta.countryCount} countries and ${originCatalogMeta.sheetCount} verified source sheets.`;
  usePageMeta(`${title} — Coffendi`, description, path, language, { indexable: !error });
  return (
    <>
      <PageHero
        eyebrow={language === "tr" ? "Coffendi menşe atlası" : "Coffendi origin atlas"}
        title={title}
        copy={description}
        marker={error ? "!" : String(originCatalogMeta.countryCount)}
      />
      <section className="section shell catalog-route-status" aria-live="polite" aria-busy={!error}>
        <Globe2 aria-hidden="true" />
        <p>{description}</p>
        {error && (
          <button className="button button--dark" type="button" onClick={onRetry}>
            {language === "tr" ? "Kataloğu yeniden dene" : "Retry the catalogue"}
          </button>
        )}
      </section>
    </>
  );
}

export default function App({ initialOriginCatalog = null }) {
  const location = useLocation();
  const [storedLanguage, setLanguage] = usePersistentState("coffendi-language", "en");
  const [selected, setSelected] = usePersistentState("coffendi-green-comparison", ["ethiopia-washed", "brazil-classic"]);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogState, setCatalogState] = useState(() => initialOriginCatalog || { status: "idle", countries: [] });
  const language = storedLanguage === "tr" ? "tr" : "en";
  const copy = messages[language] || messages.en;
  const catalogRequired = location.pathname === "/compare"
    || location.pathname === "/coffees"
    || location.pathname.startsWith("/coffees/")
    || location.pathname === "/origins"
    || location.pathname.startsWith("/origins/");
  const profiles = useMemo(() => buildCoffeeProfiles(catalogState.countries), [catalogState.countries]);
  const safeSelected = useMemo(() => Array.isArray(selected) ? selected.filter((id) => profiles.some((profile) => profile.id === id)).slice(0, 3) : [], [profiles, selected]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    if (storedLanguage !== language) setLanguage(language);
  }, [language, setLanguage, storedLanguage]);
  useEffect(() => {
    if (catalogState.status === "ready") return undefined;
    const controller = new AbortController();
    let idleHandle = 0;
    const loadCatalog = () => {
      setCatalogState((current) => ({ ...current, status: "loading" }));
      fetch(originCatalogIndexUrl, {
        signal: controller.signal,
        cache: "force-cache",
        headers: { Accept: "application/json" },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Origin index returned ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          if (payload.revision !== originCatalogMeta.revision || !Array.isArray(payload.countries) || payload.countries.length !== originCatalogMeta.countryCount) {
            throw new Error("Origin index validation failed");
          }
          setCatalogState({ status: "ready", countries: payload.countries });
        })
        .catch((error) => {
          if (error.name !== "AbortError") setCatalogState({ status: "error", countries: [] });
        });
    };

    if (catalogRequired) loadCatalog();
    else if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(loadCatalog, { timeout: 1500 });
    else idleHandle = window.setTimeout(loadCatalog, 300);

    return () => {
      controller.abort();
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
    };
    // A retry or transition into a catalog route should perform exactly one validated request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogAttempt, catalogRequired]);

  const toggleCompare = (id) => {
    setSelected((current) => {
      const safe = Array.isArray(current) ? current.filter((value) => profiles.some((profile) => profile.id === value)).slice(0, 3) : [];
      if (safe.includes(id)) return safe.filter((value) => value !== id);
      return safe.length < 3 ? [...safe, id] : safe;
    });
  };
  const clearComparison = () => setSelected([]);
  const comparisonFull = safeSelected.length >= 3;

  const catalogPending = catalogRequired && catalogState.status !== "ready";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{language === "tr" ? "İçeriğe geç" : "Skip to content"}</a>
      <ScrollManager />
      <ExperienceLayer language={language} />
      <Header language={language} setLanguage={setLanguage} copy={copy} />
      <main id="main-content">
        {catalogPending ? (
          <CatalogStatusPage
            language={language}
            path={location.pathname}
            error={catalogState.status === "error"}
            onRetry={() => setCatalogAttempt((attempt) => attempt + 1)}
          />
        ) : (
          <Routes>
            <Route path="/" element={<HomePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} comparisonFull={comparisonFull} profiles={profiles} />} />
            <Route path="/coffees" element={<CoffeesPage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} comparisonFull={comparisonFull} profiles={profiles} />} />
            <Route path="/coffees/:coffeeId" element={<CoffeePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} comparisonFull={comparisonFull} profiles={profiles} />} />
            <Route path="/origins" element={<OriginsPage language={language} profiles={profiles} />} />
            <Route path="/origins/:countrySlug" element={<CoffeePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} comparisonFull={comparisonFull} profiles={profiles} />} />
            <Route path="/compare" element={<ComparePage language={language} copy={copy} selected={safeSelected} onToggle={toggleCompare} onClear={clearComparison} profiles={profiles} />} />
            <Route path="/approach" element={<ApproachPage language={language} />} />
            <Route path="/contact" element={<ContactPage language={language} copy={copy} />} />
            <Route path="/privacy" element={<PrivacyPage language={language} />} />
            <Route path="*" element={<NotFound language={language} />} />
          </Routes>
        )}
      </main>
      <Footer language={language} copy={copy} />
    </div>
  );
}
