(function attachWapiPromiseStory(global) {
  global.initWapiPromiseStory = function initWapiPromiseStory() {
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
  };
})(window);
