(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const STATES = Object.freeze({
    EXACT_TARGET: "EXACT_KNOWN_TARGET",
    UNRESOLVED_TARGET: "UNRESOLVED_NAMED_TARGET",
    AMBIGUOUS_REFERENCE: "AMBIGUOUS_NAMED_REFERENCE",
    KNOWN_MENTION: "KNOWN_ENTITY_MENTION",
    SERVICE_NEED: "SERVICE_NEED",
    CONTEXT_REFERENCE: "CONTEXT_REFERENCE",
    NONE: "NO_ENTITY_EVIDENCE",
  });
  const CONTEXT_TARGET = /^(?:it|there|this|that|that place|the place|me|situ|sana|tempat itu|它|那里|那边)$/u;
  const CONTEXT_ANAPHORA = /\b(?:it|its|there|this|that|that place|the place|ia|itu|situ|sana|tempat itu|(?:lokasi|harga|waktu|peraturan|perkhidmatan)nya)\b|它|那里|那边|这个|这个地方/u;
  const CONTEXT_FACT_INTENTS = new Set(["campus_hours", "campus_fees", "campus_rules", "campus_services", "campus_location", "campus_nearby"]);
  const CONTEXT_RELATIVE_PAYLOAD = /^(?:today|tomorrow|tonight|now|currently|this (?:morning|afternoon|evening|week|weekend)|next (?:week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)|sunday|monday|tuesday|wednesday|thursday|friday|saturday|ahad|isnin|selasa|rabu|khamis|jumaat|jumat|sabtu|hours?|opening(?: time| hours?)?|closing(?: time| hours?)?|fees?|cost|price|rules?|access|payment|services?|availability|location|nearby|purpose|function|waktu|harga|bayaran|peraturan|akses|lokasi|perkhidmatan|kegunaan|hari ini|esok|malam ini|sekarang|今天|明天|今晚|现在|目前|开放时间|营业时间|费用|规则|位置|附近|服务|用途|(?:星期|周)[一二三四五六日天]|\d{4}[ -]\d{1,2}[ -]\d{1,2})$/u;
  const CONTEXT_RELATIVE_TURN = /^(?:more|what else|anything else|tell me more about (?:it|that|that place)|where exactly|which source is correct|just choose one|(?:really )?just pick (?:the )?(?:later|earlier) one|apa lagi|lagi)(?: please)?$/u;
  const COMPARISON_CONNECTOR = /\b(?:and|dan|versus|vs)\b|和|与|跟/iu;
  const CLOSED_CLASS_AUXILIARY = /^(?:do|does|did|can|could|may|might|will|would|should|is|are|was|were|has|have|had)\s+(?:the\s+)?/u;
  const GENERIC_TARGETS = Object.freeze({
    cafe: "dining", cafes: "dining", cafeteria: "dining", cafeterias: "dining", kafe: "dining", kafeteria: "dining",
    "食堂": "dining", "餐厅": "dining", "咖啡厅": "dining",
    "sports facilities": "sports", "sport facilities": "sports", "dewan sukan": "sports", "dewan sukan besar": "sports",
    "体育设施": "sports", "运动设施": "sports",
  });
  const DISCOVERY_IDS = Object.freeze({
    dining: Object.freeze(["cafe-a", "cafe-b", "cafe-c", "cafe-admin"]),
    sports: Object.freeze(["astaka", "basketball-court", "sports-equipment-store"]),
  });
  const SERVICE_ENTITY_BY_FRAME = Object.freeze({
    PRINT_DOCUMENT: "pos-mini",
    WASH_CLOTHES: "hostel-laundry",
    IRON_CLOTHES: "hostel-iron-room",
    BORROW_BICYCLE: "bicycle-service",
    BORROW_SPORTS_EQUIPMENT: "sports-equipment-store",
    HOSTEL_STUDY: "hostel-study-room",
    BUY_DAILY_SUPPLIES: "koop-mart",
    COLLECT_PARCEL: "pos-mini",
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function isWordCharacter(character) {
    return Boolean(character && /[\p{L}\p{N}]/u.test(character));
  }

  function isLatinWordCharacter(character) {
    return Boolean(character && isWordCharacter(character) && !/[\u3400-\u9fff]/u.test(character));
  }

  function unicodeView(value) {
    const source = String(value || "");
    let folded = "";
    const offsets = [];
    let pendingSpace = false;
    let sourceOffset = 0;
    for (const originalCharacter of source) {
      let expanded = originalCharacter.toLocaleLowerCase();
      try { expanded = expanded.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch {}
      for (const character of expanded) {
        if (isWordCharacter(character)) {
          if (pendingSpace && folded && !folded.endsWith(" ")) {
            folded += " ";
            offsets.push(sourceOffset);
          }
          folded += character;
          offsets.push(sourceOffset);
          pendingSpace = false;
        } else pendingSpace = true;
      }
      sourceOffset += originalCharacter.length;
    }
    return Object.freeze({ source, folded, offsets: Object.freeze(offsets) });
  }

  function originalSpan(view, start, end) {
    if (start < 0 || end <= start || !view.offsets.length) return Object.freeze({ start: 0, end: 0 });
    const originalStart = view.offsets[start] ?? 0;
    const lastOffset = view.offsets[Math.min(end - 1, view.offsets.length - 1)] ?? originalStart;
    const lastCharacter = [...view.source.slice(lastOffset)][0] || "";
    return Object.freeze({ start: originalStart, end: lastOffset + lastCharacter.length });
  }

  function isContextRelativePayload(value) {
    const payload = unicodeView(value).folded
      .replace(/^(?:and|so|kalau)\s+/u, "")
      .replace(/\s+(?:then|pula)$/u, "")
      .replace(/^(?:那么|那)/u, "")
      .replace(/呢$/u, "");
    return CONTEXT_TARGET.test(payload) || CONTEXT_RELATIVE_PAYLOAD.test(payload);
  }

  function isBoundedFactDimensionTurn(message, intent) {
    if (!CONTEXT_FACT_INTENTS.has(intent)) return false;
    let remaining = unicodeView(message).folded
      .replace(/\b(?:hours?|opening|closing|open|opens|close|closes|closed|time|fees?|cost|costs|price|prices|rules?|services?|location|located|near|nearby|parking|available|availability|access|payment|purpose|function|waktu|pukul|jam|buka|tutup|harga|yuran|bayaran|peraturan|perkhidmatan|lokasi|dekat|berhampiran)\b/gu, " ")
      .replace(/(?:现在|目前|今天|明天|几点|什么时候|开门|关门|关闭|开放时间|营业时间|开放|费用|收费|规则|服务|位置|附近|停车|用途)/gu, " ")
      .replace(/\b(?:what|which|when|where|how|much|are|is|does|do|did|can|could|may|might|will|would|should|has|have|had|the|any|about|of|for|on|at|berapa|apa|mana|adakah)\b/gu, " ")
      .replace(/(?:请问|吗|呢|有没有|有|是|多少|什么)/gu, " ")
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .trim();
    return !remaining;
  }

  function isProvablyContextRelativeTurn(message, slot, intent) {
    if (slot && isContextRelativePayload(slot.text)) return true;
    const folded = unicodeView(message).folded;
    return isContextRelativePayload(folded)
      || CONTEXT_ANAPHORA.test(folded)
      || isBoundedFactDimensionTurn(message, intent)
      || CONTEXT_RELATIVE_TURN.test(folded)
      || /^(?:what|which|how|when|where|can|could|may|is|are)\b.*\b(?:it|this|there|that place)(?:\s+(?:on|in)\s+(?:the\s+)?(?:echo\s+)?map)?(?:\s+ah)?$/u.test(folded)
      || /^(?:what time|show me(?: on (?:the )?map)?|show it(?: on (?:the )?map)?|where exactly)$/u.test(folded)
      || /^so \d{1,2}(?::?\d{2})?(?:am|pm)? (?:or|atau) \d{1,2}(?::?\d{2})?(?:am|pm)?$/u.test(folded)
      || /^(?:还有呢|还有吗|还有什么|再说一点|更多)$/u.test(folded);
  }

  function aliasCatalog() {
    const records = [];
    window.EchoAI.PlaceRegistry.getIdentityPlaces().forEach(place => {
      const primary = new Set([place.title, place.id, place.canonicalId].map(value => unicodeView(value).folded).filter(Boolean));
      [...new Set(place.identityAliases || place.aliases || [])].forEach(alias => {
        const normalized = unicodeView(alias).folded;
        if (!normalized) return;
        records.push(Object.freeze({
          entityId: place.canonicalId,
          alias: String(alias),
          normalized,
          primary: primary.has(normalized),
          script: /[\u3400-\u9fff]/u.test(normalized) ? "CJK_OR_MIXED" : "LATIN",
        }));
      });
    });
    return records;
  }

  function exactOccurrences(view) {
    const results = [];
    aliasCatalog().forEach(record => {
      let offset = 0;
      while (offset <= view.folded.length - record.normalized.length) {
        const index = view.folded.indexOf(record.normalized, offset);
        if (index < 0) break;
        const before = view.folded[index - 1] || "";
        const after = view.folded[index + record.normalized.length] || "";
        const latinBoundary = record.script !== "LATIN" || (!isLatinWordCharacter(before) && !isLatinWordCharacter(after));
        if (latinBoundary) results.push(Object.freeze({
          ...record,
          matchKind: "EXACT",
          normalizedSpan: Object.freeze({ start: index, end: index + record.normalized.length }),
          span: originalSpan(view, index, index + record.normalized.length),
          score: 200 + record.normalized.length + (record.primary ? 30 : 0) + (/^[a-z]\d{1,2}$/.test(record.normalized) ? 40 : 0),
        }));
        offset = index + Math.max(record.normalized.length, 1);
      }
    });
    return results;
  }

  function latinTokens(view) {
    const tokens = [];
    const pattern = /[a-z0-9]+/gu;
    let match;
    while ((match = pattern.exec(view.folded))) tokens.push(Object.freeze({ text: match[0], start: match.index, end: pattern.lastIndex }));
    return tokens;
  }

  function approximateOccurrences(view, exact) {
    const exactEntities = new Set(exact.map(item => `${item.entityId}:${item.normalizedSpan.start}`));
    const tokens = latinTokens(view);
    const results = [];
    aliasCatalog().filter(record => record.script === "LATIN").forEach(record => {
      const aliasTokens = record.normalized.split(" ").filter(Boolean);
      if (!aliasTokens.length) return;
      for (let offset = 0; offset <= tokens.length - aliasTokens.length; offset += 1) {
        const windowTokens = tokens.slice(offset, offset + aliasTokens.length);
        const covered = aliasTokens.every((aliasToken, index) => windowTokens[index].text === aliasToken
          || window.EchoAI.Normalizer.isConservativeTypoMatch(windowTokens[index].text, aliasToken));
        const hasTypo = aliasTokens.some((aliasToken, index) => windowTokens[index].text !== aliasToken);
        if (!covered || !hasTypo || exactEntities.has(`${record.entityId}:${windowTokens[0].start}`)) continue;
        results.push(Object.freeze({
          ...record,
          matchKind: "APPROXIMATE",
          normalizedSpan: Object.freeze({ start: windowTokens[0].start, end: windowTokens[windowTokens.length - 1].end }),
          span: originalSpan(view, windowTokens[0].start, windowTokens[windowTokens.length - 1].end),
          score: 100 + record.normalized.length + (record.primary ? 20 : 0),
        }));
      }
    });
    return results;
  }

  function bestEvidence(matches) {
    const unshadowed = matches.filter(item => !matches.some(other => other !== item
      && other.matchKind === "EXACT"
      && other.normalizedSpan.start === item.normalizedSpan.start
      && other.normalizedSpan.end > item.normalizedSpan.end));
    const sorted = [...unshadowed].sort((left, right) => right.score - left.score
      || left.normalizedSpan.start - right.normalizedSpan.start
      || right.normalized.length - left.normalized.length
      || left.entityId.localeCompare(right.entityId, "en"));
    const byEntityAndPosition = new Map();
    sorted.forEach(item => {
      const key = `${item.entityId}:${item.normalizedSpan.start}`;
      if (!byEntityAndPosition.has(key)) byEntityAndPosition.set(key, item);
    });
    return [...byEntityAndPosition.values()].sort((left, right) => left.normalizedSpan.start - right.normalizedSpan.start || right.score - left.score);
  }

  function collectAliasEvidence(message) {
    const view = unicodeView(message);
    const exact = exactOccurrences(view);
    return deepFreeze({ view, matches: bestEvidence([...exact, ...approximateOccurrences(view, exact)]) });
  }

  function maximalAliasEvidence(matches) {
    return matches.filter(candidate => !matches.some(other => other !== candidate
      && other.matchKind === "EXACT"
      && other.normalizedSpan.start <= candidate.normalizedSpan.start
      && other.normalizedSpan.end >= candidate.normalizedSpan.end
      && (other.normalizedSpan.end - other.normalizedSpan.start > candidate.normalizedSpan.end - candidate.normalizedSpan.start
        || other.normalizedSpan.start === candidate.normalizedSpan.start
          && other.normalizedSpan.end === candidate.normalizedSpan.end
          && other.primary
          && !candidate.primary)));
  }

  function cleanTarget(value) {
    let target = String(value || "").trim();
    let previous = "";
    while (target && target !== previous) {
      previous = target;
      target = target
        .replace(/^(?:please\s+|the\s+|a\s+|an\s+)+/iu, "")
        .replace(/^exact(?:ly)?\s+/iu, "")
        .replace(/^(?:exact\s+)?location of\s+/iu, "")
        .replace(/^tell me (?:the )?(?:most likely )?/iu, "")
        .replace(/(?:\s+(?:please|for me|exactly))+$/iu, "")
        .replace(/^(?:on|in|using)\s+(?:the\s+)?(?:echo\s+)?map$/iu, "")
        .replace(/(?:\s+(?:on|in|using)\s+(?:the\s+)?(?:echo\s+)?map)+$/iu, "")
        .replace(/[?!.。,，！？；;:]+$/u, "")
        .trim();
    }
    return target;
  }

  function extractTargetSlot(message) {
    const view = unicodeView(message);
    const query = view.folded.replace(/[?!.。,，！？；;:]+$/u, "").trim();
    if (!query) return null;
    const patterns = [
      { kind: "navigation", strength: "identity", pattern: /^(?:(?:could|can|would) you\s+)?(?:please\s+)?(?:help me\s+)?(?:navigate to|take me to|bring me to|drop a pin for|pin|open|show(?: me)?)\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^(?:can|could|may) i (?:go|get) to\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^(?:tolong\s+)?(?:letak pin untuk|macam mana nak cari)\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^(.+?)\s+(?:boleh\s+)?(?:show|open)(?:\s+(?:it|this))?\s+(?:on\s+)?(?:the\s+)?(?:echo\s+)?map(?:\s+tak)?$/u },
      { kind: "navigation", strength: "identity", pattern: /^(?:请)?(?:在)?地图(?:上)?(?:显示|打开)(.+)$/u },
      { kind: "location", strength: "identity", pattern: /^(?:(?:could|can|would) you\s+)?(?:please\s+)?(?:help me\s+)?(?:where is|where s|wheres|locate|find)\s+(.+)$/u },
      { kind: "location", strength: "service_object", pattern: /^(?:kat|di) mana\s+(.+)$/u },
      { kind: "information", strength: "identity", pattern: /^(?:tell me about|information about)\s+(.+)$/u },
      { kind: "information", strength: "identity", pattern: /^(?:what|how) about\s+(.+)$/u },
      { kind: "nearby", strength: "identity", pattern: /^what\s+(?:is|are)\s+(?:near|next to|around)\s+(.+)$/u },
      { kind: "nearby", strength: "identity", pattern: /^(?:got|is there)\s+(?:an?\s+)?(.+?)\s+(?:around|on|in)\s+(?:the\s+)?campus$/u },
      { kind: "location", strength: "identity", pattern: /^(.+?)\s+location$/u },
      { kind: "information", strength: "identity", pattern: /^(.+?)\s+(?:same as|is (?:beside|inside|in|near))\s+.+$/u },
      { kind: "information", strength: "identity", pattern: /^(.+?)\s+(?:在|跟|和|与)\s+.+$/u },
      { kind: "hours", strength: "identity", pattern: /^(?:pretend|assume|just answer\s*:?)\s+(.+?)\s+(?:opens?|closes?|later time|opening time|closing time)\b.*$/u },
      { kind: "services", strength: "identity", pattern: /^(?:what|which)(?:\s+.+?)?\s+(?:does|do)\s+(.+?)\s+(?:provide|offer|have|stock|sell)(?:\s+.*)?$/u },
      { kind: "services", strength: "identity", pattern: /^(?:what|which)\s+(?:is|are)\s+(.+?)\s+(?:used for|for|about)(?:\s+.*)?$/u },
      { kind: "rules", strength: "identity", pattern: /^(?:can|may)\s+.+?\s+(?:go to|enter|use|visit)\s+(.+?)(?:\s+(?:after|before|at)\s+.+)?$/u },
      { kind: "information", strength: "service_object", pattern: /^(?:i|we)\s+(?:need|want|require)\s+(.+)$/u },
      { kind: "location", strength: "identity", pattern: /^i need (?:directions to|to (?:find|locate|reach|get to))\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^how (?:do|can) i (?:get|go) to\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^how to find\s+(.+)$/u },
      { kind: "navigation", strength: "identity", pattern: /^(?:boleh\s+)?(?:tunjuk|papar|letak pin)(?:\s+lokasi(?:\s+tepat)?)?\s+(.+?)(?:\s+(?:dalam|di|pada)\s+(?:echo\s+)?map)?$/u },
      { kind: "hours", strength: "identity", pattern: /^tell me (?:the )?(?:most likely )?(.+?)\s+(?:closing|opening) time$/u },
      { kind: "location", strength: "service_object", pattern: /^where (?:should|might|could|can) i (?:go|head)(?:\s+to)?\s+for\s+(.+)$/u },
      { kind: "location", strength: "service_object", pattern: /^where (?:might|could|can) i get\s+(.+)$/u },
      { kind: "hours", strength: "identity", pattern: /^(?:what time|when)\s+(?:does|do|is|are)\s+(.+?)\s+(?:open|close|closing|operating|available)(?:\s+.*)?$/u },
      { kind: "hours", strength: "identity", pattern: /^(?:is|are)\s+(.+?)\s+(?:open|closed|operating|available)(?:\s+.*)?$/u },
      { kind: "fees", strength: "identity", pattern: /^(?:how much|what)\s+(?:is|are)\s+(?:the\s+)?(.+?)\s+(?:usage\s+)?(?:fee|fees|cost|price)(?:\s+.*)?$/u },
      { kind: "location", strength: "service_object", pattern: /^(.+?)\s+(?:kat|di) mana$/u },
      { kind: "location", strength: "service_object", pattern: /^(.+?)(?:在哪里|在哪儿|怎么去|如何去|的位置)(?:借|洗|打印|复印)?$/u },
      { kind: "nearby", strength: "identity", pattern: /^(.+?)(?:附近|周边)(?:有)?(?:什么|哪些).*$/u },
      { kind: "predicate", strength: "identity", pattern: /^(.+?)(?:今天|明天|最近|目前|现在).+$/u },
      { kind: "hours", strength: "identity", pattern: /^(.+?)(?:今天|明天)?(?:几点|什么时候)(?:开门|关门|关闭|关)$/u },
      { kind: "hours", strength: "identity", pattern: /^(.+?)(?:星期|周)[一二三四五六日天].*(?:开门|关门|开放|关闭|开|关)(?:\s*(?:对吗|吗|呢))?$/u },
    ];
    for (const descriptor of patterns) {
      const match = descriptor.pattern.exec(query);
      if (!match) continue;
      const rawTarget = match[1];
      const target = cleanTarget(rawTarget);
      if (!target) continue;
      const normalizedStart = match.index + match[0].indexOf(rawTarget);
      const normalizedEnd = normalizedStart + rawTarget.length;
      const category = GENERIC_TARGETS[target] || "";
      return deepFreeze({
        text: target,
        span: originalSpan(view, normalizedStart, normalizedEnd),
        kind: category ? "discovery" : descriptor.kind,
        strength: category ? "category" : descriptor.strength,
        category,
      });
    }
    return null;
  }

  function wholeAliasMatches(target) {
    const targetView = unicodeView(cleanTarget(target));
    const matches = [];
    aliasCatalog().forEach(record => {
      if (targetView.folded === record.normalized) {
        matches.push(Object.freeze({ ...record, matchKind: "EXACT", score: 300 + record.normalized.length + (record.primary ? 30 : 0) + (/^[a-z]\d{1,2}$/.test(record.normalized) ? 40 : 0) }));
        return;
      }
      const targetTokens = targetView.folded.split(" ").filter(Boolean);
      const aliasTokens = record.normalized.split(" ").filter(Boolean);
      if (record.script !== "LATIN" || targetTokens.length !== aliasTokens.length) return;
      const covered = aliasTokens.every((aliasToken, index) => targetTokens[index] === aliasToken
        || window.EchoAI.Normalizer.isConservativeTypoMatch(targetTokens[index], aliasToken));
      const typo = aliasTokens.some((aliasToken, index) => targetTokens[index] !== aliasToken);
      if (covered && typo) matches.push(Object.freeze({ ...record, matchKind: "APPROXIMATE", score: 150 + record.normalized.length + (record.primary ? 20 : 0) }));
    });
    const byEntity = new Map();
    matches.forEach(item => {
      const current = byEntity.get(item.entityId);
      if (!current || item.score > current.score) byEntity.set(item.entityId, item);
    });
    const sorted = [...byEntity.values()].sort((left, right) => right.score - left.score || left.entityId.localeCompare(right.entityId, "en"));
    if (!sorted.length) return [];
    const topScore = sorted[0].score;
    return sorted.filter(item => item.score === topScore);
  }

  function containsEvidence(target, evidence) {
    const folded = unicodeView(target).folded;
    return evidence.matches.some(match => folded.includes(match.normalized)
      || (match.matchKind === "APPROXIMATE" && folded.split(" ").some(token => window.EchoAI.Normalizer.isConservativeTypoMatch(token, match.normalized))));
  }

  function compoundAttachment(message, match) {
    const source = String(message || "");
    const before = source.slice(0, match.span.start);
    const after = source.slice(match.span.end);
    const beforeCharacter = [...before].pop() || "";
    const afterCharacter = [...after][0] || "";
    const directBefore = isWordCharacter(beforeCharacter);
    const directAfter = isWordCharacter(afterCharacter);
    const runPattern = /[\p{L}\p{N}]/u;
    let runStart = match.span.start;
    let runEnd = match.span.end;
    while (runStart > 0) {
      const previous = [...source.slice(0, runStart)].pop() || "";
      if (!runPattern.test(previous)) break;
      runStart -= previous.length;
    }
    while (runEnd < source.length) {
      const next = [...source.slice(runEnd)][0] || "";
      if (!runPattern.test(next)) break;
      runEnd += next.length;
    }
    return deepFreeze({ directBefore, directAfter, text: source.slice(runStart, runEnd), span: Object.freeze({ start: runStart, end: runEnd }) });
  }

  function targetState(state, slot = null, entityId = "", matchKind = "NONE") {
    return deepFreeze({ state, span: slot?.span || null, text: slot?.text || "", entityId, matchKind });
  }

  function noMap() {
    return deepFreeze({ confidence: "NONE", eligible: false, placeId: "", buildingId: "", targetType: "UNMAPPED" });
  }

  function mapDecision(entityId, basis, matchKind) {
    if (basis !== "EXACT_TARGET" || matchKind !== "EXACT") return noMap();
    const place = window.EchoAI.PlaceRegistry.getById(entityId);
    if (!window.EchoAI.PlaceRegistry.hasMapTarget(place)) return noMap();
    return deepFreeze({
      confidence: place.mapState === "PARENT_ONLY" ? "VERIFIED_PARENT_TARGET" : "EXACT",
      eligible: true,
      placeId: entityId,
      buildingId: place.buildingId,
      targetType: place.mapState || "EXACT",
      labelTarget: place.mapState === "PARENT_ONLY" ? place.parentTitle || place.title : place.title,
    });
  }

  function canonical(state = "NONE", entityId = "", basis = "NONE", confidence = 0, entityIds = []) {
    return deepFreeze({ state, entityId, entityIds: Object.freeze(entityIds), basis, confidence });
  }

  function emptyContext() {
    return deepFreeze({ state: "NONE", entityId: "" });
  }

  function serviceResult(analysis, state = analysis.state) {
    const first = analysis.frames[0] || null;
    return deepFreeze({ state, requestState: analysis.requestState || "NONE", action: first?.action || "", object: first?.object || "", frames: analysis.frames, evidence: analysis.evidence });
  }

  function serviceFrameHasSafeTarget(slot, analysis) {
    let remaining = unicodeView(slot?.text).folded;
    const frameEvidence = [...new Set(analysis.frames.flatMap(frame => frame.evidence))]
      .filter(item => item.type !== "REQUEST" && item.type !== "QUESTION");
    const evidenceRanges = frameEvidence.map(item => {
      const start = item.text ? remaining.indexOf(item.text) : -1;
      return start < 0 ? null : { start, end: start + item.text.length };
    }).filter(Boolean);
    if (evidenceRanges.length) {
      remaining = [...remaining].map((character, index) => evidenceRanges.some(range => index >= range.start && index < range.end) ? " " : character).join("");
    }
    remaining = remaining
      .replace(/\b(?:i|m|we|my|our|me|us|a|an|the|this|these|there|any|some|somewhere|place|do|does|did|is|are|was|were|can|could|may|might|should|which|where|how|much|go|to|be|being|for|from|at|in|on|and|that|please|students?|residents?|cost|costs|fee|fees|price|prices|ah)\b/gu, " ")
      .replace(/(?:我|我们|我的|请|问|可以|能|要|在|去|有|吗|呢|哪里|哪儿|什么|学生|宿舍)/gu, " ")
      .replace(/\b(?:kat|di|mana|boleh|nak|ada|tak|tempat|untuk|saya|kami|pelajar|asrama)\b/gu, " ")
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .trim();
    if (analysis.frames.every(frame => frame.requestBasis === "DIRECT_REQUEST") && /^\p{L}+ly$/u.test(remaining)) remaining = "";
    return !remaining;
  }

  function serviceCanonicalizationEligibility(message, slot, analysis, identityOccurrences) {
    const empty = (frame = null) => deepFreeze({ eligible: false, entityId: "", entityIds: Object.freeze([]), frame });
    if (analysis.state !== "COMPLETE" || analysis.requestState !== "REQUESTED") return empty();
    const frames = analysis.frames.filter(item => item.requested && (SERVICE_ENTITY_BY_FRAME[item.kind] || item.kind === "FIND_FOOD"));
    if (!frames.length) return empty();
    const entityIds = [...new Set(frames.map(item => SERVICE_ENTITY_BY_FRAME[item.kind]).filter(Boolean))];
    const competingRegisteredTarget = identityOccurrences.some(match => !entityIds.includes(match.entityId));
    if (competingRegisteredTarget) return empty(frames[0]);
    const scope = slot?.text || message;
    const safeTarget = serviceFrameHasSafeTarget({ text: scope }, { frames });
    return deepFreeze({ eligible: safeTarget, entityId: safeTarget ? entityIds[0] || "" : "", entityIds: Object.freeze(safeTarget ? entityIds : []), frame: frames[0] });
  }

  function discoveryCategory(slot, message) {
    if (slot?.category) return slot.category;
    const normalized = unicodeView(message).folded;
    if (/\b(?:cafeterias?|cafes?|dining|places? to eat|where (?:can|could) i (?:eat|get food)|kafeteria|kafe|tempat makan)\b|食堂|餐厅|咖啡厅/u.test(normalized)) return "dining";
    if (/\b(?:sport facilities|sports facilities|places? to exercise|kemudahan sukan|tempat sukan|dewan sukan)\b|体育设施|运动设施/u.test(normalized)) return "sports";
    return "";
  }

  function isExplicitlyDelimitedMention(message, match) {
    const source = String(message || "");
    const before = source.slice(0, match.span.start).trim();
    const after = source.slice(match.span.end).trim();
    const followsDelimiter = /^[:;\u2014\u2013-]/u.test(after);
    const wrapped = /[([{]\s*$/u.test(before) && /^\s*[)\]}]/u.test(after);
    return (!before && followsDelimiter) || wrapped;
  }

  const PREDICATE_CUES = Object.freeze({
    campus_hours: /^(?:(?:now|today|tomorrow|tonight|currently|cuma|sekarang)\s+)?(?:open|opens|opening|close|closes|closing|closed|hours?|operating|available|berfungsi|buka|tutup|waktu|pukul|jam|confirm)\b/u,
    campus_services: /^(?:provide|provides|offer|offers|stock|stocks|sell|sells|have|has|buat)\b/u,
    campus_rules: /^(?:allow|allows|permit|permits|accept|accepts|require|requires|have|has)\b/u,
    campus_fees: /^(?:cost|costs|charge|charges|fee|fees|price|prices|bayaran|harga)\b/u,
    campus_nearby: /^(?:near|nearby|dekat|around|beside|next to)\b/u,
    campus_navigation: /^(?:(?:可以|boleh)\s*)?(?:show|open|tunjuk|has|have|map|mapped|located|situated)\b/u,
    campus_location: /^(?:located|situated|location|near|nearby|dekat)\b/u,
  });

  function isStructurallyBoundedMention(message, match, intent) {
    if (isExplicitlyDelimitedMention(message, match)) return true;
    const source = unicodeView(message).folded.replace(/[?!.。,，！？；;:]+$/u, "").trim();
    const before = source.slice(0, match.normalizedSpan.start).trim();
    const after = source.slice(match.normalizedSpan.end).trim();
    const cue = PREDICATE_CUES[intent];
    if (!before && cue?.test(after)) return true;
    return !after && /\b(?:near|nearby|at|into|inside|within|around|to|of|for|dekat|dalam)(?:\s+the)?\s*$/u.test(before);
  }

  function auxiliarySubjectMention(aliasEvidence, matches) {
    const operator = CLOSED_CLASS_AUXILIARY.exec(aliasEvidence.view.folded);
    if (!operator) return null;
    const subjectStart = operator[0].length;
    const candidates = matches
      .filter(match => match.matchKind === "EXACT" && match.normalizedSpan.start === subjectStart)
      .sort((left, right) => right.normalized.length - left.normalized.length || right.score - left.score);
    if (!candidates.length) return null;
    const longestLength = candidates[0].normalized.length;
    const longest = candidates.filter(match => match.normalized.length === longestLength);
    if (new Set(longest.map(match => match.entityId)).size !== 1) return null;
    const rest = aliasEvidence.view.folded.slice(candidates[0].normalizedSpan.end);
    return /^\s+\S/u.test(rest) ? candidates[0] : null;
  }

  function result(input) {
    return deepFreeze({
      intent: input.intent,
      target: input.target,
      mentions: Object.freeze(input.mentions || []),
      service: input.service,
      context: input.context || emptyContext(),
      canonical: input.canonical,
      map: input.map || noMap(),
      category: input.category || "",
      candidateEntityIds: Object.freeze(input.candidateEntityIds || []),
      aliasEvidence: input.aliasEvidence,
    });
  }

  function resolve(message, options = {}) {
    const intent = options.intent || window.EchoAI.IntentRouter.classify(message);
    const slot = extractTargetSlot(message);
    const aliasEvidence = collectAliasEvidence(message);
    const serviceAnalysis = window.EchoAI.IntentRouter.analyzeServiceFrame(message);
    const service = serviceResult(serviceAnalysis);
    const occurrences = aliasEvidence.matches;
    const overlapsServiceEvidence = match => serviceAnalysis.evidence.some(item => item.span.start < match.normalizedSpan.end && item.span.end > match.normalizedSpan.start);
    const identityOccurrences = maximalAliasEvidence(serviceAnalysis.state === "COMPLETE"
      ? occurrences.filter(match => !overlapsServiceEvidence(match))
      : occurrences);
    const serviceEligibility = serviceCanonicalizationEligibility(message, slot, serviceAnalysis, identityOccurrences);
    const category = discoveryCategory(slot, message);

    if (slot?.strength === "category" || !slot && category && !identityOccurrences.length && serviceAnalysis.state === "NONE") {
      const ids = DISCOVERY_IDS[category] || [];
      return result({ intent: "campus_discovery", target: targetState(STATES.NONE, slot), mentions: [], service, canonical: canonical("MULTIPLE", "", "DISCOVERY", 0.94, ids), category, candidateEntityIds: ids, aliasEvidence });
    }

    if (slot && CONTEXT_TARGET.test(slot.text)) {
      if (options.previousEntityId) {
        return result({ intent, target: targetState(STATES.NONE, slot), mentions: [], service, context: deepFreeze({ state: STATES.CONTEXT_REFERENCE, entityId: options.previousEntityId }), canonical: canonical("RESOLVED", options.previousEntityId, "CONTEXT", 0.82), aliasEvidence });
      }
      return result({ intent, target: targetState(STATES.NONE, slot), mentions: [], service, canonical: canonical(), aliasEvidence });
    }

    if (slot && slot.strength !== "category") {
      const exact = wholeAliasMatches(slot.text);
      if (exact.length === 1) {
        const match = exact[0];
        const basis = match.matchKind === "EXACT" ? "EXACT_TARGET" : "APPROXIMATE_TARGET";
        const state = match.matchKind === "EXACT" ? STATES.EXACT_TARGET : STATES.KNOWN_MENTION;
        const targetIntent = slot.kind === "information" ? "campus_info"
          : slot.kind === "location" && match.entityId !== "bicycle-service" ? "campus_location"
            : intent;
        return result({ intent: targetIntent, target: targetState(state, slot, match.entityId, match.matchKind), mentions: [match], service, canonical: canonical("RESOLVED", match.entityId, basis, match.matchKind === "EXACT" ? 0.99 : 0.76), map: mapDecision(match.entityId, basis, match.matchKind), aliasEvidence });
      }
      if (exact.length > 1) {
        return result({ intent, target: targetState(STATES.AMBIGUOUS_REFERENCE, slot), mentions: [], service: serviceResult(serviceAnalysis, "BLOCKED_BY_AMBIGUITY"), canonical: canonical("AMBIGUOUS", "", "AMBIGUOUS_TARGET", 0.35), aliasEvidence });
      }
      const contextualTopic = options.contextReference && !occurrences.length && isProvablyContextRelativeTurn(message, slot, intent);
      const serviceObject = (slot.strength === "service_object" || slot.kind === "information" && options.contextReference)
        && serviceEligibility.eligible;
      if (!serviceObject && !contextualTopic) {
        return result({ intent, target: targetState(STATES.UNRESOLVED_TARGET, slot), mentions: [], service: serviceResult(serviceAnalysis, "BLOCKED_BY_TARGET"), canonical: canonical("UNRESOLVED", "", "UNRESOLVED_TARGET", 0), aliasEvidence });
      }
    }

    const whole = wholeAliasMatches(message);
    if (whole.length === 1) {
      const match = whole[0];
      const basis = match.matchKind === "EXACT" ? "EXACT_TARGET" : "APPROXIMATE_TARGET";
      const state = match.matchKind === "EXACT" ? STATES.EXACT_TARGET : STATES.KNOWN_MENTION;
      return result({ intent, target: targetState(state, { text: cleanTarget(message), span: Object.freeze({ start: 0, end: String(message || "").length }) }, match.entityId, match.matchKind), mentions: [match], service, canonical: canonical("RESOLVED", match.entityId, basis, match.matchKind === "EXACT" ? 0.99 : 0.76), map: mapDecision(match.entityId, basis, match.matchKind), aliasEvidence });
    }

    const hasSpecificHostelCode = identityOccurrences.some(match => /^blok-[a-z]\d{1,2}$/.test(match.entityId));
    const prioritizedOccurrences = hasSpecificHostelCode ? identityOccurrences.filter(match => match.entityId !== "blok-kediaman") : identityOccurrences;
    const uniqueEntities = [...new Set(prioritizedOccurrences.map(match => match.entityId))];
    if (intent === "campus_comparison" && uniqueEntities.length >= 2 && COMPARISON_CONNECTOR.test(aliasEvidence.view.folded)) {
      return result({ intent, target: targetState(STATES.KNOWN_MENTION), mentions: prioritizedOccurrences, service, canonical: canonical("MULTIPLE", "", "COMPARISON", 0.9, uniqueEntities), candidateEntityIds: uniqueEntities, aliasEvidence });
    }

    if (identityOccurrences.length) {
      const attachmentPairs = identityOccurrences.map(match => ({ match, attachment: compoundAttachment(message, match) }));
      const compounded = attachmentPairs.find(item => item.attachment.directBefore || item.attachment.directAfter);
      if (compounded) {
        const compoundSlot = { text: compounded.attachment.text, span: compounded.attachment.span };
        return result({ intent, target: targetState(STATES.UNRESOLVED_TARGET, compoundSlot), mentions: [], service: serviceResult(serviceAnalysis, "BLOCKED_BY_TARGET"), canonical: canonical("UNRESOLVED", "", "UNRESOLVED_TARGET", 0), aliasEvidence });
      }
      if (uniqueEntities.length > 1) {
        return result({ intent, target: targetState(STATES.AMBIGUOUS_REFERENCE), mentions: identityOccurrences, service: serviceResult(serviceAnalysis, "BLOCKED_BY_AMBIGUITY"), canonical: canonical("AMBIGUOUS", "", "MULTIPLE_MENTIONS", 0.35), aliasEvidence });
      }
      const auxiliaryMention = auxiliarySubjectMention(aliasEvidence, prioritizedOccurrences);
      if (auxiliaryMention) {
        return result({ intent, target: targetState(STATES.KNOWN_MENTION), mentions: prioritizedOccurrences, service, canonical: canonical("RESOLVED", auxiliaryMention.entityId, "MENTION", 0.9), aliasEvidence });
      }
      const boundedMatches = identityOccurrences.filter(match => isStructurallyBoundedMention(message, match, intent));
      if (!boundedMatches.length) {
        return result({ intent, target: targetState(STATES.AMBIGUOUS_REFERENCE), mentions: identityOccurrences, service: serviceResult(serviceAnalysis, "BLOCKED_BY_AMBIGUITY"), canonical: canonical("AMBIGUOUS", "", "AMBIGUOUS_MENTION", 0.35), aliasEvidence });
      }
      const match = [...boundedMatches].sort((left, right) => right.score - left.score || right.normalized.length - left.normalized.length)[0];
      return result({ intent, target: targetState(STATES.KNOWN_MENTION), mentions: identityOccurrences, service, canonical: canonical("RESOLVED", match.entityId, match.matchKind === "EXACT" ? "MENTION" : "APPROXIMATE_MENTION", match.matchKind === "EXACT" ? 0.9 : 0.72), aliasEvidence });
    }

    if (intent === "campus_comparison" && serviceEligibility.eligible && serviceEligibility.entityIds.length >= 2) {
      const ids = serviceEligibility.entityIds;
      return result({ intent, target: targetState(STATES.NONE), mentions: [], service, canonical: canonical("MULTIPLE", "", "SERVICE_COMPARISON", 0.86, ids), candidateEntityIds: ids, aliasEvidence });
    }

    if (serviceEligibility.eligible) {
      if (serviceEligibility.entityId) return result({ intent, target: targetState(STATES.NONE), mentions: [], service: serviceResult(serviceAnalysis, STATES.SERVICE_NEED), canonical: canonical("RESOLVED", serviceEligibility.entityId, "SERVICE", 0.92), aliasEvidence });
      if (serviceAnalysis.frames.some(item => item.kind === "FIND_FOOD")) {
        const ids = DISCOVERY_IDS.dining;
        const hunger = /\b(?:hungry|lapar)\b|饿/u.test(aliasEvidence.view.folded);
        return result({ intent: hunger ? "campus_services" : "campus_discovery", target: targetState(STATES.NONE), mentions: [], service: serviceResult(serviceAnalysis, STATES.SERVICE_NEED), canonical: canonical("MULTIPLE", "", hunger ? "DINING_NEED" : "DISCOVERY", 0.94, ids), category: "dining", candidateEntityIds: ids, aliasEvidence });
      }
    }

    const explicitContext = Boolean(options.contextReference);
    if (explicitContext && options.previousEntityId && isProvablyContextRelativeTurn(message, slot, intent)) {
      return result({ intent, target: targetState(STATES.NONE), mentions: [], service, context: deepFreeze({ state: STATES.CONTEXT_REFERENCE, entityId: options.previousEntityId }), canonical: canonical("RESOLVED", options.previousEntityId, "CONTEXT", 0.82), aliasEvidence });
    }

    return result({ intent, target: targetState(STATES.NONE), mentions: [], service, canonical: canonical(), aliasEvidence });
  }

  window.EchoAI.CanonicalResolver = Object.freeze({ STATES, resolve });
  window.EchoAI.Retriever = Object.freeze({ collectAliasEvidence, extractTargetSlot });
}());
