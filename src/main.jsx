import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { originCatalogIndexUrl, originCatalogMeta } from "./originCatalog";
import "./styles.css";
import "./motion.css";
import "./creative.css";
import "./origin-explorer.css";

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("motion-ready");
}

const catalogRoute = location.pathname === "/compare"
  || location.pathname === "/coffees"
  || location.pathname.startsWith("/coffees/")
  || location.pathname === "/origins"
  || location.pathname.startsWith("/origins/");
let initialOriginCatalog = null;
if (catalogRoute) {
  try {
    const response = await fetch(originCatalogIndexUrl, {
      cache: "force-cache",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Origin index returned ${response.status}`);
    const payload = await response.json();
    if (payload.revision !== originCatalogMeta.revision || !Array.isArray(payload.countries) || payload.countries.length !== originCatalogMeta.countryCount) {
      throw new Error("Origin index validation failed");
    }
    initialOriginCatalog = { status: "ready", countries: payload.countries };
  } catch {
    initialOriginCatalog = { status: "error", countries: [] };
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App initialOriginCatalog={initialOriginCatalog} />
    </BrowserRouter>
  </React.StrictMode>,
);
