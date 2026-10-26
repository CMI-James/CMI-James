// Render with ?theme=light for the light-mode variant
if (new URLSearchParams(location.search).get("theme") === "light") {
  document.documentElement.dataset.theme = "light";
}
