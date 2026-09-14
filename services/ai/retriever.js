(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const STOP_WORDS = new Set([
    "the", "is", "at", "a", "an", "and", "to", "me", "where", "what", "when", "how", "does", "do", "mart",
    "campus", "student", "shop", "store", "event", "hall", "service", "services", "print", "printing", "laundry", "sport", "sports", "equipment", "food",
    "di", "kat", "mana", "apa", "ke", "yang", "kalau", "hari", "pukul", "jam", "dewan",
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "ahad", "isnin", "sel", "selasa", "rabu", "kham", "khamis", "jumaat", "jumat", "sabtu",
  ]);
  const MIN_IDENTITY_SCORE = 70;
  const SAFE_TARGET_MODIFIERS = new Set(["main", "campus", "kmk", "building", "block", "room"]);

  function phraseIndex(query, alias) {
    const index = query.indexOf(alias);
    if (index < 0) return -1;
    const before = index > 0 ? query[index - 1] : "";
    const after = query[index + alias.length] || "";
    return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after) ? index : -1;
  }

  function explicitLocationTarget(query) {
    let match = query.match(/^(?:(?:could|can|would) you )?(?:please )?(?:where is|wheres|locate|find|show(?: me)?|open|pin|navigate to|take me to|bring me to) (?:the )?(.+)$/);
    if (!match) match = query.match(/^(.+?) (?:kat|di) mana$/);
    if (!match) return "";
    return match[1]
      .replace(/\s+(?:near|beside|inside)\s+.+$/, "")
      .replace(/\s+(?:on|in|using) (?:the )?(?:echo )?map(?: please)?$/, "")
      .replace(/\s+for me$/, "")
      .trim();
  }

  function aliasFitsLocationTarget(query, alias) {
    const target = explicitLocationTarget(query);
    if (!target) return true;
    const index = phraseIndex(target, alias);
    if (index < 0) return false;
    const remainder = `${target.slice(0, index)} ${target.slice(index + alias.length)}`.trim();
    return !remainder || window.EchoAI.Normalizer.tokens(remainder).every(token => SAFE_TARGET_MODIFIERS.has(token));
  }

  function scoreAlias(query, queryTokens, alias) {
    const normalizer = window.EchoAI.Normalizer;
    const normalizedAlias = normalizer.normalize(alias);
    if (!normalizedAlias) return 0;
    if (STOP_WORDS.has(normalizedAlias)) return 0;
    if (query === normalizedAlias) return 110 + normalizedAlias.length;
    const rawAlias = String(alias || "").trim();
    const shortCode = /^[A-Z]{2,4}$/.test(rawAlias) || /^[A-Za-z]\d{1,2}$/.test(rawAlias);
    if (shortCode) {
      const index = phraseIndex(query, normalizedAlias);
      if (index >= 0 && aliasFitsLocationTarget(query, normalizedAlias)) return 100 + normalizedAlias.length;
    }
    if (phraseIndex(query, normalizedAlias) >= 0 && aliasFitsLocationTarget(query, normalizedAlias)
      && (/[\u3400-\u9fff]/.test(normalizedAlias) || normalizedAlias.includes(" ") || normalizedAlias.length >= 4)) return 90 + normalizedAlias.length;
    const aliasTokens = normalizer.tokens(normalizedAlias);
    const meaningfulAliasTokens = aliasTokens.filter(token => token.length >= 3 && !STOP_WORDS.has(token));
    const meaningfulQueryTokens = queryTokens.filter(token => token.length >= 3 && !STOP_WORDS.has(token));
    if (!meaningfulAliasTokens.length || !meaningfulQueryTokens.length) return 0;
    const exactMatches = meaningfulAliasTokens.filter(token => meaningfulQueryTokens.includes(token));
    const typoMatches = meaningfulAliasTokens.filter(aliasToken => meaningfulQueryTokens.some(token => normalizer.isConservativeTypoMatch(token, aliasToken)));
    const covered = new Set([...exactMatches, ...typoMatches]);
    if (covered.size === meaningfulAliasTokens.length && typoMatches.length > 0) return 75 + meaningfulAliasTokens.join("").length;
    return exactMatches.reduce((score, token) => score + (token.length >= 4 ? 12 : 4), 0);
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
    })).filter(item => item.score >= MIN_IDENTITY_SCORE).sort((a, b) => b.score - a.score || a.place.title.localeCompare(b.place.title, "en"));

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
    })).filter(item => item.score >= MIN_IDENTITY_SCORE).sort((a, b) => b.score - a.score).map(item => item.place).filter((place, index, all) => all.findIndex(item => item.canonicalId === place.canonicalId) === index);
  }

  window.EchoAI.Retriever = Object.freeze({ resolve, resolveMany });
}());
