import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  normalizeCoffeeSearch,
  translateCoffeeValue,
} from "../lib/turkishCoffee";
import "../origin-documents.css";

const local = (value, language) =>
  typeof value === "object" && value !== null ? value[language] : value;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const SPECIFICATION_FIELDS = [
  "type",
  "grade",
  "defects",
  "flavor",
  "aroma",
  "body",
  "acidity",
  "process",
  "screen",
  "moisture",
  "packing",
];

const displayGrade = (sheet, language) => (
  language === "tr"
    ? (sheet.gradeTr || sheet.grade)
    : sheet.grade
);

const sheetAssets = (sheet, language) => {
  const useTurkish = language === "tr" && sheet.turkishPreview;
  return {
    thumbnail: useTurkish ? sheet.turkishThumbnail : sheet.thumbnail,
    preview: useTurkish ? sheet.turkishPreview : sheet.preview,
    fullPreview: useTurkish
      ? (sheet.turkishFullPreview || sheet.turkishPreview)
      : (sheet.fullPreview || sheet.preview),
    pdfUrl: useTurkish ? sheet.turkishPdfUrl : sheet.pdfUrl,
    downloadUrl: useTurkish ? sheet.turkishDownloadUrl : sheet.downloadUrl,
    language: useTurkish ? "tr-TR" : "en",
  };
};

