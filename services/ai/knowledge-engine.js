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

  const DISCOVERY_CATEGORIES = Object.freeze({
    dining: Object.freeze(["cafe-a", "cafe-b", "cafe-c", "cafe-admin"]),
    sports: Object.freeze(["astaka", "basketball-court", "sports-equipment-store"]),
  });

  function discoveryCategory(message) {
    const text = String(message || "");
    const dining = /\b(?:cafeterias?|cafes?|dining|where (?:can|could) i (?:eat|get food)|where to eat|places? to eat|what places serve food|what cafes? are there|show me (?:cafeterias?|cafes?)|kafeteria|kafe|tempat makan|mana boleh makan)\b|食堂|餐厅|咖啡厅|哪里可以吃饭|哪(?:里|儿)能吃饭|吃东西/i;
    if (dining.test(text)) return "dining";
    const sports = /\b(?:sport facilities|sports facilities|what sports facilities are there|show me sports facilities|places? to exercise|where (?:can|could) i (?:play sports|exercise)|kemudahan sukan|tempat sukan|dewan sukan|mana boleh bersukan)\b|体育设施|运动设施|哪里可以运动|运动场地/i;
    return sports.test(text) ? "sports" : "";
  }

  function discoveryCandidates(category) {
    const approvedIds = DISCOVERY_CATEGORIES[category] || [];
    return approvedIds.map(getEntity).filter(place => place && place.status !== "UNSUPPORTED");
  }

  function resolve(message, contextEntityId = "") {
    const evidence = window.EchoAI.Retriever.analyzeIdentityEvidence(message);
    const serviceEntityId = window.EchoAI.IntentRouter.serviceNeedEntityId(message);
    if (evidence.status === "known") {
      const preferredId = serviceEntityId && !evidence.target ? serviceEntityId : evidence.entityId;
      const place = getEntity(preferredId);
      if (place) return Object.freeze({ status: "resolved", place, candidates: Object.freeze([place]), confidence: evidence.confidence, resolutionType: place.mapState || "UNMAPPED" });
    }
    if (evidence.status === "ambiguous") {
      const candidates = evidence.matches.map(match => getEntity(match.entityId)).filter(Boolean);
      return Object.freeze({ status: "ambiguous", place: null, candidates: Object.freeze(candidates), confidence: 0.4, resolutionType: "AMBIGUOUS" });
    }
    if (evidence.status === "unknown_qualified") {
      return Object.freeze({ status: "unknown", place: null, candidates: Object.freeze([]), confidence: 0, resolutionType: "UNMAPPED" });
    }
    if (serviceEntityId) {
      const place = getEntity(serviceEntityId);
      if (place) return Object.freeze({ status: "resolved", place, candidates: Object.freeze([place]), confidence: 0.96, resolutionType: place.mapState || "UNMAPPED" });
    }
    const contextPlace = contextEntityId ? getEntity(contextEntityId) : null;
    if (contextPlace) return Object.freeze({ status: "resolved_context", place: contextPlace, candidates: Object.freeze([contextPlace]), confidence: 0.82, resolutionType: contextPlace.mapState || "UNMAPPED" });
    const diningNeed = /\b(?:i(?:'m| am)? hungry|hungry|saya lapar|lapar)\b|我饿了|饿了/i.test(String(message || ""));
    if (diningNeed) return Object.freeze({ status: "dining", category: "dining", place: null, candidates: Object.freeze(discoveryCandidates("dining")), confidence: 0.94, resolutionType: "MULTIPLE" });
    const category = discoveryCategory(message);
    if (category) return Object.freeze({ status: "discovery", category, place: null, candidates: Object.freeze(discoveryCandidates(category)), confidence: 0.94, resolutionType: "MULTIPLE" });
    return Object.freeze({ status: "unknown", place: null, candidates: Object.freeze([]), confidence: 0, resolutionType: "UNMAPPED" });
  }

  function resolveMany(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const evidence = window.EchoAI.Retriever.analyzeIdentityEvidence(message, { allowMultiple: true });
    const identityMatches = ["known", "known_multiple"].includes(evidence.status)
      ? evidence.matches.map(match => getEntity(match.entityId)).filter(Boolean)
      : [];
    const descriptiveMatches = normalized === "which place can print and which sells daily items"
      ? [getEntity("pos-mini"), getEntity("koop-mart")].filter(Boolean)
      : [];
    return [...new Map([...identityMatches, ...descriptiveMatches].map(place => [place.canonicalId, place])).values()];
  }

  function factTypesForIntent(intent) {
    if (intent === "campus_hours") return ["hours"];
    if (intent === "campus_fees") return ["fee"];
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
    discoveryCategory,
    resolve,
    resolveMany,
    selectFacts,
    validateInventory,
  });
}());
