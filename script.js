const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const revealItems = document.querySelectorAll(".reveal");
const statCounters = document.querySelectorAll("[data-counter]");
const network = document.querySelector("[data-network]");
const spotlights = document.querySelectorAll("[data-spotlight]");
const productSteps = document.querySelectorAll(".product-step");
const productPanels = document.querySelectorAll("[data-product-panel]");
const scrollCards = document.querySelectorAll(
  ".rail-orbit-shell, .stat, .tension-card, .product-stage-shell, .platform-column, .cta-panel"
);

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
  const cards = network.querySelectorAll(".network-card");
  let autoFocusId = null;
  let autoResumeId = null;
  let autoIndex = 0;

  const setFocusedCard = (targetCard) => {
    cards.forEach((card) => card.classList.toggle("is-focused", card === targetCard));
  };

  const stopAutoFocus = () => {
    if (autoFocusId !== null) {
      window.clearInterval(autoFocusId);
      autoFocusId = null;
    }
  };

  const scheduleAutoFocus = (delay = 0) => {
    if (!cards.length) return;
    stopAutoFocus();

    if (autoResumeId !== null) {
      window.clearTimeout(autoResumeId);
    }

    autoResumeId = window.setTimeout(() => {
      autoResumeId = null;
      setFocusedCard(cards[autoIndex % cards.length]);
      autoIndex += 1;
      autoFocusId = window.setInterval(() => {
        setFocusedCard(cards[autoIndex % cards.length]);
        autoIndex += 1;
      }, 2600);
    }, delay);
  };

  scheduleAutoFocus();

  network.addEventListener("pointermove", (event) => {
    stopAutoFocus();

    if (autoResumeId !== null) {
      window.clearTimeout(autoResumeId);
      autoResumeId = null;
    }

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

    let activeCard = null;
    let activeDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;
      const distance = Math.hypot(event.clientX - cardCenterX, event.clientY - cardCenterY);

      if (distance < activeDistance) {
        activeDistance = distance;
        activeCard = card;
      }
    });

    setFocusedCard(activeCard);
  });

  network.addEventListener("pointerleave", () => {
    layers.forEach((layer) => {
      layer.style.removeProperty("--move-x");
      layer.style.removeProperty("--move-y");
    });

    scheduleAutoFocus(900);
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
