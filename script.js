const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const revealItems = document.querySelectorAll(".reveal");
const statCounters = document.querySelectorAll("[data-counter]");
const network = document.querySelector("[data-network]");
const routeGlobe = document.querySelector("[data-route-globe]");
const globeRender = document.querySelector("[data-globe-render]");
const routeCard = document.querySelector("[data-route-card]");
const routeDock = document.querySelector(".network-route-dock");
const rateForm = document.querySelector("[data-rate-form]");
const rateAmountInput = document.querySelector("[data-rate-amount]");
const rateRouteSelect = document.querySelector("[data-rate-route]");
const rateOutput = document.querySelector("[data-rate-output]");
const rateMeta = document.querySelector("[data-rate-meta]");
const productSteps = document.querySelectorAll(".product-step");
const productPanels = document.querySelectorAll("[data-product-panel]");
const scrollCards = document.querySelectorAll(
  ".rail-orbit-shell, .tension-card, .cta-panel"
);
const supportsHeroParallax = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const sharedRouteRates = new Map([
  [
    "lagos-nairobi",
    { rate: "1 USD = 128.40 KES", multiplier: 128.4, outputCurrency: "KES" },
  ],
  [
    "nairobi-guangzhou",
    { rate: "1 USD = 7.24 CNY", multiplier: 7.24, outputCurrency: "CNY" },
  ],
  [
    "kampala-guangzhou",
    { rate: "1 USD = 7.24 CNY", multiplier: 7.24, outputCurrency: "CNY" },
  ],
  [
    "nairobi-lagos",
    { rate: "1 USD = 1548.20 NGN", multiplier: 1548.2, outputCurrency: "NGN" },
  ],
]);
const desktopGlobeMedia = window.matchMedia("(min-width: 981px)");
let liveGlobeInitialized = false;
const globeGeoDataPromise = fetch("assets/world.geojson")
  .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
  .then((data) => (Array.isArray(data.features) ? data.features : []))
  .catch(() => []);

const formatRateAmount = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const syncRateEstimate = (preferredRouteId = null) => {
  if (!rateOutput || !rateMeta || !rateAmountInput || !rateRouteSelect) return;

  const selectedRoute =
    sharedRouteRates.get(preferredRouteId || rateRouteSelect.value) ||
    sharedRouteRates.values().next().value;
  const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
  const received = amount * selectedRoute.multiplier;

  rateOutput.textContent = `${formatRateAmount(received)} ${selectedRoute.outputCurrency}`;
  rateMeta.textContent = `Indicative rate ${selectedRoute.rate}`;
};

if (rateForm && rateAmountInput && rateRouteSelect) {
  rateAmountInput.addEventListener("input", () => syncRateEstimate());
  rateRouteSelect.addEventListener("change", () => syncRateEstimate());
  syncRateEstimate();
}

if (menuToggle && header && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

if (network && supportsHeroParallax && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const layers = network.querySelectorAll("[data-depth]");

  network.addEventListener("pointermove", (event) => {
    const rect = network.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth) || 1;
      const moveX = (offsetX / rect.width) * depth * 14;
      const moveY = (offsetY / rect.height) * depth * 14;
      layer.style.setProperty("--move-x", `${moveX}px`);
      layer.style.setProperty("--move-y", `${moveY}px`);
    });
  });

  network.addEventListener("pointerleave", () => {
    layers.forEach((layer) => {
      layer.style.removeProperty("--move-x");
      layer.style.removeProperty("--move-y");
    });
  });
}

