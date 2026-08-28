(function () {
  const CACHE_KEY = "echo-wall-translation-cache:v1";

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
  }

  function writeCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  }

  async function translateText(text, targetLanguage, sourceLanguage = "auto") {
    const cleanText = String(text || "").trim();
    if (!cleanText) return "";
    const key = `${sourceLanguage}|${targetLanguage}|${cleanText}`;
    const cache = readCache();
    if (cache[key]) return cache[key];

    const config = window.EchoConfig?.translation || {};
    if (!config.endpoint) {
      const error = new Error("TRANSLATION_NOT_CONFIGURED");
      error.code = "TRANSLATION_NOT_CONFIGURED";
      throw error;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(config.requestHeaders || {}) },
      body: JSON.stringify({ text: cleanText, sourceLanguage, targetLanguage }),
    });
    if (!response.ok) throw new Error(`Translation request failed (${response.status}).`);
    const result = await response.json();
    const translated = String(result.translatedText || result.translation || "").trim();
    if (!translated) throw new Error("Translation service returned no text.");
    cache[key] = translated;
    writeCache(cache);
    return translated;
  }

  window.TranslationService = { translateText };
})();
