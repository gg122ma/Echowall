(function () {
  const STORAGE_KEY = "echo-wall-language:v1";
  const SUPPORTED = ["en", "ms", "zh"];
  let language = localStorage.getItem(STORAGE_KEY) || "en";
  if (!SUPPORTED.includes(language)) language = "en";

  function interpolate(template, variables) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => variables?.[key] ?? `{${key}}`);
  }

  function t(key, variables = {}) {
    const locales = window.EchoLocales || {};
    const table = locales[language] || locales.en || {};
    const fallback = locales.en || {};
    return interpolate(table[key] ?? fallback[key] ?? key, variables);
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      element.textContent = t(key);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  }

  function setLanguage(nextLanguage) {
    if (!SUPPORTED.includes(nextLanguage)) return;
    language = nextLanguage;
    localStorage.setItem(STORAGE_KEY, language);
    apply();
    window.dispatchEvent(new CustomEvent("echo:languagechange", { detail: { language } }));
  }

  window.I18n = {
    t,
    apply,
    setLanguage,
    getLanguage: () => language,
    supported: SUPPORTED.slice(),
  };
})();
