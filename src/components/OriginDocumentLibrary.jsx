import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import "../origin-documents.css";

const local = (value, language) =>
  typeof value === "object" && value !== null ? value[language] : value;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const previewStatusStyle = {
  position: "absolute",
  zIndex: 2,
  top: "50%",
  left: "50%",
  width: "min(310px, calc(100% - 40px))",
  padding: 16,
  borderRadius: 12,
  background: "rgba(18,55,45,.94)",
  color: "rgba(255,255,255,.82)",
  textAlign: "center",
  transform: "translate(-50%,-50%)",
  pointerEvents: "none",
};

const readerPlaceholderStyle = {
  width: "min(100%,480px)",
  aspectRatio: "2 / 3",
  display: "block",
  background: "linear-gradient(145deg,#eee6d8,#d8cdbb)",
};

const thumbnailPlaceholderStyle = {
  width: "100%",
  aspectRatio: "2 / 3",
  display: "block",
  background: "rgba(255,255,255,.12)",
};

function CountryPageReader({
  sheets,
  country,
  language,
  onOpen,
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const reader = useRef(null);
  const swipeStart = useRef(null);
  const suppressClick = useRef(false);
  const activeSheet = sheets[pageIndex] || sheets[0];
  const pageCount = sheets.length;
  const countryName = local(country, language);
  const copy = language === "tr"
    ? {
      eyebrow: "Ülkeye özel PDF okuyucu",
      title: `${countryName} kaynak sayfaları`,
      verified: `Bu ${pageCount} sayfanın tamamı yalnızca ${countryName} menşeine aittir.`,
      page: "Sayfa",
      previous: "Önceki sayfa",
      next: "Sonraki sayfa",
      enlarge: "Büyüt ve tam ekranda incele",
      open: "PDF'yi aç",
      download: "Bu sayfayı indir",
      swipe: "Sayfalar arasında geçmek için kaydırın veya okları kullanın.",
      pages: "Kaynak sayfalar",
      select: "Sayfayı seç",
    }
    : {
      eyebrow: "Country PDF reader",
      title: `${countryName} source pages`,
      verified: `All ${pageCount} pages in this reader belong only to ${countryName}.`,
      page: "Page",
      previous: "Previous page",
      next: "Next page",
      enlarge: "Enlarge and review fullscreen",
      open: "Open PDF",
      download: "Download this page",
      swipe: "Swipe the page or use the arrows to move through the country file.",
      pages: "Source pages",
      select: "Select page",
    };

  useEffect(() => {
    setPageIndex(0);
    setMediaReady(false);
  }, [sheets[0]?.id]);

  useEffect(() => {
    const element = reader.current;
    if (!element || mediaReady) return undefined;
    if (!("IntersectionObserver" in window)) {
      setMediaReady(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMediaReady(true);
      observer.disconnect();
    }, { rootMargin: "120px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [mediaReady]);

  if (!activeSheet) return null;

  const step = (offset) => {
    setPageIndex((current) => (current + offset + pageCount) % pageCount);
  };

  const startSwipe = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    swipeStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const finishSwipe = (event) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || start.pointerId !== event.pointerId || pageCount < 2) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 46 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
    suppressClick.current = true;
    step(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  const openActiveSheet = (event) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen(activeSheet.id, event.currentTarget);
  };

  return (
    <div
      ref={reader}
      className="origin-page-reader"
      role="region"
      aria-label={`${countryName} ${copy.pages}`}
      aria-roledescription="carousel"
      data-country-reader={activeSheet.countrySlug}
    >
      <header className="origin-page-reader__header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3>{copy.title}</h3>
          <p>{copy.verified}</p>
        </div>
        <div className="origin-page-reader__counter" aria-live="polite" aria-atomic="true">
          <span>{copy.page}</span>
          <strong>{String(pageIndex + 1).padStart(2, "0")}</strong>
          <i aria-hidden="true">/</i>
          <b>{String(pageCount).padStart(2, "0")}</b>
        </div>
      </header>

      <div className="origin-page-reader__stage">
        <button
          className="origin-page-reader__step origin-page-reader__step--previous"
          type="button"
          onClick={() => step(-1)}
          disabled={pageCount < 2}
          aria-label={copy.previous}
        >
          <i className="origin-ui-icon" aria-hidden="true">←</i>
        </button>

        <button
          className="origin-page-reader__page"
          type="button"
          onClick={openActiveSheet}
          onPointerDown={startSwipe}
          onPointerUp={finishSwipe}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && pageCount > 1) {
              event.preventDefault();
              step(-1);
            }
            if (event.key === "ArrowRight" && pageCount > 1) {
              event.preventDefault();
              step(1);
            }
          }}
          aria-label={`${copy.enlarge}: ${activeSheet.grade}`}
        >
          {mediaReady ? (
            <img
              key={activeSheet.preview}
              src={activeSheet.preview}
              srcSet={`${activeSheet.thumbnail} 360w, ${activeSheet.preview} 1080w`}
              sizes="(max-width: 760px) calc(100vw - 58px), min(62vw, 720px)"
              alt={`${activeSheet.grade} ${language === "tr" ? "PDF sayfası" : "PDF page"}`}
              width="1080"
              height="1620"
              decoding="async"
              draggable="false"
            />
          ) : (
            <span style={readerPlaceholderStyle} aria-hidden="true" />
          )}
          <span className="origin-page-reader__enlarge">
            <i className="origin-ui-icon" aria-hidden="true">⛶</i>
            {copy.enlarge}
          </span>
        </button>

        <button
          className="origin-page-reader__step origin-page-reader__step--next"
          type="button"
          onClick={() => step(1)}
          disabled={pageCount < 2}
          aria-label={copy.next}
        >
          <i className="origin-ui-icon" aria-hidden="true">→</i>
        </button>
      </div>

      <div className="origin-page-reader__details">
        <div>
          <p>
            <span>{activeSheet.type}</span>
            <span>{activeSheet.process}</span>
          </p>
          <h4>{activeSheet.grade}</h4>
          <small>{activeSheet.flavor}</small>
        </div>
        <nav aria-label={language === "tr" ? "Aktif sayfa işlemleri" : "Active page actions"}>
          <button
            className="button button--dark button--small"
            type="button"
            onClick={(event) => onOpen(activeSheet.id, event.currentTarget)}
          >
            <i className="origin-ui-icon" aria-hidden="true">⛶</i>
            {copy.enlarge}
          </button>
          <a className="button button--outline button--small" href={activeSheet.pdfUrl} target="_blank" rel="noreferrer">
            <i className="origin-ui-icon" aria-hidden="true">↗</i>
            {copy.open}
          </a>
          <a className="button button--outline button--small" href={activeSheet.downloadUrl}>
            <i className="origin-ui-icon" aria-hidden="true">↓</i>
            {copy.download}
          </a>
        </nav>
      </div>

      <div className="origin-page-reader__progress" aria-hidden="true">
        <span style={{ width: `${((pageIndex + 1) / pageCount) * 100}%` }} />
      </div>

      <div className="origin-page-reader__thumbnail-heading">
        <strong>{copy.pages}</strong>
        <span>{copy.swipe}</span>
      </div>
      <div className="origin-page-reader__thumbnails" role="group" aria-label={copy.select}>
        {sheets.map((sheet, index) => (
          <button
            key={sheet.id}
            className={index === pageIndex ? "is-active" : ""}
            type="button"
            onClick={() => setPageIndex(index)}
            aria-label={`${copy.select} ${index + 1}: ${sheet.grade}`}
            aria-current={index === pageIndex ? "true" : undefined}
          >
            {mediaReady ? (
              <img
                src={sheet.thumbnail}
                alt=""
                width="360"
                height="540"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span style={thumbnailPlaceholderStyle} aria-hidden="true" />
            )}
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{sheet.grade}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function SheetCard({ sheet, index, language, onOpen }) {
  const copy = language === "tr"
    ? {
      sheet: "Teknik föy",
      view: "Ön izleme",
      download: "PDF indir",
      english: "İngilizce belge",
    }
    : {
      sheet: "Reference sheet",
      view: "Preview",
      download: "Download PDF",
      english: "English document",
    };

  return (
    <article className="origin-sheet-card" data-sheet-id={sheet.id}>
      <button
        className="origin-sheet-card__preview"
        type="button"
        onClick={(event) => onOpen(sheet.id, event.currentTarget)}
        aria-label={`${copy.view}: ${sheet.grade}`}
      >
        <img
          src={sheet.thumbnail}
          alt=""
          width="360"
          height="540"
          loading="lazy"
          decoding="async"
        />
        <span className="origin-sheet-card__preview-action">
          <i className="origin-ui-icon" aria-hidden="true">⛶</i>
          {copy.view}
        </span>
        <span className="origin-sheet-card__number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </button>
      <div className="origin-sheet-card__body">
        <div className="origin-sheet-card__kicker">
          <span>{sheet.type}</span>
          <span>{copy.english}</span>
        </div>
        <h3>{sheet.grade}</h3>
        <p>{sheet.flavor}</p>
        <dl className="origin-sheet-card__facts">
          <div>
            <dt>{language === "tr" ? "İşleme" : "Process"}</dt>
            <dd>{sheet.process}</dd>
          </div>
          <div>
            <dt>{language === "tr" ? "Elek" : "Screen"}</dt>
            <dd>{sheet.screen}</dd>
          </div>
        </dl>
        <div className="origin-sheet-card__actions">
          <button
            className="button button--dark button--small"
            type="button"
            onClick={(event) => onOpen(sheet.id, event.currentTarget)}
          >
            <i className="origin-ui-icon" aria-hidden="true">▤</i>
            {copy.view}
          </button>
          <a className="button button--outline button--small" href={sheet.downloadUrl}>
            <i className="origin-ui-icon" aria-hidden="true">↓</i>
            {copy.download}
          </a>
        </div>
      </div>
    </article>
  );
}

function SheetViewer({
  activeSheet,
  activeIndex,
  sheets,
  country,
  language,
  onClose,
  onStep,
  returnFocus,
}) {
  const dialog = useRef(null);
  const previewViewport = useRef(null);
  const swipeStart = useRef(null);
  const wasOpen = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState("page");
  const [previewState, setPreviewState] = useState({ source: "", status: "loading" });
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const copy = language === "tr"
    ? {
      close: "Belge görüntüleyiciyi kapat",
      previous: "Önceki föy",
      next: "Sonraki föy",
      zoomOut: "Uzaklaştır",
      zoomIn: "Yakınlaştır",
      fitPage: "Sayfaya sığdır",
      fitWidth: "Genişliğe sığdır",
      fullscreen: "Tam ekran okuma",
      open: "PDF'yi yeni sekmede aç",
      download: "PDF indir",
      specs: "Belge özellikleri",
      source: "Kaynak",
      page: "Sayfa",
      revision: "Sürüm",
      language: "Belge dili",
      english: "İngilizce",
      unavailable: "Tam ekran bu tarayıcıda kullanılamıyor. Tam pencere görüntüleyici açık kalır.",
      swipe: "Sayfalar arasında geçmek için sola veya sağa kaydırın.",
      loadingPage: "Belge sayfası yükleniyor",
      previewError: "Sayfa ön izlemesi yüklenemedi. PDF'yi yeni sekmede açabilirsiniz.",
      fields: {
        type: "Tür",
        grade: "Sınıf",
        defects: "Kusurlar",
        flavor: "Tat",
        aroma: "Aroma",
        body: "Gövde",
        acidity: "Asidite",
        process: "İşleme",
        screen: "Elek",
        moisture: "Nem",
        packing: "Paketleme",
      },
    }
    : {
      close: "Close document viewer",
      previous: "Previous sheet",
      next: "Next sheet",
      zoomOut: "Zoom out",
      zoomIn: "Zoom in",
      fitPage: "Fit page",
      fitWidth: "Fit width",
      fullscreen: "Fullscreen reading",
      open: "Open PDF in a new tab",
      download: "Download PDF",
      specs: "Sheet specifications",
      source: "Source",
      page: "Page",
      revision: "Revision",
      language: "Document language",
      english: "English",
      unavailable: "Fullscreen is unavailable in this browser. The full-window viewer remains open.",
      swipe: "Swipe left or right to move through this country’s pages.",
      loadingPage: "Loading document page",
      previewError: "The page preview could not load. You can open the PDF in a new tab.",
      fields: {
        type: "Type",
        grade: "Grade",
        defects: "Defects",
        flavor: "Flavor",
        aroma: "Aroma",
        body: "Body",
        acidity: "Acidity",
        process: "Process",
        screen: "Screen",
        moisture: "Moisture",
        packing: "Packing",
      },
    };

  const isOpen = Boolean(activeSheet);

  useEffect(() => {
    const element = dialog.current;
    if (isOpen) {
      wasOpen.current = true;
      if (element && !element.open) element.showModal();
      document.documentElement.classList.add("document-viewer-open");
    } else {
      document.documentElement.classList.remove("document-viewer-open");
      if (element?.open) element.close();
      if (wasOpen.current) {
        wasOpen.current = false;
        requestAnimationFrame(() => returnFocus.current?.focus?.({ preventScroll: true }));
      }
    }
    return () => {
      document.documentElement.classList.remove("document-viewer-open");
      if (document.fullscreenElement === element) document.exitFullscreen?.().catch(() => {});
    };
  }, [isOpen, returnFocus]);

  useEffect(() => {
    setZoom(1);
    setFit("page");
    setFullscreenMessage("");
    previewViewport.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeSheet?.id]);

  useEffect(() => {
    if (!activeSheet || activeIndex < 0 || sheets.length < 2) return undefined;
    const neighbors = [
      sheets[(activeIndex + 1) % sheets.length],
      sheets[(activeIndex - 1 + sheets.length) % sheets.length],
    ];
    const images = neighbors.map((sheet) => {
      const image = new Image();
      image.src = sheet.preview;
      return image;
    });
    return () => images.forEach((image) => {
      image.src = "";
    });
  }, [activeIndex, activeSheet, sheets]);

  if (!activeSheet) return null;
  const previewStatus = previewState.source === activeSheet.preview
    ? previewState.status
    : "loading";

  const setViewerZoom = (nextZoom) => {
    setFit("custom");
    setZoom(clamp(nextZoom, 0.75, 3));
  };

  const enterFullscreen = async () => {
    setFullscreenMessage("");
    try {
      if (!dialog.current?.requestFullscreen) throw new Error("unsupported");
      await dialog.current.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setFullscreenMessage(copy.unavailable);
    }
  };

  const specifications = [
    ["type", activeSheet.type],
    ["grade", activeSheet.grade],
    ["defects", activeSheet.defects],
    ["flavor", activeSheet.flavor],
    ["aroma", activeSheet.aroma],
    ["body", activeSheet.body],
    ["acidity", activeSheet.acidity],
    ["process", activeSheet.process],
    ["screen", activeSheet.screen],
    ["moisture", activeSheet.moisture],
    ["packing", activeSheet.packing],
  ];

  const startSwipe = (event) => {
    if (fit !== "page" || zoom !== 1 || sheets.length < 2) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    swipeStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const finishSwipe = (event) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 54 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
    onStep(deltaX < 0 ? 1 : -1);
  };

  return (
    <dialog
      ref={dialog}
      className="origin-document-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="origin-document-dialog__shell">
        <header className="origin-document-dialog__header">
          <div>
            <p>{local(country, language)} · {activeSheet.type}</p>
            <h2 id={titleId}>{activeSheet.grade}</h2>
            <span id={descriptionId}>
              {String(activeIndex + 1).padStart(2, "0")} / {String(sheets.length).padStart(2, "0")}
            </span>
          </div>
          <button className="origin-document-dialog__close" type="button" onClick={onClose} aria-label={copy.close}>
            <i className="origin-ui-icon" aria-hidden="true">×</i>
          </button>
        </header>

        <div className="origin-document-dialog__toolbar" role="toolbar" aria-label={language === "tr" ? "Belge kontrolleri" : "Document controls"}>
          <div className="origin-document-dialog__stepper">
            <button type="button" onClick={() => onStep(-1)} disabled={sheets.length < 2} aria-label={copy.previous}>
              <i className="origin-ui-icon" aria-hidden="true">←</i>
              <span>{language === "tr" ? "Önceki" : "Previous"}</span>
            </button>
            <strong>{activeIndex + 1} / {sheets.length}</strong>
            <button type="button" onClick={() => onStep(1)} disabled={sheets.length < 2} aria-label={copy.next}>
              <span>{language === "tr" ? "Sonraki" : "Next"}</span>
              <i className="origin-ui-icon" aria-hidden="true">→</i>
            </button>
          </div>
          <div className="origin-document-dialog__zoom">
            <button type="button" onClick={() => setViewerZoom(zoom - 0.25)} aria-label={copy.zoomOut} disabled={zoom <= 0.75}>
              <i className="origin-ui-icon" aria-hidden="true">−</i>
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setViewerZoom(zoom + 0.25)} aria-label={copy.zoomIn} disabled={zoom >= 3}>
              <i className="origin-ui-icon" aria-hidden="true">+</i>
            </button>
            <button type="button" className={fit === "page" ? "is-active" : ""} onClick={() => { setFit("page"); setZoom(1); }}>
              {copy.fitPage}
            </button>
            <button type="button" className={fit === "width" ? "is-active" : ""} onClick={() => { setFit("width"); setZoom(1); }}>
              {copy.fitWidth}
            </button>
            <button type="button" onClick={() => { setFit("page"); setZoom(1); }} aria-label={language === "tr" ? "Yakınlaştırmayı sıfırla" : "Reset zoom"}>
              <i className="origin-ui-icon" aria-hidden="true">↺</i>
            </button>
            <button type="button" onClick={enterFullscreen} aria-label={copy.fullscreen}>
              <i className="origin-ui-icon" aria-hidden="true">⛶</i>
              <span>{copy.fullscreen}</span>
            </button>
          </div>
          <div className="origin-document-dialog__document-actions">
            <a href={activeSheet.pdfUrl} target="_blank" rel="noreferrer" aria-label={copy.open}>
              <i className="origin-ui-icon" aria-hidden="true">↗</i>
              <span>{copy.open}</span>
            </a>
            <a href={activeSheet.downloadUrl} aria-label={copy.download}>
              <i className="origin-ui-icon" aria-hidden="true">↓</i>
              <span>{copy.download}</span>
            </a>
          </div>
        </div>

        {fullscreenMessage && <p className="origin-document-dialog__status" role="status">{fullscreenMessage}</p>}

        <div className="origin-document-dialog__content" tabIndex="0" aria-label={language === "tr" ? "Kaydırılabilir belge ve özellikler" : "Scrollable document and specifications"}>
          <div
            ref={previewViewport}
            className={`origin-document-dialog__preview origin-document-dialog__preview--${fit}${fit === "page" && zoom === 1 && sheets.length > 1 ? " is-swipeable" : ""}`}
            tabIndex="0"
            aria-busy={previewStatus === "loading"}
            aria-label={`${language === "tr" ? "Kaydırılabilir belge ön izlemesi" : "Scrollable document preview"}. ${copy.swipe}`}
            onPointerDown={startSwipe}
            onPointerUp={finishSwipe}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
          >
            {previewStatus !== "ready" && (
              <div className={`origin-document-dialog__preview-status is-${previewStatus}`} style={previewStatusStyle} role="status" aria-live="polite">
                <i className="origin-ui-icon" aria-hidden="true">{previewStatus === "error" ? "!" : "▤"}</i>
                <span>{previewStatus === "error" ? copy.previewError : copy.loadingPage}</span>
              </div>
            )}
            <img
              key={activeSheet.preview}
              src={activeSheet.preview}
              alt={`${activeSheet.grade} ${language === "tr" ? "referans föyü" : "reference sheet"}`}
              width="1080"
              height="1620"
              decoding="async"
              draggable="false"
              onLoad={() => setPreviewState({ source: activeSheet.preview, status: "ready" })}
              onError={() => setPreviewState({ source: activeSheet.preview, status: "error" })}
              style={fit === "custom" ? { width: `${zoom * 100}%` } : undefined}
            />
          </div>
          <aside className="origin-document-dialog__specifications" aria-labelledby={`${titleId}-specs`}>
            <div className="origin-document-dialog__spec-heading">
              <i className="origin-ui-icon" aria-hidden="true">▤</i>
              <h3 id={`${titleId}-specs`}>{copy.specs}</h3>
            </div>
            <dl>
              {specifications.map(([field, value]) => (
                <div key={field}>
                  <dt>{copy.fields[field]}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="origin-document-dialog__provenance">
              <p><strong>{copy.source}</strong><span>{activeSheet.sourceDocument}</span></p>
              <p><strong>{copy.page}</strong><span>{activeSheet.sourcePage}</span></p>
              <p><strong>{copy.revision}</strong><span>{activeSheet.revision}</span></p>
              <p><strong>{copy.language}</strong><span>{copy.english}</span></p>
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  );
}

export default function OriginDocumentLibrary({
  profile,
  language,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const returnFocus = useRef(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [process, setProcess] = useState("all");
  const [launcherVisible, setLauncherVisible] = useState(() => (
    typeof window !== "undefined" && window.scrollY > 120
  ));
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogState, setCatalogState] = useState(() => ({
    status: profile.catalogDataUrl ? "loading" : "ready",
    sheets: profile.sheets || [],
  }));
  const sheets = catalogState.sheets;
  const expectedSheetCount = profile.sheetCount || sheets.length;

  useEffect(() => {
    const controller = new AbortController();
    if (!profile.catalogDataUrl) {
      setCatalogState({ status: "ready", sheets: profile.sheets || [] });
      return () => controller.abort();
    }

    setCatalogState({ status: "loading", sheets: [] });
    fetch(profile.catalogDataUrl, {
      signal: controller.signal,
      cache: "force-cache",
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (payload.countrySlug !== profile.slug || !Array.isArray(payload.sheets)) {
          throw new Error("Country catalog relationship mismatch");
        }
        setCatalogState({ status: "ready", sheets: payload.sheets });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setCatalogState({ status: "error", sheets: [] });
      });

    return () => controller.abort();
  }, [catalogAttempt, profile.catalogDataUrl, profile.sheets, profile.slug]);

  useEffect(() => {
    const updateLauncher = () => setLauncherVisible(window.scrollY > 120);
    updateLauncher();
    window.addEventListener("scroll", updateLauncher, { passive: true });
    return () => window.removeEventListener("scroll", updateLauncher);
  }, [profile.slug]);

  const copy = language === "tr"
    ? {
      eyebrow: "Ülke kataloğu",
      title: `${local(profile.country, language)} için ${expectedSheetCount} teknik föy`,
      intro: "Yalnızca bu menşeye ait föyleri inceleyin, büyütün, yeni sekmede açın veya PDF olarak indirin.",
      search: "Föylerde ara",
      placeholder: "Sınıf, tür, işlem veya tat",
      type: "Tür",
      process: "İşleme",
      all: "Tümü",
      results: `${sheets.length} föy`,
      filteredResults: "eşleşen föy",
      reset: "Filtreleri temizle",
      downloadAll: "Ülke kataloğunu indir",
      emptyTitle: "Bu menşe için yayımlanmış teknik föy yok.",
      emptyCopy: "Güncel lot ve belge durumu talep sırasında doğrudan teyit edilir.",
      noMatches: "Bu filtrelerle eşleşen föy bulunamadı.",
      loading: "Ülkeye ait teknik föyler hazırlanıyor.",
      loadingCopy: "Doğrulanmış katalog verileri güvenli kaynaktan yükleniyor.",
      error: "Teknik föyler şu anda yüklenemedi.",
      errorCopy: "Bağlantınızı kontrol edip bu ülkenin kataloğunu yeniden deneyin.",
      retry: "Yeniden dene",
      floatingFile: "Ülke PDF dosyası",
      floatingOpen: "Okuyucuyu aç",
      floatingPages: "sayfa",
    }
    : {
      eyebrow: "Country catalogue",
      title: `${expectedSheetCount} reference ${expectedSheetCount === 1 ? "sheet" : "sheets"} for ${local(profile.country, language)}`,
      intro: "Review only the sheets related to this origin, enlarge them, open them in a new tab, or download the PDF.",
      search: "Search sheets",
      placeholder: "Grade, type, process or flavor",
      type: "Type",
      process: "Process",
      all: "All",
      results: `${sheets.length} ${sheets.length === 1 ? "sheet" : "sheets"}`,
      filteredResults: "matching sheets",
      reset: "Clear filters",
      downloadAll: "Download country catalogue",
      emptyTitle: "No reference sheets are published for this origin.",
      emptyCopy: "Current lots and document availability are confirmed directly during an inquiry.",
      noMatches: "No sheets match these filters.",
      loading: "Preparing this country’s reference sheets.",
      loadingCopy: "The verified catalogue data is loading from its protected source.",
      error: "The reference sheets could not be loaded.",
      errorCopy: "Check your connection and retry this country catalogue.",
      retry: "Try again",
      floatingFile: "Country PDF file",
      floatingOpen: "Open reader",
      floatingPages: sheets.length === 1 ? "page" : "pages",
    };

  const types = useMemo(() => [...new Set(sheets.map((sheet) => sheet.type))].sort(), [sheets]);
  const processes = useMemo(() => [...new Set(sheets.map((sheet) => sheet.process))].sort(), [sheets]);
  const filteredSheets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language === "tr" ? "tr-TR" : "en");
    return sheets.filter((sheet) => (
      (type === "all" || sheet.type === type)
      && (process === "all" || sheet.process === process)
      && (!normalizedQuery || [
        sheet.grade,
        sheet.type,
        sheet.process,
        sheet.flavor,
        sheet.screen,
      ].join(" ").toLocaleLowerCase(language === "tr" ? "tr-TR" : "en").includes(normalizedQuery))
    ));
  }, [language, process, query, sheets, type]);

  const activeSheetId = new URLSearchParams(location.search).get("sheet");
  const activeIndex = sheets.findIndex((sheet) => sheet.id === activeSheetId);
  const activeSheet = activeIndex >= 0 ? sheets[activeIndex] : null;

  const setActiveSheet = (sheetId, { replace = false } = {}) => {
    const params = new URLSearchParams(location.search);
    if (sheetId) params.set("sheet", sheetId);
    else params.delete("sheet");
    navigate(
      { pathname: location.pathname, search: params.toString() ? `?${params}` : "" },
      { replace, preventScrollReset: true },
    );
  };

  useEffect(() => {
    if (catalogState.status === "ready" && activeSheetId && activeIndex < 0) {
      setActiveSheet("", { replace: true });
    }
    // location.search is intentionally the source of truth for a reload-safe viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeSheetId, catalogState.status]);

  const openSheet = (sheetId, trigger) => {
    returnFocus.current = trigger;
    setActiveSheet(sheetId);
  };

  const stepSheet = (offset) => {
    if (!sheets.length || activeIndex < 0) return;
    const next = (activeIndex + offset + sheets.length) % sheets.length;
    setActiveSheet(sheets[next].id, { replace: true });
  };

  if (catalogState.status === "loading") {
    return (
      <section id="catalog" className="section origin-documents origin-documents--loading" aria-labelledby={titleId} aria-busy="true">
        <div className="shell">
          <div className="origin-documents__loading-copy" role="status">
            <i className="origin-ui-icon" aria-hidden="true">▤</i>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id={titleId}>{copy.loading}</h2>
            <p>{copy.loadingCopy}</p>
          </div>
          <div className="origin-documents__skeleton" aria-hidden="true">
            {Array.from({ length: Math.min(3, expectedSheetCount) }, (_, index) => (
              <span key={index}><i /><b /><small /></span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (catalogState.status === "error") {
    return (
      <section id="catalog" className="section origin-documents origin-documents--empty" aria-labelledby={titleId}>
        <div className="shell">
          <div className="origin-documents__empty" role="alert">
            <i className="origin-ui-icon" aria-hidden="true">▤</i>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id={titleId}>{copy.error}</h2>
            <p>{copy.errorCopy}</p>
            <button className="button button--dark" type="button" onClick={() => setCatalogAttempt((attempt) => attempt + 1)}>
              <i className="origin-ui-icon" aria-hidden="true">↺</i>
              {copy.retry}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!sheets.length) {
    return (
      <section id="catalog" className="section origin-documents origin-documents--empty" aria-labelledby={titleId}>
        <div className="shell">
          <div className="origin-documents__empty">
            <i className="origin-ui-icon" aria-hidden="true">▤</i>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id={titleId}>{copy.emptyTitle}</h2>
            <p>{copy.emptyCopy}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="catalog" className="section origin-documents" aria-labelledby={titleId}>
        <div className="shell">
        <header className="origin-documents__header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id={titleId}>{copy.title}</h2>
            <p>{copy.intro}</p>
          </div>
          {profile.bundleDownloadUrl && (
            <a className="button button--dark" href={profile.bundleDownloadUrl}>
              <i className="origin-ui-icon" aria-hidden="true">↓</i>
              {copy.downloadAll}
            </a>
          )}
        </header>

        <CountryPageReader
          sheets={sheets}
          country={profile.country}
          language={language}
          onOpen={openSheet}
        />

        <div className="origin-documents__filters">
          <label className="origin-documents__search">
            <span>{copy.search}</span>
            <span><i className="origin-ui-icon" aria-hidden="true">⌕</i><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.placeholder} /></span>
          </label>
          <label>
            <span>{copy.type}</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">{copy.all}</option>
              {types.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>{copy.process}</span>
            <select value={process} onChange={(event) => setProcess(event.target.value)}>
              <option value="all">{copy.all}</option>
              {processes.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <div className="origin-documents__filter-status">
            <i className="origin-ui-icon" aria-hidden="true">≡</i>
            <strong aria-live="polite">{filteredSheets.length} {copy.filteredResults}</strong>
            <button type="button" onClick={() => { setQuery(""); setType("all"); setProcess("all"); }} disabled={!query && type === "all" && process === "all"}>
              <i className="origin-ui-icon" aria-hidden="true">↺</i>
              {copy.reset}
            </button>
          </div>
        </div>

        {filteredSheets.length ? (
          <div className="origin-documents__grid">
            {filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                index={sheets.findIndex((candidate) => candidate.id === sheet.id)}
                language={language}
                onOpen={openSheet}
              />
            ))}
          </div>
        ) : (
          <div className="origin-documents__no-results">
            <i className="origin-ui-icon" aria-hidden="true">▤</i>
            <h3>{copy.noMatches}</h3>
            <button className="button button--outline" type="button" onClick={() => { setQuery(""); setType("all"); setProcess("all"); }}>
              {copy.reset}
            </button>
          </div>
        )}
        </div>
      </section>

      <SheetViewer
        activeSheet={activeSheet}
        activeIndex={activeIndex}
        sheets={sheets}
        country={profile.country}
        language={language}
        onClose={() => setActiveSheet("", { replace: true })}
        onStep={stepSheet}
        returnFocus={returnFocus}
      />

      <button
        className={`origin-pdf-launcher button button--dark${launcherVisible ? " is-visible" : ""}`}
        type="button"
        data-page-count={sheets.length}
        onClick={(event) => openSheet(sheets[0].id, event.currentTarget)}
        aria-label={`${copy.floatingOpen}: ${local(profile.country, language)}, ${sheets.length} ${copy.floatingPages}`}
      >
        <img src={`/images/flags/${profile.iso.toLowerCase()}.svg`} alt="" width="36" height="24" aria-hidden="true" />
        <span className="origin-pdf-launcher__copy">
          <small>{copy.floatingFile}</small>
          <strong>{local(profile.country, language)} · {sheets.length} {copy.floatingPages}</strong>
        </span>
        <i className="origin-ui-icon" aria-hidden="true">▤</i>
      </button>
    </>
  );
}
