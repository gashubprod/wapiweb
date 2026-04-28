// Loads the expensive 3D globe only on desktop where the hero visual is displayed.
(function attachWapiGlobeLoader(global) {
  const desktopGlobeMedia = global.matchMedia("(min-width: 1181px)");
  let requested = false;

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const loadDesktopGlobe = () => {
    if (requested || !desktopGlobeMedia.matches) return;
    requested = true;

    const startWhenBootstrapIsReady = (attempt = 0) => {
      if (typeof global.startWapiRouteGlobe === "function") {
        global.startWapiRouteGlobe();
        return;
      }

      if (attempt < 20) {
        global.setTimeout(() => startWhenBootstrapIsReady(attempt + 1), 50);
      }
    };

    loadScript("vendor/three.min.js")
      .then(() => loadScript("vendor/globe.gl.min.js"))
      .then(() => loadScript("js/globe.js"))
      .then(() => startWhenBootstrapIsReady())
      .catch(() => {
        requested = false;
      });
  };

  loadDesktopGlobe();

  if (typeof desktopGlobeMedia.addEventListener === "function") {
    desktopGlobeMedia.addEventListener("change", loadDesktopGlobe);
  } else if (typeof desktopGlobeMedia.addListener === "function") {
    desktopGlobeMedia.addListener(loadDesktopGlobe);
  }
})(window);
