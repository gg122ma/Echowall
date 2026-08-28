(function () {
  const STORAGE_KEY = "echo-wall-theme:v1";
  const VALID = new Set(["light", "dark", "system"]);

  function getPreference() {
    const saved = localStorage.getItem(STORAGE_KEY) || "system";
    return VALID.has(saved) ? saved : "system";
  }

  function resolve(preference) {
    if (preference !== "system") return preference;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply(preference = getPreference()) {
    const resolved = resolve(preference);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    window.dispatchEvent(new CustomEvent("echo:themechange", { detail: { preference, resolved } }));
  }

  function setTheme(preference) {
    if (!VALID.has(preference)) return;
    localStorage.setItem(STORAGE_KEY, preference);
    apply(preference);
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener?.("change", () => {
    if (getPreference() === "system") apply("system");
  });

  window.ThemeService = { getPreference, setTheme, apply };
  apply();
})();