if (productSteps.length && productPanels.length) {
  const setActiveProduct = (productId) => {
    productSteps.forEach((step) => {
      const isActive = step.dataset.product === productId;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-pressed", String(isActive));
    });

    productPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.productPanel === productId);
    });
  };

  setActiveProduct(productSteps[0].dataset.product);

  productSteps.forEach((step) => {
    step.addEventListener("click", () => {
      setActiveProduct(step.dataset.product);
    });

    step.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setActiveProduct(step.dataset.product);
    });
  });

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const productObserver = new IntersectionObserver(
      (entries) => {
        let bestEntry = null;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        });

        if (bestEntry) {
          setActiveProduct(bestEntry.target.dataset.product);
        }
      },
      {
        threshold: [0.35, 0.6, 0.85],
        rootMargin: "-18% 0px -28% 0px",
      }
    );

    productSteps.forEach((step) => productObserver.observe(step));
  }
}

if (scrollCards.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let cardFrame = null;

  const updateScrollCards = () => {
    const viewportHeight = window.innerHeight;

    scrollCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const progress = Math.min(Math.max((viewportHeight - rect.top) / (viewportHeight * 0.92), 0), 1);
      const rise = (1 - progress) * 74;
      const scale = 0.95 + progress * 0.05;
      const tilt = (1 - progress) * 7;
      const alpha = 0.58 + progress * 0.42;

      card.style.setProperty("--card-rise", `${rise.toFixed(2)}px`);
      card.style.setProperty("--card-scale", scale.toFixed(3));
      card.style.setProperty("--card-tilt", `${tilt.toFixed(2)}deg`);
      card.style.setProperty("--card-alpha", alpha.toFixed(3));
    });

    cardFrame = null;
  };

  const requestCardUpdate = () => {
    if (cardFrame !== null) return;
    cardFrame = window.requestAnimationFrame(updateScrollCards);
  };

  window.addEventListener("scroll", requestCardUpdate, { passive: true });
  window.addEventListener("resize", requestCardUpdate);
  requestCardUpdate();
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const targetValue = element.dataset.counter;

      if (targetValue.includes("+") || targetValue.includes("/")) {
        element.textContent = targetValue;
      } else {
        const target = Number(targetValue);
        const duration = 1000;
        const start = performance.now();

        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          element.textContent = String(Math.floor(progress * target));

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            element.textContent = String(target);
          }
        };

        requestAnimationFrame(tick);
      }

      counterObserver.unobserve(element);
    });
  },
  { threshold: 0.55 }
);

statCounters.forEach((counter) => counterObserver.observe(counter));

