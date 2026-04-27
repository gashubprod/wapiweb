// Subtle desktop-only parallax for the hero visual layers.
(function attachWapiHeroMotion(global) {
  global.initWapiHeroMotion = function initWapiHeroMotion() {
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
  };
})(window);
