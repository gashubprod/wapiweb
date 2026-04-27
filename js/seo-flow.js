// Corridor walkthrough controller. Keeps SEO page steps and app panels synced while scrolling.
(function attachWapiSeoFlow(global) {
  global.initWapiSeoFlow = function initWapiSeoFlow() {
    const flows = Array.from(document.querySelectorAll("[data-seo-flow]"));

    if (!flows.length) return;

    flows.forEach((flow) => {
      const steps = Array.from(flow.querySelectorAll("[data-flow-step]"));
      const panels = Array.from(flow.querySelectorAll("[data-flow-panel]"));

      if (!steps.length || !panels.length) return;

      let activeStepId = null;
      let flowFrame = null;

      const setActiveStep = (stepId) => {
        if (!stepId || stepId === activeStepId) return;
        activeStepId = stepId;

        steps.forEach((step) => {
          const isActive = step.dataset.flowStep === stepId;
          step.classList.toggle("is-active", isActive);

          if (isActive) {
            step.setAttribute("aria-current", "true");
          } else {
            step.removeAttribute("aria-current");
          }
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.flowPanel === stepId;
          panel.classList.toggle("is-active", isActive);
          panel.setAttribute("aria-hidden", String(!isActive));
        });
      };

      const syncFlowToScroll = () => {
        // Match the product section behavior: a stable viewport focus line drives the active state.
        const focusLine = window.innerHeight * 0.48;
        let activeStep = steps[0];
        let smallestDistance = Number.POSITIVE_INFINITY;

        steps.forEach((step) => {
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

        setActiveStep(activeStep.dataset.flowStep);
        flowFrame = null;
      };

      const requestFlowSync = () => {
        if (flowFrame !== null) return;
        flowFrame = window.requestAnimationFrame(syncFlowToScroll);
      };

      window.addEventListener("scroll", requestFlowSync, { passive: true });
      window.addEventListener("resize", requestFlowSync);
      syncFlowToScroll();
    });
  };
})(window);