const sheetSrcSet = (assets) => [
  `${assets.thumbnail} 360w`,
  `${assets.preview} 1080w`,
  assets.fullPreview && `${assets.fullPreview} 2160w`,
].filter(Boolean).join(", ");

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
  const thumbnailRail = useRef(null);
  const swipeStart = useRef(null);
  const suppressClick = useRef(false);
  const activeSheet = sheets[pageIndex] || sheets[0];
  const activeAssets = activeSheet ? sheetAssets(activeSheet, language) : null;
  const pageCount = sheets.length;
  const countryName = local(country, language);
  const copy = language === "tr"
    ? {
      eyebrow: "Etkileşimli ülke dosyası",
      title: `${countryName} kaynak sayfaları`,
      verified: `Bu okuyucuda yalnızca ${countryName} menşesiyle eşleştirilmiş ${pageCount} kaynak sayfası yer alır.`,
      page: "Sayfa",
      previous: "Önceki sayfa",
      next: "Sonraki sayfa",
      enlarge: "Tam ekran görüntüle",
      open: "PDF’yi aç",
      download: "PDF sayfasını indir",
      quality: "270 PPI Türkçe teknik föy",
      swipeShort: "Sayfayı kaydır",
      swipe: "Sayfalar arasında kaydırın, küçük görsellerden seçim yapın veya ok düğmelerini kullanın.",
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
      quality: "270 PPI English technical sheet",
      swipeShort: "Swipe the page",
      swipe: "Swipe the page or use the arrows to move through the country file.",
      pages: "Source pages",
      select: "Select page",
    };

  const firstSheetId = sheets[0]?.id;

  useEffect(() => {
    setPageIndex(0);
    setMediaReady(false);
  }, [firstSheetId]);

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

  useEffect(() => {
    if (!mediaReady) return undefined;
    const neighbors = [
      sheets[(pageIndex + 1) % pageCount],
      sheets[(pageIndex - 1 + pageCount) % pageCount],
    ].filter(Boolean);
    const images = neighbors.map((sheet) => {
      const image = new Image();
      image.src = sheetAssets(sheet, language).preview;
      return image;
    });
    return () => images.forEach((image) => {
      image.src = "";
    });
  }, [language, mediaReady, pageCount, pageIndex, sheets]);

  useEffect(() => {
    const rail = thumbnailRail.current;
    const button = rail?.children[pageIndex];
    if (!rail || !button || !mediaReady) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (window.innerWidth <= 760) return;
    const left = button.offsetLeft - ((rail.clientWidth - button.clientWidth) / 2);
    rail.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      left,
    });
  }, [mediaReady, pageIndex]);

  if (!activeSheet) return null;

  const step = (offset) => {
    const scrollPosition = window.scrollY;
    setPageIndex((current) => (current + offset + pageCount) % pageCount);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPosition, behavior: "instant" });
    });
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
          aria-label={`${copy.enlarge}: ${displayGrade(activeSheet, language)}`}
        >
          {mediaReady ? (
            <img
              key={activeAssets.preview}
              src={activeAssets.preview}
              srcSet={sheetSrcSet(activeAssets)}
              sizes="(max-width: 760px) calc(100vw - 58px), min(62vw, 720px)"
              alt={`${displayGrade(activeSheet, language)} ${language === "tr" ? "PDF sayfası" : "PDF page"}`}
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
          {pageCount > 1 && (
            <span className="origin-page-reader__swipe-cue" aria-hidden="true">
              <i>←</i>
              {copy.swipeShort}
              <i>→</i>
            </span>
          )}
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
            <span>{translateCoffeeValue(activeSheet.type, language)}</span>
            <span>{translateCoffeeValue(activeSheet.process, language)}</span>
          </p>
          <h4>{displayGrade(activeSheet, language)}</h4>
          <small>{translateCoffeeValue(activeSheet.flavor, language)}</small>
          <small>
            <i className="origin-ui-icon" aria-hidden="true">◇</i>
            {copy.quality}
          </small>
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
          <a className="button button--outline button--small" href={activeAssets.pdfUrl} target="_blank" rel="noreferrer">
            <i className="origin-ui-icon" aria-hidden="true">↗</i>
            {copy.open}
          </a>
          <a className="button button--outline button--small" href={activeAssets.downloadUrl} download>
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
      <div ref={thumbnailRail} className="origin-page-reader__thumbnails" role="group" aria-label={copy.select}>
        {sheets.map((sheet, index) => {
          const assets = sheetAssets(sheet, language);
          return (
          <button
            key={sheet.id}
            className={index === pageIndex ? "is-active" : ""}
            type="button"
            onClick={() => setPageIndex(index)}
            aria-label={`${copy.select} ${index + 1}: ${displayGrade(sheet, language)}`}
            aria-current={index === pageIndex ? "true" : undefined}
          >
            {mediaReady ? (
              <img
                src={assets.thumbnail}
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
            <strong>{displayGrade(sheet, language)}</strong>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function SheetCard({ sheet, index, language, onOpen }) {
  const assets = sheetAssets(sheet, language);
  const copy = language === "tr"
    ? {
      sheet: "Kaynak sayfası",
      view: "Ön izleme",
      download: "PDF’yi indir",
      language: "Üretilmiş Türkçe teknik föy",
    }
    : {
      sheet: "Reference sheet",
      view: "Preview",
      download: "Download PDF",
      language: "Generated English technical sheet",
    };

  return (
    <article className="origin-sheet-card" data-sheet-id={sheet.id}>
      <button
        className="origin-sheet-card__preview"
        type="button"
        onClick={(event) => onOpen(sheet.id, event.currentTarget)}
        aria-label={`${copy.view}: ${displayGrade(sheet, language)}`}
      >
        <img
          src={assets.thumbnail}
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
          <span>{translateCoffeeValue(sheet.type, language)}</span>
          <span>{copy.language}</span>
        </div>
        <h3>{displayGrade(sheet, language)}</h3>
        <p>{translateCoffeeValue(sheet.flavor, language)}</p>
        <dl className="origin-sheet-card__facts">
          <div>
            <dt>{language === "tr" ? "İşleme yöntemi" : "Process"}</dt>
            <dd>{translateCoffeeValue(sheet.process, language)}</dd>
          </div>
          <div>
            <dt>{language === "tr" ? "Elek ölçüsü" : "Screen"}</dt>
            <dd>{translateCoffeeValue(sheet.screen, language)}</dd>
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
          <a className="button button--outline button--small" href={assets.downloadUrl} download>
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
      previous: "Önceki sayfa",
      next: "Sonraki sayfa",
      zoomOut: "Uzaklaştır",
      zoomIn: "Yakınlaştır",
      fitPage: "Sayfaya sığdır",
      fitWidth: "Genişliğe sığdır",
      fitPageShort: "Sayfa",
      fitWidthShort: "Genişlik",
      fullscreen: "Tam ekran",
      open: "PDF’yi aç",
      download: "İndir",
      alternate: "İngilizce",
      sourceOriginal: "Kaynak orijinali",
      specs: "Kaynak sayfa özellikleri",
      source: "Kaynak",
      page: "Sayfa",
      revision: "Sürüm",
      language: "Görüntülenen belge",
      documentLanguage: "Üretilmiş Türkçe teknik föy",
      sourceLanguage: "Kaynak dili",
      english: "İngilizce orijinal",
      fidelity: "Görüntü kalitesi",
      highResolution: "2160×3240 px • 270 PPI",
      nextShort: "Sonraki",
      unavailable: "Tam ekran kullanılamıyor.",
      swipe: "Föy değiştirmek için kaydırın.",
      loadingPage: "Föy yükleniyor",
      previewError: "Ön izleme açılamadı.",
      fields: {
        type: "Tür",
        grade: "Ürün sınıfı",
        defects: "Kusurlar",
        flavor: "Lezzet notaları",
        aroma: "Aroma",
        body: "Gövde",
        acidity: "Asidite",
        process: "İşleme yöntemi",
        screen: "Elek ölçüsü",
        moisture: "Nem",
        packing: "Ambalaj",
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
      fitPageShort: "Page",
      fitWidthShort: "Width",
      fullscreen: "Fullscreen",
      open: "Open PDF",
      download: "Download",
      alternate: "Turkish",
      sourceOriginal: "Source original",
      specs: "Sheet specifications",
      source: "Source",
      page: "Page",
      revision: "Revision",
      language: "Displayed document",
      documentLanguage: "Generated English technical sheet",
      sourceLanguage: "Source language",
      english: "English",
      fidelity: "Preview quality",
      highResolution: "2160×3240 px • 270 PPI",
      nextShort: "Next",
      unavailable: "Fullscreen unavailable.",
      swipe: "Swipe to change sheets.",
      loadingPage: "Loading sheet",
      previewError: "Preview unavailable.",
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
  const activeAssets = activeSheet ? sheetAssets(activeSheet, language) : null;
  const previewSourceKey = activeSheet ? `${activeSheet.id}:${activeAssets.language}` : "";

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
      image.src = sheetAssets(sheet, language).preview;
      return image;
    });
    return () => images.forEach((image) => {
      image.src = "";
    });
  }, [activeIndex, activeSheet, language, sheets]);

  if (!activeSheet) return null;
  const previewStatus = previewState.source === previewSourceKey
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

  const specifications = SPECIFICATION_FIELDS.map((field) => [
    field,
    field === "grade" ? displayGrade(activeSheet, language) : activeSheet[field],
  ]);

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
            <h2 id={titleId}>{displayGrade(activeSheet, language)}</h2>
            <span id={descriptionId}>
              {String(activeIndex + 1).padStart(2, "0")} / {String(sheets.length).padStart(2, "0")}
            </span>
          </div>
          <button className="origin-document-dialog__close" type="button" onClick={onClose} aria-label={copy.close} autoFocus>
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
            <button type="button" className={fit === "page" ? "is-active" : ""} onClick={() => { setFit("page"); setZoom(1); }} aria-label={copy.fitPage}>
              {copy.fitPageShort}
            </button>
            <button type="button" className={fit === "width" ? "is-active" : ""} onClick={() => { setFit("width"); setZoom(1); }} aria-label={copy.fitWidth}>
              {copy.fitWidthShort}
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
            <a href={activeAssets.pdfUrl} target="_blank" rel="noreferrer" aria-label={copy.open}>
              <i className="origin-ui-icon" aria-hidden="true">↗</i>
              <span>{copy.open}</span>
            </a>
            <a href={activeAssets.downloadUrl} aria-label={copy.download} download>
              <i className="origin-ui-icon" aria-hidden="true">↓</i>
              <span>{copy.download}</span>
            </a>
            <a
              href={language === "tr"
                ? activeSheet.pdfUrl
                : (activeSheet.turkishPdfUrl || activeSheet.pdfUrl)}
              target="_blank"
              rel="noreferrer"
              aria-label={copy.alternate}
            >
              <i className="origin-ui-icon" aria-hidden="true">{language === "tr" ? "EN" : "TR"}</i>
              <span>{copy.alternate}</span>
            </a>
            {activeSheet.sourcePdfUrl && (
              <a
                href={activeSheet.sourcePdfUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.sourceOriginal}
              >
                <i className="origin-ui-icon" aria-hidden="true">SR</i>
                <span>{copy.sourceOriginal}</span>
              </a>
            )}
          </div>
        </div>

        {fullscreenMessage && <p className="origin-document-dialog__status" role="status">{fullscreenMessage}</p>}

        <div className="origin-document-dialog__content" tabIndex="0" aria-label={language === "tr" ? "Belge ve özellikler" : "Document and specifications"}>
          <div
            ref={previewViewport}
            className={`origin-document-dialog__preview origin-document-dialog__preview--${fit}${fit === "page" && zoom === 1 && sheets.length > 1 ? " is-swipeable" : ""}`}
            tabIndex="0"
            aria-busy={previewStatus === "loading"}
            aria-label={`${language === "tr" ? "Belge ön izlemesi" : "Document preview"}. ${copy.swipe}`}
            onPointerDown={startSwipe}
            onPointerUp={finishSwipe}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && sheets.length > 1) {
                event.preventDefault();
                onStep(-1);
              }
              if (event.key === "ArrowRight" && sheets.length > 1) {
                event.preventDefault();
                onStep(1);
              }
              if (event.key === "+" || event.key === "=") {
                event.preventDefault();
                setViewerZoom(zoom + 0.25);
              }
              if (event.key === "-") {
                event.preventDefault();
                setViewerZoom(zoom - 0.25);
              }
              if (event.key === "0") {
                event.preventDefault();
                setFit("page");
                setZoom(1);
              }
            }}
          >
            {previewStatus !== "ready" && (
              <div className={`origin-document-dialog__preview-status is-${previewStatus}`} style={previewStatusStyle} role="status" aria-live="polite">
                <i className="origin-ui-icon" aria-hidden="true">{previewStatus === "error" ? "!" : "▤"}</i>
                <span>{previewStatus === "error" ? copy.previewError : copy.loadingPage}</span>
              </div>
            )}
            <img
              key={previewSourceKey}
              src={activeAssets.preview}
              srcSet={sheetSrcSet(activeAssets)}
              sizes={fit === "custom"
                ? `${Math.round(1080 * Math.min(zoom, 2))}px`
                : "(max-width: 820px) calc(100vw - 20px), min(1060px, calc(100vw - 410px))"}
              alt={`${displayGrade(activeSheet, language)} ${language === "tr" ? "referans föyü" : "reference sheet"}`}
              width="2160"
              height="3240"
              decoding="async"
              fetchPriority="high"
              draggable="false"
              onLoad={() => setPreviewState({ source: previewSourceKey, status: "ready" })}
              onError={() => setPreviewState({ source: previewSourceKey, status: "error" })}
              style={fit === "custom" ? { width: `${zoom * 100}%` } : undefined}
            />
          </div>
          <aside className="origin-document-dialog__specifications" aria-labelledby={`${titleId}-specs`} tabIndex="0">
            <div className="origin-document-dialog__spec-heading">
              <i className="origin-ui-icon" aria-hidden="true">▤</i>
              <h3 id={`${titleId}-specs`}>{copy.specs}</h3>
            </div>
            <dl>
              {specifications.map(([field, value]) => (
                <div key={field}>
                  <dt>{copy.fields[field]}</dt>
                  <dd>{["grade", "source"].includes(field) ? value : translateCoffeeValue(value, language)}</dd>
                </div>
              ))}
            </dl>
            <div className="origin-document-dialog__provenance">
              <p><strong>{copy.source}</strong><span>{activeSheet.sourceDocument}</span></p>
              <p><strong>{copy.page}</strong><span>{activeSheet.sourcePage}</span></p>
              <p><strong>{copy.revision}</strong><span>{activeSheet.revision}</span></p>
              <p><strong>{copy.language}</strong><span>{copy.documentLanguage}</span></p>
              <p><strong>{copy.sourceLanguage}</strong><span>{copy.english}</span></p>
              <p><strong>{copy.fidelity}</strong><span>{copy.highResolution}</span></p>
            </div>
          </aside>
        </div>
        <nav
          className="origin-document-dialog__mobile-actions"
          aria-label={language === "tr" ? "Mobil belge işlemleri" : "Mobile document actions"}
        >
          <a href={activeAssets.pdfUrl} target="_blank" rel="noreferrer">
            <i className="origin-ui-icon" aria-hidden="true">↗</i>
            {language === "tr" ? "PDF’yi aç" : "Open PDF"}
          </a>
          <a href={activeAssets.downloadUrl} download>
            <i className="origin-ui-icon" aria-hidden="true">↓</i>
            {language === "tr" ? "İndir" : "Download"}
          </a>
          <button type="button" onClick={() => onStep(1)} disabled={sheets.length < 2}>
            {copy.nextShort}
            <i className="origin-ui-icon" aria-hidden="true">→</i>
          </button>
        </nav>
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
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
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
      .catch(() => {
        if (!controller.signal.aborted) setCatalogState({ status: "error", sheets: [] });
      });

    return () => controller.abort();
  }, [catalogAttempt, profile.catalogDataUrl, profile.sheets, profile.slug]);

  useEffect(() => {
    let frame = 0;
    const updateLauncher = () => {
      frame = 0;
      const catalog = document.querySelector("#catalog");
      const bounds = catalog?.getBoundingClientRect();
      const catalogIsActive = Boolean(bounds && bounds.top <= 160 && bounds.bottom > 68);
      const constellation = document.querySelector(".origin-constellation__board")?.getBoundingClientRect();
      const constellationIsActive = Boolean(constellation && constellation.top < window.innerHeight - 72 && constellation.bottom > 68);
      setLauncherVisible(window.scrollY > 120 && !catalogIsActive && !constellationIsActive);
    };
    const queueLauncherUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateLauncher);
    };
    updateLauncher();
    window.addEventListener("scroll", queueLauncherUpdate, { passive: true });
    window.addEventListener("resize", queueLauncherUpdate);
    return () => {
      window.removeEventListener("scroll", queueLauncherUpdate);
      window.removeEventListener("resize", queueLauncherUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [profile.slug]);

  const copy = language === "tr"
    ? {
      eyebrow: "Ülkeye özel kaynak arşivi",
      title: `${local(profile.country, language)}: ${expectedSheetCount} kaynak sayfası`,
      intro: "Bu ülkeyle eşleştirilmiş sayfaları okuyucuda gezinin; ayrıntıları büyütün, PDF’yi açın veya indirin.",
      search: "Kaynak arşivinde ara",
      placeholder: "Ürün sınıfı, tür, işleme yöntemi veya lezzet",
      type: "Tür",
      process: "İşleme yöntemi",
      all: "Tümü",
      results: `${sheets.length} kaynak sayfası`,
      filteredResults: "eşleşen kaynak sayfası",
      reset: "Filtreleri temizle",
      downloadAll: "Türkçe ülke dosyasını indir",
      alternateBundle: "İngilizce teknik katalog",
      sourceBundle: "İngilizce kaynak sayfalar",
      emptyTitle: "Bu menşe için yayımlanmış bir kaynak sayfa yok.",
      emptyCopy: "Güncel lot ve belge durumu talep sırasında doğrudan teyit edilir.",
      noMatches: "Bu filtrelerle eşleşen bir kaynak sayfa bulunamadı.",
      loading: "Ülkeye ait kaynak sayfaları hazırlanıyor.",
      loadingCopy: "Ülkeyle eşleştirilmiş katalog verileri güvenli kaynaktan yükleniyor.",
      error: "Kaynak sayfalar şu anda yüklenemedi.",
      errorCopy: "Bağlantınızı kontrol edip bu ülkenin kataloğunu yeniden deneyin.",
      retry: "Yeniden dene",
      floatingFile: "Ülke kaynak arşivi",
      floatingOpen: "Belge okuyucuyu aç",
      floatingPages: "kaynak sayfası",
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
      alternateBundle: "Turkish technical catalogue",
      sourceBundle: "Original English source pages",
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
    const normalizedQuery = normalizeCoffeeSearch(query);
    return sheets.filter((sheet) => (
      (type === "all" || sheet.type === type)
      && (process === "all" || sheet.process === process)
      && (!normalizedQuery || normalizeCoffeeSearch([
        sheet.grade,
        sheet.gradeTr,
        sheet.type,
        sheet.process,
        sheet.flavor,
        sheet.aroma,
        sheet.body,
        sheet.acidity,
        sheet.screen,
        translateCoffeeValue(sheet.type, language),
        translateCoffeeValue(sheet.process, language),
        translateCoffeeValue(sheet.flavor, language),
        translateCoffeeValue(sheet.aroma, language),
        translateCoffeeValue(sheet.body, language),
        translateCoffeeValue(sheet.acidity, language),
        translateCoffeeValue(sheet.screen, language),
      ].join(" ")).includes(normalizedQuery))
    ));
  }, [language, process, query, sheets, type]);

  const activeSheetId = new URLSearchParams(location.search).get("sheet");
  const activeIndex = sheets.findIndex((sheet) => sheet.id === activeSheetId);
  const activeSheet = activeIndex >= 0 ? sheets[activeIndex] : null;
  const localizedBundleDownloadUrl = language === "tr"
    ? (profile.turkishBundleDownloadUrl || profile.bundleDownloadUrl)
    : profile.bundleDownloadUrl;
  const alternateBundleUrl = language === "tr"
    ? profile.bundleUrl
    : profile.turkishBundleUrl;
  const sourceBundleUrl = profile.sourceBundleUrl;

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
          <div className="origin-documents__header-actions detail-actions">
            {localizedBundleDownloadUrl && (
              <a className="button button--dark" href={localizedBundleDownloadUrl}>
                <i className="origin-ui-icon" aria-hidden="true">↓</i>
                {copy.downloadAll}
              </a>
            )}
            {alternateBundleUrl && (
              <a className="button button--outline" href={alternateBundleUrl} target="_blank" rel="noreferrer">
                <i className="origin-ui-icon" aria-hidden="true">{language === "tr" ? "EN" : "TR"}</i>
                {copy.alternateBundle}
              </a>
            )}
            {sourceBundleUrl && (
              <a className="button button--outline" href={sourceBundleUrl} target="_blank" rel="noreferrer">
                <i className="origin-ui-icon" aria-hidden="true">SRC</i>
                {copy.sourceBundle}
              </a>
            )}
          </div>
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
              {types.map((value) => <option key={value} value={value}>{translateCoffeeValue(value, language)}</option>)}
            </select>
          </label>
          <label>
            <span>{copy.process}</span>
            <select value={process} onChange={(event) => setProcess(event.target.value)}>
              <option value="all">{copy.all}</option>
              {processes.map((value) => <option key={value} value={value}>{translateCoffeeValue(value, language)}</option>)}
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
