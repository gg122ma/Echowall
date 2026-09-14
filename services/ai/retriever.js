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
  const QUERY_SCAFFOLD_WORDS = new Set([
    "about", "accept", "after", "allowed", "amount", "answer", "anything", "are", "around", "assume", "bag", "before", "beside", "between", "bring", "buy", "can", "close", "closed", "closes", "closing", "code", "conflict", "court",
    "boys", "confirm", "correct", "cost", "could", "current", "day", "directions", "dress", "eat", "enter", "exactly", "facilities", "fee", "fees", "find", "for", "friday", "from", "get", "girls", "give", "go", "got",
    "hours", "inside", "information", "into", "items", "locate", "map", "may", "midnight", "monday", "near", "navigate", "need", "next", "noon", "now", "of", "on",
    "just", "key", "later", "likely", "location", "mention", "minimum", "most", "much", "my", "office", "only", "open", "opened", "opening", "opens", "outside", "pay", "payment", "please", "pretend", "provide", "provides", "qr", "right", "rules", "saturday", "say", "services", "show", "sunday",
    "take", "tell", "there", "thursday", "time", "today", "tuesday", "usage", "use", "used", "wednesday", "which", "works", "would", "you", "bawa", "belanja", "berapa", "betul", "boleh", "buka",
    "berfungsi", "cari", "cuma", "dekat", "dibenarkan", "hari", "harga", "jangan", "lah", "macam", "masuk", "nak", "pada", "pagi", "pejabat", "peta", "peraturan", "tak", "tutup", "waktu", "yuran",
  ]);

  function phraseIndex(query, alias) {
    const index = query.indexOf(alias);
    if (index < 0) return -1;
    const before = index > 0 ? query[index - 1] : "";
    const after = query[index + alias.length] || "";
    return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after) ? index : -1;
  }

  function explicitLocationTarget(query) {
    let match = query.match(/^(?:(?:could|can|would) you )?(?:please )?(?:help me )?(?:where is|wheres|locate|find|show(?: me)?|open|pin|drop a pin for|navigate to|take me to|bring me to) (?:the )?(.+)$/);
    if (!match) match = query.match(/^where can (?:i|we) (?:find|locate) (?:the )?(.+)$/);
    if (!match) match = query.match(/^(?:do you know |(?:please )?tell me )where (?:the )?(.+?) is$/);
    if (!match) match = query.match(/^i need directions to (?:the )?(.+)$/);
    if (!match) match = query.match(/^(.+?) (?:kat|di) mana$/);
    if (!match) return "";
    return match[1]
      .replace(/\s+(?:near|beside|inside)\s+.+$/, "")
      .replace(/\s+(?:on|in|using) (?:the )?(?:echo )?map(?: please)?$/, "")
      .replace(/\s+for me$/, "")
      .trim();
  }

  function wholeTargetMatchesAlias(target, alias) {
    const normalizer = window.EchoAI.Normalizer;
    const targetTokens = normalizer.tokens(target).filter(token => !SAFE_TARGET_MODIFIERS.has(token));
    const aliasTokens = normalizer.tokens(alias).filter(token => !SAFE_TARGET_MODIFIERS.has(token));
    if (!targetTokens.length || targetTokens.length !== aliasTokens.length) return false;
    return aliasTokens.every((aliasToken, index) => targetTokens[index] === aliasToken
      || normalizer.isConservativeTypoMatch(targetTokens[index], aliasToken));
  }

  function hasNoUnexplainedIdentityTokens(query, alias) {
    const normalizer = window.EchoAI.Normalizer;
    if (/[^\x00-\x7f]/.test(query)) {
      const remainder = query.replace(alias, "").replace(/(?:请问|在哪里|哪里|哪儿|在哪|位置|怎么|如何|几点|开放|开门|关门|关闭|营业|可以|有没有|是不是|附近|有什么|什么|有|地图|带我去|给我看|星期[一二三四五六日天]|早上|下午|晚上|请|在|显示|点|开|关|对|吗|呢)/g, "").replace(/[0-9:\s]+/g, "");
      return remainder.length === 0;
    }
    const queryTokens = normalizer.tokens(query).filter(token => token.length >= 2 && !STOP_WORDS.has(token)
      && !SAFE_TARGET_MODIFIERS.has(token) && !QUERY_SCAFFOLD_WORDS.has(token) && !/^\d+(?::\d+)?(?:am|pm)?$/.test(token));
    const aliasTokens = normalizer.tokens(alias).filter(token => token.length >= 2 && !STOP_WORDS.has(token) && !SAFE_TARGET_MODIFIERS.has(token));
    const unmatched = [...queryTokens];
    aliasTokens.forEach(aliasToken => {
      const index = unmatched.findIndex(token => token === aliasToken || normalizer.isConservativeTypoMatch(token, aliasToken));
      if (index >= 0) unmatched.splice(index, 1);
    });
    return unmatched.length === 0;
  }

  function aliasFitsLocationTarget(query, alias) {
    const target = explicitLocationTarget(query);
    if (!target) return true;
    const index = phraseIndex(target, alias);
    if (index < 0) return false;
    const remainder = `${target.slice(0, index)} ${target.slice(index + alias.length)}`.trim();
    return !remainder || window.EchoAI.Normalizer.tokens(remainder).every(token => SAFE_TARGET_MODIFIERS.has(token));
  }

  function scoreAlias(query, queryTokens, alias, allowMultipleIdentities = false) {
    const normalizer = window.EchoAI.Normalizer;
    const normalizedAlias = normalizer.normalize(alias);
    if (!normalizedAlias) return 0;
    if (STOP_WORDS.has(normalizedAlias)) return 0;
    if (query === normalizedAlias) return 110 + normalizedAlias.length;
    const rawAlias = String(alias || "").trim();
    const shortCode = /^[A-Z]{2,4}$/.test(rawAlias) || /^[A-Za-z]\d{1,2}$/.test(rawAlias);
    if (shortCode) {
      const index = phraseIndex(query, normalizedAlias);
      if (index >= 0 && aliasFitsLocationTarget(query, normalizedAlias) && (allowMultipleIdentities || hasNoUnexplainedIdentityTokens(query, normalizedAlias))) return 100 + normalizedAlias.length;
    }
    if (phraseIndex(query, normalizedAlias) >= 0 && aliasFitsLocationTarget(query, normalizedAlias) && (allowMultipleIdentities || hasNoUnexplainedIdentityTokens(query, normalizedAlias))
      && (/[\u3400-\u9fff]/.test(normalizedAlias) || normalizedAlias.includes(" ") || normalizedAlias.length >= 4)) return 90 + normalizedAlias.length;
    const aliasTokens = normalizer.tokens(normalizedAlias);
    const meaningfulAliasTokens = aliasTokens.filter(token => token.length >= 3 && !STOP_WORDS.has(token));
    const meaningfulQueryTokens = queryTokens.filter(token => token.length >= 3 && !STOP_WORDS.has(token));
    if (!meaningfulAliasTokens.length || !meaningfulQueryTokens.length) return 0;
    const exactMatches = meaningfulAliasTokens.filter(token => meaningfulQueryTokens.includes(token));
    const typoMatches = meaningfulAliasTokens.filter(aliasToken => meaningfulQueryTokens.some(token => normalizer.isConservativeTypoMatch(token, aliasToken)));
    const covered = new Set([...exactMatches, ...typoMatches]);
    const target = explicitLocationTarget(query);
    const targetAllowsFallback = target ? wholeTargetMatchesAlias(target, normalizedAlias) : allowMultipleIdentities || hasNoUnexplainedIdentityTokens(query, normalizedAlias);
    if (covered.size === meaningfulAliasTokens.length && typoMatches.length > 0 && targetAllowsFallback) return 75 + meaningfulAliasTokens.join("").length;
    return exactMatches.reduce((score, token) => score + (token.length >= 4 ? 12 : 4), 0);
  }

  function scorePlace(query, queryTokens, place, allowMultipleIdentities = false) {
    return Math.max(0, ...place.aliases.map(alias => {
      const score = scoreAlias(query, queryTokens, alias, allowMultipleIdentities);
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
      score: scorePlace(query, queryTokens, place, true),
    })).filter(item => item.score >= MIN_IDENTITY_SCORE).sort((a, b) => b.score - a.score).map(item => item.place).filter((place, index, all) => all.findIndex(item => item.canonicalId === place.canonicalId) === index);
  }

  window.EchoAI.Retriever = Object.freeze({ resolve, resolveMany });
}());
