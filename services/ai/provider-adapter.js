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

  function validateCampusOutput(payload, plan) {
    if (!payload || typeof payload !== "object" || typeof payload.answer !== "string") return Object.freeze({ valid: false, reason: "INVALID_SHAPE" });
    if (payload.answerMode !== plan.answerMode) return Object.freeze({ valid: false, reason: "MODE_CHANGED" });
    const selected = new Set(plan.selectedFactIds || []);
    const claimed = Array.isArray(payload.factIds) ? payload.factIds : [];
    if (claimed.some(factId => !selected.has(factId))) return Object.freeze({ valid: false, reason: "UNSELECTED_FACT" });
    if ((plan.facts || []).some(fact => ["EXPIRED", "FUTURE"].includes(fact.temporalState) || ["STALE", "UNSUPPORTED"].includes(fact.status))) return Object.freeze({ valid: false, reason: "INACTIVE_FACT" });
    if (/\bB_[A-Z0-9_]+\b/.test(payload.answer)) return Object.freeze({ valid: false, reason: "MAP_ID_IN_TEXT" });
    if (Array.isArray(payload.actions) && payload.actions.length) return Object.freeze({ valid: false, reason: "PROVIDER_ACTION" });
    if (plan.answerMode === "CONFLICT" && !/conflict|disagree|bercanggah|冲突|不同/i.test(payload.answer)) return Object.freeze({ valid: false, reason: "CONFLICT_REMOVED" });
    const approximate = (plan.facts || []).some(fact => fact.approximate);
    if (approximate && !/around|approximately|sekitar|kira-kira|约|大约/i.test(payload.answer)) return Object.freeze({ valid: false, reason: "APPROXIMATION_REMOVED" });
    return Object.freeze({ valid: true, answer: payload.answer.trim().slice(0, 2000) });
  }

  function buildCampusRenderingPrompt(clausePlan) {
    const instructions = "You render connective language for a campus assistant. You do not know and must not supply any campus facts. "
      + "You are given fixed clauses (already exact and approved) and a fixed set of transition tokens. "
      + 'Return ONLY compact JSON of the form {"answerMode":"...","language":"...","sequence":[{"type":"clause","id":"C1"},{"type":"transition","id":"NONE"},{"type":"clause","id":"C2"}]}. '
      + "The sequence must list every given clause id exactly once, in the exact order given, with exactly one transition between each consecutive pair of clauses and no transition before the first or after the last clause. "
      + `Each transition id must be one of: ${clausePlan.allowedTransitionIds.join(", ")}. `
      + "Echo back the given answerMode and language unchanged. Never invent, omit, or reorder a clause id. Never include clause text, actions, or any other field.";
    const payload = {
      answerMode: clausePlan.answerMode,
      language: clausePlan.language,
      entityTitle: clausePlan.entityTitle,
      clauses: clausePlan.clauses.map(clause => ({ id: clause.clauseId, text: clause.exactText })),
      allowedTransitionIds: clausePlan.allowedTransitionIds,
    };
    return [
      { role: "system", content: instructions },
      { role: "user", content: JSON.stringify(payload) },
    ];
  }

  async function renderCampusSequence(clausePlan) {
    const messages = buildCampusRenderingPrompt(clausePlan);
    return withTimeout(window.FreeAIAdapter.sendStructuredPrompt(messages), window.EchoAI.Config.providerTimeoutMs);
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

  window.EchoAI.ProviderAdapter = Object.freeze({ sendGeneral, extractAnswer, validateCampusOutput, renderCampusSequence });
}());
