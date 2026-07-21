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
  ".compare-picker > button",
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
  const frame = useRef(0);

  useEffect(() => {
    const updateScrollState = () => {
      frame.current = 0;
      const root = document.documentElement;
      const scrollRange = Math.max(0, root.scrollHeight - window.innerHeight);
      const progress = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0;
      const nextBackToTop = window.scrollY > Math.max(520, window.innerHeight * 0.75);

      root.style.setProperty("--page-progress", String(progress));
      document.querySelector(".site-header")?.classList.toggle("is-scrolled", window.scrollY > 18);
      setShowBackToTop((current) => current === nextBackToTop ? current : nextBackToTop);
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
    };
  }, [pathname]);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
    const reveal = (element) => element.classList.add("is-revealed");

    targets.forEach((element, index) => {
      element.dataset.reveal = "true";
      element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(reveal);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.12 });

    targets.forEach((element) => {
      if (element.getBoundingClientRect().top <= window.innerHeight * 0.92) reveal(element);
      else observer.observe(element);
    });

    return () => observer.disconnect();
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
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  };

  return (
    <>
      <div className="route-loader" aria-hidden="true"><span /></div>
      <div className="scroll-progress" aria-hidden="true"><span /></div>
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
