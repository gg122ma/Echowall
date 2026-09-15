(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const SAFE_TARGET_MODIFIERS = new Set(["main", "campus", "kmk", "building", "block", "room"]);
  const COMPARISON_CONNECTOR = /\b(?:and|dan|versus|vs)\b|和|与|跟/i;
  const ACTION_LED_TARGET = /^(?:print|printing|photocopy|copy|wash|washing|laundry|iron|ironing|borrow|rent|hire|study|eat|buy|collect|cetak|fotostat|basuh|dobi|pinjam|sewa|belajar|makan|beli|打印|复印|洗衣|借|租|学习|吃)/i;
  const ACTION_IN_CLAUSE = /\b(?:print|photocopy|wash|borrow|rent|hire|study|eat|buy|cetak|fotostat|basuh|pinjam|sewa|belajar|makan|beli)\b|打印|复印|洗衣|借|租|学习|吃/i;
  const GENERIC_DISCOVERY_TARGET = /^(?:cafeterias?|cafes?|sports facilities|dewan sukan(?: besar)?)$/i;
  const CONTEXT_REFERENCE_TARGET = /^(?:it|there|this|that|that place|the place|me)$/i;
  const SUBJECT_REFERENCE_TOKENS = new Set(["i", "im", "we", "you", "he", "she", "they", "saya", "kami", "kita", "awak", "dia", "mereka"]);
  const PREDICATE_AUXILIARIES = new Set(["can", "could", "did", "do", "does", "may", "might", "must", "shall", "should", "will", "would"]);
  const IDENTITY_ACTION_TOKENS = new Set(["enter", "find", "go", "locate", "reach", "visit", "cari", "masuk", "pergi"]);
  const LOCAL_GRAMMAR_BOUNDARIES = new Set([
    "a", "an", "the", "and", "or", "but", "about", "at", "by", "for", "from", "in", "inside", "into", "near", "beside", "of", "on", "to", "with",
    "am", "are", "is", "was", "were", "be", "been", "being", "can", "could", "did", "do", "does", "had", "has", "have",
    "may", "might", "must", "shall", "should", "will", "would", "how", "what", "when", "where", "which", "who", "why",
    "any", "some", "these", "those", "assume", "compare", "pretend", "i", "im", "me", "my", "we", "our", "you", "your",
    "ada", "adakah", "boleh", "dekat", "di", "dengan", "dan", "dari", "ke", "kat", "mana", "untuk",
  ]);

  function phraseIndex(query, alias) {
    const index = query.indexOf(alias);
    if (index < 0) return -1;
    if (/[^\x00-\x7f]/.test(alias)) return index;
    const before = index > 0 ? query[index - 1] : "";
    const after = query[index + alias.length] || "";
    return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after) ? index : -1;
  }

  function cleanTarget(value) {
    let target = String(value || "").trim();
    let previous = "";
    while (target && target !== previous) {
      previous = target;
      target = target
        .replace(/^(?:please\s+|the\s+|a\s+|an\s+)+/, "")
        .replace(/^exact\s+/, "")
        .replace(/^(?:exact\s+)?location of\s+/, "")
        .replace(/^tell me (?:the )?(?:most likely )?/, "")
        .replace(/\s+(?:please|for me|exactly)$/, "")
        .replace(/^(?:on|in|using)\s+(?:the\s+)?(?:echo\s+)?map$/, "")
        .replace(/\s+(?:on|in|using)\s+(?:the\s+)?(?:echo\s+)?map$/, "")
        .replace(/\s+(?:near|beside|inside|next to)\s+.+$/, "")
        .replace(/\s+(?:situated|located)$/, "")
        .trim();
    }
    return target;
  }

  function extractTargetSlot(message) {
    const query = window.EchoAI.Normalizer.normalize(message);
    if (!query) return null;
    const targetPatterns = [
      { kind: "navigation", strength: "identity", pattern: /^(?:(?:could|can|would) you\s+)?(?:please\s+)?(?:help me\s+)?(?:navigate to|take me to|bring me to|drop a pin for|pin|open|show(?: me)?)\s+(.+)$/ },
      { kind: "location", strength: "identity", pattern: /^(?:(?:could|can|would) you\s+)?(?:please\s+)?(?:help me\s+)?(?:where is|wheres|locate|find)\s+(.+)$/ },
      { kind: "location", strength: "identity", pattern: /^i need (?:directions to|to (?:find|locate|reach|get to))\s+(.+)$/ },
      { kind: "navigation", strength: "identity", pattern: /^how (?:do|can) i (?:get|go) to\s+(.+)$/ },
      { kind: "navigation", strength: "identity", pattern: /^how to find\s+(.+)$/ },
      { kind: "location", strength: "object", pattern: /^where (?:should|might|could|can) i (?:go|head)(?:\s+to)?\s+for\s+(.+)$/ },
      { kind: "location", strength: "object", pattern: /^where (?:might|could|can) i get\s+(.+)$/ },
      { kind: "hours", strength: "identity", pattern: /^(?:what time|when)\s+(?:does|do|is|are)\s+(.+?)\s+(?:open|close|closing|operating|available)(?:\s+.*)?$/ },
      { kind: "hours", strength: "identity", pattern: /^(?:is|are)\s+(.+?)\s+(?:open|closed|operating|available)(?:\s+.*)?$/ },
      { kind: "location", strength: "clause", pattern: /^(.+?)\s+(?:kat|di) mana$/ },
    ];
    for (const descriptor of targetPatterns) {
      const match = query.match(descriptor.pattern);
      if (!match) continue;
      const target = cleanTarget(match[1]);
      if (target) return Object.freeze({
        target,
        kind: GENERIC_DISCOVERY_TARGET.test(target) ? "discovery" : descriptor.kind,
        strength: GENERIC_DISCOVERY_TARGET.test(target) ? "category" : descriptor.strength,
      });
    }
    return null;
  }

  function catalog() {
    const regular = window.EchoAI.PlaceRegistry.getPlaces().map(place => ({
      entityId: place.canonicalId,
      source: "registry",
      aliases: place.identityAliases || place.aliases || [],
      primaryAliases: [place.title, place.canonicalId, place.id],
    }));
    const special = (window.KMK_AI_PHASE3?.specialEntities || []).map(entity => ({
      entityId: entity.id,
      source: "special",
      aliases: entity.aliases || [],
      primaryAliases: [entity.title, entity.id],
    }));
    return [...regular, ...special];
  }

  function comparableTokens(value) {
    return window.EchoAI.Normalizer.tokens(value).filter(token => !SAFE_TARGET_MODIFIERS.has(token));
  }

  function wholeTargetMatchesAlias(target, alias) {
    const targetTokens = comparableTokens(target);
    const aliasTokens = comparableTokens(alias);
    if (!targetTokens.length || targetTokens.length !== aliasTokens.length) return false;
    return aliasTokens.every((aliasToken, index) => targetTokens[index] === aliasToken
      || window.EchoAI.Normalizer.isConservativeTypoMatch(targetTokens[index], aliasToken));
  }

  function uniqueBest(matches) {
    const best = new Map();
    matches.forEach(match => {
      const current = best.get(match.entityId);
      if (!current || match.score > current.score || (match.score === current.score && (match.index ?? 0) < (current.index ?? 0))) best.set(match.entityId, match);
    });
    return [...best.values()].sort((left, right) => (right.score - left.score) || ((left.index ?? 0) - (right.index ?? 0)) || left.entityId.localeCompare(right.entityId, "en"));
  }

  function exactTargetMatches(target) {
    const matches = [];
    catalog().forEach(entry => {
      entry.aliases.forEach(alias => {
        const normalizedAlias = window.EchoAI.Normalizer.normalize(alias);
        if (!normalizedAlias || !wholeTargetMatchesAlias(target, normalizedAlias)) return;
        const exact = window.EchoAI.Normalizer.normalize(target) === normalizedAlias;
        const shortCode = /^[a-z]\d{1,2}$/.test(normalizedAlias);
        const primary = entry.primaryAliases.some(value => window.EchoAI.Normalizer.normalize(value) === normalizedAlias);
        matches.push({ ...entry, alias: normalizedAlias, score: (exact ? 200 : 160) + normalizedAlias.length + (primary ? 30 : 0) + (shortCode && entry.source === "special" ? 40 : 0) });
      });
    });
    return uniqueBest(matches);
  }

  function occurrenceMatches(query) {
    const matches = [];
    catalog().forEach(entry => {
      entry.aliases.forEach(alias => {
        const normalizedAlias = window.EchoAI.Normalizer.normalize(alias);
        if (!normalizedAlias) return;
        let index = phraseIndex(query, normalizedAlias);
        let approximate = false;
        if (index < 0 && !/[^\x00-\x7f]/.test(normalizedAlias)) {
          const queryTokens = window.EchoAI.Normalizer.tokens(query);
          const aliasTokens = window.EchoAI.Normalizer.tokens(normalizedAlias);
          for (let offset = 0; offset <= queryTokens.length - aliasTokens.length; offset += 1) {
            const windowTokens = queryTokens.slice(offset, offset + aliasTokens.length);
            const typoCount = aliasTokens.filter((aliasToken, tokenIndex) => window.EchoAI.Normalizer.isConservativeTypoMatch(windowTokens[tokenIndex], aliasToken)).length;
            const covered = aliasTokens.every((aliasToken, tokenIndex) => windowTokens[tokenIndex] === aliasToken
              || window.EchoAI.Normalizer.isConservativeTypoMatch(windowTokens[tokenIndex], aliasToken));
            if (!covered || !typoCount) continue;
            index = queryTokens.slice(0, offset).join(" ").length;
            approximate = true;
            break;
          }
        }
        if (index < 0) return;
        const shortCode = /^[a-z]\d{1,2}$/.test(normalizedAlias);
        const primary = entry.primaryAliases.some(value => window.EchoAI.Normalizer.normalize(value) === normalizedAlias);
        matches.push({ ...entry, alias: normalizedAlias, index, score: (approximate ? 80 : 100) + normalizedAlias.length + (primary ? 30 : 0) + (shortCode && entry.source === "special" ? 40 : 0) });
      });
    });
    return uniqueBest(matches);
  }

  function lexicalTokens(message) {
    const tokens = [];
    const expression = /[A-Za-z0-9]+|[\u3400-\u9fff]+/gu;
    const source = String(message || "");
    let match;
    while ((match = expression.exec(source))) {
      tokens.push({ raw: match[0], normalized: window.EchoAI.Normalizer.normalize(match[0]), start: match.index, end: expression.lastIndex });
    }
    return tokens;
  }

  function hasHardBoundary(message, left, right) {
    return /[.!?;:。！？；：]/u.test(String(message || "").slice(left, right));
  }

  function looksLikeNameToken(token) {
    if (!token || !/^[A-Za-z0-9]+$/.test(token.raw) || LOCAL_GRAMMAR_BOUNDARIES.has(token.normalized)) return false;
    if (SAFE_TARGET_MODIFIERS.has(token.normalized)) return false;
    return /^[A-Z][a-z0-9]+/.test(token.raw) || /^[A-Z0-9]{2,}$/.test(token.raw);
  }

  function isLocalContentToken(token) {
    return Boolean(token && /^[A-Za-z0-9]+$/.test(token.raw)
      && !LOCAL_GRAMMAR_BOUNDARIES.has(token.normalized)
      && !SAFE_TARGET_MODIFIERS.has(token.normalized));
  }

  function localAliasSpan(message, occurrence) {
    const tokens = lexicalTokens(message);
    const aliasTokens = window.EchoAI.Normalizer.tokens(occurrence.alias);
    const aliasHasCjk = /[^\x00-\x7f]/.test(occurrence.alias);
    for (let offset = 0; offset < tokens.length; offset += 1) {
      let length = aliasTokens.length;
      let covered = false;
      if (aliasHasCjk) {
        covered = tokens[offset].normalized.includes(occurrence.alias);
        length = 1;
      } else if (offset + length <= tokens.length) {
        covered = aliasTokens.every((aliasToken, index) => tokens[offset + index].normalized === aliasToken
          || window.EchoAI.Normalizer.isConservativeTypoMatch(tokens[offset + index].normalized, aliasToken));
      }
      if (!covered) continue;
      const first = tokens[offset];
      const last = tokens[offset + length - 1];
      const left = tokens[offset - 1];
      const right = tokens[offset + length];
      const afterRight = tokens[offset + length + 1];
      const leftNamed = left && !hasHardBoundary(message, left.end, first.start) && looksLikeNameToken(left);
      const rightNamed = right && !hasHardBoundary(message, last.end, right.start) && looksLikeNameToken(right);
      const leftContent = left && !hasHardBoundary(message, left.end, first.start) && isLocalContentToken(left);
      const rightContent = right && !hasHardBoundary(message, last.end, right.start) && isLocalContentToken(right);
      const rightClosesSpan = rightContent && (!afterRight || LOCAL_GRAMMAR_BOUNDARIES.has(afterRight.normalized)
        || hasHardBoundary(message, right.end, afterRight.start));
      const tokenBeforeLeft = tokens[offset - 2];
      const tokenBeforeSubject = tokens[offset - 3];
      const predicateBeforeAlias = leftContent && (SUBJECT_REFERENCE_TOKENS.has(tokenBeforeLeft?.normalized)
        || IDENTITY_ACTION_TOKENS.has(left.normalized)
        || (tokenBeforeLeft && PREDICATE_AUXILIARIES.has(tokenBeforeSubject?.normalized)));
      const lowercaseClosedWrapper = leftContent && rightContent && rightClosesSpan && !predicateBeforeAlias;
      const lowercasePrefixWrapper = leftContent && !right && !predicateBeforeAlias;
      const leftAttached = leftNamed || lowercaseClosedWrapper || lowercasePrefixWrapper;
      const rightAttached = rightNamed || lowercaseClosedWrapper;
      let localStart = leftAttached ? offset - 1 : offset;
      let localEnd = rightAttached ? offset + length : offset + length - 1;
      while (localStart > 0 && looksLikeNameToken(tokens[localStart - 1])
        && !hasHardBoundary(message, tokens[localStart - 1].end, tokens[localStart].start)) localStart -= 1;
      while (localEnd + 1 < tokens.length && looksLikeNameToken(tokens[localEnd + 1])
        && !hasHardBoundary(message, tokens[localEnd].end, tokens[localEnd + 1].start)) localEnd += 1;
      const cjkAliasOffset = aliasHasCjk ? tokens[offset].normalized.indexOf(occurrence.alias) : -1;
      const cjkWrappedOnBothSides = cjkAliasOffset > 0
        && cjkAliasOffset + occurrence.alias.length < tokens[offset].normalized.length;
      const latinQualifierTouchesCjk = aliasHasCjk && (leftAttached || rightAttached);
      return {
        qualified: Boolean(leftAttached || rightAttached || latinQualifierTouchesCjk || cjkWrappedOnBothSides),
        target: String(message || "").slice(tokens[localStart].start, tokens[localEnd].end).trim(),
      };
    }
    return { qualified: false, target: "" };
  }

  function fallbackQualifiedIdentity(message, occurrences) {
    for (const occurrence of occurrences) {
      const shadowedBySpecificAlias = occurrences.some(other => other !== occurrence
        && other.index === occurrence.index
        && other.alias.length > occurrence.alias.length
        && other.alias.includes(occurrence.alias));
      if (shadowedBySpecificAlias) continue;
      const local = localAliasSpan(message, occurrence);
      if (local.qualified) {
        const knownLocalTarget = exactTargetMatches(local.target).some(match => match.entityId === occurrence.entityId);
        if (!knownLocalTarget) return local;
      }
    }
    return null;
  }

  function fallbackNamedSpan(message, options = {}) {
    const tokens = lexicalTokens(message);
    const focusTokens = new Set(options.namedSpanFocusTokens || []);
    const caseInsensitive = Boolean(options.detectUnaliasedNamedSpan && focusTokens.size);
    let runStart = -1;
    for (let index = 0; index <= tokens.length; index += 1) {
      const token = tokens[index];
      const belongsToSpan = caseInsensitive ? (focusTokens.has(token?.normalized) || isLocalContentToken(token)) : looksLikeNameToken(token);
      if (belongsToSpan) {
        if (runStart < 0) runStart = index;
        continue;
      }
      const runLength = runStart < 0 ? 0 : index - runStart;
      const hasFocus = !focusTokens.size || tokens.slice(runStart, index).some(item => focusTokens.has(item.normalized));
      if (runLength >= (caseInsensitive ? 2 : 3) && hasFocus) {
        return String(message || "").slice(tokens[runStart].start, tokens[index - 1].end).trim();
      }
      runStart = -1;
    }
    return "";
  }

  function unknownEvidence(slot) {
    return Object.freeze({ status: "unknown_qualified", entityId: "", matches: Object.freeze([]), target: slot.target, targetKind: slot.kind, confidence: 0 });
  }

  function analyzeIdentityEvidence(message, options = {}) {
    const query = window.EchoAI.Normalizer.normalize(message);
    const slot = extractTargetSlot(message);
    const occurrences = occurrenceMatches(query);

    if (slot) {
      if (slot.strength === "category") {
        return Object.freeze({ status: "none", entityId: "", matches: Object.freeze([]), target: slot.target, targetKind: slot.kind, confidence: 0 });
      }
      if (CONTEXT_REFERENCE_TARGET.test(slot.target)) {
        return Object.freeze({ status: "none", entityId: "", matches: Object.freeze([]), target: "", targetKind: slot.kind, confidence: 0 });
      }
      const exact = exactTargetMatches(slot.target);
      if (exact.length) {
        const topScore = exact[0].score;
        const top = exact.filter(match => match.score === topScore);
        if (top.length > 1) return Object.freeze({ status: "ambiguous", entityId: "", matches: Object.freeze(top), target: slot.target, targetKind: slot.kind, confidence: 0.4 });
        return Object.freeze({ status: "known", entityId: exact[0].entityId, matches: Object.freeze(exact), target: slot.target, targetKind: slot.kind, confidence: 0.99 });
      }

      if (options.allowMultiple && occurrences.length >= 2 && COMPARISON_CONNECTOR.test(query)) {
        return Object.freeze({ status: "known_multiple", entityId: occurrences[0].entityId, matches: Object.freeze(occurrences), target: slot.target, targetKind: slot.kind, confidence: 0.96 });
      }

      const targetContainsKnownAlias = occurrences.some(match => phraseIndex(slot.target, match.alias) >= 0);
      const targetTokenCount = window.EchoAI.Normalizer.tokens(slot.target).length;
      const actionTarget = (slot.strength === "object" && ACTION_LED_TARGET.test(slot.target))
        || (slot.strength === "clause" && ACTION_IN_CLAUSE.test(slot.target));
      if (slot.strength === "identity" || targetContainsKnownAlias || (targetTokenCount >= 2 && !actionTarget)) return unknownEvidence(slot);
    }

    if (!occurrences.length) {
      const namedSpan = fallbackNamedSpan(message, options);
      if (namedSpan) return unknownEvidence({ target: namedSpan, kind: slot?.kind || "location" });
      return Object.freeze({ status: "none", entityId: "", matches: Object.freeze([]), target: slot?.target || "", targetKind: slot?.kind || "", confidence: 0 });
    }

    if (options.allowMultiple && occurrences.length >= 2 && COMPARISON_CONNECTOR.test(query)) {
      return Object.freeze({ status: "known_multiple", entityId: occurrences[0].entityId, matches: Object.freeze(occurrences), target: "", targetKind: "", confidence: 0.96 });
    }

    if (options.detectUnaliasedNamedSpan) {
      const namedSpan = fallbackNamedSpan(message, options);
      if (namedSpan && !exactTargetMatches(namedSpan).length) {
        return unknownEvidence({ target: namedSpan, kind: slot?.kind || "location" });
      }
    }

    const qualifiedFallback = fallbackQualifiedIdentity(message, occurrences);
    if (qualifiedFallback) {
      return unknownEvidence({ target: qualifiedFallback.target, kind: slot?.kind || "location" });
    }

    const firstIndex = Math.min(...occurrences.map(match => match.index));
    const first = occurrences.filter(match => match.index === firstIndex).sort((left, right) => right.score - left.score);
    const topScore = first[0].score;
    const top = first.filter(match => match.score === topScore);
    if (top.length > 1) return Object.freeze({ status: "ambiguous", entityId: "", matches: Object.freeze(top), target: "", targetKind: "", confidence: 0.4 });
    return Object.freeze({ status: "known", entityId: top[0].entityId, matches: Object.freeze(occurrences), target: slot?.target || "", targetKind: slot?.kind || "", confidence: 0.98 });
  }

  function resolve(message, contextEntityId = "") {
    const evidence = analyzeIdentityEvidence(message);
    if (evidence.status === "known") {
      const place = window.EchoAI.PlaceRegistry.getById(evidence.entityId);
      if (place) return Object.freeze({ status: "resolved", place, candidates: Object.freeze([place]), confidence: evidence.confidence });
    }
    if (evidence.status === "ambiguous") {
      const candidates = evidence.matches.map(match => window.EchoAI.PlaceRegistry.getById(match.entityId)).filter(Boolean);
      return Object.freeze({ status: "ambiguous", place: null, candidates: Object.freeze(candidates), confidence: 0.4 });
    }
    const contextPlace = evidence.status === "none" && contextEntityId ? window.EchoAI.PlaceRegistry.getById(contextEntityId) : null;
    return contextPlace ? Object.freeze({ status: "resolved_context", place: contextPlace, candidates: Object.freeze([contextPlace]), confidence: 0.82 })
      : Object.freeze({ status: "unknown", place: null, candidates: Object.freeze([]), confidence: 0 });
  }

  function resolveMany(message) {
    const evidence = analyzeIdentityEvidence(message, { allowMultiple: true });
    if (!["known", "known_multiple"].includes(evidence.status)) return [];
    return evidence.matches.map(match => window.EchoAI.PlaceRegistry.getById(match.entityId)).filter(Boolean)
      .filter((place, index, all) => all.findIndex(item => item.canonicalId === place.canonicalId) === index);
  }

  window.EchoAI.Retriever = Object.freeze({ analyzeIdentityEvidence, extractTargetSlot, resolve, resolveMany });
}());
