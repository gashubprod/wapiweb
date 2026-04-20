const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const revealItems = document.querySelectorAll(".reveal");
const statCounters = document.querySelectorAll("[data-counter]");
const network = document.querySelector("[data-network]");
const routeGlobe = document.querySelector("[data-route-globe]");
const globeRender = document.querySelector("[data-globe-render]");
const globeCanvas = document.querySelector("[data-globe-canvas]");
const routeSvg = document.querySelector("[data-route-svg]");
const routeLayer = document.querySelector("[data-route-layer]");
const routeCard = document.querySelector("[data-route-card]");
const routeDock = document.querySelector(".network-route-dock");
const routeSelectors = document.querySelectorAll("[data-route-selector]");
const rateForm = document.querySelector("[data-rate-form]");
const rateAmountInput = document.querySelector("[data-rate-amount]");
const rateRouteSelect = document.querySelector("[data-rate-route]");
const rateOutput = document.querySelector("[data-rate-output]");
const rateMeta = document.querySelector("[data-rate-meta]");
const spotlights = document.querySelectorAll("[data-spotlight]");
const productSteps = document.querySelectorAll(".product-step");
const productPanels = document.querySelectorAll("[data-product-panel]");
const scrollCards = document.querySelectorAll(
  ".rail-orbit-shell, .tension-card, .cta-panel"
);
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
const liveGlobeScriptCache = new Map();
const desktopGlobeMedia = window.matchMedia("(min-width: 981px)");
let liveGlobeInitialized = false;
let liveGlobeRequested = false;

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

const loadExternalScript = (src, isReady) => {
  if (isReady()) return Promise.resolve();

  const existingPromise = liveGlobeScriptCache.get(src);
  if (existingPromise) return existingPromise;

  const promise = new Promise((resolve, reject) => {
    const existingTag = document.querySelector(`script[src="${src}"]`);

    if (existingTag) {
      existingTag.addEventListener("load", () => resolve(), { once: true });
      existingTag.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  liveGlobeScriptCache.set(src, promise);
  return promise;
};

const loadLiveGlobeAssets = async () => {
  await loadExternalScript("vendor/three.min.js", () => Boolean(window.THREE));
  await loadExternalScript("vendor/globe.gl.min.js", () => Boolean(window.Globe));
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
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (network && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

if (false && routeGlobe && routeSvg && routeLayer && routeCard && routeDock) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const cardTitle = routeCard.querySelector("[data-route-title]");
  const cardRate = routeCard.querySelector("[data-route-rate]");
  const cardUpdated = routeCard.querySelector("[data-route-updated]");
  const cardDetail = routeCard.querySelector("[data-route-detail]");
  const cardSettlement = routeCard.querySelector("[data-route-settlement]");
  const cardTiming = routeCard.querySelector("[data-route-timing]");
  const marketLayer = document.createElementNS(SVG_NS, "g");
  const routeGroups = new Map();
  const marketGroups = new Map();
  let activeRouteId = "nairobi-guangzhou";
  let cycleInterval = null;
  let cycleResumeTimeout = null;
  let cardUpdateTimer = null;

  const markets = {
    lagos: { label: "Lagos", x: 146, y: 254 },
    kampala: { label: "Kampala", x: 206, y: 290 },
    nairobi: { label: "Nairobi", x: 226, y: 304 },
    guangzhou: { label: "Guangzhou", x: 404, y: 228 },
  };

  const routes = [
    {
      id: "nairobi-guangzhou",
      title: "Nairobi to Guangzhou",
      rate: "1 USD = 7.24 CNY",
      detail: "Local collection in Kenya, OTC conversion, and final payout into China rails.",
      settlement: "USDC treasury handoff",
      timing: "Instant payout",
      tone: "brand",
      color: "#00b549",
      from: "nairobi",
      to: "guangzhou",
      control: [304, 170],
      duration: "4.8s",
    },
    {
      id: "lagos-nairobi",
      title: "Lagos to Nairobi",
      rate: "1 USD = 128.40 KES",
      detail: "Business collection in Nigeria with routed settlement into Kenyan local rails.",
      settlement: "Local payout rails",
      timing: "Instant payout",
      tone: "brand",
      color: "#00b549",
      from: "lagos",
      to: "nairobi",
      control: [174, 214],
      duration: "4.2s",
    },
    {
      id: "kampala-guangzhou",
      title: "Kampala to Guangzhou",
      rate: "1 USD = 7.24 CNY",
      detail: "UGX collection, OTC conversion, and treasury settlement into China corridors.",
      settlement: "Stablecoin-enabled",
      timing: "Instant payout",
      tone: "signal",
      color: "#ffd721",
      from: "kampala",
      to: "guangzhou",
      control: [296, 150],
      duration: "5.6s",
    },
    {
      id: "nairobi-lagos",
      title: "Nairobi to Lagos",
      rate: "1 USD = 1548.20 NGN",
      detail: "Kenyan collection with treasury routing into Nigerian payout and bank transfer rails.",
      settlement: "Treasury-managed FX",
      timing: "Instant payout",
      tone: "brand",
      color: "#00b549",
      from: "nairobi",
      to: "lagos",
      control: [182, 344],
      duration: "4.6s",
    },
  ];

  const routeById = new Map(routes.map((route) => [route.id, route]));

  const createSvg = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => {
      node.setAttribute(name, String(value));
    });
    return node;
  };

  const pointOnQuadratic = (start, control, end, t) => {
    const inv = 1 - t;
    return {
      x: inv * inv * start.x + 2 * inv * t * control[0] + t * t * end.x,
      y: inv * inv * start.y + 2 * inv * t * control[1] + t * t * end.y,
    };
  };

  const buildRoutePath = (route) => {
    const from = markets[route.from];
    const to = markets[route.to];
    return `M ${from.x} ${from.y} Q ${route.control[0]} ${route.control[1]} ${to.x} ${to.y}`;
  };

  marketLayer.classList.add("network-market-layer");
  routeLayer.appendChild(marketLayer);

  Object.entries(markets).forEach(([marketId, market]) => {
    const group = createSvg("g", {
      class: "network-market-group",
      "data-market-id": marketId,
    });
    const ring = createSvg("circle", {
      class: "network-market-ring",
      cx: market.x,
      cy: market.y,
      r: 11,
    });
    const node = createSvg("circle", {
      class: "network-market-node",
      cx: market.x,
      cy: market.y,
      r: 5.2,
    });

    group.append(ring, node);
    marketGroups.set(marketId, group);
    marketLayer.appendChild(group);
  });

  routes.forEach((route) => {
    const pathData = buildRoutePath(route);
    const from = markets[route.from];
    const to = markets[route.to];
    const hotspot = pointOnQuadratic(from, route.control, to, 0.56);
    const group = createSvg("g", {
      class: "network-route-group",
      "data-route-id": route.id,
      "data-tone": route.tone,
    });

    group.style.setProperty("--route-color", route.color);

    const line = createSvg("path", {
      class: "network-route-line",
      d: pathData,
    });
    const hit = createSvg("path", {
      class: "network-route-hit",
      d: pathData,
      tabindex: "0",
      focusable: "true",
      role: "button",
      "aria-label": `Show ${route.title} indicative rate`,
    });
    const pulse = createSvg("circle", {
      class: "network-route-pulse",
      cx: hotspot.x.toFixed(2),
      cy: hotspot.y.toFixed(2),
      r: 13,
    });
    const hotspotDot = createSvg("circle", {
      class: "network-route-hotspot",
      cx: hotspot.x.toFixed(2),
      cy: hotspot.y.toFixed(2),
      r: 6.5,
    });
    const traveler = createSvg("circle", {
      class: "network-route-flow",
      r: route.tone === "signal" ? 5.4 : 6.2,
    });
    const animateMotion = createSvg("animateMotion", {
      dur: route.duration,
      repeatCount: "indefinite",
      rotate: "auto",
      path: pathData,
    });

    traveler.appendChild(animateMotion);
    group.append(line, pulse, hotspotDot, traveler, hit);
    routeGroups.set(route.id, group);
    routeLayer.appendChild(group);

    const activate = () => {
      setActiveRoute(route.id, true);
    };

    hit.addEventListener("click", activate);
    hit.addEventListener("focus", () => {
      setActiveRoute(route.id, false);
    });
    hotspotDot.addEventListener("click", activate);
    hit.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
  });

  const updateTimestamp = () => {
    const now = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(new Date());

    return `Updated ${now} EAT`;
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
    }, 5200);
  };

  const pauseCycle = () => {
    stopCycle();

    if (prefersReducedMotion) return;

    cycleResumeTimeout = window.setTimeout(() => {
      startCycle();
    }, 12000);
  };

  function setActiveRoute(routeId, isUserInitiated) {
    const route = routeById.get(routeId);

    if (!route) return;

    activeRouteId = routeId;

    routeCard.classList.add("is-updating");
    window.clearTimeout(cardUpdateTimer);

    routeGroups.forEach((group, id) => {
      group.classList.toggle("is-active", id === routeId);
    });

    marketGroups.forEach((group, marketId) => {
      const isActiveMarket = marketId === route.from || marketId === route.to;
      group.classList.toggle("is-active", isActiveMarket);
    });

    routeSelectors.forEach((selector) => {
      selector.classList.toggle("is-active", selector.dataset.routeSelector === routeId);
    });

    routeGlobe.style.setProperty("--route-accent", route.color);
    routeDock.style.setProperty("--route-accent", route.color);
    routeCard.style.setProperty("--route-accent", route.color);

    cardTitle.textContent = route.title;
    cardRate.textContent = route.rate;
    cardUpdated.textContent = updateTimestamp();
    cardDetail.textContent = route.detail;
    cardSettlement.textContent = route.settlement;
    cardTiming.textContent = route.timing;

    cardUpdateTimer = window.setTimeout(() => {
      routeCard.classList.remove("is-updating");
    }, 220);

    if (isUserInitiated) {
      pauseCycle();
    }
  }

  routeSelectors.forEach((selector) => {
    selector.addEventListener("click", () => {
      setActiveRoute(selector.dataset.routeSelector, true);
    });
  });

  setActiveRoute(activeRouteId, false);
  startCycle();
}

