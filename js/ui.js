(function attachWapiUi(global) {
  function initRateCheck() {
    const rateForm = document.querySelector("[data-rate-form]");
    const rateAmountInput = document.querySelector("[data-rate-amount]");
    const rateRouteSelect = document.querySelector("[data-rate-route]");
    const rateOutput = document.querySelector("[data-rate-output]");
    const rateMeta = document.querySelector("[data-rate-meta]");
    const {
      DEFAULT_ROUTE_ID,
      sharedRouteRates,
      formatRateAmount,
    } = global.WapiRoutes || {};

    if (!rateForm || !rateAmountInput || !rateRouteSelect || !rateOutput || !rateMeta) return;

    const syncRateEstimate = (preferredRouteId = null) => {
      const selectedRoute =
        sharedRouteRates.get(preferredRouteId || rateRouteSelect.value) ||
        sharedRouteRates.get(DEFAULT_ROUTE_ID) ||
        sharedRouteRates.values().next().value;
      const amount = Math.max(Number(rateAmountInput.value) || 0, 0);
      const received = amount * selectedRoute.multiplier;

      rateOutput.textContent = `${formatRateAmount(received)} ${selectedRoute.outputCurrency}`;
      rateMeta.textContent = `Indicative rate ${selectedRoute.rate}`;
    };

    rateAmountInput.addEventListener("input", () => syncRateEstimate());
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
    const productSteps = document.querySelectorAll(".product-step");
    const productPanels = document.querySelectorAll("[data-product-panel]");

    if (!productSteps.length || !productPanels.length) return;

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

  function initScrollCards() {
    const scrollCards = document.querySelectorAll(".rail-orbit-shell, .tension-card, .cta-panel");

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

    if (!promiseSection || !promiseVisual || !promiseSteps.length) {
      return;
    }

    const setActivePromiseStep = (activeIndex) => {
      promiseSteps.forEach((step, index) => {
        step.classList.toggle("is-active", index === activeIndex);
        step.classList.toggle("is-past", index < activeIndex);
      });
    };

    // The text panels drive the visual state. As each step becomes the dominant
    // item in the viewport, it becomes active. The image crossfade starts a bit
    // later so the second frame arrives after the second step has properly settled.
    const stepRatios = new Map();
    const receiverStep = promiseSteps[1] || null;

    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible-step");
          }

          stepRatios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let activeIndex = 0;
        let bestRatio = -1;

        promiseSteps.forEach((step, index) => {
          const ratio = stepRatios.get(step) || 0;

          if (ratio > bestRatio) {
            bestRatio = ratio;
            activeIndex = index;
          }
        });

        setActivePromiseStep(bestRatio > 0 ? activeIndex : 0);

        if (receiverStep) {
          const receiverRatio = stepRatios.get(receiverStep) || 0;
          const imageProgress = Math.min(Math.max((receiverRatio - 0.24) / 0.28, 0), 1);

          promiseVisual.style.setProperty("--promise-image-progress", imageProgress.toFixed(3));
        } else {
          promiseVisual.style.setProperty("--promise-image-progress", "0");
        }
      },
      {
        threshold: [0, 0.18, 0.32, 0.5, 0.68, 0.86],
        rootMargin: "-18% 0px -28% 0px",
      }
    );

    promiseSteps.forEach((step) => {
      stepRatios.set(step, 0);
      stepObserver.observe(step);
    });

    promiseVisual.style.setProperty("--promise-image-progress", "0");
    setActivePromiseStep(0);
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
