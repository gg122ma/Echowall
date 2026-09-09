(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  window.EchoAI.Config = Object.freeze({
    enabled: window.EchoConfig?.features?.campusAssistant !== false,
    contextTtlMs: 20 * 60 * 1000,
    providerTimeoutMs: 9000,
    maxQuestionLength: 500,
    sourceAuthority: Object.freeze({ ownerSource: 1, campusKnowledge: 2, mapData: 3, communityOpinion: 4, genericModel: 5 }),
    supportedLanguages: Object.freeze(["en", "ms", "zh"]),
    supportedIntents: Object.freeze([
      "campus_info", "campus_hours", "campus_rules", "campus_services",
      "campus_location", "campus_navigation", "campus_nearby",
      "campus_comparison", "general", "unknown",
    ]),
  });
}());
