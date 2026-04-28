// Hero corridor globe. Uses static route data and degrades silently if globe assets fail.
(function attachWapiRouteGlobe(global) {
  const desktopGlobeMedia = window.matchMedia("(min-width: 1181px)");
  let liveGlobeInitialized = false;
  // GeoJSON is fetched once and reused by the globe renderer.
  const globeGeoDataPromise = fetch("assets/world.geojson")
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then((data) => (Array.isArray(data.features) ? data.features : []))
    .catch(() => []);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const toDeg = (radians) => (radians * 180) / Math.PI;

  const hexToRgba = (hex, alpha) => {
    const normalized = hex.replace("#", "");
    const expanded =
      normalized.length === 3
        ? normalized
            .split("")
            .map((character) => character + character)
            .join("")
        : normalized;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const routeDisplayColor = (route, alpha = 0.96) => {
    if (route.color === "#ffd721") {
      return `rgba(194, 152, 0, ${alpha})`;
    }

    return hexToRgba(route.color, alpha);
  };

  const vectorFromLatLng = (lat, lng) => {
    const latRad = toRad(lat);
    const lngRad = toRad(lng);
    return {
      x: Math.cos(latRad) * Math.sin(lngRad),
      y: Math.sin(latRad),
      z: Math.cos(latRad) * Math.cos(lngRad),
    };
  };

  const normalizeVector = (vector) => {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
  };

  const latLngFromVector = (vector) => ({
    lat: toDeg(Math.atan2(vector.y, Math.hypot(vector.x, vector.z))),
    lng: toDeg(Math.atan2(vector.x, vector.z)),
  });

  const midpointLatLng = (start, end) => {
    const from = vectorFromLatLng(start.lat, start.lng);
    const to = vectorFromLatLng(end.lat, end.lng);
    return latLngFromVector(
      normalizeVector({
        x: from.x + to.x,
        y: from.y + to.y,
        z: from.z + to.z,
      })
    );
  };

  const getCountryName = (feature) =>
    feature?.properties?.name ||
    feature?.properties?.NAME ||
    feature?.properties?.ADMIN ||
    feature?.properties?.NAME_EN ||
    "";

  const normalizeCountryName = (name) =>
    String(name || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");

  const getCountryKey = (name) => {
    const normalized = normalizeCountryName(name);

    if (normalized === "unitedstatesofamerica" || normalized === "usa") {
      return "unitedstates";
    }

    if (normalized === "unitedrepublicoftanzania") {
      return "tanzania";
    }

    if (normalized === "uk") {
      return "unitedkingdom";
    }

    return normalized;
  };

  global.initWapiRouteGlobe = function initWapiRouteGlobe({
    routeGlobe,
    globeRender,
    routeCard,
    routeDock,
  }) {
    if (
      liveGlobeInitialized ||
      !routeGlobe ||
      !globeRender ||
      !routeCard ||
      !routeDock ||
      !global.Globe ||
      !global.WapiRoutes
    ) {
      return;
    }

    const { DEFAULT_ROUTE_ID, MARKET_DEFINITIONS, ROUTE_DEFINITIONS } = global.WapiRoutes;
    liveGlobeInitialized = true;

    try {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const routeTitleEl = routeCard.querySelector("[data-route-title]");
      const routeRateEl = routeCard.querySelector("[data-route-rate]");
      let activeRouteId = DEFAULT_ROUTE_ID;
      let activeRoute = null;
      let cycleInterval = null;
      let cycleResumeTimeout = null;
      let cardUpdateTimer = null;
      let globeFrame = null;
      let countryFeatures = [];
      let lastOverlayFrameTime = 0;
      let lastDockPosition = null;
      let liveGlobeReady = false;
      let sceneActive = !("IntersectionObserver" in window);
      const cityTags = new Map();
      const cityTagPositions = new Map();
      const overlayThrottleMs = 1000 / 30;
      const overlayPositionThreshold = 1.25;

      // Expand route IDs into globe-ready coordinates and styling.
      const routes = ROUTE_DEFINITIONS.map((route) => {
        const fromMarket = MARKET_DEFINITIONS[route.from];
        const toMarket = MARKET_DEFINITIONS[route.to];

        return {
          ...route,
          startLat: fromMarket.lat,
          startLng: fromMarket.lng,
          endLat: toMarket.lat,
          endLng: toMarket.lng,
          midpoint: midpointLatLng(fromMarket, toMarket),
        };
      });

      const routeById = new Map(routes.map((route) => [route.id, route]));

      Object.values(MARKET_DEFINITIONS).forEach((market) => {
        const tag = document.createElement("div");
        tag.className = "network-city-tag";
        tag.textContent = market.label;
        routeGlobe.appendChild(tag);
        cityTags.set(market.id, tag);
      });

      const globe = new global.Globe(globeRender, {
        animateIn: false,
        waitForGlobeReady: false,
        rendererConfig: {
          antialias: true,
          alpha: true,
        },
      })
        .width(globeRender.clientWidth || 560)
        .height(globeRender.clientHeight || 560)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(false)
        .showGraticules(false)
        .enablePointerInteraction(false)
        .pointsTransitionDuration(0)
        .arcsTransitionDuration(0)
        .polygonsTransitionDuration(0);

      const material = globe.globeMaterial && globe.globeMaterial();
      if (material) {
        if (material.color?.set) material.color.set("#f4f6f1");
        if (material.emissive?.set) material.emissive.set("#eef4ec");
        if ("emissiveIntensity" in material) material.emissiveIntensity = 0.1;
        if ("shininess" in material) material.shininess = 2;
        if (material.specular?.set) material.specular.set("#d9ded6");
      }

      const controls = globe.controls && globe.controls();
      if (controls) {
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.56;
      }

      const stopCycle = () => {
        window.clearInterval(cycleInterval);
        cycleInterval = null;
        window.clearTimeout(cycleResumeTimeout);
        cycleResumeTimeout = null;
      };

      const startCycle = () => {
        if (prefersReducedMotion || !sceneActive || !liveGlobeReady || cycleInterval) return;

        cycleInterval = window.setInterval(() => {
          const currentIndex = routes.findIndex((route) => route.id === activeRouteId);
          const nextRoute = routes[(currentIndex + 1) % routes.length];
          setActiveRoute(nextRoute.id, false);
        }, 5800);
      };

      const pauseCycle = () => {
        stopCycle();

        if (prefersReducedMotion || !sceneActive) return;

        cycleResumeTimeout = window.setTimeout(() => {
          startCycle();
        }, 12000);
      };

      const setGlobeRunning = (isRunning) => {
        sceneActive = isRunning;

        if (!liveGlobeReady) return;

        if (controls) {
          controls.autoRotate = isRunning && !prefersReducedMotion;
        }

        if (isRunning) {
          if (typeof globe.resumeAnimation === "function") {
            globe.resumeAnimation();
          }

          if (!globeFrame) {
            globeFrame = window.requestAnimationFrame(updateOverlay);
          }

          startCycle();
        } else {
          stopCycle();

          if (typeof globe.pauseAnimation === "function") {
            globe.pauseAnimation();
          }

          if (globeFrame) {
            window.cancelAnimationFrame(globeFrame);
            globeFrame = null;
          }
        }
      };

      const syncScene = () => {
        activeRoute = routeById.get(activeRouteId);
        if (!activeRoute) return;

        const activeCountries = new Set([
          getCountryKey(MARKET_DEFINITIONS[activeRoute.from].country),
          getCountryKey(MARKET_DEFINITIONS[activeRoute.to].country),
        ]);
        const activeMarketPoints = [MARKET_DEFINITIONS[activeRoute.from], MARKET_DEFINITIONS[activeRoute.to]].map(
          (market) => ({
            ...market,
            active: true,
          })
        );

        globe
          .polygonsData(countryFeatures)
          .polygonCapColor((feature) =>
            activeCountries.has(getCountryKey(getCountryName(feature)))
              ? hexToRgba(activeRoute.color, 0.18)
              : "rgba(17, 17, 17, 0.035)"
          )
          .polygonSideColor(() => "rgba(0, 0, 0, 0)")
          .polygonStrokeColor((feature) =>
            activeCountries.has(getCountryKey(getCountryName(feature)))
              ? hexToRgba(activeRoute.color, 0.22)
              : "rgba(17, 17, 17, 0.08)"
          )
          .polygonAltitude((feature) =>
            activeCountries.has(getCountryKey(getCountryName(feature))) ? 0.006 : 0.0015
          )
          .pointsData(activeMarketPoints)
          .pointLat("lat")
          .pointLng("lng")
          .pointColor(() => hexToRgba(activeRoute.color, 0.96))
          .pointAltitude(() => 0.022)
          .pointRadius(() => 0.34)
          .ringsData([])
          .arcsData([activeRoute])
          .arcStartLat("startLat")
          .arcStartLng("startLng")
          .arcEndLat("endLat")
          .arcEndLng("endLng")
          .arcColor((corridor) => [
            routeDisplayColor(corridor, 0.98),
            routeDisplayColor(corridor, 0.9),
          ])
          .arcAltitude((corridor) => corridor.arcAltitude)
          .arcStroke(() => 0.21)
          .arcDashLength(() => 0.36)
          .arcDashGap(() => 0.58)
          .arcDashAnimateTime((corridor) => corridor.animationMs);
      };

      const setCityTagPosition = (marketId) => {
        const tag = cityTags.get(marketId);
        const market = MARKET_DEFINITIONS[marketId];

        if (!tag || !market) return;

        const point = globe.getScreenCoords(market.lat, market.lng, 0.02);
        const globeRect = routeGlobe.getBoundingClientRect();

        if (!point) {
          tag.classList.remove("is-visible");
          cityTagPositions.delete(marketId);
          return;
        }

        const localX = point.x - globeRect.left;
        const localY = point.y - globeRect.top;
        const inside =
          localX > 8 &&
          localY > 8 &&
          localX < globeRect.width - 8 &&
          localY < globeRect.height - 8;

        if (!inside) {
          tag.classList.remove("is-visible");
          cityTagPositions.delete(marketId);
          return;
        }

        const nextX = Number(localX.toFixed(2));
        const nextY = Number((localY - 18).toFixed(2));
        const previousPosition = cityTagPositions.get(marketId);

        if (
          !previousPosition ||
          Math.abs(previousPosition.x - nextX) > overlayPositionThreshold ||
          Math.abs(previousPosition.y - nextY) > overlayPositionThreshold
        ) {
          tag.style.left = `${nextX}px`;
          tag.style.top = `${nextY}px`;
          cityTagPositions.set(marketId, { x: nextX, y: nextY });
        }

        tag.classList.add("is-visible");
      };

      const updateDockPosition = () => {
        if (!activeRoute) return;

        const frameRect = routeGlobe.closest("[data-network]")?.getBoundingClientRect();
        const globeRect = routeGlobe.getBoundingClientRect();
        const midpoint = globe.getScreenCoords(
          activeRoute.midpoint.lat,
          activeRoute.midpoint.lng,
          activeRoute.arcAltitude * 0.72
        );

        if (!frameRect || !midpoint) return;

        const localX = midpoint.x - globeRect.left;
        const localY = midpoint.y - globeRect.top;
        const dockWidth = routeDock.offsetWidth || 232;
        const dockHeight = routeDock.offsetHeight || 104;
        const gap = 18;
        const margin = 12;
        const normalizedX = (localX - globeRect.width / 2) / (globeRect.width / 2);
        const normalizedY = (localY - globeRect.height / 2) / (globeRect.height / 2);
        let dockLocalLeft = localX - dockWidth / 2;
        let dockLocalTop = localY - dockHeight / 2;

        if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
          dockLocalLeft = normalizedX > 0 ? localX - dockWidth - gap : localX + gap;
        } else {
          dockLocalTop = normalizedY > 0 ? localY - dockHeight - gap : localY + gap;
        }

        dockLocalLeft = clamp(dockLocalLeft, margin, globeRect.width - dockWidth - margin);
        dockLocalTop = clamp(dockLocalTop, margin, globeRect.height - dockHeight - margin);

        const nextDockX = Number((globeRect.left - frameRect.left + dockLocalLeft).toFixed(2));
        const nextDockY = Number((globeRect.top - frameRect.top + dockLocalTop).toFixed(2));

        if (
          !lastDockPosition ||
          Math.abs(lastDockPosition.x - nextDockX) > overlayPositionThreshold ||
          Math.abs(lastDockPosition.y - nextDockY) > overlayPositionThreshold
        ) {
          routeDock.style.setProperty("--dock-x", `${nextDockX}px`);
          routeDock.style.setProperty("--dock-y", `${nextDockY}px`);
          lastDockPosition = { x: nextDockX, y: nextDockY };
        }
      };

      function setActiveRoute(routeId, isUserInitiated, animateCard = true) {
        const route = routeById.get(routeId);
        if (!route) return;

        activeRouteId = routeId;
        routeGlobe.style.setProperty("--route-accent", route.color);
        routeDock.style.setProperty("--route-accent", route.color);
        routeCard.style.setProperty("--route-accent", route.color);

        if (routeTitleEl) routeTitleEl.textContent = route.title;
        if (routeRateEl) routeRateEl.textContent = route.heroRate || route.rate;

        window.clearTimeout(cardUpdateTimer);
        if (animateCard) {
          routeCard.classList.add("is-updating");
        } else {
          routeCard.classList.remove("is-updating");
        }

        syncScene();
        globe.pointOfView(route.focus, prefersReducedMotion ? 0 : 1200);

        if (animateCard) {
          cardUpdateTimer = window.setTimeout(() => {
            routeCard.classList.remove("is-updating");
          }, 220);
        }

        if (isUserInitiated) {
          pauseCycle();
        }
      }

      const updateOverlay = (timestamp = 0) => {
        if (!sceneActive) {
          globeFrame = null;
          return;
        }

        if (
          activeRoute &&
          (!lastOverlayFrameTime || timestamp - lastOverlayFrameTime >= overlayThrottleMs)
        ) {
          lastOverlayFrameTime = timestamp;
          setCityTagPosition(activeRoute.from);
          setCityTagPosition(activeRoute.to);
          updateDockPosition();
        }

        globeFrame = window.requestAnimationFrame(updateOverlay);
      };

      const resizeGlobe = () => {
        const width = globeRender.clientWidth || 560;
        const height = globeRender.clientHeight || width;
        lastDockPosition = null;
        cityTagPositions.clear();
        globe.width(width).height(height);
        updateDockPosition();
      };

      const beginLiveGlobe = () => {
        if (!desktopGlobeMedia.matches || !global.Globe) return;

        window.addEventListener("resize", resizeGlobe);
        globeGeoDataPromise.then((features) => {
          countryFeatures = features;
          setActiveRoute(activeRouteId, false, false);
          resizeGlobe();
          routeGlobe.classList.add("is-globe-ready");
          liveGlobeReady = true;
          setGlobeRunning(sceneActive);
        });
      };

      const handleGlobeMediaChange = (event) => {
        if (event.matches) {
          beginLiveGlobe();
        }
      };

      if (desktopGlobeMedia.matches) {
        beginLiveGlobe();
      }

      if ("IntersectionObserver" in window) {
        const visibilityTarget = routeGlobe.closest("[data-network]") || routeGlobe;
        const visibilityObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            setGlobeRunning(Boolean(entry && entry.isIntersecting));
          },
          {
            rootMargin: "160px 0px 160px 0px",
            threshold: 0.01,
          }
        );

        visibilityObserver.observe(visibilityTarget);
      }

      if (typeof desktopGlobeMedia.addEventListener === "function") {
        desktopGlobeMedia.addEventListener("change", handleGlobeMediaChange);
      } else if (typeof desktopGlobeMedia.addListener === "function") {
        desktopGlobeMedia.addListener(handleGlobeMediaChange);
      }
    } catch (error) {
      console.error("Wapi globe init failed", error);
    }
  };
})(window);
