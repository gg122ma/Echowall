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
    const facts = Array.isArray(response.facts)
      ? response.facts.filter(item => item && typeof item.factId === "string" && typeof item.status === "string").slice(0, 12)
      : [];
    const selectedFactIds = new Set(Array.isArray(response.answerPlan?.selectedFactIds) ? response.answerPlan.selectedFactIds : []);
    const selectedFacts = facts.filter(item => selectedFactIds.has(item.factId));
    const actionAllowed = response.answerPlan?.actionAllowed === true;
    const actions = actionAllowed && Array.isArray(response.actions)
      ? response.actions.filter(window.EchoAI.MapAction.validate).slice(0, 1)
      : [];
    const mode = window.EchoAI.AnswerPlanner?.MODES?.includes(response.answerPlan?.mode) ? response.answerPlan.mode : "UNSUPPORTED";
    const context = response.context && typeof response.context === "object" ? {
      activeEntityId: String(response.context.activeEntityId || ""),
      activeIntent: String(response.context.activeIntent || ""),
      servedFactIds: Object.freeze([...(response.context.servedFactIds || [])].filter(value => typeof value === "string")),
      servedDimensions: Object.freeze([...(response.context.servedDimensions || [])].filter(value => typeof value === "string")),
    } : null;
    return Object.freeze({
      schemaVersion: "3.0",
      answer: response.answer.trim().slice(0, 2000),
      intent,
      confidence,
      premise: ["SUPPORTED", "CONTRADICTED", "UNKNOWN", "AMBIGUOUS"].includes(response.premise) ? response.premise : "UNKNOWN",
      resolvedPlaces: Object.freeze(resolvedPlaces),
      grounding: Object.freeze(grounding),
      conflicts: Object.freeze(Array.isArray(response.conflicts) ? response.conflicts.slice(0, 10) : []),
      facts: Object.freeze(selectedFacts),
      selectedFactIds: Object.freeze(selectedFacts.map(item => item.factId)),
      answerPlan: Object.freeze({
        mode,
        correction: mode === "CORRECTION",
        uncertainty: ["CONFLICT", "PARTIAL", "UNSUPPORTED", "AMBIGUOUS"].includes(mode),
        selectedFactIds: Object.freeze(selectedFacts.map(item => item.factId)),
        actionAllowed: actions.length > 0,
      }),
      resolution: response.resolution && typeof response.resolution === "object" ? Object.freeze({ ...response.resolution }) : null,
      context: context ? Object.freeze(context) : null,
      actions: Object.freeze(actions),
      error: response.error && typeof response.error.code === "string" ? Object.freeze({ code: response.error.code }) : null,
    });
  }

  window.EchoAI.ResponseValidator = Object.freeze({ validate });
}());
