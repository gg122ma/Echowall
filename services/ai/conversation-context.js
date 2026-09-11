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

  function update(sessionId = "default", entityId, intent, servedFactIds = [], servedDimensions = []) {
    if (!entityId) return get(sessionId);
    const previous = sessions.get(sessionId);
    const sameEntity = previous?.activeEntityId === entityId || previous?.entityId === entityId;
    const state = {
      activeEntityId: entityId,
      activeIntent: intent,
      servedFactIds: [...new Set([...(sameEntity ? previous?.servedFactIds || [] : []), ...servedFactIds])],
      servedDimensions: [...new Set([...(sameEntity ? previous?.servedDimensions || [] : []), ...servedDimensions])],
      entityId,
      intent,
      updatedAt: Date.now(),
    };
    sessions.set(sessionId, state);
    return { ...state };
  }

  function markServed(sessionId = "default", entityId, intent, facts = []) {
    return update(sessionId, entityId, intent, facts.map(item => item.factId).filter(Boolean), facts.map(item => item.dimension).filter(Boolean));
  }

  function clear(sessionId = "default") {
    sessions.delete(sessionId);
  }

  function referencesPrevious(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    return /\b(it|there|that place|its|situ|sana|tempat itu|dia)\b/.test(normalized)
      || /(那里|那边|它|附近|怎么去|如何去)/.test(String(message || ""));
  }

  function isEllipticalFollowUp(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    if (!normalized) return false;
    return /^(?:more|what else|anything else|what about|how about|kalau|apa lagi|lagi)\b/.test(normalized)
      || /^(?:还有呢|还有吗|还有什么|再说一点|更多)[？?。.!！]?$/.test(String(message || "").trim())
      || /^(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|ahad|isnin|selasa|rabu|khamis|jumaat|jumat|sabtu)(?:\s+(?:then|pula))?$/.test(normalized)
      || /^(?:那|那么)?(?:星期|周)[一二三四五六日天](?:呢)?$/.test(String(message || "").trim().replace(/[？?。.!！]/g, ""));
  }

  function isMoreFollowUp(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    return /^(?:more|what else|anything else|apa lagi|lagi)(?:\s+please)?$/.test(normalized)
      || /^(?:还有呢|还有吗|还有什么|再说一点|更多)[？?。.!！]?$/.test(String(message || "").trim());
  }

  window.EchoAI.ConversationContext = Object.freeze({ get, update, markServed, clear, referencesPrevious, isEllipticalFollowUp, isMoreFollowUp });
}());
