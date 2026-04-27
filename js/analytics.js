(function attachWapiAnalytics(global) {
  const GA_MEASUREMENT_ID = "G-H4C4SQTD1G";
  const CLARITY_PROJECT_ID = "wi62mepian";

  global.dataLayer = global.dataLayer || [];
  global.gtag = global.gtag || function gtag() {
    global.dataLayer.push(arguments);
  };

  global.gtag("js", new Date());
  global.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    transport_type: "beacon",
  });

  if (!document.querySelector(`script[src="https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}"]`)) {
    const clarityScript = document.createElement("script");
    clarityScript.async = true;
    clarityScript.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    document.head.appendChild(clarityScript);
  }

  global.clarity = global.clarity || function clarity() {
    (global.clarity.q = global.clarity.q || []).push(arguments);
  };

  const cleanText = (value) => value.replace(/\s+/g, " ").trim();

  const getLinkLabel = (link) => {
    const ariaLabel = link.getAttribute("aria-label");
    return cleanText(ariaLabel || link.textContent || link.href || "Unknown link");
  };

  const trackEvent = (eventName, params = {}) => {
    if (typeof global.gtag !== "function") return;

    global.gtag("event", eventName, {
      page_name: document.body?.dataset.page || "unknown",
      ...params,
    });
  };

  const classifyLink = (link) => {
    const href = link.getAttribute("href") || "";
    const label = getLinkLabel(link);
    const isDeveloperLink = href.includes("docs.wapipay.io");
    const isPrimaryCta = link.classList.contains("button-primary");
    const isProductCta = link.classList.contains("product-step-link");
    const isNavLink = Boolean(link.closest(".nav"));

    if (isDeveloperLink) {
      return {
        eventName: "select_developer_cta",
        params: { cta_label: label, link_url: href },
      };
    }

    if (isProductCta) {
      return {
        eventName: "select_product_cta",
        params: { cta_label: label, link_url: href },
      };
    }

    if (isPrimaryCta || label.toLowerCase().includes("download")) {
      return {
        eventName: "select_primary_cta",
        params: { cta_label: label, link_url: href },
      };
    }

    if (isNavLink) {
      return {
        eventName: "select_navigation",
        params: { nav_label: label, link_url: href },
      };
    }

    return null;
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    const analyticsEvent = classifyLink(link);
    if (!analyticsEvent) return;

    trackEvent(analyticsEvent.eventName, analyticsEvent.params);
  });

  document.addEventListener("change", (event) => {
    const field = event.target;
    if (!field.matches("[data-rate-currency], [data-rate-route]")) return;

    trackEvent("change_rate_check", {
      field_name: field.matches("[data-rate-currency]") ? "send_currency" : "country_route",
      field_value: field.value,
    });
  });
})(window);
