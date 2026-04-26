(function attachWapiLayout(global) {
  const storeButtons = `
    <a
      class="store-button"
      href="https://apps.apple.com/us/app/wapipay-global/id1532846160"
      target="_blank"
      rel="noreferrer"
    >
      <span class="store-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="presentation">
          <path
            d="M16.37 1.43c.06 1.24-.35 2.18-.98 2.95-.69.82-1.81 1.46-2.98 1.37-.14-1.12.38-2.24 1.01-2.97.69-.81 1.88-1.4 2.95-1.35zm3.14 16.63c-.48 1.1-.7 1.58-1.32 2.55-.87 1.35-2.1 3.03-3.61 3.04-1.35.01-1.7-.88-3.53-.87-1.83.01-2.22.89-3.57.88-1.51-.01-2.67-1.52-3.54-2.87-2.43-3.76-2.68-8.18-1.19-10.47 1.06-1.63 2.73-2.58 4.3-2.58 1.6 0 2.6.88 3.92.88 1.28 0 2.06-.88 3.9-.88 1.4 0 2.89.76 3.95 2.06-3.45 1.89-2.89 6.8.69 8.26z"
            fill="currentColor"
          ></path>
        </svg>
      </span>
      <span class="store-copy">
        <span class="store-button-label">Download on the</span>
        <strong>App Store</strong>
      </span>
    </a>
    <a
      class="store-button"
      href="https://play.google.com/store/apps/details?id=com.wapipay"
      target="_blank"
      rel="noreferrer"
    >
      <span class="store-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="presentation">
          <path d="M3.5 2.4 13.8 12 3.5 21.6z" fill="#34A853"></path>
          <path d="M13.8 12 17.3 8.8 21.5 11.2c1.2.68 1.2 1.73 0 2.4L17.3 16z" fill="#FBBC04"></path>
          <path d="M3.5 2.4 17.3 8.8 13.8 12z" fill="#4285F4"></path>
          <path d="M3.5 21.6 17.3 16 13.8 12z" fill="#EA4335"></path>
        </svg>
      </span>
      <span class="store-copy">
        <span class="store-button-label">Get it on</span>
        <strong>Google Play</strong>
      </span>
    </a>
  `;

  function getLinkSet(page) {
    if (page !== "home") {
      return {
        home: "index.html#top",
        products: "index.html#products",
        markets: "index.html#markets",
        about: "about.html",
        trust: "trust.html",
        start: "#get-started",
      };
    }

    return {
      home: "#top",
      products: "#products",
      markets: "#markets",
      about: "about.html",
      trust: "trust.html",
      start: "#get-started",
    };
  }

  function renderHeader(page) {
    const links = getLinkSet(page);
    const aboutCurrent = page === "about" ? ' aria-current="page"' : "";
    const trustCurrent = page === "trust" ? ' aria-current="page"' : "";

    return `
      <header class="site-header">
        <a class="brand" href="${links.home}" aria-label="WapiPay home">
          <img
            class="brand-logo"
            src="assets/existing/logo.png"
            alt="WapiPay"
            width="449"
            height="92"
            decoding="async"
            fetchpriority="high"
          />
          <span class="brand-copy">Global account anywhere</span>
        </a>

        <button
          class="menu-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="primary-nav"
          aria-label="Open navigation"
        >
          <span class="sr-only">Menu</span>
          <span class="menu-toggle-box" aria-hidden="true">
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
          </span>
        </button>

        <nav class="nav" id="primary-nav">
          <a href="${links.products}">Products</a>
          <a href="https://docs.wapipay.io/">Developers</a>
          <a href="${links.markets}">Markets</a>
          <a href="${links.about}"${aboutCurrent}>About</a>
          <a href="${links.trust}"${trustCurrent}>Trust</a>
        </nav>

        <div class="header-actions">
          <a class="button button-secondary" href="https://docs.wapipay.io/">Developer Portal</a>
          <a class="button button-primary" href="${links.start}">Download App</a>
        </div>
      </header>
    `;
  }

  function renderClosing(page) {
    const links = getLinkSet(page);

    return `
      <div class="closing-panel">
        <div class="cta-panel closing-cta">
          <p class="eyebrow">Get Started</p>
          <h2><span class="text-reveal">Choose the WapiPay path that fits the payment job.</span></h2>
          <p>Download the app for personal transfers, use the developer portal for API payouts, or contact the team for larger settlement needs.</p>
          <div class="store-actions cta-store-actions" aria-label="Download WapiPay">
            ${storeButtons}
            <a class="button button-secondary" href="https://docs.wapipay.io/">Developer Portal</a>
          </div>
          <div class="closing-proof" aria-label="Closing trust points">
            <div class="closing-proof-item">
              <strong>20+</strong>
              <span>Currencies supported</span>
            </div>
            <div class="closing-proof-item">
              <strong>App + API</strong>
              <span>Personal and business access</span>
            </div>
            <div class="closing-proof-item">
              <strong>Local rails</strong>
              <span>Across key corridors</span>
            </div>
          </div>
        </div>

        <footer class="site-footer">
          <div class="footer-brand">
            <img
              class="footer-logo"
              src="assets/existing/logo.png"
              alt="WapiPay"
              width="449"
              height="92"
              loading="lazy"
              decoding="async"
            />
            <p>Cross-border payments, wallets, business payouts, and OTC support across supported corridors.</p>
          </div>
          <div class="footer-columns">
            <section class="footer-column footer-location">
              <span class="footer-heading">Nairobi</span>
              <p>15th Floor, Broadwalk Residency, Ojijo Road, Westlands, Nairobi</p>
              <a href="tel:+254768985998">+254 (768) 985998</a>
              <a href="tel:+254790268631">+254 (790) 268631</a>
              <a href="mailto:jambo@wapipay.com">jambo@wapipay.com</a>
              <p>P.O Box 12248 GPO, Nairobi</p>
            </section>

            <section class="footer-column footer-location">
              <span class="footer-heading">Kampala</span>
              <p>Suit 11B, DTB Centre, Plot 17/19 Kampala Road</p>
              <a href="tel:+256782970476">+256 (782) 970476</a>
              <a href="tel:+256323200898">+256 (323) 200898</a>
              <a href="mailto:jambouganda@wapipay.com">jambouganda@wapipay.com</a>
              <p>P.O Box 107285 Kampala</p>
            </section>

            <section class="footer-column footer-links-group">
              <span class="footer-heading">Contact</span>
              <a href="mailto:customercare@wapipay.com">customercare@wapipay.com</a>
              <a href="mailto:jambo@wapipay.com">jambo@wapipay.com</a>
              <a href="https://docs.wapipay.io/docs/contact-us">Contact Us</a>
              <a href="https://docs.wapipay.io/docs/f-a-q">FAQ</a>
            </section>

            <section class="footer-column footer-links-group">
              <span class="footer-heading">Explore</span>
              <a href="${links.products}">Products</a>
              <a href="${links.markets}">Markets</a>
              <a href="https://docs.wapipay.io/">Developers</a>
              <a href="${links.about}">About</a>
              <a href="${links.trust}">Trust</a>
              <a href="${links.start}">Download App</a>
            </section>

            <section class="footer-column footer-links-group">
              <span class="footer-heading">Legal</span>
              <a href="trust.html">Trust & Security</a>
              <a href="privacy.html">Privacy Policy</a>
              <a href="terms.html">Terms of Use</a>
              <a href="https://docs.wapipay.io/docs/f-a-q">FAQ</a>
            </section>
          </div>
        </footer>
      </div>
    `;
  }

  global.renderWapiLayout = function renderWapiLayout() {
    const page = document.body.dataset.page || "home";
    const headerMount = document.querySelector("[data-site-header]");
    const closingMount = document.querySelector("[data-site-closing]");

    if (headerMount) {
      headerMount.outerHTML = renderHeader(page);
    }

    if (closingMount) {
      closingMount.outerHTML = renderClosing(page);
    }
  };
})(window);
