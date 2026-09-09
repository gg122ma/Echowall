(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  async function withTimeout(promise, milliseconds) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("provider timeout")), milliseconds); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function extractAnswer(payload) {
    const value = typeof payload === "string" ? payload : payload?.answer || payload?.reply || payload?.message || payload?.output;
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 2000) : "";
  }

  async function sendGeneral(message) {
    if (!window.FreeAIAdapter?.isAIModelEnabled?.()) return Object.freeze({ status: "unavailable", answer: "" });
    try {
      const payload = await withTimeout(window.FreeAIAdapter.sendMessage(message), window.EchoAI.Config.providerTimeoutMs);
      const answer = extractAnswer(payload);
      return answer ? Object.freeze({ status: "ok", answer }) : Object.freeze({ status: "invalid_response", answer: "" });
    } catch (error) {
      const safe = window.EchoAI.Errors.safeError(error);
      return Object.freeze({ status: "error", answer: "", error: Object.freeze({ code: safe.code }) });
    }
  }

  window.EchoAI.ProviderAdapter = Object.freeze({ sendGeneral, extractAnswer });
}());