const initLiveGlobe = () => {
  if (liveGlobeInitialized || !routeGlobe || !globeRender || !routeCard || !routeDock || !window.Globe) {
    return;
  }

  liveGlobeInitialized = true;

  try {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const routeTitleEl = routeCard.querySelector("[data-route-title]");
    const routeRateEl = routeCard.querySelector("[data-route-rate]");
    let activeRouteId = "lagos-nairobi";
    let activeRoute = null;
    let cycleInterval = null;
    let cycleResumeTimeout = null;
    let cardUpdateTimer = null;
    let globeFrame = null;
    let countryFeatures = [];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const toDeg = (radians) => (radians * 180) / Math.PI;
    const formatAmount = (value) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

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

    const markets = {
      lagos: {
        id: "lagos",
        label: "Lagos",
        country: "Nigeria",
        lat: 6.5244,
        lng: 3.3792,
      },
      kampala: {
        id: "kampala",
        label: "Kampala",
        country: "Uganda",
        lat: 0.3476,
        lng: 32.5825,
      },
      nairobi: {
        id: "nairobi",
        label: "Nairobi",
        country: "Kenya",
        lat: -1.286389,
        lng: 36.817223,
      },
      guangzhou: {
        id: "guangzhou",
        label: "Guangzhou",
        country: "China",
        lat: 23.1291,
        lng: 113.2644,
      },
    };

    const routes = [
      {
        id: "lagos-nairobi",
        title: "Lagos to Nairobi",
        rate: "1 USD = 128.40 KES",
        multiplier: 128.4,
        outputCurrency: "KES",
        color: "#00b549",
        from: "lagos",
        to: "nairobi",
        arcAltitude: 0.18,
        animationMs: 3000,
        focus: { lat: 4.4, lng: 19.8, altitude: 1.56 },
      },
      {
        id: "nairobi-guangzhou",
        title: "Nairobi to Guangzhou",
        rate: "1 USD = 7.24 CNY",
        multiplier: 7.24,
        outputCurrency: "CNY",
        color: "#00b549",
        from: "nairobi",
        to: "guangzhou",
        arcAltitude: 0.22,
        animationMs: 3300,
        focus: { lat: 12.4, lng: 73.8, altitude: 1.62 },
      },
      {
        id: "kampala-guangzhou",
        title: "Kampala to Guangzhou",
        rate: "1 USD = 7.24 CNY",
        multiplier: 7.24,
        outputCurrency: "CNY",
        color: "#ffd721",
        from: "kampala",
        to: "guangzhou",
        arcAltitude: 0.23,
        animationMs: 3500,
        focus: { lat: 12.7, lng: 75.3, altitude: 1.62 },
      },
      {
        id: "nairobi-lagos",
        title: "Nairobi to Lagos",
        rate: "1 USD = 1548.20 NGN",
        multiplier: 1548.2,
        outputCurrency: "NGN",
        color: "#00b549",
        from: "nairobi",
        to: "lagos",
        arcAltitude: 0.18,
        animationMs: 3000,
        focus: { lat: 4.4, lng: 19.8, altitude: 1.56 },
      },
    ].map((route) => {
      const fromMarket = markets[route.from];
      const toMarket = markets[route.to];

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
    const cityTags = new Map();
    const cityTagPositions = new Map();
    const overlayThrottleMs = 1000 / 30;
    const overlayPositionThreshold = 1.25;
    let lastOverlayFrameTime = 0;
    let lastDockPosition = null;

    Object.values(markets).forEach((market) => {
      const tag = document.createElement("div");
      tag.className = "network-city-tag";
      tag.textContent = market.label;
      routeGlobe.appendChild(tag);
      cityTags.set(market.id, tag);
    });

    const globe = new window.Globe(globeRender, {
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
      controls.autoRotate = !prefersReducedMotion;
      controls.autoRotateSpeed = 0.56;
    }

    const updateRateEstimate = () => {
      if (!rateOutput || !rateMeta || !rateAmountInput || !rateRouteSelect) return;

      const selectedRoute = routeById.get(rateRouteSelect.value) || routeById.get(activeRouteId);
      const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
      const received = amount * selectedRoute.multiplier;

      rateOutput.textContent = `${formatAmount(received)} ${selectedRoute.outputCurrency}`;
      rateMeta.textContent = `Indicative rate ${selectedRoute.rate}`;
    };

    const stopCycle = () => {
      window.clearInterval(cycleInterval);
      cycleInterval = null;
      window.clearTimeout(cycleResumeTimeout);
      cycleResumeTimeout = null;
    };

    const startCycle = () => {
      if (prefersReducedMotion || cycleInterval) return;

      cycleInterval = window.setInterval(() => {
        const currentIndex = routes.findIndex((route) => route.id === activeRouteId);
        const nextRoute = routes[(currentIndex + 1) % routes.length];
        setActiveRoute(nextRoute.id, false);
      }, 5800);
    };

    const pauseCycle = () => {
      stopCycle();

      if (prefersReducedMotion) return;

      cycleResumeTimeout = window.setTimeout(() => {
        startCycle();
      }, 12000);
    };

    const syncScene = () => {
      activeRoute = routeById.get(activeRouteId);
      if (!activeRoute) return;

      const activeCountries = new Set([
        markets[activeRoute.from].country,
        markets[activeRoute.to].country,
      ]);
      const activeMarketPoints = [markets[activeRoute.from], markets[activeRoute.to]].map(
        (market) => ({
          ...market,
          active: true,
        })
      );

      globe
        .polygonsData(countryFeatures)
        .polygonCapColor((feature) =>
          activeCountries.has(getCountryName(feature))
            ? hexToRgba(activeRoute.color, 0.18)
            : "rgba(17, 17, 17, 0.035)"
        )
        .polygonSideColor(() => "rgba(0, 0, 0, 0)")
        .polygonStrokeColor((feature) =>
          activeCountries.has(getCountryName(feature))
            ? hexToRgba(activeRoute.color, 0.22)
            : "rgba(17, 17, 17, 0.08)"
        )
        .polygonAltitude((feature) =>
          activeCountries.has(getCountryName(feature)) ? 0.006 : 0.0015
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
      const market = markets[marketId];

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
      if (!network || !activeRoute) return;

      const frameRect = network.getBoundingClientRect();
      const globeRect = routeGlobe.getBoundingClientRect();
      const midpoint = globe.getScreenCoords(
        activeRoute.midpoint.lat,
        activeRoute.midpoint.lng,
        activeRoute.arcAltitude * 0.72
      );

      if (!midpoint) return;

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
        dockLocalLeft =
          normalizedX > 0 ? localX - dockWidth - gap : localX + gap;
      } else {
        dockLocalTop =
          normalizedY > 0 ? localY - dockHeight - gap : localY + gap;
      }

      dockLocalLeft = clamp(dockLocalLeft, margin, globeRect.width - dockWidth - margin);
      dockLocalTop = clamp(dockLocalTop, margin, globeRect.height - dockHeight - margin);

      const nextDockX = Number(
        (globeRect.left - frameRect.left + dockLocalLeft).toFixed(2)
      );
      const nextDockY = Number(
        (globeRect.top - frameRect.top + dockLocalTop).toFixed(2)
      );

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
      if (routeRateEl) routeRateEl.textContent = route.rate;

      window.clearTimeout(cardUpdateTimer);
      if (animateCard) {
        routeCard.classList.add("is-updating");
      } else {
        routeCard.classList.remove("is-updating");
      }
      syncScene();
      globe.pointOfView(route.focus, prefersReducedMotion ? 0 : 1200);

      if (rateRouteSelect) {
        rateRouteSelect.value = route.id;
        updateRateEstimate();
      }

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

    if (rateForm && rateAmountInput && rateRouteSelect) {
      rateAmountInput.addEventListener("input", updateRateEstimate);
      rateRouteSelect.addEventListener("change", () => {
        setActiveRoute(rateRouteSelect.value, true);
      });
    }

    window.addEventListener("resize", resizeGlobe);
    globeGeoDataPromise.then((features) => {
      countryFeatures = features;
      setActiveRoute(activeRouteId, false, false);
      updateRateEstimate();
      resizeGlobe();
      routeGlobe.classList.add("is-globe-ready");
      startCycle();
      globeFrame = window.requestAnimationFrame(updateOverlay);
    });
  } catch (error) {
    console.error("Wapi globe init failed", error);
  }
};

if (routeGlobe && globeRender && routeCard && routeDock) {
  const beginLiveGlobe = () => {
    if (!desktopGlobeMedia.matches || liveGlobeInitialized || !window.Globe) return;
    initLiveGlobe();
  };

  const queueLiveGlobe = () => {
    if (!desktopGlobeMedia.matches || liveGlobeInitialized) return;
    beginLiveGlobe();
  };

  if (desktopGlobeMedia.matches) {
    queueLiveGlobe();
  }

  const handleGlobeMediaChange = (event) => {
    if (event.matches) {
      queueLiveGlobe();
    }
  };

  if (typeof desktopGlobeMedia.addEventListener === "function") {
    desktopGlobeMedia.addEventListener("change", handleGlobeMediaChange);
  } else if (typeof desktopGlobeMedia.addListener === "function") {
    desktopGlobeMedia.addListener(handleGlobeMediaChange);
  }
}

