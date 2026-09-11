(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const MODES = Object.freeze(["DIRECT", "CORRECTION", "CONFLICT", "PARTIAL", "UNSUPPORTED", "AMBIGUOUS", "COMPARISON", "FOLLOW_UP"]);

  function createAction(place, intent, question = "", language = "en") {
    const normalized = window.EchoAI.Normalizer.normalize(question);
    const bareExactEntity = intent === "campus_info" && (place.aliases || []).some(alias => window.EchoAI.Normalizer.normalize(alias) === normalized);
    if (!window.EchoAI.IntentRouter.requestsMapAction(intent) && !bareExactEntity) return null;
    return window.EchoAI.MapAction.create(place, language);
  }

  function plan(input) {
    const { question, language, intent, resolution, previous, premise, asOf } = input;
    const place = resolution.place;
    const isFollowUp = Boolean(previous && window.EchoAI.ConversationContext.isMoreFollowUp(question));

    if (resolution.status === "dining") return Object.freeze({
      answerMode: "DIRECT", language, intent,
      content: Object.freeze({ primary: "DINING_OPTIONS", secondary: Object.freeze([]), caveat: "NO_LIVE_STATUS" }),
      selectedFactIds: Object.freeze([]),
      facts: Object.freeze([]),
      conflicts: Object.freeze([]),
      action: null,
      place: null,
      candidates: resolution.candidates,
    });

    if (!place) return Object.freeze({
      answerMode: resolution.status === "ambiguous" ? "AMBIGUOUS" : "UNSUPPORTED", language, intent,
      content: Object.freeze({ primary: resolution.status === "ambiguous" ? "AMBIGUOUS_ENTITY" : "UNSUPPORTED_GENERAL", secondary: Object.freeze([]), caveat: null }),
      selectedFactIds: Object.freeze([]), facts: Object.freeze([]), conflicts: Object.freeze([]), action: null, place: null,
      candidates: resolution.candidates || Object.freeze([]),
    });

    if (place.status === "UNSUPPORTED") return Object.freeze({
      answerMode: "UNSUPPORTED", language, intent,
      content: Object.freeze({ primary: `UNSUPPORTED_${place.canonicalId.toUpperCase().replace(/-/g, "_")}`, secondary: Object.freeze([]), caveat: "NO_GUESS" }),
      selectedFactIds: Object.freeze([]), facts: Object.freeze([]), conflicts: Object.freeze([]), action: null, place,
      candidates: Object.freeze([]),
    });

    if (place.mapState === "PARENT_ONLY") return Object.freeze({
      answerMode: "PARTIAL", language, intent,
      content: Object.freeze({ primary: "PARENT_ONLY", secondary: Object.freeze([]), caveat: "PARENT_NOT_EXACT" }),
      selectedFactIds: Object.freeze([]), facts: Object.freeze([]), conflicts: Object.freeze([]), action: createAction(place, intent, question, language), place,
      candidates: Object.freeze([]),
    });

    if (place.canonicalId === "blok-p5") return Object.freeze({
      answerMode: "PARTIAL", language, intent,
      content: Object.freeze({ primary: "P5_UNMAPPED", secondary: Object.freeze([]), caveat: "NO_EXACT_TARGET" }),
      selectedFactIds: Object.freeze([]), facts: Object.freeze([]), conflicts: Object.freeze([]), action: null, place,
      candidates: Object.freeze([]),
    });

    const selection = window.EchoAI.KnowledgeEngine.selectFacts(place.canonicalId, isFollowUp ? (previous.activeIntent || previous.intent || intent) : intent, {
      asOf,
      servedFactIds: isFollowUp ? previous.servedFactIds || [] : [],
      limit: intent === "campus_location" || intent === "campus_navigation" ? 2 : (isFollowUp ? 2 : 3),
    });
    const facts = selection.facts;
    const conflicts = selection.conflicts;
    let answerMode = isFollowUp ? "FOLLOW_UP" : "DIRECT";
    let primary = "FACTS";
    let caveat = null;

    if (conflicts.length) {
      answerMode = "CONFLICT";
      primary = "CONFLICT";
      caveat = "CHECK_LATEST";
    } else if (premise?.status === "CONTRADICTED") {
      answerMode = "CORRECTION";
      primary = "FACTS";
    } else if (!facts.length && isFollowUp) {
      answerMode = "FOLLOW_UP";
      primary = "FACTS_EXHAUSTED";
    } else if (!facts.length) {
      answerMode = "UNSUPPORTED";
      primary = intent === "campus_hours" ? "UNSUPPORTED_HOURS" : "UNSUPPORTED_ENTITY_FACT";
      caveat = "NO_GUESS";
    } else if (facts.some(item => item.status === "PARTIAL") || ["AMBIGUOUS", "UNMAPPED"].includes(place.mapState)) {
      answerMode = "PARTIAL";
      caveat = place.mapState === "AMBIGUOUS" ? "AMBIGUOUS_MAP" : place.mapState === "UNMAPPED" && window.EchoAI.IntentRouter.requestsMapAction(intent) ? "NO_EXACT_TARGET" : null;
    }

    const action = answerMode === "UNSUPPORTED" || answerMode === "CONFLICT" ? null : createAction(place, intent, question, language);
    return Object.freeze({
      answerMode,
      content: Object.freeze({ primary, secondary: Object.freeze(facts.slice(1).map(item => item.factId)), caveat }),
      selectedFactIds: Object.freeze(facts.map(item => item.factId)),
      facts,
      conflicts,
      action,
      place,
      premise: premise?.status || "SUPPORTED",
      intent,
      language,
      candidates: Object.freeze([]),
    });
  }

  window.EchoAI.AnswerPlanner = Object.freeze({ MODES, plan });
}());
