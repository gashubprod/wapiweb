// Shared reveal observer and simple stat counter animation.
(function attachWapiReveal(global) {
  const animateCounter = (element) => {
    const targetValue = element.dataset.counter;

    if (targetValue.includes("+") || targetValue.includes("/")) {
      element.textContent = targetValue;
      return;
    }

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
  };

  global.initWapiReveal = function initWapiReveal() {
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

          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.55 }
    );

    statCounters.forEach((counter) => counterObserver.observe(counter));
  };
})(window);
