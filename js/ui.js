(function attachWapiUi(global) {
  const initializers = [
    "initWapiHeaderMenu",
    "initWapiRateCheck",
    "initWapiHeroMotion",
    "initWapiProducts",
    "initWapiScrollCards",
    "initWapiPromiseStory",
    "initWapiReveal",
  ];

  global.initWapiUi = function initWapiUi() {
    initializers.forEach((initializerName) => {
      const initializer = global[initializerName];
      if (typeof initializer === "function") initializer();
    });
  };
})(window);
