(() => {
  const key = `${location.host}:preload-recovery`;
  addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    try {
      const now = Date.now();
      if (now - Number(sessionStorage[key] || 0) < 10_000) return;
      sessionStorage[key] = now;
      location.reload();
    } catch {}
  });
})();
