(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const AUTHORITY = Object.freeze({ L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 });

  function isoDate(value) {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
    const text = String(value || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
  }

  function effectiveState(fact, asOf = new Date()) {
    const today = isoDate(asOf);
    if (fact.effectiveFrom && today < fact.effectiveFrom) return "FUTURE";
    if (fact.effectiveTo && today > fact.effectiveTo) return "EXPIRED";
    return "CURRENT";
  }

  function getFacts(entityId, options = {}) {
    const includeHistorical = Boolean(options.includeHistorical);
    return (window.KMK_AI_PHASE3?.facts || []).filter(item => item.entityId === entityId).map(item => Object.freeze({
      ...item,
      temporalState: effectiveState(item, options.asOf),
      authorityRank: Math.min(...item.provenance.map(ref => AUTHORITY[ref.authority] || 99)),
    })).filter(item => includeHistorical || (item.temporalState === "CURRENT" && item.status !== "STALE" && item.status !== "UNSUPPORTED"));
  }

  function getFact(factId, options = {}) {
    const item = (window.KMK_AI_PHASE3?.facts || []).find(candidate => candidate.factId === factId);
    if (!item) return null;
    return getFacts(item.entityId, { ...options, includeHistorical: true }).find(candidate => candidate.factId === factId) || null;
  }

  function detectConflicts(facts) {
    const groups = new Map();
    (facts || []).forEach(item => {
      const groupKey = `${item.entityId}::${item.semanticKey}`;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(item);
    });
    const conflicts = [];
    groups.forEach(group => {
      const current = group.filter(item => item.temporalState === "CURRENT");
      if (current.length < 2) return;
      const bestRank = Math.min(...current.map(item => item.authorityRank));
      const authoritative = current.filter(item => item.authorityRank === bestRank);
      const explicitConflict = authoritative.filter(item => item.status === "CONFLICTING");
      if (explicitConflict.length > 1) {
        const semanticKey = explicitConflict[0].semanticKey;
        conflicts.push(Object.freeze({
          conflictId: `${semanticKey}.conflict`,
          entityId: explicitConflict[0].entityId,
          semanticKey,
          type: bestRank === 1 ? "L1_L1" : "SAME_AUTHORITY",
          status: "UNRESOLVED",
          factIds: Object.freeze(explicitConflict.map(item => item.factId)),
        }));
      }
    });
    return conflicts;
  }

  function entityFromDefinition(definition) {
    if (!definition) return null;
    const building = definition.buildingId
      ? (window.CAMPUS_BUILDINGS || []).find(item => item.id === definition.buildingId) || null
      : null;
    return Object.freeze({
      ...definition,
      canonicalId: definition.id,
      building,
      aliases: definition.aliases || Object.freeze([]),
      sourceRecords: Object.freeze([]),
    });
  }

  function getSpecialEntity(entityId) {
    return entityFromDefinition((window.KMK_AI_PHASE3?.specialEntities || []).find(item => item.id === entityId));
  }

  function getEntity(entityId) {
    return window.EchoAI.PlaceRegistry.getById(entityId) || getSpecialEntity(entityId);
  }

  function aliasMatches(normalizedQuery, alias) {
    const normalizedAlias = window.EchoAI.Normalizer.normalize(alias);
    if (!normalizedAlias) return false;
    if (normalizedQuery === normalizedAlias) return true;
    if (/[^\x00-\x7F]/.test(normalizedAlias)) return normalizedQuery.includes(normalizedAlias);
    const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "i").test(normalizedQuery);
  }

  function resolve(message, contextEntityId = "") {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const special = (window.KMK_AI_PHASE3?.specialEntities || []).find(entity => entity.aliases.some(alias => aliasMatches(normalized, alias)));
    if (special) return Object.freeze({ status: "resolved", place: entityFromDefinition(special), candidates: Object.freeze([]), confidence: 0.99, resolutionType: special.mapState });
    const dining = /\b(?:i(?:'m| am)? hungry|hungry|food|eat|makan|lapar)\b|饿|吃饭|食物/i.test(String(message || ""));
    if (dining) return Object.freeze({ status: "dining", place: null, candidates: Object.freeze(["cafe-a", "cafe-b", "cafe-c", "cafe-admin"].map(getEntity).filter(Boolean)), confidence: 0.94, resolutionType: "MULTIPLE" });
    const resolved = window.EchoAI.Retriever.resolve(message, contextEntityId);
    return Object.freeze({ ...resolved, resolutionType: resolved.place?.mapState || (resolved.status === "ambiguous" ? "AMBIGUOUS" : "UNMAPPED") });
  }

  function factTypesForIntent(intent) {
    if (intent === "campus_hours") return ["hours"];
    if (intent === "campus_rules") return ["rule"];
    if (intent === "campus_services") return ["service", "purpose", "identity", "fee"];
    if (intent === "campus_location" || intent === "campus_navigation") return ["purpose", "identity", "service"];
    return ["purpose", "service", "identity", "hours", "rule", "fee"];
  }

  function selectFacts(entityId, intent, options = {}) {
    const facts = getFacts(entityId, options);
    const types = factTypesForIntent(intent);
    const relevantFacts = facts.filter(item => types.includes(item.type));
    const relevantConflicts = detectConflicts(relevantFacts);
    if (intent === "campus_hours" && relevantConflicts.length) {
      const conflictIds = new Set(relevantConflicts.flatMap(item => item.factIds));
      return Object.freeze({ facts: Object.freeze(relevantFacts.filter(item => conflictIds.has(item.factId))), conflicts: Object.freeze(relevantConflicts) });
    }
    const conflictingIds = new Set(relevantConflicts.flatMap(item => item.factIds));
    const ordered = relevantFacts.filter(item => !conflictingIds.has(item.factId))
      .sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type) || a.authorityRank - b.authorityRank);
    const served = new Set(options.servedFactIds || []);
    const unserved = ordered.filter(item => !served.has(item.factId));
    const selected = unserved.length ? unserved : (served.size ? [] : ordered);
    return Object.freeze({ facts: Object.freeze(selected.slice(0, options.limit || 3)), conflicts: Object.freeze([]) });
  }

  function validateInventory() {
    return Object.freeze({ expected: Number(window.KMK_AI_PHASE3?.masterEntityCount), actual: window.EchoAI.PlaceRegistry.getMasterEntityCount() });
  }

  window.EchoAI.KnowledgeEngine = Object.freeze({
    AUTHORITY,
    effectiveState,
    getFacts,
    getFact,
    detectConflicts,
    getEntity,
    getSpecialEntity,
    resolve,
    selectFacts,
    validateInventory,
  });
}());
