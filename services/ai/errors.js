(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  class CampusAIError extends Error {
    constructor(code, safeMessage) {
      super(safeMessage || "The campus assistant could not complete that request.");
      this.name = "CampusAIError";
      this.code = code || "UNKNOWN_ERROR";
      this.safeMessage = safeMessage || "The campus assistant could not complete that request.";
    }
  }

  function safeError(error) {
    if (error instanceof CampusAIError) return error;
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("timeout")) return new CampusAIError("PROVIDER_TIMEOUT", "The assistant service took too long to respond.");
    if (message.includes("rate") || error?.status === 429) return new CampusAIError("RATE_LIMIT", "The assistant is busy. Please try again shortly.");
    if (typeof navigator !== "undefined" && navigator.onLine === false) return new CampusAIError("OFFLINE", "You appear to be offline. Known campus facts are still available locally.");
    return new CampusAIError("NETWORK_ERROR", "The assistant service is temporarily unavailable.");
  }

  window.EchoAI.Errors = Object.freeze({ CampusAIError, safeError });
}());
