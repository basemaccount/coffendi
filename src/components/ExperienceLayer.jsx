import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation } from "react-router-dom";

const REVEAL_SELECTOR = [
  ".service-strip .shell > div",
  ".origin-atlas__header > *",
  ".origin-atlas__controls",
  ".origin-atlas__visual",
  ".origin-atlas__readout",
  ".section-heading",
  ".profile-card",
  ".story-grid > *",
  ".story-steps > li",
  ".comparison-teaser .shell > *",
  ".decision-grid > article",
  ".origin-card",
  ".compare-table",
  ".pillar-grid > article",
  ".approach-feature > *",
  ".contact-layout > *",
  ".policy > *",
  ".not-found > *",
  ".footer-lead > *",
  ".footer-grid > *",
].join(",");

export default function ExperienceLayer({ language }) {
  const { pathname } = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showChapterNavigator, setShowChapterNavigator] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [routeAnnouncement, setRouteAnnouncement] = useState("");
  const [connectionNotice, setConnectionNotice] = useState(null);
  const frame = useRef(0);

  useEffect(() => {
    const nativeScrollTimeline = window.CSS?.supports?.("animation-timeline: scroll(root block)") ?? false;
    const updateScrollState = () => {
      frame.current = 0;
      const root = document.documentElement;
      const nextBackToTop = window.scrollY > Math.max(520, window.innerHeight * 0.75);
      const nextChapterNavigator = window.scrollY > Math.max(240, window.innerHeight * 0.34);

      if (!nativeScrollTimeline) {
        const scrollRange = Math.max(0, root.scrollHeight - window.innerHeight);
        const progress = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0;
        root.style.setProperty("--page-progress", String(progress));
      }
      document.querySelector(".site-header")?.classList.toggle("is-scrolled", window.scrollY > 18);
      setShowBackToTop((current) => current === nextBackToTop ? current : nextBackToTop);
      setShowChapterNavigator((current) => current === nextChapterNavigator ? current : nextChapterNavigator);
    };

    const queueUpdate = () => {
      if (!frame.current) frame.current = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (frame.current) window.cancelAnimationFrame(frame.current);
      if (!nativeScrollTimeline) document.documentElement.style.removeProperty("--page-progress");
    };
  }, [pathname]);

  useEffect(() => {
    let wasOffline = !navigator.onLine;
    let clearTimer = 0;
    const handleOffline = () => {
      wasOffline = true;
      window.clearTimeout(clearTimer);
      setConnectionNotice("offline");
    };
    const handleOnline = () => {
      if (!wasOffline) return;
      wasOffline = false;
      window.clearTimeout(clearTimer);
      setConnectionNotice("online");
      clearTimer = window.setTimeout(() => setConnectionNotice(null), 3600);
    };
    const handlePageShow = (event) => {
      if (!event.persisted) return;
      const root = document.documentElement;
      root.classList.remove("route-changing", "is-restoring-scroll");
      document.body.classList.remove("no-scroll");
      document.querySelector("#main-content")?.removeAttribute("inert");
      document.querySelector(".site-footer")?.removeAttribute("inert");
      window.dispatchEvent(new Event("app:pageshow"));
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("scroll")));
    };

    if (!navigator.onLine) handleOffline();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useLayoutEffect(() => {
    const main = document.querySelector("#main-content");
    if (!main) return undefined;

    const routeKey = pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    const sectionNodes = Array.from(main.children).filter((element) => (
      element.tagName === "SECTION"
      && (element.querySelector("h1, h2") || element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby"))
    ));
    const nextChapters = sectionNodes.map((section, index) => {
      const heading = section.querySelector("h1, h2");
      const fallback = language === "tr" ? `Bölüm ${index + 1}` : `Section ${index + 1}`;
      const label = heading?.textContent?.replace(/\s+/g, " ").trim() || section.getAttribute("aria-label") || fallback;
      const generatedId = !section.id;
      if (generatedId) section.id = `chapter-${routeKey}-${String(index + 1).padStart(2, "0")}`;
      if (generatedId) section.dataset.experienceChapterId = "true";
      if (index >= 2) section.dataset.renderDeferred = "true";
      return { id: section.id, label, number: index + 1 };
    });

    setChapters(nextChapters);
    setActiveChapterId(nextChapters[0]?.id || "");

    const chapterObserver = "IntersectionObserver" in window && nextChapters.length > 1
      ? new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top);
        if (visible[0]) setActiveChapterId(visible[0].target.id);
      }, { rootMargin: "-18% 0px -72% 0px", threshold: 0 })
      : null;

    sectionNodes.forEach((section) => chapterObserver?.observe(section));

    const footer = document.querySelector(".site-footer");
    const footerObserver = footer && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting), { rootMargin: "0px 0px -10% 0px" })
      : null;
    if (footer) footerObserver?.observe(footer);

    return () => {
      chapterObserver?.disconnect();
      footerObserver?.disconnect();
      sectionNodes.forEach((section) => {
        delete section.dataset.renderDeferred;
        if (section.dataset.experienceChapterId === "true") {
          section.removeAttribute("id");
          delete section.dataset.experienceChapterId;
        }
      });
    };
  }, [pathname, language]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const suffix = language === "tr" ? "Sayfa yüklendi." : "Page loaded.";
      setRouteAnnouncement(`${document.title}. ${suffix}`);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname, language]);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    const reveal = (element) => element.classList.add("is-revealed");
    const revealAll = () => targets.forEach(reveal);
    const revealPassedViewport = () => targets.forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) reveal(element);
    });

    targets.forEach((element, index) => {
      element.dataset.reveal = "true";
      element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const aboveViewport = entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0);
        if (!entry.isIntersecting && !aboveViewport) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.12 });

    targets.forEach((element) => observer.observe(element));
    const revealFailsafe = window.setTimeout(revealPassedViewport, 1400);
    window.addEventListener("app:pageshow", revealPassedViewport);

    return () => {
      window.clearTimeout(revealFailsafe);
      window.removeEventListener("app:pageshow", revealPassedViewport);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!precisePointer || reduceMotion) return undefined;

    const cleanups = Array.from(document.querySelectorAll("[data-optical]")).map((surface) => {
      let pointerFrame = 0;
      let pendingEvent;
      const renderPointer = () => {
        pointerFrame = 0;
        if (!pendingEvent) return;
        const bounds = surface.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (pendingEvent.clientX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (pendingEvent.clientY - bounds.top) / bounds.height));
        surface.style.setProperty("--optical-x", `${x * 100}%`);
        surface.style.setProperty("--optical-y", `${y * 100}%`);
        surface.style.setProperty("--optical-shift-x", `${(x - 0.5) * -8}px`);
        surface.style.setProperty("--optical-shift-y", `${(y - 0.5) * -8}px`);
        surface.classList.add("is-optical-active");
      };
      const handlePointerMove = (event) => {
        pendingEvent = event;
        if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
      };
      const handlePointerLeave = () => {
        surface.classList.remove("is-optical-active");
        surface.style.setProperty("--optical-shift-x", "0px");
        surface.style.setProperty("--optical-shift-y", "0px");
      };

      surface.addEventListener("pointermove", handlePointerMove, { passive: true });
      surface.addEventListener("pointerleave", handlePointerLeave);
      return () => {
        surface.removeEventListener("pointermove", handlePointerMove);
        surface.removeEventListener("pointerleave", handlePointerLeave);
        if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname]);

  const returnToTop = () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    window.scrollTo({ top: 0, behavior });
  };

  const goToChapter = (chapterId) => {
    const target = document.getElementById(chapterId);
    if (!target) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    setActiveChapterId(chapterId);
    target.scrollIntoView({ block: "start", behavior });
  };

  const activeIndex = Math.max(0, chapters.findIndex(({ id }) => id === activeChapterId));
  const chapterNavigatorVisible = showChapterNavigator && !footerInView && chapters.length > 1;

  return (
    <>
      <p className="experience-announcer" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement}</p>
      {connectionNotice && <div className={`connection-notice is-${connectionNotice}`} role="status" aria-live="polite"><span aria-hidden="true" /><div><strong>{language === "tr" ? connectionNotice === "offline" ? "Bağlantı kesildi" : "Bağlantı yeniden kuruldu" : connectionNotice === "offline" ? "You’re offline" : "Connection restored"}</strong><small>{language === "tr" ? connectionNotice === "offline" ? "Bazı görseller ve talep gönderimi kullanılamayabilir." : "Gezinmeye ve talep göndermeye devam edebilirsiniz." : connectionNotice === "offline" ? "Some images and inquiry submission may be unavailable." : "You can continue browsing and submit an inquiry."}</small></div></div>}
      <div className="route-loader" aria-hidden="true"><span /></div>
      <div className="scroll-progress" aria-hidden="true"><span /></div>
      <nav
        className={`chapter-navigator ${chapterNavigatorVisible ? "is-visible" : ""}`}
        aria-label={language === "tr" ? "Sayfa bölümleri" : "Page sections"}
        aria-hidden={!chapterNavigatorVisible}
      >
        <div className="chapter-navigator__meta" aria-hidden="true">
          <small>{language === "tr" ? "Bölüm" : "Chapter"}</small>
          <strong>{String(activeIndex + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}</strong>
          <span>{chapters[activeIndex]?.label}</span>
        </div>
        <div className="chapter-navigator__track">
          {chapters.map((chapter) => {
            const active = chapter.id === activeChapterId;
            return (
              <button
                key={chapter.id}
                type="button"
                className={active ? "is-active" : ""}
                aria-current={active ? "step" : undefined}
                aria-controls={chapter.id}
                aria-label={`${language === "tr" ? "Bölüme git" : "Go to section"}: ${chapter.label}`}
                tabIndex={chapterNavigatorVisible ? 0 : -1}
                title={chapter.label}
                onClick={() => goToChapter(chapter.id)}
              >
                <span aria-hidden="true">{String(chapter.number).padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <button
        className={`back-to-top ${showBackToTop ? "is-visible" : ""}`}
        type="button"
        aria-label={language === "tr" ? "Sayfanın başına dön" : "Back to top"}
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        onClick={returnToTop}
      >
        <ArrowUp aria-hidden="true" />
      </button>
    </>
  );
}