if (routeGlobe && globeCanvas && routeSvg && routeLayer && routeCard && routeDock) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const globeCtx = globeCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  if (globeCtx) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const VIEWBOX_SIZE = 520;
    const VIEW_CENTER = VIEWBOX_SIZE / 2;
    const VIEW_RADIUS = 204;
    const GLOBE_SIZE = globeCanvas.width;
    const GLOBE_CENTER = GLOBE_SIZE / 2;
    const GLOBE_RADIUS = (VIEW_RADIUS / VIEWBOX_SIZE) * GLOBE_SIZE;
    const SAMPLE_STEP = 2;
    const frameBuffer = globeCtx.createImageData(GLOBE_SIZE, GLOBE_SIZE);
    const framePixels = frameBuffer.data;
    const cardTitle = routeCard.querySelector("[data-route-title]");
    const cardRate = routeCard.querySelector("[data-route-rate]");
    const cardUpdated = routeCard.querySelector("[data-route-updated]");
    const cardDetail = routeCard.querySelector("[data-route-detail]");
    const cardSettlement = routeCard.querySelector("[data-route-settlement]");
    const cardTiming = routeCard.querySelector("[data-route-timing]");
    const marketLayer = document.createElementNS(SVG_NS, "g");
    const marketGroups = new Map();
    const routeScenes = new Map();
    let activeRouteId = "nairobi-guangzhou";
    let cycleInterval = null;
    let cycleResumeTimeout = null;
    let cardUpdateTimer = null;
    let animationFrame = null;
    let lastRender = 0;
    let texturePixels = null;
    let textureWidth = 0;
    let textureHeight = 0;

    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const normalizeAngle = (angle) => {
      let normalized = angle;

      while (normalized > Math.PI) normalized -= Math.PI * 2;
      while (normalized < -Math.PI) normalized += Math.PI * 2;

      return normalized;
    };

    const vectorFromLatLon = (lat, lon) => ({
      x: Math.cos(lat) * Math.sin(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.cos(lon),
    });

    const normalizeVector = (vector) => {
      const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
      return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length,
      };
    };

    const latLonFromVector = (vector) => ({
      lat: Math.atan2(vector.y, Math.hypot(vector.x, vector.z)),
      lon: Math.atan2(vector.x, vector.z),
    });

    const slerpVector = (from, to, t) => {
      const dot = clamp(from.x * to.x + from.y * to.y + from.z * to.z, -1, 1);
      const omega = Math.acos(dot);

      if (omega < 1e-5) return from;

      const sinOmega = Math.sin(omega);
      const weightFrom = Math.sin((1 - t) * omega) / sinOmega;
      const weightTo = Math.sin(t * omega) / sinOmega;

      return normalizeVector({
        x: from.x * weightFrom + to.x * weightTo,
        y: from.y * weightFrom + to.y * weightTo,
        z: from.z * weightFrom + to.z * weightTo,
      });
    };

    const createSvg = (tag, attrs = {}) => {
      const node = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([name, value]) => {
        node.setAttribute(name, String(value));
      });
      return node;
    };

    const formatAmount = (value) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    const updateTimestamp = () => {
      const now = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Nairobi",
      }).format(new Date());

      return `Updated ${now} EAT`;
    };

    const projectVector = (vector, altitude, view) => {
      const sinLon = Math.sin(view.lon);
      const cosLon = Math.cos(view.lon);
      const sinLat = Math.sin(view.lat);
      const cosLat = Math.cos(view.lat);
      const rotatedX = vector.x * cosLon - vector.z * sinLon;
      const forward = vector.x * sinLon + vector.z * cosLon;
      const rotatedY = vector.y * cosLat - forward * sinLat;
      const rotatedZ = vector.y * sinLat + forward * cosLat;

      return {
        x: VIEW_CENTER + rotatedX * VIEW_RADIUS * altitude,
        y: VIEW_CENTER - rotatedY * VIEW_RADIUS * altitude,
        visible: rotatedZ > -0.02,
        z: rotatedZ,
      };
    };

    const sampleTexture = (lon, lat) => {
      if (!texturePixels) return null;

      const u = (normalizeAngle(lon) + Math.PI) / (Math.PI * 2);
      const v = (Math.PI / 2 - lat) / Math.PI;
      const texX = Math.floor(clamp(u, 0, 0.999999) * (textureWidth - 1));
      const texY = Math.floor(clamp(v, 0, 0.999999) * (textureHeight - 1));
      const index = (texY * textureWidth + texX) * 4;
      const alpha = texturePixels[index + 3];

      if (alpha < 8) return null;

      const luminance =
        (texturePixels[index] + texturePixels[index + 1] + texturePixels[index + 2]) / 3;
      const land = clamp((255 - luminance) / 180, 0, 1);

      if (land < 0.035) return null;

      return land;
    };

    const paintBlock = (startX, startY, size, red, green, blue, alpha) => {
      for (let offsetY = 0; offsetY < size; offsetY += 1) {
        const y = startY + offsetY;
        if (y < 0 || y >= GLOBE_SIZE) continue;

        for (let offsetX = 0; offsetX < size; offsetX += 1) {
          const x = startX + offsetX;
          if (x < 0 || x >= GLOBE_SIZE) continue;

          const index = (y * GLOBE_SIZE + x) * 4;
          framePixels[index] = red;
          framePixels[index + 1] = green;
          framePixels[index + 2] = blue;
          framePixels[index + 3] = alpha;
        }
      }
    };

    const drawGlobeTexture = (view) => {
      framePixels.fill(0);

      if (texturePixels) {
        const sinLat = Math.sin(view.lat);
        const cosLat = Math.cos(view.lat);
        const min = Math.floor(GLOBE_CENTER - GLOBE_RADIUS);
        const max = Math.ceil(GLOBE_CENTER + GLOBE_RADIUS);

        for (let pixelY = min; pixelY <= max; pixelY += SAMPLE_STEP) {
          for (let pixelX = min; pixelX <= max; pixelX += SAMPLE_STEP) {
            const normalizedX = (pixelX + SAMPLE_STEP / 2 - GLOBE_CENTER) / GLOBE_RADIUS;
            const normalizedY = -(pixelY + SAMPLE_STEP / 2 - GLOBE_CENTER) / GLOBE_RADIUS;
            const rhoSquared = normalizedX * normalizedX + normalizedY * normalizedY;

            if (rhoSquared > 1) continue;

            const rho = Math.sqrt(rhoSquared);
            let latitude = view.lat;
            let longitude = view.lon;

            if (rho > 0.000001) {
              const c = Math.asin(rho);
              const sinC = Math.sin(c);
              const cosC = Math.cos(c);

              latitude = Math.asin(cosC * sinLat + (normalizedY * sinC * cosLat) / rho);
              longitude =
                view.lon +
                Math.atan2(
                  normalizedX * sinC,
                  rho * cosLat * cosC - normalizedY * sinLat * sinC
                );
            }

            const land = sampleTexture(longitude, latitude);
            if (!land) continue;

            const edgeLight = Math.sqrt(1 - rhoSquared);
            const light = 0.78 + edgeLight * 0.3;
            const red = Math.round(172 * light + land * 34);
            const green = Math.round(182 * light + land * 28);
            const blue = Math.round(168 * light + land * 16);
            const alpha = Math.round(28 + land * 170);

            paintBlock(pixelX, pixelY, SAMPLE_STEP, red, green, blue, alpha);
          }
        }
      }

      globeCtx.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);
      globeCtx.putImageData(frameBuffer, 0, 0);

      const highlight = globeCtx.createRadialGradient(
        GLOBE_CENTER * 0.8,
        GLOBE_CENTER * 0.72,
        GLOBE_RADIUS * 0.12,
        GLOBE_CENTER,
        GLOBE_CENTER,
        GLOBE_RADIUS * 1.02
      );
      highlight.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      highlight.addColorStop(1, "rgba(255, 255, 255, 0)");

      globeCtx.save();
      globeCtx.globalCompositeOperation = "screen";
      globeCtx.fillStyle = highlight;
      globeCtx.fillRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);
      globeCtx.restore();
    };

    const pathFromSegments = (segments) =>
      segments
        .map((segment) =>
          segment
            .map((point, index) =>
              `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
            )
            .join(" ")
        )
        .join(" ");

    const markets = {
      lagos: { label: "Lagos", lat: toRad(6.5244), lon: toRad(3.3792) },
      kampala: { label: "Kampala", lat: toRad(0.3476), lon: toRad(32.5825) },
      nairobi: { label: "Nairobi", lat: toRad(-1.286389), lon: toRad(36.817223) },
      guangzhou: { label: "Guangzhou", lat: toRad(23.1291), lon: toRad(113.2644) },
    };

    Object.values(markets).forEach((market) => {
      market.vector = vectorFromLatLon(market.lat, market.lon);
    });

    const routes = [
      {
        id: "nairobi-guangzhou",
        title: "Nairobi to Guangzhou",
        rate: "1 USD = 7.24 CNY",
        multiplier: 7.24,
        outputCurrency: "CNY",
        detail: "Local collection in Kenya, OTC conversion, and final payout into China rails.",
        settlement: "USDC treasury handoff",
        timing: "Instant payout",
        tone: "brand",
        color: "#00b549",
        from: "nairobi",
        to: "guangzhou",
        lift: 0.2,
        speed: 4.8,
      },
      {
        id: "lagos-nairobi",
        title: "Lagos to Nairobi",
        rate: "1 USD = 128.40 KES",
        multiplier: 128.4,
        outputCurrency: "KES",
        detail: "Business collection in Nigeria with routed settlement into Kenyan local rails.",
        settlement: "Local payout rails",
        timing: "Instant payout",
        tone: "brand",
        color: "#00b549",
        from: "lagos",
        to: "nairobi",
        lift: 0.16,
        speed: 4.4,
      },
      {
        id: "kampala-guangzhou",
        title: "Kampala to Guangzhou",
        rate: "1 USD = 7.24 CNY",
        multiplier: 7.24,
        outputCurrency: "CNY",
        detail: "UGX collection, OTC conversion, and treasury settlement into China corridors.",
        settlement: "Stablecoin-enabled",
        timing: "Instant payout",
        tone: "signal",
        color: "#ffd721",
        from: "kampala",
        to: "guangzhou",
        lift: 0.21,
        speed: 5.2,
      },
      {
        id: "nairobi-lagos",
        title: "Nairobi to Lagos",
        rate: "1 USD = 1548.20 NGN",
        multiplier: 1548.2,
        outputCurrency: "NGN",
        detail: "Kenyan collection with treasury routing into Nigerian payout and bank transfer rails.",
        settlement: "Treasury-managed FX",
        timing: "Instant payout",
        tone: "brand",
        color: "#00b549",
        from: "nairobi",
        to: "lagos",
        lift: 0.16,
        speed: 4.6,
      },
    ].map((route) => {
      const midpoint = normalizeVector({
        x: markets[route.from].vector.x + markets[route.to].vector.x,
        y: markets[route.from].vector.y + markets[route.to].vector.y,
        z: markets[route.from].vector.z + markets[route.to].vector.z,
      });
      const focus = latLonFromVector(midpoint);

      return {
        ...route,
        fromVector: markets[route.from].vector,
        toVector: markets[route.to].vector,
        focusLon: normalizeAngle(focus.lon),
        focusLat: clamp(focus.lat * 0.92, toRad(-14), toRad(24)),
      };
    });

    const routeById = new Map(routes.map((route) => [route.id, route]));
    const currentView = {
      lon: routeById.get(activeRouteId).focusLon,
      lat: routeById.get(activeRouteId).focusLat,
    };
    const targetView = { ...currentView };

    marketLayer.classList.add("network-market-layer");
    routeLayer.appendChild(marketLayer);

    Object.entries(markets).forEach(([marketId]) => {
      const group = createSvg("g", {
        class: "network-market-group",
        "data-market-id": marketId,
      });
      const stem = createSvg("line", {
        class: "network-market-stem",
      });
      const ring = createSvg("circle", {
        class: "network-market-ring",
        r: 11,
      });
      const node = createSvg("circle", {
        class: "network-market-node",
        r: 5.2,
      });
      const label = createSvg("text", {
        class: "network-market-label",
      });
      label.textContent = markets[marketId].label;

      group.append(stem, ring, node, label);
      marketGroups.set(marketId, { group, stem, ring, node, label });
      marketLayer.appendChild(group);
    });

    routes.forEach((route, index) => {
      const group = createSvg("g", {
        class: "network-route-group",
        "data-route-id": route.id,
        "data-tone": route.tone,
      });
      const line = createSvg("path", { class: "network-route-line" });
      const hit = createSvg("path", {
        class: "network-route-hit",
        tabindex: "0",
        focusable: "true",
        role: "button",
        "aria-label": `Show ${route.title} indicative rate`,
      });
      const pulse = createSvg("circle", {
        class: "network-route-pulse",
        r: 13,
      });
      const hotspot = createSvg("circle", {
        class: "network-route-hotspot",
        r: 6.2,
      });
      const traveler = createSvg("circle", {
        class: "network-route-flow",
        r: route.tone === "signal" ? 5.3 : 5.8,
      });

      group.style.setProperty("--route-color", route.color);
      group.append(line, hit, pulse, hotspot, traveler);
      routeScenes.set(route.id, { route, group, line, hit, pulse, hotspot, traveler, offset: index * 0.17 });
      routeLayer.appendChild(group);

      const activate = () => {
        setActiveRoute(route.id, true);
      };

      hit.addEventListener("click", activate);
      hotspot.addEventListener("click", activate);
      hit.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate();
      });
    });

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
      }, 5600);
    };

    const pauseCycle = () => {
      stopCycle();

      if (prefersReducedMotion) return;

      cycleResumeTimeout = window.setTimeout(() => {
        startCycle();
      }, 12000);
    };

    const updateRateEstimate = () => {
      if (!rateOutput || !rateMeta || !rateAmountInput || !rateRouteSelect) return;

      const selectedRoute = routeById.get(rateRouteSelect.value) || routeById.get(activeRouteId);
      const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
      const received = amount * selectedRoute.multiplier;

      rateOutput.textContent = `${formatAmount(received)} ${selectedRoute.outputCurrency}`;
      rateMeta.textContent = `Indicative rate ${selectedRoute.rate}`;
    };

    function setActiveRoute(routeId, isUserInitiated) {
      const route = routeById.get(routeId);

      if (!route) return;

      activeRouteId = routeId;
      targetView.lon = route.focusLon;
      targetView.lat = route.focusLat;
      routeCard.classList.add("is-updating");
      window.clearTimeout(cardUpdateTimer);

      routeSelectors.forEach((selector) => {
        selector.classList.toggle("is-active", selector.dataset.routeSelector === routeId);
      });

      routeGlobe.style.setProperty("--route-accent", route.color);
      routeDock.style.setProperty("--route-accent", route.color);
      routeCard.style.setProperty("--route-accent", route.color);

      cardTitle.textContent = route.title;
      cardRate.textContent = route.rate;
      if (cardUpdated) cardUpdated.textContent = updateTimestamp();
      if (cardDetail) cardDetail.textContent = route.detail;
      if (cardSettlement) cardSettlement.textContent = route.settlement;
      if (cardTiming) cardTiming.textContent = route.timing;

      if (rateRouteSelect) {
        rateRouteSelect.value = route.id;
        updateRateEstimate();
      }

      cardUpdateTimer = window.setTimeout(() => {
        routeCard.classList.remove("is-updating");
      }, 240);

      if (isUserInitiated) {
        pauseCycle();
      }
    }

    const updateScene = (now, view) => {
      const activeRoute = routeById.get(activeRouteId);
      let activeHotspot = null;

      marketGroups.forEach(({ group, stem, ring, node, label }, marketId) => {
        const market = markets[marketId];
        const projected = projectVector(market.vector, 1.002, view);
        const isActiveMarket = activeRoute && (marketId === activeRoute.from || marketId === activeRoute.to);
        const labelOffsetX = projected.x > VIEW_CENTER ? -20 : 20;
        const labelOffsetY = projected.y < VIEW_CENTER - 18 ? 22 : -22;
        const labelX = projected.x + labelOffsetX;
        const labelY = projected.y + labelOffsetY;

        group.classList.toggle("is-active", Boolean(isActiveMarket && projected.visible));
        group.style.opacity = projected.visible ? "" : "0";
        group.style.pointerEvents = projected.visible ? "auto" : "none";
        stem.setAttribute("x1", projected.x.toFixed(2));
        stem.setAttribute("y1", projected.y.toFixed(2));
        stem.setAttribute("x2", labelX.toFixed(2));
        stem.setAttribute("y2", labelY.toFixed(2));
        ring.setAttribute("cx", projected.x.toFixed(2));
        ring.setAttribute("cy", projected.y.toFixed(2));
        node.setAttribute("cx", projected.x.toFixed(2));
        node.setAttribute("cy", projected.y.toFixed(2));
        label.setAttribute("x", labelX.toFixed(2));
        label.setAttribute("y", labelY.toFixed(2));
        label.setAttribute("text-anchor", projected.x > VIEW_CENTER ? "end" : "start");
      });

      routeScenes.forEach((scene) => {
        const { route, group, line, hit, pulse, hotspot, traveler, offset } = scene;
        const segments = [];
        let currentSegment = [];
        let hotspotPoint = null;

        for (let step = 0; step <= 46; step += 1) {
          const progress = step / 46;
          const vector = slerpVector(route.fromVector, route.toVector, progress);
          const altitude = 1 + route.lift * Math.pow(Math.sin(Math.PI * progress), 1.35);
          const projected = projectVector(vector, altitude, view);
          const point = { x: projected.x, y: projected.y, t: progress };

          if (projected.visible) {
            currentSegment.push(point);

            if (!hotspotPoint || Math.abs(progress - 0.5) < Math.abs(hotspotPoint.t - 0.5)) {
              hotspotPoint = point;
            }
          } else if (currentSegment.length > 1) {
            segments.push(currentSegment);
            currentSegment = [];
          } else {
            currentSegment = [];
          }
        }

        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }

        const path = pathFromSegments(segments);
        const isActive = route.id === activeRouteId;

        group.classList.toggle("is-active", isActive);
        group.classList.toggle("is-hidden", !path);
        line.setAttribute("d", path);
        hit.setAttribute("d", path);

        if (!path) {
          pulse.setAttribute("display", "none");
          hotspot.setAttribute("display", "none");
          traveler.setAttribute("display", "none");
          return;
        }

        if (hotspotPoint && isActive) {
          pulse.setAttribute("display", "");
          hotspot.setAttribute("display", "");
          pulse.setAttribute("cx", hotspotPoint.x.toFixed(2));
          pulse.setAttribute("cy", hotspotPoint.y.toFixed(2));
          hotspot.setAttribute("cx", hotspotPoint.x.toFixed(2));
          hotspot.setAttribute("cy", hotspotPoint.y.toFixed(2));
          activeHotspot = hotspotPoint;
        } else {
          pulse.setAttribute("display", "none");
          hotspot.setAttribute("display", "none");
        }

        const travelProgress = (now / (route.speed * 1000) + offset) % 1;
        const travelVector = slerpVector(route.fromVector, route.toVector, travelProgress);
        const travelAltitude = 1 + route.lift * Math.pow(Math.sin(Math.PI * travelProgress), 1.35);
        const travelPoint = projectVector(travelVector, travelAltitude, view);

        if (isActive && travelPoint.visible) {
          traveler.setAttribute("display", "");
          traveler.setAttribute("cx", travelPoint.x.toFixed(2));
          traveler.setAttribute("cy", travelPoint.y.toFixed(2));
        } else {
          traveler.setAttribute("display", "none");
        }
      });

      if (activeHotspot) {
        const normalizedX = (activeHotspot.x - VIEW_CENTER) / VIEW_RADIUS;
        const normalizedY = (activeHotspot.y - VIEW_CENTER) / VIEW_RADIUS;
        const svgRect = routeSvg.getBoundingClientRect();
        const frameRect = network.getBoundingClientRect();
        const hotspotX = (activeHotspot.x / VIEWBOX_SIZE) * svgRect.width + (svgRect.left - frameRect.left);
        const hotspotY = (activeHotspot.y / VIEWBOX_SIZE) * svgRect.height + (svgRect.top - frameRect.top);
        const dockWidth = routeDock.offsetWidth || 280;
        const dockHeight = routeDock.offsetHeight || 112;
        const gap = 24;
        const margin = 18;
        let dockLeft = hotspotX - dockWidth / 2;
        let dockTop = hotspotY - dockHeight / 2;

        if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
          if (normalizedX > 0) {
            dockLeft = hotspotX - dockWidth - gap;
            dockTop = hotspotY - dockHeight / 2;
          } else {
            dockLeft = hotspotX + gap;
            dockTop = hotspotY - dockHeight / 2;
          }
        } else if (normalizedY > 0) {
          dockLeft = hotspotX - dockWidth / 2;
          dockTop = hotspotY - dockHeight - gap;
        } else {
          dockLeft = hotspotX - dockWidth / 2;
          dockTop = hotspotY + gap;
        }

        dockLeft = clamp(dockLeft, margin, frameRect.width - dockWidth - margin);
        dockTop = clamp(dockTop, 78, frameRect.height - dockHeight - margin);

        routeDock.style.setProperty("--dock-x", `${dockLeft.toFixed(2)}px`);
        routeDock.style.setProperty("--dock-y", `${dockTop.toFixed(2)}px`);
      }
    };

    const render = (now) => {
      if (!prefersReducedMotion && now - lastRender < 33) {
        animationFrame = window.requestAnimationFrame(render);
        return;
      }

      const drift = prefersReducedMotion ? 0 : Math.sin(now * 0.00018) * toRad(2.4);

      currentView.lon += normalizeAngle(targetView.lon + drift - currentView.lon) * 0.06;
      currentView.lat += (targetView.lat - currentView.lat) * 0.06;

      drawGlobeTexture(currentView);
      updateScene(now, currentView);
      lastRender = now;
      animationFrame = window.requestAnimationFrame(render);
    };

    const textureImage = new Image();
    textureImage.decoding = "async";
    textureImage.addEventListener("load", () => {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = textureImage.naturalWidth;
      textureCanvas.height = textureImage.naturalHeight;
      const textureContext = textureCanvas.getContext("2d", { willReadFrequently: true });

      if (!textureContext) return;

      textureContext.drawImage(textureImage, 0, 0);
      texturePixels = textureContext.getImageData(0, 0, textureCanvas.width, textureCanvas.height).data;
      textureWidth = textureCanvas.width;
      textureHeight = textureCanvas.height;
    });
    textureImage.src = "assets/existing/map.webp";

    routeSelectors.forEach((selector) => {
      selector.addEventListener("click", () => {
        setActiveRoute(selector.dataset.routeSelector, true);
      });
    });

    if (rateForm && rateAmountInput && rateRouteSelect) {
      rateAmountInput.addEventListener("input", updateRateEstimate);
      rateRouteSelect.addEventListener("change", () => {
        setActiveRoute(rateRouteSelect.value, true);
      });
    }

    setActiveRoute(activeRouteId, false);
    updateScene(0, currentView);
    updateRateEstimate();
    startCycle();

    if (prefersReducedMotion) {
      drawGlobeTexture(currentView);
      updateScene(0, currentView);
    } else {
      animationFrame = window.requestAnimationFrame(render);
    }
  }
}

if (false && routeGlobe && globeRender && routeCard && routeDock && window.Globe && window.THREE) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THREE = window.THREE;
  const cardTitle = routeCard.querySelector("[data-route-title]");
  const cardRate = routeCard.querySelector("[data-route-rate]");
  let activeRouteId = "lagos-nairobi";
  let cycleInterval = null;
  let cycleResumeTimeout = null;
  let cardUpdateTimer = null;
  let activeRoute = null;
  let countryFeatures = [];
  let dockFrame = null;

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const toDeg = (radians) => (radians * 180) / Math.PI;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
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
            .map((value) => value + value)
            .join("")
        : normalized;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
      focus: { lat: 4.2, lng: 20.5, altitude: 1.54 },
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
      arcAltitude: 0.23,
      animationMs: 3400,
      focus: { lat: 12.5, lng: 73.5, altitude: 1.6 },
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
      arcAltitude: 0.24,
      animationMs: 3600,
      focus: { lat: 12.8, lng: 75.5, altitude: 1.62 },
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
      focus: { lat: 4.2, lng: 20.5, altitude: 1.54 },
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
    .showGraticules(true)
    .globeOffset([0, 10])
    .enablePointerInteraction(false)
    .pointsTransitionDuration(280)
    .polygonsTransitionDuration(480)
    .arcsTransitionDuration(480);

  const globeMaterial = globe.globeMaterial();
  globeMaterial.color = new THREE.Color("#f6f7f2");
  globeMaterial.emissive = new THREE.Color("#edf3ec");
  globeMaterial.emissiveIntensity = 0.16;
  globeMaterial.shininess = 3;
  globeMaterial.specular = new THREE.Color("#d7ddd4");

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.02);
  keyLight.position.set(-220, 140, 260);
  const fillLight = new THREE.DirectionalLight(0xdceee1, 0.34);
  fillLight.position.set(190, -60, 180);
  globe.lights([ambientLight, keyLight, fillLight]);

  const controls = globe.controls();
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.34;

  const resizeGlobe = () => {
    const width = globeRender.clientWidth || 560;
    const height = globeRender.clientHeight || width;
    globe.width(width).height(height);
    updateDockPosition();
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
    }, 5600);
  };

  const pauseCycle = () => {
    stopCycle();

    if (prefersReducedMotion) return;

    cycleResumeTimeout = window.setTimeout(() => {
      startCycle();
    }, 12000);
  };

  const updateRateEstimate = () => {
    if (!rateOutput || !rateMeta || !rateAmountInput || !rateRouteSelect) return;

    const selectedRoute = routeById.get(rateRouteSelect.value) || routeById.get(activeRouteId);
    const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
    const received = amount * selectedRoute.multiplier;

    rateOutput.textContent = `${formatAmount(received)} ${selectedRoute.outputCurrency}`;
    rateMeta.textContent = `Indicative rate ${selectedRoute.rate}`;
  };

  const syncScene = () => {
    const route = routeById.get(activeRouteId);

    if (!route) return;

    activeRoute = route;
    const activeCountries = new Set([markets[route.from].country, markets[route.to].country]);
    const activePoints = Object.values(markets).map((market) => ({
      ...market,
      active: market.id === route.from || market.id === route.to,
    }));

    globe
      .polygonsData(countryFeatures)
      .polygonCapColor((feature) =>
        activeCountries.has(getCountryName(feature))
          ? hexToRgba(route.color, 0.24)
          : "rgba(26, 26, 29, 0.05)"
      )
      .polygonSideColor(() => "rgba(0, 0, 0, 0)")
      .polygonStrokeColor((feature) =>
        activeCountries.has(getCountryName(feature))
          ? hexToRgba(route.color, 0.2)
          : "rgba(26, 26, 29, 0.08)"
      )
      .polygonAltitude((feature) =>
        activeCountries.has(getCountryName(feature)) ? 0.006 : 0.0014
      )
      .pointsData(activePoints)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor((point) =>
        point.active ? hexToRgba(route.color, 0.96) : "rgba(26, 26, 29, 0.18)"
      )
      .pointAltitude((point) => (point.active ? 0.026 : 0.008))
      .pointRadius((point) => (point.active ? 0.42 : 0.16))
      .ringsData(
        [markets[route.from], markets[route.to]].map((market) => ({
          lat: market.lat,
          lng: market.lng,
          color: route.color,
        }))
      )
      .ringLat("lat")
      .ringLng("lng")
      .ringColor((ring) => [hexToRgba(ring.color, 0.3), hexToRgba(ring.color, 0)])
      .ringMaxRadius(2.7)
      .ringPropagationSpeed(1.15)
      .ringRepeatPeriod(1900)
      .arcsData(routes)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor((corridor) =>
        corridor.id === route.id
          ? [hexToRgba(corridor.color, 0.92), hexToRgba(corridor.color, 0.92)]
          : ["rgba(26, 26, 29, 0.12)", "rgba(26, 26, 29, 0.02)"]
      )
      .arcAltitude((corridor) => (corridor.id === route.id ? corridor.arcAltitude : 0.08))
      .arcStroke((corridor) => (corridor.id === route.id ? 0.22 : 0.06))
      .arcDashLength((corridor) => (corridor.id === route.id ? 0.38 : 0.14))
      .arcDashGap((corridor) => (corridor.id === route.id ? 0.72 : 1.8))
      .arcDashAnimateTime((corridor) => (corridor.id === route.id ? corridor.animationMs : 0));
  };

  function setActiveRoute(routeId, isUserInitiated) {
    const route = routeById.get(routeId);

    if (!route) return;

    activeRouteId = routeId;
    routeGlobe.style.setProperty("--route-accent", route.color);
    routeDock.style.setProperty("--route-accent", route.color);
    routeCard.style.setProperty("--route-accent", route.color);
    cardTitle.textContent = route.title;
    cardRate.textContent = route.rate;
    routeCard.classList.add("is-updating");
    window.clearTimeout(cardUpdateTimer);
    syncScene();
    globe.pointOfView(route.focus, prefersReducedMotion ? 0 : 1200);

    if (rateRouteSelect) {
      rateRouteSelect.value = route.id;
      updateRateEstimate();
    }

    cardUpdateTimer = window.setTimeout(() => {
      routeCard.classList.remove("is-updating");
    }, 220);

    updateDockPosition();

    if (isUserInitiated) {
      pauseCycle();
    }
  }

  const projectPoint = (lat, lng, altitude = 0) => {
    const coords = globe.getCoords(lat, lng, altitude);
    const vector = new THREE.Vector3(coords.x, coords.y, coords.z);
    vector.project(globe.camera());

    if (vector.z > 1.1) return null;

    return {
      x: (vector.x * 0.5 + 0.5) * globeRender.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * globeRender.clientHeight,
    };
  };

  function updateDockPosition() {
    if (!network || !activeRoute) return;

    const frameRect = network.getBoundingClientRect();
    const globeRect = routeGlobe.getBoundingClientRect();
    const dockWidth = routeDock.offsetWidth || 232;
    const dockHeight = routeDock.offsetHeight || 104;
    const gap = 20;
    const margin = 18;
    const midpoint =
      projectPoint(
        activeRoute.midpoint.lat,
        activeRoute.midpoint.lng,
        Math.max(activeRoute.arcAltitude * 0.65, 0.08)
      ) || projectPoint(activeRoute.focus.lat, activeRoute.focus.lng, 0);

    if (!midpoint) return;

    const hotspotX = globeRect.left - frameRect.left + midpoint.x;
    const hotspotY = globeRect.top - frameRect.top + midpoint.y;
    const normalizedX = (midpoint.x - globeRect.width / 2) / (globeRect.width / 2);
    const normalizedY = (midpoint.y - globeRect.height / 2) / (globeRect.height / 2);
    let dockLeft = hotspotX - dockWidth / 2;
    let dockTop = hotspotY - dockHeight / 2;

    if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
      if (normalizedX > 0) {
        dockLeft = hotspotX - dockWidth - gap;
      } else {
        dockLeft = hotspotX + gap;
      }
    } else if (normalizedY > 0) {
      dockTop = hotspotY - dockHeight - gap;
    } else {
      dockTop = hotspotY + gap;
    }

    dockLeft = clamp(dockLeft, margin, frameRect.width - dockWidth - margin);
    dockTop = clamp(dockTop, 74, frameRect.height - dockHeight - margin);

    routeDock.style.setProperty("--dock-x", `${dockLeft.toFixed(2)}px`);
    routeDock.style.setProperty("--dock-y", `${dockTop.toFixed(2)}px`);
  }

  const tickDock = () => {
    updateDockPosition();
    dockFrame = window.requestAnimationFrame(tickDock);
  };

  fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    .then((response) => response.json())
    .then((data) => {
      countryFeatures = Array.isArray(data.features) ? data.features : [];
      syncScene();
    })
    .catch(() => {
      countryFeatures = [];
      syncScene();
    });

  if (rateForm && rateAmountInput && rateRouteSelect) {
    rateAmountInput.addEventListener("input", updateRateEstimate);
    rateRouteSelect.addEventListener("change", () => {
      setActiveRoute(rateRouteSelect.value, true);
    });
  }

  window.addEventListener("resize", resizeGlobe);
  setActiveRoute(activeRouteId, false);
  updateRateEstimate();
  resizeGlobe();
  startCycle();
  dockFrame = window.requestAnimationFrame(tickDock);

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(dockFrame);
  });
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  spotlights.forEach((section) => {
    section.addEventListener("pointermove", (event) => {
      const rect = section.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      section.style.setProperty("--spot-x", `${x}%`);
      section.style.setProperty("--spot-y", `${y}%`);
    });

    section.addEventListener("pointerleave", () => {
      section.style.removeProperty("--spot-x");
      section.style.removeProperty("--spot-y");
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
  routeGlobe.classList.add("has-live-globe");

  try {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const routeTitleEl = routeCard.querySelector("[data-route-title]");
    const routeRateEl = routeCard.querySelector("[data-route-rate]");
    const geoJsonUrl = "assets/world.geojson";
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
      .showGraticules(true)
      .enablePointerInteraction(false)
      .pointsTransitionDuration(240)
      .arcsTransitionDuration(520)
      .polygonsTransitionDuration(520);

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
      controls.autoRotateSpeed = 0.68;
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
      const marketPoints = Object.values(markets).map((market) => ({
        ...market,
        active: market.id === activeRoute.from || market.id === activeRoute.to,
      }));

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
        .pointsData(marketPoints)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor((point) =>
          point.active ? hexToRgba(activeRoute.color, 0.96) : "rgba(17, 17, 17, 0.16)"
        )
        .pointAltitude((point) => (point.active ? 0.022 : 0.006))
        .pointRadius((point) => (point.active ? 0.34 : 0.12))
        .ringsData(
          [markets[activeRoute.from], markets[activeRoute.to]].map((market) => ({
            lat: market.lat,
            lng: market.lng,
            color: activeRoute.color,
          }))
        )
        .ringLat("lat")
        .ringLng("lng")
        .ringColor((ring) => [hexToRgba(ring.color, 0.24), hexToRgba(ring.color, 0)])
        .ringMaxRadius(2.3)
        .ringPropagationSpeed(1.05)
        .ringRepeatPeriod(1800)
        .arcsData(routes)
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor((corridor) =>
          corridor.id === activeRoute.id
            ? [routeDisplayColor(corridor, 0.98), routeDisplayColor(corridor, 0.9)]
            : ["rgba(17, 17, 17, 0.08)", "rgba(17, 17, 17, 0.02)"]
        )
        .arcAltitude((corridor) => (corridor.id === activeRoute.id ? corridor.arcAltitude : 0.06))
        .arcStroke((corridor) => (corridor.id === activeRoute.id ? 0.21 : 0.045))
        .arcDashLength((corridor) => (corridor.id === activeRoute.id ? 0.36 : 0.12))
        .arcDashGap((corridor) => (corridor.id === activeRoute.id ? 0.58 : 2))
        .arcDashAnimateTime((corridor) =>
          corridor.id === activeRoute.id ? corridor.animationMs : 0
        );
    };

    const setCityTagPosition = (marketId) => {
      const tag = cityTags.get(marketId);
      const market = markets[marketId];

      if (!tag || !market) return;

      const point = globe.getScreenCoords(market.lat, market.lng, 0.02);
      const globeRect = routeGlobe.getBoundingClientRect();

      if (!point) {
        tag.classList.remove("is-visible");
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
        return;
      }

      tag.style.left = `${localX.toFixed(2)}px`;
      tag.style.top = `${(localY - 18).toFixed(2)}px`;
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

      routeDock.style.setProperty(
        "--dock-x",
        `${(globeRect.left - frameRect.left + dockLocalLeft).toFixed(2)}px`
      );
      routeDock.style.setProperty(
        "--dock-y",
        `${(globeRect.top - frameRect.top + dockLocalTop).toFixed(2)}px`
      );
    };

    function setActiveRoute(routeId, isUserInitiated) {
      const route = routeById.get(routeId);

      if (!route) return;

      activeRouteId = routeId;
      routeGlobe.style.setProperty("--route-accent", route.color);
      routeDock.style.setProperty("--route-accent", route.color);
      routeCard.style.setProperty("--route-accent", route.color);

      if (routeTitleEl) routeTitleEl.textContent = route.title;
      if (routeRateEl) routeRateEl.textContent = route.rate;

      routeCard.classList.add("is-updating");
      window.clearTimeout(cardUpdateTimer);
      syncScene();
      globe.pointOfView(route.focus, prefersReducedMotion ? 0 : 1200);

      if (rateRouteSelect) {
        rateRouteSelect.value = route.id;
        updateRateEstimate();
      }

      cardUpdateTimer = window.setTimeout(() => {
        routeCard.classList.remove("is-updating");
      }, 220);

      if (isUserInitiated) {
        pauseCycle();
      }
    }

    const updateOverlay = () => {
      if (activeRoute) {
        setCityTagPosition(activeRoute.from);
        setCityTagPosition(activeRoute.to);
        updateDockPosition();
      }

      globeFrame = window.requestAnimationFrame(updateOverlay);
    };

    const resizeGlobe = () => {
      const width = globeRender.clientWidth || 560;
      const height = globeRender.clientHeight || width;
      globe.width(width).height(height);
      updateDockPosition();
    };

    if (rateForm && rateAmountInput && rateRouteSelect) {
      rateAmountInput.addEventListener("input", updateRateEstimate);
      rateRouteSelect.addEventListener("change", () => {
        setActiveRoute(rateRouteSelect.value, true);
      });
    }

    fetch(geoJsonUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        countryFeatures = Array.isArray(data.features) ? data.features : [];
        syncScene();
      })
      .catch(() => {
        countryFeatures = [];
        syncScene();
      });

    window.addEventListener("resize", resizeGlobe);
    setActiveRoute(activeRouteId, false);
    updateRateEstimate();
    resizeGlobe();
    startCycle();
    globeFrame = window.requestAnimationFrame(updateOverlay);
  } catch (error) {
    console.error("Wapi globe init failed", error);
  }
};

if (routeGlobe && globeRender && routeCard && routeDock) {
  const beginLiveGlobe = () => {
    if (!desktopGlobeMedia.matches || liveGlobeRequested || liveGlobeInitialized) return;

    liveGlobeRequested = true;

    loadLiveGlobeAssets()
      .then(() => {
        initLiveGlobe();
      })
      .catch((error) => {
        liveGlobeRequested = false;
        console.error("Wapi globe assets failed to load", error);
      });
  };

  if (desktopGlobeMedia.matches) {
    if ("IntersectionObserver" in window) {
      const heroGlobeObserver = new IntersectionObserver(
        (entries, observer) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            beginLiveGlobe();
            observer.disconnect();
          }
        },
        { rootMargin: "220px 0px" }
      );

      heroGlobeObserver.observe(routeGlobe);
    } else {
      beginLiveGlobe();
    }
  }

  const handleGlobeMediaChange = (event) => {
    if (event.matches) {
      beginLiveGlobe();
    }
  };

  if (typeof desktopGlobeMedia.addEventListener === "function") {
    desktopGlobeMedia.addEventListener("change", handleGlobeMediaChange);
  } else if (typeof desktopGlobeMedia.addListener === "function") {
    desktopGlobeMedia.addListener(handleGlobeMediaChange);
  }
}
