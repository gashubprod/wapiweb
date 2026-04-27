// Product story controller. Keeps copy steps and mock product panels in sync while scrolling.
(function attachWapiProducts(global) {
  global.initWapiProducts = function initWapiProducts() {
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
      // Use a stable viewport focus line so the active product changes predictably.
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
  };
})(window);
