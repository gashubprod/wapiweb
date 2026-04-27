(function attachWapiRateSource(global) {
  // Keep the checker stable today; set this endpoint later to replace static rates.
  const ENDPOINT_META_SELECTOR = 'meta[name="wapi-rates-endpoint"]';
  const REQUEST_TIMEOUT_MS = 3500;

  const getConfiguredEndpoint = () =>
    global.WAPI_RATE_ENDPOINT ||
    document.querySelector(ENDPOINT_META_SELECTOR)?.getAttribute("content")?.trim() ||
    "";

  const getRateItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rates)) return payload.rates;
    if (Array.isArray(payload?.routes)) return payload.routes;
    return [];
  };

  const getNumericMultiplier = (rate) => {
    const value = rate?.multiplier ?? rate?.value ?? rate?.rateValue;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  };

  const normalizeCurrencyRates = (item, payloadBaseCurrency) => {
    if (item?.rates && typeof item.rates === "object" && !Array.isArray(item.rates)) {
      return Object.entries(item.rates).reduce((rates, [currency, rate]) => {
        const multiplier = getNumericMultiplier(rate);
        if (!multiplier) return rates;

        rates[currency] = {
          multiplier,
          rate: rate.displayRate || rate.rate || rate.label || `${currency} rate available`,
        };

        return rates;
      }, {});
    }

    const currency =
      item.baseCurrency ||
      item.fromCurrency ||
      item.sourceCurrency ||
      item.sendCurrency ||
      payloadBaseCurrency;
    const multiplier = getNumericMultiplier(item);

    if (!currency || !multiplier) return {};

    return {
      [currency]: {
        multiplier,
        rate: item.displayRate || item.rateLabel || item.rate || `${currency} rate available`,
      },
    };
  };

  const applyRatesToStore = (payload, sharedRouteRates) => {
    const items = getRateItems(payload);
    let appliedCount = 0;

    items.forEach((item) => {
      const routeId = item.routeId || item.id;
      if (!routeId) return;

      const existingRoute = sharedRouteRates.get(routeId) || { rates: {} };
      const nextRates = {
        ...existingRoute.rates,
        ...normalizeCurrencyRates(item, payload?.baseCurrency),
      };

      if (!Object.keys(nextRates).length) return;

      sharedRouteRates.set(routeId, {
        ...existingRoute,
        label: item.label || item.rateCheckLabel || existingRoute.label,
        outputCurrency:
          item.outputCurrency ||
          item.toCurrency ||
          item.targetCurrency ||
          item.quoteCurrency ||
          existingRoute.outputCurrency,
        rates: nextRates,
      });

      appliedCount += 1;
    });

    return appliedCount;
  };

  const notifyStatus = (status) => {
    global.dispatchEvent(new CustomEvent("wapi:rates-status", { detail: status }));
    return status;
  };

  const hydrateRates = async ({ sharedRouteRates } = {}) => {
    const endpoint = getConfiguredEndpoint();

    if (!endpoint || !sharedRouteRates) {
      return notifyStatus({ mode: "indicative", reason: "missing_endpoint" });
    }

    const controller = new AbortController();
    const timeoutId = global.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    notifyStatus({ mode: "loading", endpoint });

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Rate endpoint returned ${response.status}`);
      }

      const payload = await response.json();
      const appliedCount = applyRatesToStore(payload, sharedRouteRates);

      if (!appliedCount) {
        throw new Error("Rate endpoint returned no matching routes");
      }

      return notifyStatus({
        mode: "live",
        endpoint,
        appliedCount,
        updatedAt: payload.updatedAt || payload.timestamp || payload.asOf || null,
      });
    } catch (error) {
      return notifyStatus({
        mode: "indicative",
        endpoint,
        reason: error.name === "AbortError" ? "timeout" : "fetch_failed",
      });
    } finally {
      global.clearTimeout(timeoutId);
    }
  };

  global.WapiRateSource = {
    getConfiguredEndpoint,
    hasConfiguredEndpoint: () => Boolean(getConfiguredEndpoint()),
    hydrateRates,
  };
})(window);
