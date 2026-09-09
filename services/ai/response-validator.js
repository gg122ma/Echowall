(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  function validate(response) {
    if (!response || typeof response.answer !== "string" || !response.answer.trim()) return null;
    const intents = window.EchoAI.Config.supportedIntents;
    const intent = intents.includes(response.intent) ? response.intent : "unknown";
    const confidence = Math.max(0, Math.min(1, Number(response.confidence) || 0));
    const resolvedPlaces = Array.isArray(response.resolvedPlaces)
      ? response.resolvedPlaces.filter(item => item && typeof item.placeId === "string" && typeof item.title === "string").slice(0, 6)
      : [];
    const grounding = Array.isArray(response.grounding)
      ? response.grounding.filter(item => item && typeof item.recordId === "string" && Number.isFinite(Number(item.authority))).slice(0, 10)
      : [];
    const actions = Array.isArray(response.actions)
      ? response.actions.filter(window.EchoAI.MapAction.validate).slice(0, 2)
      : [];
    return Object.freeze({
      answer: response.answer.trim().slice(0, 2000),
      intent,
      confidence,
      premise: ["SUPPORTED", "CONTRADICTED", "UNKNOWN", "AMBIGUOUS"].includes(response.premise) ? response.premise : "UNKNOWN",
      resolvedPlaces: Object.freeze(resolvedPlaces),
      grounding: Object.freeze(grounding),
      conflicts: Object.freeze(Array.isArray(response.conflicts) ? response.conflicts.slice(0, 10) : []),
      actions: Object.freeze(actions),
      error: response.error && typeof response.error.code === "string" ? Object.freeze({ code: response.error.code }) : null,
    });
  }

  window.EchoAI.ResponseValidator = Object.freeze({ validate });
}());
