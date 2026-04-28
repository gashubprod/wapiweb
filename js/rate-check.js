// Customer rate checker. Static route rates keep pages useful until the live feed is configured.
(function attachWapiRateCheck(global) {
  const ROUTE_PAGE_DEFAULTS = {
    "kenya-to-china": { routeId: "nairobi-guangzhou", currency: "KES", amount: "20000" },
    "kenya-to-india": { routeId: "nairobi-mumbai", currency: "KES", amount: "20000" },
    "kenya-to-tanzania": { routeId: "nairobi-dar-es-salaam", currency: "KES", amount: "20000" },
    "kenya-to-uganda": { routeId: "nairobi-kampala", currency: "KES", amount: "20000" },
    "kenya-to-united-kingdom": { routeId: "nairobi-london", currency: "KES", amount: "20000" },
    "kenya-to-united-states": { routeId: "nairobi-new-york", currency: "KES", amount: "20000" },
    "uganda-to-china": { routeId: "kampala-guangzhou", currency: "UGX", amount: "200000" },
    "uganda-to-india": { routeId: "kampala-mumbai", currency: "UGX", amount: "200000" },
    "uganda-to-kenya": { routeId: "kampala-nairobi", currency: "UGX", amount: "200000" },
    "uganda-to-tanzania": { routeId: "kampala-dar-es-salaam", currency: "UGX", amount: "200000" },
    "uganda-to-united-kingdom": { routeId: "kampala-london", currency: "UGX", amount: "200000" },
    "uganda-to-united-states": { routeId: "kampala-new-york", currency: "UGX", amount: "200000" },
  };

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[character]);

  const getRoutePageDefault = () => {
    const slug = global.location.pathname.split("/").filter(Boolean).pop();
    return ROUTE_PAGE_DEFAULTS[slug] || null;
  };

  const buildCurrencyOptions = (currencyOptions) =>
    currencyOptions.map(({ code, label }) => (
      `<option value="${escapeHtml(code)}">${escapeHtml(label || code)}</option>`
    )).join("");

  const buildRouteOptions = (routes) =>
    routes.map(({ id, rateCheckLabel, title }) => (
      `<option value="${escapeHtml(id)}">${escapeHtml(rateCheckLabel || title)}</option>`
    )).join("");

  const renderRoutePageRateCheck = ({ BASE_CURRENCY_OPTIONS, ROUTE_DEFINITIONS }) => {
    const defaultConfig = getRoutePageDefault();
    if (!defaultConfig) return;

    const route = ROUTE_DEFINITIONS.find((item) => item.id === defaultConfig.routeId);
    const routeLabel = route?.rateCheckLabel || "this corridor";
    const currencyOptions = buildCurrencyOptions(BASE_CURRENCY_OPTIONS);
    const routeOptions = buildRouteOptions(ROUTE_DEFINITIONS);

    document.querySelectorAll(".seo-rate-section").forEach((section) => {
      if (section.querySelector("[data-rate-form]") || section.dataset.routeRateEnhanced === "true") return;

      const card = section.querySelector(".seo-rate-card");
      if (!card) return;

      section.dataset.routeRateEnhanced = "true";
      card.classList.add("seo-route-rate-check");
      card.innerHTML = `
        <span>Rate check</span>
        <strong>Compare payout</strong>
        <p>Change the amount, send currency, or corridor. The estimate updates instantly.</p>
        <form
          class="rate-check-form route-rate-form"
          data-rate-form
          data-rate-default-route="${escapeHtml(defaultConfig.routeId)}"
          data-rate-default-currency="${escapeHtml(defaultConfig.currency)}"
          data-rate-default-amount="${escapeHtml(defaultConfig.amount)}"
          aria-label="Rate check for ${escapeHtml(routeLabel)}"
        >
          <label class="rate-field">
            <span>Amount</span>
            <input type="number" min="1" step="1" value="${escapeHtml(defaultConfig.amount)}" inputmode="decimal" data-rate-amount />
          </label>

          <label class="rate-field">
            <span>Send currency</span>
            <select data-rate-currency>${currencyOptions}</select>
          </label>

          <label class="rate-field">
            <span>Country route</span>
            <select data-rate-route>${routeOptions}</select>
          </label>

          <div class="rate-check-result" aria-live="polite">
            <div class="rate-check-result-topline">
              <span>Recipient gets</span>
              <small class="rate-check-status" data-rate-status>Indicative</small>
            </div>
            <strong data-rate-output>Calculating</strong>
            <small data-rate-meta>Choose a route to compare payout.</small>
          </div>
        </form>
      `;
    });
  };

  const initRateForm = ({
    rateForm,
    DEFAULT_ROUTE_ID,
    DEFAULT_BASE_CURRENCY,
    sharedRouteRates,
    formatRateAmount,
  }) => {
    if (rateForm.dataset.rateReady === "true") return;

    const rateAmountInput = rateForm.querySelector("[data-rate-amount]");
    const rateCurrencySelect = rateForm.querySelector("[data-rate-currency]");
    const rateRouteSelect = rateForm.querySelector("[data-rate-route]");
    const rateOutput = rateForm.querySelector("[data-rate-output]");
    const rateMeta = rateForm.querySelector("[data-rate-meta]");
    const rateStatus = rateForm.querySelector("[data-rate-status]");

    if (!rateAmountInput || !rateCurrencySelect || !rateRouteSelect || !rateOutput || !rateMeta) return;

    const defaultRouteId = rateForm.dataset.rateDefaultRoute || DEFAULT_ROUTE_ID;
    const defaultCurrency = rateForm.dataset.rateDefaultCurrency || DEFAULT_BASE_CURRENCY || "USD";
    const defaultAmount = rateForm.dataset.rateDefaultAmount;

    if (defaultAmount) rateAmountInput.value = defaultAmount;
    if (
      defaultCurrency &&
      Array.from(rateCurrencySelect.options).some((option) => option.value === defaultCurrency)
    ) {
      rateCurrencySelect.value = defaultCurrency;
    }
    if (defaultRouteId && sharedRouteRates.has(defaultRouteId)) {
      rateRouteSelect.value = defaultRouteId;
    }

    let rateFeedState = {
      mode: "indicative",
      reason: global.WapiRateSource?.hasConfiguredEndpoint?.() ? "pending" : "missing_endpoint",
      updatedAt: null,
    };

    const formatUpdatedAt = (updatedAt) => {
      if (!updatedAt) return "";

      const date = new Date(updatedAt);
      if (Number.isNaN(date.getTime())) return "";

      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    };

    const getRateStatusLabel = () => {
      if (rateFeedState.mode === "live") return "Live";
      if (rateFeedState.mode === "loading") return "Checking";
      return "Indicative";
    };

    const getRateMetaPrefix = () => {
      if (rateFeedState.mode === "live") return "Live rate";
      return "Rate estimate";
    };

    const getRateMetaSuffix = () => {
      if (rateFeedState.mode === "live") {
        const updatedAt = formatUpdatedAt(rateFeedState.updatedAt);
        return updatedAt ? ` - Updated ${updatedAt}` : "";
      }

      if (rateFeedState.mode === "loading") {
        return " - Checking live feed";
      }

      if (rateFeedState.reason === "fetch_failed" || rateFeedState.reason === "timeout") {
        return " - Live feed unavailable";
      }

      return "";
    };

    const setRateFeedState = (nextState) => {
      rateFeedState = {
        ...rateFeedState,
        ...nextState,
      };

      rateForm.dataset.rateState = rateFeedState.mode;
      if (rateStatus) rateStatus.textContent = getRateStatusLabel();
    };

    rateRouteSelect.querySelectorAll("option").forEach((option) => {
      const route = sharedRouteRates.get(option.value);
      if (route?.label) option.textContent = route.label;
    });

    const syncRateEstimate = () => {
      const selectedRoute =
        sharedRouteRates.get(rateRouteSelect.value) ||
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
      rateMeta.textContent = `${getRateMetaPrefix()} ${selectedRate.rate}${getRateMetaSuffix()}`;
    };

    const hydrateLiveRates = async () => {
      if (!global.WapiRateSource?.hydrateRates || !global.WapiRateSource.hasConfiguredEndpoint()) {
        setRateFeedState({ mode: "indicative", reason: "missing_endpoint" });
        syncRateEstimate();
        return;
      }

      setRateFeedState({ mode: "loading", reason: "pending" });
      syncRateEstimate();

      const status = await global.WapiRateSource.hydrateRates({ sharedRouteRates });
      setRateFeedState(status);
      syncRateEstimate();
    };

    rateAmountInput.addEventListener("input", syncRateEstimate);
    rateCurrencySelect.addEventListener("change", syncRateEstimate);
    rateRouteSelect.addEventListener("change", syncRateEstimate);

    rateForm.dataset.rateReady = "true";
    setRateFeedState(rateFeedState);
    syncRateEstimate();
    hydrateLiveRates();
  };

  global.initWapiRateCheck = function initWapiRateCheck() {
    const {
      DEFAULT_ROUTE_ID,
      DEFAULT_BASE_CURRENCY,
      BASE_CURRENCY_OPTIONS = [],
      ROUTE_DEFINITIONS = [],
      sharedRouteRates,
      formatRateAmount,
    } = global.WapiRoutes || {};

    if (!sharedRouteRates || !formatRateAmount) return;

    renderRoutePageRateCheck({ BASE_CURRENCY_OPTIONS, ROUTE_DEFINITIONS });

    document.querySelectorAll("[data-rate-form]").forEach((rateForm) => {
      initRateForm({
        rateForm,
        DEFAULT_ROUTE_ID,
        DEFAULT_BASE_CURRENCY,
        sharedRouteRates,
        formatRateAmount,
      });
    });
  };
})(window);
