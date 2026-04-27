// Scroll progress treatment for closing CTA cards.
(function attachWapiScrollCards(global) {
  global.initWapiScrollCards = function initWapiScrollCards() {
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
  };
})(window);
