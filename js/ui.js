// UI orchestrator. Individual behavior modules register their own init functions on window.
(function attachWapiUi(global) {
  const initializers = [
    "initWapiHeaderMenu",
    "initWapiRateCheck",
    "initWapiHeroMotion",
    "initWapiProducts",
    "initWapiScrollCards",
    "initWapiPromiseStory",
    "initWapiSeoFlowContent",
    "initWapiSeoFlow",
    "initWapiReveal",
  ];

  global.initWapiUi = function initWapiUi() {
    initializers.forEach((initializerName) => {
      const initializer = global[initializerName];
      if (typeof initializer === "function") initializer();
    });
  };
})(window);
