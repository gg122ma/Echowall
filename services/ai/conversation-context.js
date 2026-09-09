(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  const sessions = new Map();

  function get(sessionId = "default") {
    const state = sessions.get(sessionId);
    if (!state) return null;
    if (Date.now() - state.updatedAt > window.EchoAI.Config.contextTtlMs) {
      sessions.delete(sessionId);
      return null;
    }
    return { ...state };
  }

  function update(sessionId = "default", entityId, intent) {
    if (!entityId) return get(sessionId);
    const state = { entityId, intent, updatedAt: Date.now() };
    sessions.set(sessionId, state);
    return { ...state };
  }

  function clear(sessionId = "default") {
    sessions.delete(sessionId);
  }

  function referencesPrevious(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    return /\b(it|there|that place|its|situ|sana|tempat itu|dia)\b/.test(normalized)
      || /(那里|那边|它|附近|怎么去|如何去)/.test(String(message || ""));
  }

  window.EchoAI.ConversationContext = Object.freeze({ get, update, clear, referencesPrevious });
}());
