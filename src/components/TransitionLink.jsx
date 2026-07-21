import { Link as RouterLink, NavLink as RouterNavLink, useNavigate } from "react-router-dom";

const TRANSITION_TIMEOUT_MS = 1200;
let activeTransition = null;
let transitionSequence = 0;

function useSafeTransitionClick({
  to,
  onClick,
  target,
  replace,
  state,
  preventScrollReset,
  relative,
  reloadDocument,
  download,
}) {
  const navigate = useNavigate();

  return (event) => {
    onClick?.(event);

    const isPlainNavigation = !event.defaultPrevented
      && event.button === 0
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey
      && (!target || target === "_self")
      && !reloadDocument
      && download == null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isPlainNavigation) return;

    window.dispatchEvent(new Event("app:before-navigation"));

    if (reduceMotion || typeof document.startViewTransition !== "function") return;

    event.preventDefault();

    try {
      activeTransition?.skipTransition?.();
    } catch {
      activeTransition = null;
    }

    const sequence = ++transitionSequence;
    const root = document.documentElement;
    let navigationCommitted = false;
    let releaseTimer = 0;

    const commitNavigation = () => {
      if (navigationCommitted) return;
      navigationCommitted = true;
      navigate(to, { replace, state, preventScrollReset, relative, flushSync: true });
    };

    const release = () => {
      window.clearTimeout(releaseTimer);
      if (sequence !== transitionSequence) return;
      root.classList.remove("route-changing");
      activeTransition = null;
    };

    root.classList.add("route-changing");

    try {
      const transition = document.startViewTransition(commitNavigation);
      activeTransition = transition;
      releaseTimer = window.setTimeout(() => {
        try {
          transition.skipTransition?.();
        } finally {
          release();
        }
      }, TRANSITION_TIMEOUT_MS);

      Promise.resolve(transition.ready).catch(() => {});
      Promise.resolve(transition.updateCallbackDone).catch(() => {});
      Promise.resolve(transition.finished).catch(() => {}).finally(release);
    } catch {
      commitNavigation();
      release();
    }
  };
}

export function Link({
  to,
  onClick,
  target,
  replace,
  state,
  preventScrollReset,
  relative,
  reloadDocument,
  download,
  ...props
}) {
  const handleClick = useSafeTransitionClick({
    to,
    onClick,
    target,
    replace,
    state,
    preventScrollReset,
    relative,
    reloadDocument,
    download,
  });

  return (
    <RouterLink
      {...props}
      to={to}
      target={target}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
      reloadDocument={reloadDocument}
      download={download}
      onClick={handleClick}
    />
  );
}

export function NavLink({
  to,
  onClick,
  target,
  replace,
  state,
  preventScrollReset,
  relative,
  reloadDocument,
  download,
  ...props
}) {
  const handleClick = useSafeTransitionClick({
    to,
    onClick,
    target,
    replace,
    state,
    preventScrollReset,
    relative,
    reloadDocument,
    download,
  });

  return (
    <RouterNavLink
      {...props}
      to={to}
      target={target}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
      reloadDocument={reloadDocument}
      download={download}
      onClick={handleClick}
    />
  );
}
