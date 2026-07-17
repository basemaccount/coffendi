import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  CircleGauge,
  Coffee,
  Droplets,
  Factory,
  Leaf,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Trash2,
  Truck,
  Wind,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { usePersistentState } from "./hooks/usePersistentState";
import { submitRequest } from "./lib/api";
import {
  formatPrice,
  getProduct,
  learningCards,
  products,
  storeCurrency,
  sustainabilityPillars,
} from "./storefrontData";

const SITE_URL = String(import.meta.env.VITE_PUBLIC_STORE_URL || "https://coffendi.vercel.app").replace(/\/$/, "");

const processIcons = {
  "spray-dried": Wind,
  agglomerated: CircleGauge,
  "freeze-dried": Snowflake,
};

function setMetaContent(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    document.head.append(element);
  }
  element.setAttribute("content", content);
}

function usePageMeta(title, description, options = {}) {
  const { pathname } = useLocation();
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
  const imageUrl = options.image ? `${SITE_URL}${options.image}` : `${SITE_URL}/images/instant-hero.webp`;

  useEffect(() => {
    document.title = title;
    setMetaContent('meta[name="description"]', { name: "description" }, description);
    setMetaContent('meta[name="robots"]', { name: "robots" }, options.robots || "index,follow");
    setMetaContent('meta[property="og:type"]', { property: "og:type" }, options.type || "website");
    setMetaContent('meta[property="og:title"]', { property: "og:title" }, title);
    setMetaContent('meta[property="og:description"]', { property: "og:description" }, description);
    setMetaContent('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    setMetaContent('meta[property="og:image"]', { property: "og:image" }, imageUrl);
    setMetaContent('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    setMetaContent('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    setMetaContent('meta[name="twitter:image"]', { name: "twitter:image" }, imageUrl);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.append(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, [canonicalUrl, description, imageUrl, options.robots, options.type, title]);
}

function StructuredData({ data }) {
  const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => {
        let targetId = hash.slice(1);
        try {
          targetId = decodeURIComponent(targetId);
        } catch {
          // Keep the literal fragment when it is not valid percent-encoding.
        }
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

function AnnouncementBar() {
  return (
    <div className="announcement">
      <p>
        <span>Three instant-coffee formats.</span>
        <span className="announcement__detail">Retail-ready experience · Dedicated bulk pathway</span>
      </p>
      <Link to="/bulk">
        <span className="announcement__desktop-link">Plan a bulk order</span>
        <span className="announcement__mobile-link">Bulk & private label</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function Header({ cartCount, onOpenCart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const mobileNavigation = useRef(null);
  const menuWasOpen = useRef(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const isolatedElements = [
      document.querySelector(".announcement"),
      document.querySelector(".brand"),
      document.querySelector(".desktop-nav"),
      document.querySelector(".cart-button"),
      document.querySelector("#main-content"),
      document.querySelector(".site-footer"),
    ].filter(Boolean);
    const handleKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.classList.toggle("no-scroll", menuOpen);
    isolatedElements.forEach((element) => { element.inert = menuOpen; });
    if (menuOpen) {
      menuWasOpen.current = true;
      document.addEventListener("keydown", handleKey);
      requestAnimationFrame(() => mobileNavigation.current?.querySelector("a")?.focus());
    } else if (menuWasOpen.current) {
      menuWasOpen.current = false;
      requestAnimationFrame(() => menuButton.current?.focus());
    }

    return () => {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("keydown", handleKey);
      isolatedElements.forEach((element) => { element.inert = false; });
    };
  }, [menuOpen]);

  const navigation = [
    ["Shop", "/shop"],
    ["Learn", "/learn"],
    ["Sustainability", "/sustainability"],
    ["Bulk", "/bulk"],
  ];

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Coffendi home">
          <img src="/coffendi-logo.png" alt="" width="82" height="82" />
          <span>
            <strong>Coffendi</strong>
            <small>Instant coffee, clearly considered</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "is-active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="cart-button"
            type="button"
            onClick={onOpenCart}
            aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <ShoppingBag size={19} aria-hidden="true" />
            <span className="cart-button__label">Cart</span>
            <span className="cart-count" aria-hidden="true">{cartCount}</span>
          </button>
          <button
            ref={menuButton}
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div
        ref={mobileNavigation}
        id="mobile-navigation"
        className={`mobile-navigation ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <nav aria-label="Mobile navigation">
          {navigation.map(([label, to], index) => (
            <NavLink key={to} to={to}>
              <span>0{index + 1}</span>
              {label}
              <ArrowRight aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
        <div className="mobile-navigation__note">
          <Coffee aria-hidden="true" />
          <p>From one jar to a full production brief, start with the format that fits.</p>
        </div>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__lead page-shell">
        <div>
          <p className="eyebrow eyebrow--light">Make the next cup clear</p>
          <h2>Retail ease. Bulk capability. One thoughtful coffee language.</h2>
        </div>
        <Link className="button button--cream" to="/shop">
          Explore the three formats <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="site-footer__grid page-shell">
        <div className="footer-brand">
          <img src="/coffendi-logo.png" alt="" width="112" height="112" />
          <p>
            A focused home for spray dried, agglomerated and freeze dried coffee—built for curious
            drinkers and serious buyers.
          </p>
        </div>
        <div>
          <h3>Products</h3>
          {products.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`}>{product.shortName}</Link>
          ))}
        </div>
        <div>
          <h3>Discover</h3>
          <Link to="/learn">How it is made</Link>
          <Link to="/sustainability">Sustainability</Link>
          <Link to="/bulk">Bulk & private label</Link>
          <Link to="/checkout">Checkout</Link>
        </div>
        <div>
          <h3>Policies</h3>
          <Link to="/shipping-returns">Shipping & returns</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
      <div className="site-footer__base page-shell">
        <span>© {new Date().getFullYear()} Coffendi</span>
        <span>Specifications, availability and delivery terms are confirmed before purchase.</span>
      </div>
    </footer>
  );
}

function CartDrawer({ open, items, onClose, onIncrement, onDecrement, onRemove, returnFocusRef }) {
  const closeButton = useRef(null);
  const wasOpen = useRef(false);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const priced = items.length > 0 && items.every(({ product }) => product.priceCents);
  const subtotal = items.reduce(
    (total, { product, quantity }) => total + (product.priceCents || 0) * quantity,
    0,
  );

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    if (open) {
      wasOpen.current = true;
      closeButton.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      requestAnimationFrame(() => returnFocusRef.current?.focus?.());
    }
    const handleKey = (event) => {
      if (event.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div className={`cart-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="cart-backdrop" type="button" onClick={onClose} tabIndex="-1" aria-hidden="true" />
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="cart-drawer__header">
          <div>
            <p className="eyebrow">Your selection</p>
            <h2 id="cart-title">Cart <span>{count}</span></h2>
          </div>
          <button ref={closeButton} className="icon-button" type="button" onClick={onClose} aria-label="Close cart">
            <X aria-hidden="true" />
          </button>
        </div>

        {items.length ? (
          <>
            <div className="cart-items">
              {items.map(({ product, quantity }) => (
                <article className="cart-item" key={product.id}>
                  <img src={product.image} alt="" width="96" height="96" />
                  <div className="cart-item__content">
                    <Link to={`/products/${product.id}`} onClick={onClose}>{product.name}</Link>
                    <span>{formatPrice(product.priceCents)}</span>
                    <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                      <button type="button" onClick={() => onDecrement(product.id)} aria-label={`Decrease ${product.name} quantity`}>
                        <Minus aria-hidden="true" />
                      </button>
                      <output aria-label="Quantity">{quantity}</output>
                      <button type="button" onClick={() => onIncrement(product.id)} aria-label={`Increase ${product.name} quantity`}>
                        <Plus aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <button className="remove-button" type="button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name} from cart`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
            <div className="cart-drawer__footer">
              <ul className="cart-checkpoints" aria-label="Reviewed before payment">
                <li><Check aria-hidden="true" /> Pack & availability</li>
                <li><Truck aria-hidden="true" /> Delivery & taxes</li>
                <li><ShieldCheck aria-hidden="true" /> Secure payment</li>
              </ul>
              <div className="cart-total">
                <span>{priced ? "Subtotal" : "Retail pricing"}</span>
                <strong>{priced ? formatPrice(subtotal) : "Confirmed securely at checkout"}</strong>
              </div>
              <p>Shipping, taxes and final availability are reviewed before payment.</p>
              <div className="cart-drawer__footer-actions">
                <Link className="button button--dark button--full" to="/checkout" onClick={onClose}>
                  Continue to checkout <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="button button--ghost button--full" to="/shop" onClick={onClose}>
                  Continue shopping
                </Link>
              </div>
              <Link className="text-link text-link--center" to="/bulk" onClick={onClose}>
                Need commercial quantities? Start a bulk brief
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-cart">
            <span><ShoppingBag aria-hidden="true" /></span>
            <h3>Your cart is ready for a first format.</h3>
            <p>Compare the three textures, then add the one that fits your cup.</p>
            <Link className="button button--dark" to="/shop" onClick={onClose}>Explore products</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, action }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {(copy || action) && (
        <div className="section-heading__aside">
          {copy && <p>{copy}</p>}
          {action}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd, cartQuantity = 0 }) {
  const Icon = processIcons[product.id];
  return (
    <article id={`format-${product.id}`} className={`product-card product-card--${product.tone} ${cartQuantity ? "is-in-cart" : ""}`}>
      <Link className="product-card__image" to={`/products/${product.id}`}>
        <img src={product.image} alt={product.alt} loading="lazy" width="680" height="680" />
        <span className="product-card__number">{product.number}</span>
        <span className="product-card__format"><Icon aria-hidden="true" /> {product.format}</span>
      </Link>
      <div className="product-card__content">
        <p>{product.descriptor}</p>
        <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
        <div className="product-card__status">
          <span className="product-card__price">{formatPrice(product.priceCents)}</span>
          {cartQuantity > 0 && <span className="product-card__cart-state"><Check aria-hidden="true" /> In cart · {cartQuantity}</span>}
        </div>
        <dl className="product-card__facts">
          <div><dt>Cup direction</dt><dd>{product.cupDirection}</dd></div>
          <div><dt>Choose it for</dt><dd>{product.decisionCue}</dd></div>
        </dl>
        <div className="product-card__actions">
          <button className="button button--dark" type="button" onClick={() => onAdd(product.id)} aria-label={cartQuantity ? `Add another ${product.name} to cart` : `Add to cart: ${product.name}`}>
            {cartQuantity ? "Add another" : "Add to cart"} <Plus aria-hidden="true" />
          </button>
          <Link className="circle-link" to={`/products/${product.id}`} aria-label={`Learn about ${product.name}`}>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function HomePage({ onAdd, cartQuantities }) {
  usePageMeta(
    "Coffendi — Instant coffee, clearly considered",
    "Discover spray dried, agglomerated and freeze dried instant coffee for individual purchase and bulk supply.",
  );

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "Coffendi",
              url: `${SITE_URL}/`,
              logo: `${SITE_URL}/coffendi-logo.png`,
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "Coffendi",
              url: `${SITE_URL}/`,
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
              "@type": "ItemList",
              name: "Coffendi instant coffee formats",
              itemListElement: products.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${SITE_URL}/products/${product.id}`,
                name: product.name,
              })),
            },
          ],
        }}
      />
      <section className="hero">
        <div className="hero__content page-shell">
          <div className="hero__copy">
            <p className="eyebrow">Instant coffee · reintroduced</p>
            <h1>Three ways to make a remarkable cup, <em>instantly.</em></h1>
            <p className="hero__lede">
              Fine powder, generous granules or aromatic crystals. Meet the format that fits your
              ritual—and the scale that fits your business.
            </p>
            <div className="hero__actions">
              <Link className="button button--dark" to="/shop">
                Shop the collection <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="button button--ghost" to="/bulk">Explore bulk supply</Link>
            </div>
            <div className="hero__proof" aria-label="Store highlights">
              <span><Check aria-hidden="true" /> Three distinct formats</span>
              <span><Check aria-hidden="true" /> Retail and bulk pathways</span>
              <span><Check aria-hidden="true" /> Secure hosted checkout</span>
            </div>
          </div>
          <div className="hero__visual">
            <img
              src="/images/instant-hero.webp"
              alt="Three distinct instant coffee textures beside a freshly prepared cup"
              fetchPriority="high"
              width="1694"
              height="953"
            />
            <div className="hero-note hero-note--top"><span>01</span> Fine powder</div>
            <div className="hero-note hero-note--middle"><span>02</span> Porous granules</div>
            <div className="hero-note hero-note--bottom"><span>03</span> Premium crystals</div>
          </div>
        </div>
        <div className="hero__marquee" aria-hidden="true">
          <span>SPRAY DRIED</span><i>✦</i><span>AGGLOMERATED</span><i>✦</i><span>FREEZE DRIED</span><i>✦</i><span>INSTANTLY COFFENDI</span>
        </div>
      </section>

      <section className="products-section page-shell">
        <SectionHeading
          eyebrow="The core collection"
          title="One coffee category. Three different experiences."
          copy="Choose by texture, cup direction and use case. Detailed commercial specifications remain tied to the confirmed product and batch."
          action={<Link className="text-link" to="/learn">Compare the processes <ArrowRight aria-hidden="true" /></Link>}
        />
        <div className="product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} cartQuantity={cartQuantities[product.id] || 0} />)}
        </div>
      </section>

      <section className="format-story">
        <div className="page-shell format-story__grid">
          <div className="format-story__intro">
            <p className="eyebrow eyebrow--light">The difference is in the drying</p>
            <h2>Same simple cup. A very different journey.</h2>
            <p>
              Soluble coffee begins as roasted coffee extract. The final drying method shapes the
              product’s texture, appearance, positioning and handling.
            </p>
            <Link className="button button--cream" to="/learn#how-it-is-made">See how it is made</Link>
          </div>
          <ol className="format-story__steps">
            {products.map((product) => {
              const Icon = processIcons[product.id];
              return (
                <li key={product.id}>
                  <div><Icon aria-hidden="true" /></div>
                  <span>{product.number}</span>
                  <h3>{product.shortName}</h3>
                  <p>{product.processLabel}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="bulk-feature page-shell">
        <div className="bulk-feature__visual">
          <img src="/images/instant-bulk-beans.webp" alt="Coffee beans in a natural fibre sack" loading="lazy" width="900" height="640" />
          <span className="bulk-feature__stamp"><Box aria-hidden="true" /> Built for scale</span>
        </div>
        <div className="bulk-feature__content">
          <p className="eyebrow">Bulk & business</p>
          <h2>From a product idea to a commercially useful brief.</h2>
          <p>
            Tell us the format, cup direction, expected volume, destination and packaging route.
            We will keep the conversation grounded in what can actually be confirmed.
          </p>
          <ul className="check-list">
            <li><Check aria-hidden="true" /> Commercial-volume requests</li>
            <li><Check aria-hidden="true" /> Packaging and private-label planning</li>
            <li><Check aria-hidden="true" /> Specification-led product matching</li>
            <li><Check aria-hidden="true" /> Destination and logistics context</li>
          </ul>
          <Link className="button button--dark" to="/bulk">Build a bulk brief <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="learning-section page-shell">
        <SectionHeading
          eyebrow="Coffee, unpacked"
          title="Understand the product behind the convenience."
          copy="Clear language for curious drinkers, product teams and commercial buyers."
        />
        <div className="learning-grid">
          {learningCards.map((card, index) => (
            <Link key={card.title} className="learning-card" to={card.to}>
              <span>0{index + 1}</span>
              <p>{card.label}</p>
              <h3>{card.title}</h3>
              <small>{card.copy}</small>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="sustainability-teaser">
        <div className="page-shell sustainability-teaser__grid">
          <div>
            <p className="eyebrow">A framework before a claim</p>
            <h2>Better coffee begins with measurable questions.</h2>
          </div>
          <div>
            <p>
              Energy, water, responsible sourcing and packaging all matter in soluble coffee. Our
              sustainability page separates the standards we expect from the achievements that
              still need verified evidence.
            </p>
            <Link className="text-link" to="/sustainability">Explore the framework <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="faq-section page-shell">
        <SectionHeading eyebrow="Good questions" title="Before your first spoonful—or first pallet." />
        <div className="faq-grid">
          <details>
            <summary>What makes instant coffee soluble?<Plus aria-hidden="true" /></summary>
            <p>The brewed coffee solids have already been extracted and dried. Adding water rehydrates those soluble solids into a prepared cup.</p>
          </details>
          <details>
            <summary>Which format is the most premium?<Plus aria-hidden="true" /></summary>
            <p>Freeze dried is commonly positioned at the premium end, but the right format depends on the desired cup, presentation, application and budget.</p>
          </details>
          <details>
            <summary>Can I buy for a business?<Plus aria-hidden="true" /></summary>
            <p>Yes. The bulk brief captures format, volume, destination, packaging and product direction so the commercial conversation starts with useful context.</p>
          </details>
          <details>
            <summary>Are prices and certifications confirmed?<Plus aria-hidden="true" /></summary>
            <p>Only configured retail prices and documentation tied to a confirmed product should be treated as final. We do not apply unsupported certification or sustainability claims.</p>
          </details>
        </div>
      </section>
    </>
  );
}

function ShopPage({ onAdd, cartQuantities }) {
  usePageMeta(
    "Shop instant coffee — Coffendi",
    "Compare and shop Coffendi spray dried, agglomerated and freeze dried instant coffee.",
  );
  return (
    <>
      <PageHero
        eyebrow="The instant collection"
        title="Choose your texture. Shape your cup."
        copy="Compare texture, cup direction and use case in one clear view. Final retail prices appear when the live merchant catalog is connected."
        marker="03 formats"
      />
      <section className="shop-intro page-shell">
        <div className="shop-intro__note"><Sparkles aria-hidden="true" /><span>Every format starts with brewed coffee extract. The drying route makes the visible difference.</span></div>
        <nav className="format-switcher" aria-label="Choose an instant coffee format">
          {products.map((product) => {
            const Icon = processIcons[product.id];
            return <a key={product.id} href={`#format-${product.id}`}><Icon aria-hidden="true" /><span><small>{product.format}</small><strong>{product.shortName}</strong></span><ArrowRight aria-hidden="true" /></a>;
          })}
        </nav>
        <div className="product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} cartQuantity={cartQuantities[product.id] || 0} />)}
        </div>
      </section>
      <section className="shop-service page-shell">
        <div><Truck aria-hidden="true" /><h3>Delivery clarity</h3><p>Available regions, timing, duties and shipping cost are confirmed before payment.</p></div>
        <div><ShieldCheck aria-hidden="true" /><h3>Secure payment boundary</h3><p>Payment details are handled on the configured hosted checkout—not stored in this application.</p></div>
        <div><PackageCheck aria-hidden="true" /><h3>Product confirmation</h3><p>Final pack, specification and availability remain visible before the order is placed.</p></div>
      </section>
    </>
  );
}

function ProductPage({ onAdd, cartQuantities }) {
  const { productId } = useParams();
  const product = getProduct(productId);
  const cartQuantity = cartQuantities[productId] || 0;
  const purchaseActionRef = useRef(null);
  const [showMobileBuy, setShowMobileBuy] = useState(false);
  usePageMeta(
    product ? `${product.name} — Coffendi` : "Instant coffee — Coffendi",
    product
      ? `${product.intro} Explore the process, texture, uses and retail or bulk buying paths.`
      : "Explore Coffendi instant coffee.",
    product ? { type: "product", image: product.image } : {},
  );

  useEffect(() => {
    const purchaseAction = purchaseActionRef.current;
    if (!purchaseAction || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileBuy(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { rootMargin: "-84px 0px 0px", threshold: 0.1 });
    observer.observe(purchaseAction);
    return () => observer.disconnect();
  }, [productId]);

  if (!product) return <Navigate to="/shop" replace />;
  const Icon = processIcons[product.id];

  const productSchema = {
    "@type": "Product",
    "@id": `${SITE_URL}/products/${product.id}#product`,
    name: product.name,
    sku: `COFFENDI-${product.id.toUpperCase()}`,
    category: "Instant coffee",
    image: `${SITE_URL}${product.image}`,
    description: product.intro,
    brand: { "@type": "Brand", name: "Coffendi" },
    ...(product.priceCents
      ? {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/products/${product.id}`,
            priceCurrency: storeCurrency,
            price: (product.priceCents / 100).toFixed(2),
          },
        }
      : {}),
  };

  return (
    <div className="product-page">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            productSchema,
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Shop", item: `${SITE_URL}/shop` },
                { "@type": "ListItem", position: 2, name: product.name, item: `${SITE_URL}/products/${product.id}` },
              ],
            },
          ],
        }}
      />
      <section className={`product-detail product-detail--${product.tone}`}>
        <div className="page-shell product-detail__grid">
          <div className="product-detail__media">
            <img src={product.image} alt={product.alt} fetchPriority="high" width="1254" height="1254" />
            <span className="product-detail__index">{product.number}</span>
          </div>
          <div className="product-detail__content">
            <div className="breadcrumbs"><Link to="/shop">Shop</Link><ChevronRight aria-hidden="true" />{product.shortName}</div>
            <p className="eyebrow">{product.descriptor}</p>
            <h1>{product.name}</h1>
            <p className="product-detail__lede">{product.intro}</p>
            <div className="product-price">
              <strong>{formatPrice(product.priceCents)}</strong>
              <span>Consumer pack · final size and availability shown at checkout</span>
            </div>
            <button ref={purchaseActionRef} className="button button--dark button--large" type="button" onClick={() => onAdd(product.id)}>
              {cartQuantity ? "Add another" : "Add to cart"} <ShoppingBag aria-hidden="true" />
            </button>
            {cartQuantity > 0 && <p className="product-in-cart" aria-live="polite"><Check aria-hidden="true" /> {cartQuantity} {cartQuantity === 1 ? "pack" : "packs"} currently in your cart</p>}
            <Link className="text-link" to={`/bulk?product=${product.id}`}>Need this in bulk? Build a commercial brief <ArrowRight aria-hidden="true" /></Link>
            <ul className="purchase-notes" aria-label="Purchase information">
              <li><PackageCheck aria-hidden="true" /> Pack and availability reviewed before payment</li>
              <li><ShieldCheck aria-hidden="true" /> Secure hosted payment boundary</li>
            </ul>
            <dl className="product-facts">
              <div><dt>Format</dt><dd>{product.format}</dd></div>
              <div><dt>Cup direction</dt><dd>{product.cupDirection}</dd></div>
              <div><dt>Choose it for</dt><dd>{product.decisionCue}</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <section className="product-explainer page-shell">
        <div>
          <p className="eyebrow">How it takes shape</p>
          <h2>Designed by the final drying step.</h2>
        </div>
        <div className="product-explainer__story">
          <span><Icon aria-hidden="true" /></span>
          <p>{product.story}</p>
          <div><strong>Well suited to</strong><p>{product.idealFor}</p></div>
        </div>
      </section>
      <section className="preparation-section">
        <div className="page-shell">
          <SectionHeading eyebrow="Make it yours" title="A simple cup, with room to adjust." copy="The confirmed pack remains the final source for dose and preparation instructions." />
          <ol className="preparation-grid">
            <li><span>01</span><Coffee aria-hidden="true" /><h3>Start with the pack</h3><p>Use the dose and serving size supplied with the confirmed retail product.</p></li>
            <li><span>02</span><Droplets aria-hidden="true" /><h3>Add fresh water</h3><p>Use fresh hot water below a rolling boil and add it gradually for easier strength control.</p></li>
            <li><span>03</span><Sparkles aria-hidden="true" /><h3>Stir, taste, refine</h3><p>Stir until dissolved, then adjust water, milk or ice to suit the cup you want.</p></li>
          </ol>
        </div>
      </section>
      <section className="next-products page-shell">
        <SectionHeading eyebrow="Keep comparing" title="The other forms in the collection." />
        <div className="next-products__grid">
          {products.filter((item) => item.id !== product.id).map((item) => (
            <Link key={item.id} to={`/products/${item.id}`}>
              <img src={item.image} alt="" loading="lazy" />
              <div className="next-products__content"><span>{item.number}</span><h3>{item.name}</h3><p>{item.format}</p><small>{item.cupDirection}</small></div>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <div className={`mobile-buy-bar ${showMobileBuy ? "is-visible" : ""}`} aria-label={`Buy ${product.name}`} aria-hidden={!showMobileBuy}>
        <span><strong>{product.shortName}</strong><small>{cartQuantity ? `${cartQuantity} in cart` : formatPrice(product.priceCents)}</small></span>
        <button className="button button--cream" type="button" onClick={() => onAdd(product.id)}>
          {cartQuantity ? "Add another" : "Add to cart"} <ShoppingBag aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function PageHero({ eyebrow, title, copy, marker, children }) {
  return (
    <section className="page-hero">
      <div className="page-shell page-hero__grid">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
        <div><span>{marker}</span><p>{copy}</p>{children}</div>
      </div>
    </section>
  );
}

function LearnPage() {
  usePageMeta(
    "How instant coffee is made — Coffendi",
    "Understand extraction, spray drying, agglomeration and freeze drying in clear, practical language.",
  );
  return (
    <>
      <PageHero
        eyebrow="Coffee knowledge"
        title="Convenient to make. Fascinating to understand."
        copy="A clear introduction to how roasted coffee becomes a soluble powder, granule or crystal."
        marker="Learn"
      />
      <nav className="section-index page-shell" aria-label="On this page">
        <span>Explore this guide</span>
        <a href="#how-it-is-made">How it is made <ArrowRight aria-hidden="true" /></a>
        <a href="#compare-formats">Compare formats <ArrowRight aria-hidden="true" /></a>
      </nav>
      <section id="how-it-is-made" className="making-process page-shell">
        <SectionHeading eyebrow="From bean to soluble" title="Four stages before the kettle." />
        <ol>
          <li><span>01</span><div><Coffee aria-hidden="true" /><h3>Select & roast</h3><p>The coffee and roast direction establish the sensory foundation before extraction begins.</p></div></li>
          <li><span>02</span><div><Droplets aria-hidden="true" /><h3>Extract</h3><p>Roasted coffee is brewed at production scale to capture its soluble coffee solids.</p></div></li>
          <li><span>03</span><div><Factory aria-hidden="true" /><h3>Concentrate</h3><p>Part of the water is removed so the extract is ready for an efficient final drying step.</p></div></li>
          <li><span>04</span><div><Wind aria-hidden="true" /><h3>Choose the drying route</h3><p>Spray drying, agglomeration or freeze drying creates the format you recognise in the cup.</p></div></li>
        </ol>
      </section>
      <section id="compare-formats" className="comparison-section">
        <div className="page-shell">
          <SectionHeading eyebrow="Compare the formats" title="A quick view of what changes." />
          <div className="comparison-table" role="region" aria-label="Instant coffee format comparison" tabIndex="0">
            <div className="comparison-row comparison-row--header"><span>Format</span><span>Appearance</span><span>Process cue</span><span>Typical positioning</span></div>
            {products.map((product) => (
              <div className="comparison-row" key={product.id}>
                <strong>{product.shortName}</strong><span>{product.format}</span><span>{product.processLabel}</span><span>{product.profile}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="making-notes page-shell">
        <div><h2>For the best cup</h2><p>Use fresh water below a rolling boil, then follow the dose on the confirmed product pack or specification. Strength is easier to adjust when you add water gradually.</p></div>
        <div><h2>For product teams</h2><p>A useful brief goes beyond the drying format. Define the target cup, application, pack, consumer, destination and expected volume.</p></div>
      </section>
    </>
  );
}

function SustainabilityPage() {
  usePageMeta(
    "Sustainability framework — Coffendi",
    "Explore Coffendi's evidence-led sustainability framework for energy, water, supply chains and packaging.",
  );
  return (
    <>
      <section className="sustainability-hero">
        <div className="page-shell sustainability-hero__grid">
          <div className="sustainability-hero__copy">
            <p className="eyebrow eyebrow--light">Sustainability</p>
            <h1>Progress should be specific enough to measure.</h1>
            <a className="button button--cream" href="#sustainability-framework">See the framework <ArrowRight aria-hidden="true" /></a>
          </div>
          <div className="sustainability-hero__orb"><Leaf aria-hidden="true" /><span>Evidence before claims</span></div>
        </div>
      </section>
      <section id="sustainability-framework" className="sustainability-intro page-shell">
        <p className="eyebrow">Our approach</p>
        <div>
          <h2>A framework for the questions that matter most in soluble coffee.</h2>
          <p>
            Coffee cultivation is exposed to climate pressure, while soluble processing makes energy,
            water and packaging material topics. Coffendi will publish achievements only when the
            scope, baseline, period and evidence are clear.
          </p>
        </div>
      </section>
      <section className="pillar-grid page-shell">
        {sustainabilityPillars.map((pillar, index) => {
          const icons = [Factory, Droplets, ShieldCheck, PackageCheck];
          const Icon = icons[index];
          return <article key={pillar.id}><span><Icon aria-hidden="true" /></span><small>0{index + 1}</small><h3>{pillar.title}</h3><p>{pillar.copy}</p></article>;
        })}
      </section>
      <section className="evidence-section">
        <div className="page-shell evidence-section__grid">
          <div><p className="eyebrow eyebrow--light">The evidence standard</p><h2>What a credible claim should include.</h2></div>
          <ul>
            <li><span>01</span><div><strong>A defined boundary</strong><p>Which product, facility, supplier group or pack is covered?</p></div></li>
            <li><span>02</span><div><strong>A meaningful baseline</strong><p>What period or operating condition is the comparison measured against?</p></div></li>
            <li><span>03</span><div><strong>A current result</strong><p>When was it measured, and is the result absolute or intensity-based?</p></div></li>
            <li><span>04</span><div><strong>Verifiable support</strong><p>Which report, audit, certificate or data owner can substantiate it?</p></div></li>
          </ul>
        </div>
      </section>
      <section className="sustainability-cta page-shell"><div><Leaf aria-hidden="true" /><h2>Have product-specific sustainability requirements?</h2><p>Put them into the commercial brief so sourcing and documentation can be assessed together.</p></div><Link className="button button--dark" to="/bulk">Start a responsible brief</Link></section>
    </>
  );
}

function BulkInquiryForm() {
  const location = useLocation();
  const initialProduct = new URLSearchParams(location.search).get("product") || "";
  const [form, setForm] = useState({
    product: initialProduct,
    volume: "",
    packaging: "",
    name: "",
    company: "",
    email: "",
    country: "",
    message: "",
    consent: false,
    website: "",
  });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const update = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "loading", message: "Sending your brief…" });
    const productName = getProduct(form.product)?.name || "Open to recommendation";
    const brief = [
      `Instant coffee format: ${productName}`,
      `Indicative volume: ${form.volume || "Not confirmed"}`,
      `Packaging route: ${form.packaging || "Not confirmed"}`,
    ].join("\n");
    try {
      const result = await submitRequest("/api/inquiries", {
        name: form.name,
        company: form.company,
        email: form.email,
        country: form.country,
        volume: form.volume,
        audience: "partner",
        message: form.message || "Please contact me to develop this instant coffee bulk brief.",
        brief,
        source: "instant-coffee-bulk-page",
        consent: form.consent,
        website: form.website,
      });
      setStatus({ state: "success", message: `Brief received. Your reference is ${result.reference}.` });
      setForm((current) => ({ ...current, volume: "", packaging: "", message: "", consent: false, website: "" }));
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  };

  return (
    <form className="bulk-form" onSubmit={handleSubmit}>
      <div className="form-heading"><span>Commercial brief</span><h2>Tell us what the product needs to do.</h2><p>No unsupported price, lead-time or certification promise will be attached to your request.</p></div>
      <div className="bulk-form__body">
        <fieldset className="form-group">
          <legend><span>01</span>Product & route</legend>
          <div className="form-grid">
            <label><span>Format</span><select name="product" value={form.product} onChange={update}><option value="">Recommend a format</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label><span>Indicative volume</span><select name="volume" value={form.volume} onChange={update}><option value="">Select a range</option><option>Under 500 kg</option><option>500 kg–2 tonnes</option><option>2–10 tonnes</option><option>10+ tonnes</option><option>Still planning</option></select></label>
            <label><span>Packaging route</span><select name="packaging" value={form.packaging} onChange={update}><option value="">Select a route</option><option>Bulk carton</option><option>Industrial sack / super sack</option><option>Retail or private label</option><option>Food service</option><option>Open to recommendation</option></select></label>
            <label><span>Destination country</span><input name="country" value={form.country} onChange={update} autoComplete="country-name" required /></label>
          </div>
        </fieldset>
        <fieldset className="form-group">
          <legend><span>02</span>Your details</legend>
          <div className="form-grid">
            <label><span>Name</span><input name="name" value={form.name} onChange={update} autoComplete="name" required /></label>
            <label><span>Company</span><input name="company" value={form.company} onChange={update} autoComplete="organization" required /></label>
            <label className="form-grid__wide"><span>Work email</span><input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label>
          </div>
        </fieldset>
        <fieldset className="form-group">
          <legend><span>03</span>Product direction</legend>
          <div className="form-grid">
            <label className="form-grid__wide"><span>Target cup, application or other requirements</span><textarea name="message" value={form.message} onChange={update} rows="5" placeholder="For example: a smooth milk-friendly profile for 200 g retail jars, destined for…" /></label>
            <label className="consent-field form-grid__wide"><input type="checkbox" name="consent" checked={form.consent} onChange={update} required /><span>I agree that Coffendi may use this information to respond to my commercial request, as described in the <Link to="/privacy">privacy notice</Link>.</span></label>
            <label className="bot-field" aria-hidden="true"><span>Website</span><input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" /></label>
          </div>
        </fieldset>
        <div className="form-submit"><button className="button button--cream button--large" type="submit" disabled={status.state === "loading"}>{status.state === "loading" ? "Sending…" : "Send bulk brief"}<ArrowRight aria-hidden="true" /></button><p aria-live="polite" className={`form-status form-status--${status.state}`}>{status.message}</p></div>
      </div>
    </form>
  );
}

function BulkPage() {
  usePageMeta(
    "Bulk instant coffee — Coffendi",
    "Build a bulk brief for spray dried, agglomerated or freeze dried instant coffee, including volume, packaging and destination.",
  );
  return (
    <>
      <section className="bulk-hero">
        <div className="page-shell bulk-hero__grid">
          <div><p className="eyebrow eyebrow--light">Bulk & business</p><h1>Scale starts with a better brief.</h1><p>For distributors, food-service teams, manufacturers and private-label planners.</p><a className="button button--cream" href="#bulk-brief">Start your brief <ArrowRight aria-hidden="true" /></a></div>
          <div className="bulk-hero__facts"><div><Box aria-hidden="true" /><strong>3</strong><span>core formats</span></div><div><PackageCheck aria-hidden="true" /><strong>4</strong><span>packaging pathways</span></div><div><Truck aria-hidden="true" /><strong>1</strong><span>destination-led plan</span></div></div>
        </div>
      </section>
      <section className="bulk-route page-shell">
        <SectionHeading eyebrow="Choose the route" title="Product first. Then pack, volume and destination." />
        <div className="bulk-route__grid">
          <article><span>01</span><Factory aria-hidden="true" /><h3>Bulk ingredient</h3><p>For manufacturers, distributors and large-scale preparation where specification and logistics lead.</p></article>
          <article><span>02</span><PackageCheck aria-hidden="true" /><h3>Private-label planning</h3><p>For retail concepts that need format, pack and target consumer considered together.</p></article>
          <article><span>03</span><Coffee aria-hidden="true" /><h3>Food service</h3><p>For hospitality, office and vending applications with repeatable preparation needs.</p></article>
        </div>
      </section>
      <section id="bulk-brief" className="bulk-form-section"><div className="page-shell"><BulkInquiryForm /></div></section>
    </>
  );
}

function CheckoutPage({ items, onIncrement, onDecrement, onRemove }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  usePageMeta(
    "Checkout — Coffendi",
    "Review your Coffendi instant coffee selection and continue to secure checkout.",
    { robots: "noindex,nofollow" },
  );

  const startCheckout = async () => {
    setStatus({ state: "loading", message: "Opening secure checkout…" });
    try {
      const result = await submitRequest("/api/checkout", {
        items: items.map(({ product, quantity }) => ({ id: product.id, quantity })),
      });
      if (!result.url) throw new Error("The checkout service did not return a secure payment link.");
      window.location.assign(result.url);
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  };

  if (!items.length) {
    return <section className="checkout-empty page-shell"><ShoppingBag aria-hidden="true" /><p className="eyebrow">Checkout</p><h1>Your cart is empty.</h1><p>Start with one of the three instant-coffee formats.</p><Link className="button button--dark" to="/shop">Explore products</Link></section>;
  }

  const priced = items.every(({ product }) => product.priceCents);
  const subtotal = items.reduce((total, { product, quantity }) => total + (product.priceCents || 0) * quantity, 0);
  return (
    <section className="checkout-page page-shell">
      <div className="checkout-page__heading"><p className="eyebrow">Secure checkout</p><h1>Review your instant-coffee selection.</h1><p>Final live pricing, delivery, taxes and availability are presented before payment.</p></div>
      <ol className="checkout-steps" aria-label="Checkout progress"><li className="is-active"><span>1</span>Review</li><li><span>2</span>Delivery</li><li><span>3</span>Payment</li></ol>
      <div className="checkout-layout">
        <div className="checkout-items">
          {items.map(({ product, quantity }) => (
            <article key={product.id}><img src={product.image} alt="" /><div><Link to={`/products/${product.id}`}>{product.name}</Link><span>{formatPrice(product.priceCents)}</span><div className="quantity-control"><button type="button" onClick={() => onDecrement(product.id)} aria-label={`Decrease ${product.name} quantity`}><Minus aria-hidden="true" /></button><output aria-label="Quantity">{quantity}</output><button type="button" onClick={() => onIncrement(product.id)} aria-label={`Increase ${product.name} quantity`}><Plus aria-hidden="true" /></button></div></div><button className="remove-button" type="button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name}`}><Trash2 aria-hidden="true" /></button></article>
          ))}
        </div>
        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <div><span>{priced ? "Subtotal" : "Product pricing"}</span><strong>{priced ? formatPrice(subtotal) : "Shown in hosted checkout"}</strong></div>
          <div><span>Shipping & taxes</span><strong>Confirmed before payment</strong></div>
          <p className="checkout-summary__policies">By continuing, you can review the final payment, shipping and contact details under our <Link to="/terms">terms</Link>, <Link to="/shipping-returns">shipping & returns framework</Link> and <Link to="/privacy">privacy notice</Link>.</p>
          <button className="button button--dark button--full button--large" type="button" onClick={startCheckout} disabled={status.state === "loading"}>{status.state === "loading" ? "Opening checkout…" : "Continue to secure payment"}<ArrowRight aria-hidden="true" /></button>
          <p className="checkout-summary__secure"><ShieldCheck aria-hidden="true" /> Payment card details are collected by the configured hosted payment provider.</p>
          <p className={`form-status form-status--${status.state}`} aria-live="polite">{status.message}</p>
          <Link className="text-link text-link--center" to="/bulk">Buying for a business? Request bulk terms</Link>
        </aside>
      </div>
    </section>
  );
}

function CheckoutSuccessPage({ onClearCart }) {
  const location = useLocation();
  const [verification, setVerification] = useState({ state: "loading", message: "Verifying your payment…", reference: "" });
  usePageMeta(
    "Order received — Coffendi",
    "Your Coffendi checkout has been completed.",
    { robots: "noindex,nofollow" },
  );
  useEffect(() => {
    const sessionId = new URLSearchParams(location.search).get("session_id");
    if (!sessionId) {
      setVerification({ state: "error", message: "No checkout reference was provided.", reference: "" });
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.paid) throw new Error(result.message || "Payment has not been confirmed yet.");
        if (active) {
          onClearCart();
          setVerification({ state: "success", message: "Payment confirmed.", reference: result.reference });
        }
      })
      .catch((error) => {
        const message = error.name === "AbortError"
          ? "Payment verification timed out. Your cart has not been cleared; please try again."
          : error.message;
        if (active) setVerification({ state: "error", message, reference: sessionId });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [location.search, onClearCart]);

  const confirmed = verification.state === "success";
  return <section className="checkout-empty checkout-success page-shell"><span className={`success-mark ${confirmed ? "" : "success-mark--pending"}`}>{confirmed ? <Check aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</span><p className="eyebrow">{confirmed ? "Order received" : "Checkout verification"}</p><h1>{confirmed ? "Thank you. Your coffee is in motion." : "We are checking your payment."}</h1><p>{verification.message}{verification.reference ? ` Reference: ${verification.reference}.` : ""}</p><Link className="button button--dark" to={confirmed ? "/" : "/checkout"}>{confirmed ? "Return home" : "Return to checkout"}</Link></section>;
}

const policyPages = {
  privacy: {
    eyebrow: "Privacy framework",
    title: "A clear account of how customer information is handled.",
    description: "Coffendi's pre-launch privacy framework for retail customers and commercial inquiries.",
    intro: "This framework identifies the actual data flows in the storefront and the decisions the merchant must complete before launch. It is intentionally not presented as a final legal notice.",
    sections: [
      {
        title: "Information used by the storefront",
        copy: "The retail cart is stored in the visitor's browser. A bulk brief may include name, company, work email, destination, volume, packaging direction and product requirements. The inquiry endpoint rejects incomplete consent and stores accepted records in private application storage.",
      },
      {
        title: "Payment information",
        copy: "When commerce is activated, card details are collected by Stripe's hosted checkout. This application receives the resulting Checkout Session and fulfillment details; it does not collect raw card numbers.",
      },
      {
        title: "Decisions still requiring merchant approval",
        copy: "The business identity and contact, legal bases, retention periods, international transfers, cookie or analytics use, customer rights process, subprocessors and jurisdiction-specific disclosures must be completed and reviewed for the markets served.",
      },
    ],
  },
  terms: {
    eyebrow: "Terms framework",
    title: "The commercial rules should be as clear as the product.",
    description: "Coffendi's pre-launch terms framework for the instant coffee storefront.",
    intro: "Checkout is technically gated until the merchant confirms the legal and operational terms. The final document must match the selling entity, product catalog and countries actually served.",
    sections: [
      {
        title: "Order formation",
        copy: "The final terms must define when an order is accepted, how pricing errors or unavailable stock are handled, which payment methods are supported and when the customer receives confirmation.",
      },
      {
        title: "Product and customer responsibilities",
        copy: "Pack size, ingredient and allergen information, preparation guidance, storage, age or business eligibility where relevant, and the customer's responsibility for accurate delivery information must reflect the confirmed products.",
      },
      {
        title: "Legal decisions still requiring approval",
        copy: "The merchant must confirm cancellation rights, liability boundaries, dispute handling, governing law, business identity, contact information and any market-specific consumer protections before commerce is enabled.",
      },
    ],
  },
  shipping: {
    eyebrow: "Delivery framework",
    title: "Shipping and returns need operational answers, not generic promises.",
    description: "Coffendi's pre-launch shipping and returns framework for retail instant coffee orders.",
    intro: "The checkout endpoint will not accept payment until the merchant explicitly configures shipping as included in product pricing or attaches approved Stripe shipping rates.",
    sections: [
      {
        title: "Delivery at checkout",
        copy: "Allowed destination countries, available shipping choices, the delivery address and applicable tax settings are determined by the live commerce configuration and shown before payment. No shipping rate is assumed by the application.",
      },
      {
        title: "Returns and damaged orders",
        copy: "The final policy must set the return window, product-condition rules, food-safety exceptions, return-cost responsibility and a documented route for damaged, missing or incorrect orders.",
      },
      {
        title: "Decisions still requiring merchant approval",
        copy: "Dispatch locations, delivery estimates, carriers, duties, remote-area limits, customs responsibilities, refund timing and customer-support contact details must be confirmed for every served region.",
      },
    ],
  },
};

function PolicyPage({ policyKey }) {
  const policy = policyPages[policyKey];
  usePageMeta(`${policy.eyebrow} — Coffendi`, policy.description, { robots: "noindex,follow" });

  return (
    <>
      <PageHero
        eyebrow={policy.eyebrow}
        title={policy.title}
        copy={policy.description}
        marker="Pre-launch"
      />
      <section className="policy-page page-shell">
        <aside className="policy-status">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Merchant review required</strong><p>This framework is not legal advice and must be completed before live payment is enabled.</p></div>
        </aside>
        <div className="policy-page__content">
          <p className="policy-page__intro">{policy.intro}</p>
          {policy.sections.map((section, index) => (
            <section key={section.title}>
              <span>0{index + 1}</span>
              <div><h2>{section.title}</h2><p>{section.copy}</p></div>
            </section>
          ))}
          <div className="policy-next-step">
            <strong>Launch control</strong>
            <p>Keep <code>COMMERCE_LEGAL_READY</code> disabled until the final policy text, merchant details and operational workflow have been approved.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function NotFoundPage() {
  usePageMeta("Page not found — Coffendi", "The requested Coffendi page could not be found.", { robots: "noindex,nofollow" });
  return <section className="checkout-empty page-shell"><Coffee aria-hidden="true" /><p className="eyebrow">404</p><h1>This cup has moved.</h1><p>Return to the collection and choose a fresh route.</p><Link className="button button--dark" to="/">Back to Coffendi</Link></section>;
}

function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const quantities = new Map();
  value.forEach((item) => {
    const quantity = Number(item?.quantity);
    if (!getProduct(item?.id) || !Number.isInteger(quantity) || quantity < 1) return;
    quantities.set(item.id, Math.min(20, (quantities.get(item.id) || 0) + quantity));
  });
  return [...quantities].map(([id, quantity]) => ({ id, quantity }));
}

export default function App() {
  const [cart, setCart] = usePersistentState("coffendi-instant-cart", []);
  const [cartOpen, setCartOpen] = useState(false);
  const cartReturnFocus = useRef(null);
  const normalizedCart = useMemo(() => normalizeCart(cart), [cart]);
  const cartItems = useMemo(
    () => normalizedCart.map((item) => ({ ...item, product: getProduct(item.id) })),
    [normalizedCart],
  );
  const cartCount = normalizedCart.reduce((total, item) => total + item.quantity, 0);
  const cartQuantities = useMemo(
    () => Object.fromEntries(normalizedCart.map((item) => [item.id, item.quantity])),
    [normalizedCart],
  );

  useEffect(() => {
    if (JSON.stringify(cart) !== JSON.stringify(normalizedCart)) setCart(normalizedCart);
  }, [cart, normalizedCart, setCart]);

  const addToCart = useCallback((id) => {
    cartReturnFocus.current = document.activeElement;
    setCart((current) => {
      const safeCart = normalizeCart(current);
      const existing = safeCart.find((item) => item.id === id);
      if (existing) return safeCart.map((item) => item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item);
      return [...safeCart, { id, quantity: 1 }];
    });
    setCartOpen(true);
  }, [setCart]);
  const increment = useCallback((id) => setCart((current) => normalizeCart(current).map((item) => item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item)), [setCart]);
  const decrement = useCallback((id) => setCart((current) => normalizeCart(current).flatMap((item) => item.id !== id ? [item] : item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : [])), [setCart]);
  const remove = useCallback((id) => setCart((current) => normalizeCart(current).filter((item) => item.id !== id)), [setCart]);
  const clearCart = useCallback(() => setCart([]), [setCart]);
  const openCart = useCallback(() => {
    cartReturnFocus.current = document.activeElement;
    setCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <div className="app-shell">
      <ScrollManager />
      <div className="site-frame" inert={cartOpen} aria-hidden={cartOpen ? "true" : undefined}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <AnnouncementBar />
        <Header cartCount={cartCount} onOpenCart={openCart} />
        <main id="main-content" tabIndex="-1">
          <Routes>
            <Route path="/" element={<HomePage onAdd={addToCart} cartQuantities={cartQuantities} />} />
            <Route path="/shop" element={<ShopPage onAdd={addToCart} cartQuantities={cartQuantities} />} />
            <Route path="/products/:productId" element={<ProductPage onAdd={addToCart} cartQuantities={cartQuantities} />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/sustainability" element={<SustainabilityPage />} />
            <Route path="/bulk" element={<BulkPage />} />
            <Route path="/checkout" element={<CheckoutPage items={cartItems} onIncrement={increment} onDecrement={decrement} onRemove={remove} />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage onClearCart={clearCart} />} />
            <Route path="/privacy" element={<PolicyPage policyKey="privacy" />} />
            <Route path="/terms" element={<PolicyPage policyKey="terms" />} />
            <Route path="/shipping-returns" element={<PolicyPage policyKey="shipping" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <CartDrawer open={cartOpen} items={cartItems} onClose={closeCart} onIncrement={increment} onDecrement={decrement} onRemove={remove} returnFocusRef={cartReturnFocus} />
    </div>
  );
}
