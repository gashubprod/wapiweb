// Customer rate checker. Uses static fallback rates until js/rates-api.js hydrates live rates.
(function attachWapiRateCheck(global) {
  global.initWapiRateCheck = function initWapiRateCheck() {
    const rateForm = document.querySelector("[data-rate-form]");
    const rateAmountInput = document.querySelector("[data-rate-amount]");
    const rateCurrencySelect = document.querySelector("[data-rate-currency]");
    const rateRouteSelect = document.querySelector("[data-rate-route]");
    const rateOutput = document.querySelector("[data-rate-output]");
    const rateMeta = document.querySelector("[data-rate-meta]");
    const rateStatus = document.querySelector("[data-rate-status]");
    const {
      DEFAULT_ROUTE_ID,
      DEFAULT_BASE_CURRENCY,
      sharedRouteRates,
      formatRateAmount,
    } = global.WapiRoutes || {};

    if (
      !rateForm ||
      !rateAmountInput ||
      !rateCurrencySelect ||
      !rateRouteSelect ||
      !rateOutput ||
      !rateMeta ||
      !sharedRouteRates ||
      !formatRateAmount
    ) return;

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
      return "Indicative rate";
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

    const syncRateEstimate = (preferredRouteId = null) => {
      const selectedRoute =
        sharedRouteRates.get(preferredRouteId || rateRouteSelect.value) ||
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
      // Keep the UI useful even before the backend endpoint is available.
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

    rateAmountInput.addEventListener("input", () => syncRateEstimate());
    rateCurrencySelect.addEventListener("change", () => syncRateEstimate());
    rateRouteSelect.addEventListener("change", () => syncRateEstimate());
    setRateFeedState(rateFeedState);
    syncRateEstimate();
    hydrateLiveRates();
  };
})(window);
