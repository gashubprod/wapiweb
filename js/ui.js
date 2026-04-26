(function attachWapiUi(global) {
  function initRateCheck() {
    const rateForm = document.querySelector("[data-rate-form]");
    const rateAmountInput = document.querySelector("[data-rate-amount]");
    const rateCurrencySelect = document.querySelector("[data-rate-currency]");
    const rateRouteSelect = document.querySelector("[data-rate-route]");
    const rateOutput = document.querySelector("[data-rate-output]");
    const rateMeta = document.querySelector("[data-rate-meta]");
    const {
      DEFAULT_ROUTE_ID,
      DEFAULT_BASE_CURRENCY,
      sharedRouteRates,
      formatRateAmount,
    } = global.WapiRoutes || {};

    if (
      !rateForm ||
      !rateAmountInput ||
      !rateCurrencySelect ||
      !rateRouteSelect ||
      !rateOutput ||
      !rateMeta ||
      !sharedRouteRates ||
      !formatRateAmount
    ) return;

    rateRouteSelect.querySelectorAll("option").forEach((option) => {
      const route = sharedRouteRates.get(option.value);
      if (route?.label) option.textContent = route.label;
    });

    const syncRateEstimate = (preferredRouteId = null) => {
      const selectedRoute =
        sharedRouteRates.get(preferredRouteId || rateRouteSelect.value) ||
        sharedRouteRates.get(DEFAULT_ROUTE_ID) ||
        sharedRouteRates.values().next().value;
      const selectedBaseCurrency = rateCurrencySelect.value || DEFAULT_BASE_CURRENCY || "USD";
      const selectedRate =
        selectedRoute?.rates?.[selectedBaseCurrency] ||
        selectedRoute?.rates?.[DEFAULT_BASE_CURRENCY] ||
        Object.values(selectedRoute?.rates || {})[0];

      if (!selectedRoute || !selectedRate) return;

      const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
      const received = amount * selectedRate.multiplier;

      rateOutput.textContent = `${formatRateAmount(received)} ${selectedRoute.outputCurrency}`;
      rateMeta.textContent = `Indicative rate ${selectedRate.rate}`;
    };

    rateAmountInput.addEventListener("input", () => syncRateEstimate());
    rateCurrencySelect.addEventListener("change", () => syncRateEstimate());
    rateRouteSelect.addEventListener("change", () => syncRateEstimate());
    syncRateEstimate();
  }

  function initHeaderMenu() {
    const header = document.querySelector(".site-header");
    const menuToggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".nav");

    if (!header || !menuToggle || !nav) return;

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

  function initHeroParallax() {
    const network = document.querySelector("[data-network]");
    const supportsHeroParallax = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (!network || !supportsHeroParallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

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

  function initProducts() {
    const productSteps = Array.from(document.querySelectorAll(".product-step"));
    const productPanels = Array.from(document.querySelectorAll("[data-product-panel]"));

    if (!productSteps.length || !productPanels.length) return;

    let activeProductId = null;
    let productFrame = null;

    const setActiveProduct = (productId) => {
      if (!productId || productId === activeProductId) return;
      activeProductId = productId;

      productSteps.forEach((step) => {
        const isActive = step.dataset.product === productId;
        step.classList.toggle("is-active", isActive);
        if (isActive) {
          step.setAttribute("aria-current", "true");
        } else {
          step.removeAttribute("aria-current");
        }
      });

      productPanels.forEach((panel) => {
        const isActive = panel.dataset.productPanel === productId;
        panel.classList.toggle("is-active", isActive);
        panel.setAttribute("aria-hidden", String(!isActive));
      });
    };

    const syncProductToScroll = () => {
      const focusLine = window.innerHeight * 0.48;
      let activeStep = productSteps[0];
      let smallestDistance = Number.POSITIVE_INFINITY;

      productSteps.forEach((step) => {
        const rect = step.getBoundingClientRect();

        if (rect.top <= focusLine && rect.bottom >= focusLine) {
          activeStep = step;
          smallestDistance = 0;
          return;
        }

        const midpoint = rect.top + rect.height / 2;
        const distance = Math.abs(midpoint - focusLine);

        if (distance < smallestDistance) {
          smallestDistance = distance;
          activeStep = step;
        }
      });

      setActiveProduct(activeStep.dataset.product);
      productFrame = null;
    };

    const requestProductSync = () => {
      if (productFrame !== null) return;
      productFrame = window.requestAnimationFrame(syncProductToScroll);
    };

    window.addEventListener("scroll", requestProductSync, { passive: true });
    window.addEventListener("resize", requestProductSync);
    syncProductToScroll();
  }

  function initScrollCards() {
    const scrollCards = document.querySelectorAll(".cta-panel");

    if (!scrollCards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cardFrame = null;

    const updateScrollCards = () => {
      const viewportHeight = window.innerHeight;

      scrollCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const progress = Math.min(
          Math.max((viewportHeight - rect.top) / (viewportHeight * 0.92), 0),
          1
        );
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

  function initPromiseImageSwap() {
    const promiseSection = document.querySelector("[data-promise-section]");
    const promiseVisual = document.querySelector("[data-promise-visual]");
    const promiseSteps = Array.from(document.querySelectorAll("[data-promise-step]"));
    const promiseVisualSteps = Array.from(document.querySelectorAll("[data-promise-visual-step]"));
    const promiseLineSteps = Array.from(document.querySelectorAll(".promise-flow-line span"));

    if (!promiseSection || !promiseVisual || !promiseSteps.length) {
      return;
    }

    const setActivePromiseStep = (activeIndex) => {
      promiseSteps.forEach((step, index) => {
        step.classList.toggle("is-active", index === activeIndex);
        step.classList.toggle("is-past", index < activeIndex);
      });

      promiseVisualSteps.forEach((step, index) => {
        step.classList.toggle("is-active", index === activeIndex);
        step.classList.toggle("is-past", index < activeIndex);
      });

      promiseLineSteps.forEach((step, index) => {
        step.classList.toggle("is-active", index <= activeIndex);
      });
    };

    let promiseFrame = null;

    const syncPromiseToScroll = () => {
      const viewportHeight = window.innerHeight;
      const focusLine = viewportHeight * 0.48;
      let activeIndex = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      promiseSteps.forEach((step, index) => {
        const rect = step.getBoundingClientRect();

        if (rect.top < viewportHeight * 0.92) {
          step.classList.add("is-visible-step");
        }

        if (rect.top <= focusLine && rect.bottom >= focusLine) {
          activeIndex = index;
          smallestDistance = 0;
          return;
        }

        const midpoint = rect.top + rect.height / 2;
        const distance = Math.abs(midpoint - focusLine);

        if (distance < smallestDistance) {
          smallestDistance = distance;
          activeIndex = index;
        }
      });

      setActivePromiseStep(activeIndex);
      promiseVisual.style.setProperty("--promise-image-progress", activeIndex > 0 ? "1" : "0");
      promiseFrame = null;
    };

    const requestPromiseSync = () => {
      if (promiseFrame !== null) return;
      promiseFrame = window.requestAnimationFrame(syncPromiseToScroll);
    };

    window.addEventListener("scroll", requestPromiseSync, { passive: true });
    window.addEventListener("resize", requestPromiseSync);

    promiseVisual.style.setProperty("--promise-image-progress", "0");
    setActivePromiseStep(0);
    syncPromiseToScroll();
  }

  function initRevealEffects() {
    const revealItems = document.querySelectorAll(".reveal");
    const statCounters = document.querySelectorAll("[data-counter]");

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 8% 0px" }
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
  }

  global.initWapiUi = function initWapiUi() {
    initHeaderMenu();
    initRateCheck();
    initHeroParallax();
    initProducts();
    initScrollCards();
    initPromiseImageSwap();
    initRevealEffects();
  };
})(window);
