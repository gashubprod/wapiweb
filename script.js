if (window.renderWapiLayout) {
  window.renderWapiLayout();
}

if (window.initWapiUi) {
  window.initWapiUi();
}

const routeGlobe = document.querySelector("[data-route-globe]");
const globeRender = document.querySelector("[data-globe-render]");
const routeCard = document.querySelector("[data-route-card]");
const routeDock = document.querySelector(".network-route-dock");

if (routeGlobe && globeRender && routeCard && routeDock && window.initWapiRouteGlobe) {
  window.initWapiRouteGlobe({
    routeGlobe,
    globeRender,
    routeCard,
    routeDock,
  });
}
