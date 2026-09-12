(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  // Modes where an already-selected, non-empty deterministic fact list may be
  // handed to an optional provider for connective-language rendering only.
  // CONFLICT, AMBIGUOUS, COMPARISON, UNSUPPORTED, and no-fact PARTIAL stay
  // fully deterministic and never reach this module's provider path.
  const ELIGIBLE_MODES = Object.freeze(["DIRECT", "FOLLOW_UP", "CORRECTION", "PARTIAL"]);
  const ALLOWED_TRANSITION_IDS = Object.freeze(["NONE", "ALSO", "AND"]);
  const TRANSITION_TEXT = Object.freeze({
    en: Object.freeze({ NONE: " ", ALSO: " Also, ", AND: " And " }),
    ms: Object.freeze({ NONE: " ", ALSO: " Selain itu, ", AND: " Dan " }),
    zh: Object.freeze({ NONE: " ", ALSO: "另外，", AND: "而且，" }),
  });

  function isEligible(plan) {
    return Boolean(plan) && ELIGIBLE_MODES.includes(plan.answerMode) && plan.content?.primary === "FACTS"
      && Array.isArray(plan.facts) && plan.facts.length > 0;
  }

  // Builds the exact, final clause text deterministically — identical to
  // AnswerRenderer.render()'s own sentence construction — then freezes it
  // into opaque, ID-addressed clauses. A provider may only choose which
  // fixed transition token sits between consecutive clauses; it never sees
  // (and could not alter) the clause text itself once this plan is built.
  function buildClausePlan(plan, language, options = {}) {
    if (!isEligible(plan)) return null;
    const renderPlan = { ...plan, premiseDay: options.day || "" };
    const rawClauses = [];
    plan.facts.forEach(fact => {
      const text = window.EchoAI.AnswerRenderer.factText(fact, language, renderPlan);
      if (text) rawClauses.push({ factId: fact.factId, exactText: text });
    });
    if (!rawClauses.length) return null;
    if (plan.answerMode === "CORRECTION") {
      rawClauses[0] = { ...rawClauses[0], exactText: `${window.EchoAI.AnswerRenderer.correctionPrefix(language)}${rawClauses[0].exactText}` };
    }
    if (["UNMAPPED", "AMBIGUOUS"].includes(plan.place?.mapState) && window.EchoAI.IntentRouter.requestsMapAction(plan.intent)) {
      const caveat = window.EchoAI.AnswerRenderer.mapCaveatText(plan.place.mapState, language);
      if (caveat) rawClauses.push({ factId: null, exactText: caveat });
    }
    const clauses = rawClauses.slice(0, 3).map((clause, index) => Object.freeze({
      clauseId: `C${index + 1}`,
      factId: clause.factId,
      exactText: clause.exactText,
    }));
    return Object.freeze({
      answerMode: plan.answerMode,
      language,
      entityTitle: plan.place?.title || "",
      clauses,
      allowedTransitionIds: ALLOWED_TRANSITION_IDS,
    });
  }

  // Accepts only: same answerMode/language echoed back, and a sequence that
  // names every clause id exactly once in the given order with exactly one
  // approved transition id between each pair. Any other shape — a missing,
  // duplicated, reordered, or unknown clause id; an unapproved transition;
  // an extra field such as "actions"; wrong mode/language — is rejected.
  // No free text from the provider is ever read, so it cannot rewrite a
  // clause, invent a fact, leak a Map ID, or manipulate a conflict/caveat.
  function validateSequence(payload, clausePlan) {
    if (!payload || typeof payload !== "object") return { valid: false, reason: "INVALID_SHAPE" };
    if (payload.answerMode !== clausePlan.answerMode) return { valid: false, reason: "MODE_CHANGED" };
    if (payload.language !== clausePlan.language) return { valid: false, reason: "LANGUAGE_CHANGED" };
    if (Array.isArray(payload.actions) && payload.actions.length) return { valid: false, reason: "PROVIDER_ACTION" };
    const sequence = Array.isArray(payload.sequence) ? payload.sequence : null;
    if (!sequence) return { valid: false, reason: "INVALID_SHAPE" };
    const expectedLength = clausePlan.clauses.length * 2 - 1;
    if (sequence.length !== expectedLength) return { valid: false, reason: "ILLEGAL_STRUCTURE" };
    const allowedTransitions = new Set(clausePlan.allowedTransitionIds);
    for (let index = 0; index < sequence.length; index += 1) {
      const item = sequence[index];
      if (!item || typeof item !== "object") return { valid: false, reason: "INVALID_SHAPE" };
      if (index % 2 === 0) {
        if (item.type !== "clause" || item.id !== clausePlan.clauses[index / 2].clauseId) return { valid: false, reason: "UNKNOWN_CLAUSE" };
      } else if (item.type !== "transition" || !allowedTransitions.has(item.id)) {
        return { valid: false, reason: "ILLEGAL_STRUCTURE" };
      }
    }
    return { valid: true, sequence };
  }

  function assembleFromSequence(clausePlan, sequence) {
    const transitions = TRANSITION_TEXT[clausePlan.language] || TRANSITION_TEXT.en;
    const parts = sequence.map((item, index) => (
      item.type === "clause" ? clausePlan.clauses[index / 2].exactText : (transitions[item.id] ?? " ")
    ));
    return parts.join("").trim();
  }

  function parseProviderPayload(raw) {
    if (raw && typeof raw === "object") return raw;
    const text = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function callProvider(clausePlan) {
    if (!window.EchoAI.ProviderAdapter?.renderCampusSequence || !window.FreeAIAdapter?.sendStructuredPrompt) {
      return { attempted: false };
    }
    const raw = await window.EchoAI.ProviderAdapter.renderCampusSequence(clausePlan);
    return { attempted: true, raw };
  }

  // Deterministic-first, provider-optional rendering. Any disablement,
  // unavailability, timeout, thrown error, or failed validation falls back
  // to the unchanged deterministic AnswerRenderer text. `route` is an
  // internal-only observability label (deterministic / provider_accepted /
  // provider_rejected_fallback) — callers must never surface it to users.
  async function render(plan, language, options = {}) {
    const deterministicAnswer = window.EchoAI.AnswerRenderer.render(plan, language, options);
    const clausePlan = buildClausePlan(plan, language, options);
    if (!clausePlan) return Object.freeze({ text: deterministicAnswer, route: "deterministic" });
    if (!window.EchoAI.Config.campusProviderRenderingEnabled) return Object.freeze({ text: deterministicAnswer, route: "deterministic" });
    if (!window.FreeAIAdapter?.isAIModelEnabled?.()) return Object.freeze({ text: deterministicAnswer, route: "deterministic" });

    let result;
    try {
      result = await callProvider(clausePlan);
    } catch {
      return Object.freeze({ text: deterministicAnswer, route: "provider_rejected_fallback" });
    }
    if (!result.attempted) return Object.freeze({ text: deterministicAnswer, route: "deterministic" });

    const payload = parseProviderPayload(result.raw);
    if (!payload) return Object.freeze({ text: deterministicAnswer, route: "provider_rejected_fallback" });
    const validated = validateSequence(payload, clausePlan);
    if (!validated.valid) return Object.freeze({ text: deterministicAnswer, route: "provider_rejected_fallback" });
    const assembled = assembleFromSequence(clausePlan, validated.sequence);
    if (!assembled) return Object.freeze({ text: deterministicAnswer, route: "provider_rejected_fallback" });
    return Object.freeze({ text: assembled, route: "provider_accepted" });
  }

  window.EchoAI.FactLockedRenderer = Object.freeze({
    ELIGIBLE_MODES,
    ALLOWED_TRANSITION_IDS,
    isEligible,
    buildClausePlan,
    validateSequence,
    assembleFromSequence,
    render,
  });
}());
