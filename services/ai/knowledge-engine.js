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

  function directIdentityEntity(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const target = normalized.replace(/^(?:where is|wheres) (?:the )?/, "");
    if (!target || target === normalized) return null;
    return window.EchoAI.PlaceRegistry.getPlaces().find(place => (place.identityAliases || place.aliases || [])
      .some(alias => window.EchoAI.Normalizer.normalize(alias) === target)) || null;
  }

  function isHostelStudyNeed(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const hostelContext = /\b(?:hostel|dorm|dormitory|asrama|hostel residents?|dorm residents?|residents?)\b|宿舍/.test(normalized);
    const studyNeed = /\b(?:study|self study|study space|study room|study area|belajar|ulang kaji)\b|自习|读书|学习/.test(normalized);
    const serviceQuestion = /\b(?:where|where is|where do|where can|is there|any|place|space|room|area|mana|ada|boleh|tempat)\b|哪里|哪儿|有.+吗/.test(normalized);
    return hostelContext && studyNeed && serviceQuestion;
  }

  function compositionalServiceEntity(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const identityLookup = /^(?:(?:(?:could|can|would) you )?(?:please )?(?:help me )?(?:where is|wheres|locate|find|show(?: me)?|open|pin|drop a pin for|navigate to|take me to|bring me to)|where can (?:i|we) (?:find|locate)|(?:do you know |(?:please )?tell me )where|i need directions to)\b/.test(normalized);
    const serviceQuestion = /\b(?:where|where do|where can|where could|where might|go|mana|dekat|need|students?)\b|哪里|哪儿|去哪/.test(normalized);
    if (!serviceQuestion || identityLookup) return null;

    const borrowNeed = /\b(?:borrow|loan|rent|hire|pinjam|sewa)\b|借|租/.test(normalized);
    const sportsConcept = /\b(?:sport|sports|sporting|sukan)\b/.test(normalized)
      && /\b(?:equipment|gear|stuff|barang|peralatan)\b/.test(normalized)
      || /运动器材|体育器材|体育用品/.test(normalized);
    if (borrowNeed && sportsConcept) return getEntity("sports-equipment-store");

    const bicycleConcept = /\b(?:bike|bicycle|basikal)\b|自行车|脚踏车/.test(normalized);
    if (borrowNeed && bicycleConcept) return getEntity("bicycle-service");

    const laundryNeed = /\b(?:wash|washing|laundry|dobi|basuh)\b|洗衣/.test(normalized)
      && /\b(?:clothes|clothing|baju|laundry|dobi|basuh|wash|washing)\b|洗衣/.test(normalized);
    if (laundryNeed) return getEntity("hostel-laundry");

    const printingNeed = /\b(?:print|photocopy|cetak|fotostat)\b|打印|复印/.test(normalized);
    if (printingNeed) return getEntity("pos-mini");
    return null;
  }

  function unresolvedPrimaryLocationTarget(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const match = normalized.match(/^(?:(?:please )?(?:where is|wheres|locate|find|show|open)|navigate to) (?:the )?(.+?)\s+(?:near|beside|inside)\s+(.+)$/);
    if (!match) return false;
    const subject = match[1];
    const regularIdentity = window.EchoAI.PlaceRegistry.getPlaces().some(place => (place.identityAliases || place.aliases || [])
      .some(alias => aliasMatches(subject, alias)));
    const specialIdentity = (window.KMK_AI_PHASE3?.specialEntities || []).some(entity => entity.aliases.some(alias => aliasMatches(subject, alias)));
    return !regularIdentity && !specialIdentity;
  }

  function descriptiveNeedEntity(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    if (isHostelStudyNeed(normalized)) return getEntity("hostel-study-room");
    const compositionalEntity = compositionalServiceEntity(normalized);
    if (compositionalEntity) return compositionalEntity;
    const matches = [
      ["koop-mart", /^(?:where (?:can|could|do) (?:i|students) (?:normally )?buy (?:daily )?(?:things|items|supplies)|where do students normally buy (?:things|daily things|daily supplies))$/],
      ["pos-mini", /^(?:where can i print(?: something)?|need to print something where can i go)$/],
      ["hostel-laundry", /^(?:diy laundry|where can i (?:do laundry|wash (?:my )?clothes)|where do i wash baju(?: ah)?|how much does washing cost|我可以在哪里洗衣|哪里可以洗衣服?)$/],
      ["hostel-iron-room", /^(?:where can i iron clothes|what about ironing)$/],
      ["sports-equipment-store", /^(?:(?:where (?:do|can|could) (?:i|we|students)?\s*|i need to )borrow (?:sports?|sporting) (?:equipment|stuff|gear)(?: ah)?(?: where)?|(?:kat|di) mana (?:nak |boleh )?pinjam (?:barang|peralatan) sukan|(?:barang|peralatan) sukan boleh pinjam (?:di|kat) mana|boleh pinjam (?:barang sukan|peralatan sukan) (?:dekat|di|kat) mana|kat mana nak pinjam sports gear|where boleh pinjam sports (?:equipment|gear)|哪里可以借运动器材|运动器材去?哪里借|哪里借运动器材|体育器材在哪里借|我去哪里借体育用品|sports gear 哪里 borrow)$/],
      ["bicycle-service", /^(?:where (?:can|could) (?:i|students) (?:rent|hire|borrow) (?:a )?(?:bike|bicycle)|where is the bicycle service|basikal boleh pinjam dekat mana)$/],
      ["dewan-mahawangsa", /^(?:where is|wheres) the main event hall$/],
    ];
    const entityId = matches.find(([, pattern]) => pattern.test(normalized))?.[0] || "";
    return entityId ? getEntity(entityId) : null;
  }

  function resolve(message, contextEntityId = "") {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const directIdentity = directIdentityEntity(message);
    if (directIdentity) return Object.freeze({ status: "resolved", place: directIdentity, candidates: Object.freeze([directIdentity]), confidence: 0.99, resolutionType: directIdentity.mapState || "UNMAPPED" });
    const descriptiveEntity = descriptiveNeedEntity(message);
    if (descriptiveEntity) return Object.freeze({ status: "resolved", place: descriptiveEntity, candidates: Object.freeze([descriptiveEntity]), confidence: 0.96, resolutionType: descriptiveEntity.mapState || "UNMAPPED" });
    if (unresolvedPrimaryLocationTarget(message)) return Object.freeze({ status: "unknown", place: null, candidates: Object.freeze([]), confidence: 0, resolutionType: "UNMAPPED" });
    const special = (window.KMK_AI_PHASE3?.specialEntities || []).find(entity => entity.aliases.some(alias => aliasMatches(normalized, alias)));
    if (special) return Object.freeze({ status: "resolved", place: entityFromDefinition(special), candidates: Object.freeze([]), confidence: 0.99, resolutionType: special.mapState });
    const resolved = window.EchoAI.Retriever.resolve(message, contextEntityId);
    if (resolved.status === "resolved" && resolved.confidence >= 0.95) {
      return Object.freeze({ ...resolved, resolutionType: resolved.place?.mapState || "UNMAPPED" });
    }
    const diningNeed = /\b(?:i(?:'m| am)? hungry|hungry|saya lapar|lapar)\b|我饿了|饿了/i.test(String(message || ""));
    if (diningNeed) return Object.freeze({ status: "dining", category: "dining", place: null, candidates: Object.freeze(discoveryCandidates("dining")), confidence: 0.94, resolutionType: "MULTIPLE" });
    const category = discoveryCategory(message);
    if (category) return Object.freeze({ status: "discovery", category, place: null, candidates: Object.freeze(discoveryCandidates(category)), confidence: 0.94, resolutionType: "MULTIPLE" });
    return Object.freeze({ ...resolved, resolutionType: resolved.place?.mapState || (resolved.status === "ambiguous" ? "AMBIGUOUS" : "UNMAPPED") });
  }

  function resolveMany(message) {
    const normalized = window.EchoAI.Normalizer.normalize(message);
    const specialMatches = (window.KMK_AI_PHASE3?.specialEntities || [])
      .filter(entity => entity.aliases.some(alias => aliasMatches(normalized, alias)))
      .map(entityFromDefinition);
    const regularMatches = window.EchoAI.Retriever.resolveMany(message);
    const descriptiveMatches = normalized === "which place can print and which sells daily items"
      ? [getEntity("pos-mini"), getEntity("koop-mart")].filter(Boolean)
      : [];
    return [...new Map([...specialMatches, ...regularMatches, ...descriptiveMatches].map(place => [place.canonicalId, place])).values()];
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
