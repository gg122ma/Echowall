(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const STOP_WORDS = new Set([
    "the", "is", "at", "a", "an", "to", "me", "where", "what", "when", "how", "does", "do",
    "di", "kat", "mana", "apa", "ke", "yang", "kalau", "hari", "pukul", "jam",
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "ahad", "isnin", "sel", "selasa", "rabu", "kham", "khamis", "jumaat", "jumat", "sabtu",
  ]);

  function scoreAlias(query, queryTokens, alias) {
    const normalizer = window.EchoAI.Normalizer;
    const normalizedAlias = normalizer.normalize(alias);
    if (!normalizedAlias) return 0;
    if (STOP_WORDS.has(normalizedAlias)) return 0;
    if (query === normalizedAlias) return 100 + normalizedAlias.length;
    if (query.includes(normalizedAlias) && (/[\u3400-\u9fff]/.test(normalizedAlias) || normalizedAlias.includes(" ") || normalizedAlias.length >= 4)) return 80 + normalizedAlias.length;
    const aliasTokens = normalizer.tokens(normalizedAlias);
    let score = 0;
    queryTokens.filter(token => token.length >= 3 && !STOP_WORDS.has(token)).forEach(token => {
      if (aliasTokens.includes(token)) score += token.length >= 4 ? 12 : 4;
      else if (aliasTokens.some(aliasToken => normalizer.isConservativeTypoMatch(token, aliasToken))) score += 7;
    });
    return score;
  }

  function scorePlace(query, queryTokens, place) {
    return Math.max(0, ...place.aliases.map(alias => {
      const score = scoreAlias(query, queryTokens, alias);
      if (!score) return 0;
      const isPrimary = [place.title, place.canonicalId, place.id]
        .some(value => window.EchoAI.Normalizer.normalize(value) === window.EchoAI.Normalizer.normalize(alias));
      return score + (isPrimary ? 10 : 0);
    }));
  }

  function resolve(message, contextEntityId = "") {
    const normalizer = window.EchoAI.Normalizer;
    const query = normalizer.normalize(message);
    const queryTokens = normalizer.tokens(query);
    const scored = window.EchoAI.PlaceRegistry.getPlaces().map(place => ({
      place,
      score: scorePlace(query, queryTokens, place),
    })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.place.title.localeCompare(b.place.title, "en"));

    if (!scored.length) {
      const contextPlace = contextEntityId ? window.EchoAI.PlaceRegistry.getById(contextEntityId) : null;
      return contextPlace ? Object.freeze({ status: "resolved_context", place: contextPlace, candidates: Object.freeze([contextPlace]), confidence: 0.82 })
        : Object.freeze({ status: "unknown", place: null, candidates: Object.freeze([]), confidence: 0 });
    }

    const topScore = scored[0].score;
    const top = scored.filter(item => item.score === topScore);
    const uniqueTop = [...new Map(top.map(item => [item.place.canonicalId, item.place])).values()];
    if (uniqueTop.length > 1) return Object.freeze({ status: "ambiguous", place: null, candidates: Object.freeze(uniqueTop.slice(0, 6)), confidence: 0.35 });

    const place = uniqueTop[0];
    const runnerUp = scored.find(item => item.place.canonicalId !== place.canonicalId);
    if (runnerUp && runnerUp.score >= topScore - 2 && topScore < 80) {
      const candidates = [...new Map(scored.filter(item => item.score >= topScore - 2).map(item => [item.place.canonicalId, item.place])).values()];
      return Object.freeze({ status: "ambiguous", place: null, candidates: Object.freeze(candidates.slice(0, 6)), confidence: 0.4 });
    }
    return Object.freeze({ status: "resolved", place, candidates: Object.freeze([place]), confidence: topScore >= 80 ? 0.98 : 0.86 });
  }

  function resolveMany(message) {
    const normalizer = window.EchoAI.Normalizer;
    const query = normalizer.normalize(message);
    const queryTokens = normalizer.tokens(query);
    return window.EchoAI.PlaceRegistry.getPlaces().map(place => ({
      place,
      score: scorePlace(query, queryTokens, place),
    })).filter(item => item.score >= 12).sort((a, b) => b.score - a.score).map(item => item.place).filter((place, index, all) => all.findIndex(item => item.canonicalId === place.canonicalId) === index);
  }

  window.EchoAI.Retriever = Object.freeze({ resolve, resolveMany });
}());
