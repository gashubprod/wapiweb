// Final bootstrap: render shared layout, initialize page behavior, then start the hero globe.
if (window.renderWapiLayout) {
  window.renderWapiLayout();
}

if (window.initWapiUi) {
  window.initWapiUi();
}

function loadWapiScriptOnce(src) {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.body.appendChild(script);
  });
}

function initDeferredRateCheck() {
  const routeRateSlugs = new Set([
    "kenya-to-china",
    "kenya-to-india",
    "kenya-to-tanzania",
    "kenya-to-uganda",
    "kenya-to-united-kingdom",
    "kenya-to-united-states",
    "uganda-to-china",
    "uganda-to-india",
    "uganda-to-kenya",
    "uganda-to-tanzania",
    "uganda-to-united-kingdom",
    "uganda-to-united-states",
  ]);
  const currentSlug = window.location.pathname.split("/").filter(Boolean).pop();
  const needsRateCheck = document.querySelector("[data-rate-form]") || routeRateSlugs.has(currentSlug);
  if (!needsRateCheck) return;

  if (window.WapiRoutes && window.initWapiRateCheck) {
    window.initWapiRateCheck();
    return;
  }

  const basePath = document.body?.dataset.basePath || "";
  ["js/routes.js", "js/rates-api.js", "js/rate-check.js"]
    .reduce(
      (queue, path) => queue.then(() => loadWapiScriptOnce(`${basePath}${path}`)),
      Promise.resolve()
    )
    .then(() => {
      if (window.initWapiRateCheck) window.initWapiRateCheck();
    })
    .catch(() => {
      // Route pages keep their static rate copy if the enhancement scripts cannot load.
    });
}

initDeferredRateCheck();

window.startWapiRouteGlobe = function startWapiRouteGlobe() {
  const routeGlobe = document.querySelector("[data-route-globe]");
  const globeRender = document.querySelector("[data-globe-render]");
  const routeCard = document.querySelector("[data-route-card]");
  const routeDock = document.querySelector(".network-route-dock");

  if (routeGlobe && globeRender && routeCard && routeDock && window.initWapiRouteGlobe) {
    window.initWapiRouteGlobe({
      routeGlobe,
      globeRender,
      routeCard,
      routeDock,
    });
  }
};

window.startWapiRouteGlobe();
