(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  const sessionRequestGenerations = new Map();

  function beginSessionRequest(sessionId) {
    const generation = (sessionRequestGenerations.get(sessionId) || 0) + 1;
    sessionRequestGenerations.set(sessionId, generation);
    return generation;
  }

  function isLatestSessionRequest(sessionId, generation) {
    return sessionRequestGenerations.get(sessionId) === generation;
  }

  const UNKNOWN = Object.freeze({
    en: "I can’t confirm that from the current EchoWall campus information.",
    ms: "Saya tidak dapat mengesahkannya daripada maklumat kampus EchoWall yang tersedia sekarang.",
    zh: "目前的 EchoWall 校园资料无法确认这一点。",
  });
  const CURRENT_NOTICE = Object.freeze({
    en: "Hours and rules can change, so check the latest official notice or on-site sign.",
    ms: "Waktu dan peraturan boleh berubah; semak notis rasmi terkini atau papan tanda di lokasi.",
    zh: "时间和规定可能有变，请查看最新官方通知或现场告示。",
  });

  function title(place) { return String(place?.title || place?.building?.name || "this place"); }
  function resolvedPlace(place) { return Object.freeze({ placeId: place.canonicalId, buildingId: place.buildingId || "", title: title(place) }); }
  function grounding(place) {
    const source = window.EchoAI.SourceRegistry.getGrounding(place);
    return source ? [source] : [];
  }
  function formatClock(hour, minute) {
    const numericHour = Number(hour);
    if (!Number.isInteger(numericHour) || numericHour < 0 || numericHour > 23) return "";
    const suffix = numericHour >= 12 ? "pm" : "am";
    return `${numericHour % 12 || 12}:${minute}${suffix}`;
  }
  function timeText(value) {
    return String(value || "").replace(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g, (_match, startHour, startMinute, endHour, endMinute) => (
      `${formatClock(startHour, startMinute)}–${formatClock(endHour, endMinute)}`
    ));
  }
  function scheduleText(schedule, language) {
    if (!schedule) return "";
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const groups = [];
    days.forEach(day => {
      const value = schedule[day];
      if (!value) return;
      const last = groups.at(-1);
      if (last?.value === value) last.end = day;
      else groups.push({ start: day, end: day, value });
    });
    const separator = language === "zh" ? "；" : "; ";
    return groups.map(group => {
      const start = window.EchoAI.Language.dayLabel(group.start, language);
      const end = window.EchoAI.Language.dayLabel(group.end, language);
      const daysLabel = group.start === group.end ? start : `${start}–${end}`;
      if (group.value === "closed") {
        if (language === "ms") return `${daysLabel} ditutup`;
        if (language === "zh") return `${daysLabel}关闭`;
        return `${daysLabel} closed`;
      }
      return `${daysLabel} ${timeText(group.value)}`;
    }).join(separator);
  }
  function correctionPrefix(language) {
    if (language === "ms") return "Tidak. ";
    if (language === "zh") return "不对。";
    return "No. ";
  }

  function unknownAnswer(language) { return UNKNOWN[language] || UNKNOWN.en; }
  function ambiguousAnswer(language, candidates) {
    const names = candidates.map(title).join(", ");
    if (language === "ms") return `Beberapa tempat mungkin sepadan: ${names}. Sila nyatakan tempat yang dimaksudkan.`;
    if (language === "zh") return `可能有多个地点符合：${names}。请说明你指的是哪一个。`;
    return `Several places may match: ${names}. Please name the one you mean.`;
  }
  function conflictAnswer(language, place) {
    if (language === "ms") return `Sumber kampus semasa bercanggah tentang ${title(place)}. Saya tidak akan memilih satu jawapan tanpa pengesahan.`;
    if (language === "zh") return `现有校园资料对 ${title(place)} 的信息有冲突；在核实前我不会自行选择一个答案。`;
    return `Current campus sources conflict about ${title(place)}. I won’t choose one answer without confirmation.`;
  }
  function locationAnswer(language, place) {
    const location = window.EchoAI.Language.field(place, "location", language) || unknownAnswer(language);
    if (language === "ms") return `${title(place)}: ${location}`;
    if (language === "zh") return `${title(place)}：${location}`;
    return `${title(place)}: ${location}`;
  }
  function hoursAnswer(language, place, day, premiseStatus = "SUPPORTED") {
    const dayValue = day && place.schedule?.[day];
    if (dayValue) {
      const dayName = window.EchoAI.Language.dayLabel(day, language);
      let answer;
      if (dayValue === "closed") {
        if (language === "ms") answer = `${title(place)} ditutup pada hari ${dayName}. ${CURRENT_NOTICE.ms}`;
        else if (language === "zh") answer = `${title(place)} ${dayName}关闭。${CURRENT_NOTICE.zh}`;
        else answer = `${title(place)} is closed on ${dayName}. ${CURRENT_NOTICE.en}`;
      } else if (language === "ms") {
        answer = `${title(place)} dibuka ${timeText(dayValue)} pada hari ${dayName}. ${CURRENT_NOTICE.ms}`;
      } else if (language === "zh") {
        answer = `${title(place)} ${dayName}开放时间为 ${timeText(dayValue)}。${CURRENT_NOTICE.zh}`;
      } else {
        answer = `${title(place)} is open ${timeText(dayValue)} on ${dayName}. ${CURRENT_NOTICE.en}`;
      }
      return premiseStatus === "CONTRADICTED" ? `${correctionPrefix(language)}${answer}` : answer;
    }
    const hours = String(place.hours || "");
    if (!hours || /not available/i.test(hours)) return unknownAnswer(language);
    const displayHours = scheduleText(place.schedule, language) || timeText(hours);
    if (language === "ms") return `Waktu ${title(place)}: ${displayHours}. ${CURRENT_NOTICE.ms}`;
    if (language === "zh") return `${title(place)} 的开放时间：${displayHours}。${CURRENT_NOTICE.zh}`;
    return `${title(place)} hours: ${displayHours}. ${CURRENT_NOTICE.en}`;
  }
  function detailsAnswer(language, place, intent) {
    const base = window.EchoAI.Language.field(place, intent === "campus_rules" ? "rules" : "content", language);
    if (!base) return unknownAnswer(language);
    return intent === "campus_rules" ? `${base} ${CURRENT_NOTICE[language] || CURRENT_NOTICE.en}` : base;
  }
  function nearbyAnswer(language, place) {
    const result = window.EchoAI.PlaceRegistry.getNearbyDetails(place);
    const nearby = result.places;
    if (!nearby.length) return unknownAnswer(language);
    const names = nearby.map(title).join(", ");
    if (result.basis === "explicit") {
      if (language === "ms") return `Berdasarkan hubungan lokasi dalam sumber kampus, yang berhampiran ${title(place)} termasuk ${names}.`;
      if (language === "zh") return `根据校园资料中的地点关系，${title(place)} 附近包括 ${names}。`;
      return `Based on supplied campus location relationships, places near ${title(place)} include ${names}.`;
    }
    if (language === "ms") return `Berdasarkan kedudukan koordinat anggaran pada peta, tempat yang kelihatan berhampiran ${title(place)} termasuk ${names}.`;
    if (language === "zh") return `根据地图坐标的近似排序，${title(place)} 看起来靠近 ${names}。`;
    return `Based on approximate map-coordinate proximity, places that appear near ${title(place)} include ${names}.`;
  }
  function comparisonAnswer(language, places) {
    const summaries = places.slice(0, 2).map(place => `${title(place)} — ${scheduleText(place.schedule, language) || timeText(place.hours) || window.EchoAI.Language.field(place, "content", language) || unknownAnswer(language)}`);
    return summaries.join(language === "zh" ? "；" : "; ");
  }
  function injectionAnswer(language) {
    if (language === "ms") return "Arahan tidak boleh mengatasi sumber kampus EchoWall. Saya hanya akan menggunakan maklumat kampus yang disahkan dalam sumber semasa.";
    if (language === "zh") return "任何指令都不能覆盖 EchoWall 的校园资料规则；我只会使用当前可核实的校园信息。";
    return "Instructions cannot override EchoWall’s campus sources. I’ll only use campus information supported by the current records.";
  }
  function communityAuthorityAnswer(language) {
    if (language === "ms") return "Catatan komuniti ialah pendapat pelajar, bukan peraturan rasmi. Sahkan polisi melalui sumber kampus rasmi terkini.";
    if (language === "zh") return "社区帖子属于学生意见，不是官方规定；请以最新官方校园资料为准。";
    return "Community posts are student opinion, not official policy. Confirm rules using the latest official campus source.";
  }

  function response(base) {
    const suppressInternalIdentifiers = base.suppressInternalIdentifiers === true;
    return window.EchoAI.ResponseValidator.validate({
      answer: base.answer,
      intent: base.intent,
      confidence: base.confidence,
      premise: base.premise || "UNKNOWN",
      resolvedPlaces: suppressInternalIdentifiers ? [] : base.places || [],
      grounding: suppressInternalIdentifiers ? [] : base.grounding || [],
      conflicts: suppressInternalIdentifiers ? [] : base.conflicts || [],
      facts: suppressInternalIdentifiers ? [] : base.facts || [],
      answerPlan: suppressInternalIdentifiers
        ? { mode: "UNSUPPORTED", selectedFactIds: [], actionAllowed: false }
        : base.answerPlan || { mode: "UNSUPPORTED", selectedFactIds: [], actionAllowed: false },
      resolution: suppressInternalIdentifiers ? null : base.resolution || null,
      context: suppressInternalIdentifiers ? null : base.context || null,
      actions: suppressInternalIdentifiers ? [] : base.actions || [],
      error: base.error || null,
    });
  }

  function atomicGrounding(facts) {
    return (facts || []).flatMap(fact => (fact.provenance || []).map(ref => Object.freeze({
      recordId: fact.entityId || "kmk-atomic-fact",
      factId: fact.factId || "",
      authority: ref.authority === "L1" ? 1 : ref.authority === "L2" ? 2 : 3,
      source: ref.file,
      page: ref.page ?? null,
      dataStatus: "atomic",
    }))).slice(0, 10);
  }

  function answerPlanContract(plan) {
    return Object.freeze({
      mode: plan.answerMode,
      selectedFactIds: plan.selectedFactIds,
      actionAllowed: Boolean(plan.action),
    });
  }

  function blocksLegacyFallback(question, intent) {
    if (intent === "campus_fees") return true;
    return intent === "campus_rules" && /\b(dress code|uniform|attire|kod pakaian|food|snacks?|eat(?:ing)?)\b|着装|食物|零食|吃/i.test(String(question || ""));
  }

  function requestsInternalIdentifier(question) {
    const text = String(question || "");
    const normalized = window.EchoAI.Normalizer.normalize(text);
    const requestSignal = /\b(?:what|which|give(?: me)?|tell(?: me)?|show(?: me)?|reveal|print|output|include|return|state|display|dump|expose|navigate|open|bring|take)\b/i.test(normalized);
    if (!requestSignal) return false;

    const directInternalCode = /\bB_(?:\*|[A-Z0-9_]+)(?![A-Z0-9_])/i.test(text)
      || /\bb_[a-z0-9_]*\b|\bb\s+(?:id|identifier|code)\b/i.test(normalized);
    const humanFacingPhrase = /\b(?:dress|conduct|qr|postal|zip)\s+code\b|\bcode of conduct\b|\btarget audience\b|\bkey (?:facilities|services|information|details|places)\b/i.test(normalized);
    const possessiveIdentifier = /\b(?:its|their|librarys|pustakas|koops|cafe\s+[abc]s)\s+(?:id|identifier|code|target|key)\b/i.test(normalized);
    const explicitInternalIdentifier = /\b(?:internal (?:id|identifier|name|reference|target|key|code)|(?:building|map|source|fact|system|provider|registry|knowledge|planner|echo map) (?:id|identifier|reference|target|key|code)s?)\b/i.test(normalized);
    const identifierNoun = /\b(?:ids?|identifiers?|codes?|keys?)\b/i.test(normalized);
    const implementationContext = /\b(?:internal|building|map|source|fact|system|provider|registry|knowledge|planner|echo map)\b/i.test(normalized);
    const campusSubject = /\b(?:library|pustaka|koop|astaka|pavilion|cafe\s+[abc]|cafe\s+admin|stor\s+sukan|pos\s+mini)\b/i.test(normalized);

    if (directInternalCode || explicitInternalIdentifier || possessiveIdentifier) return true;
    if (humanFacingPhrase) return false;
    return identifierNoun && (implementationContext || campusSubject);
  }

  function isInjectionAttempt(question) {
    const text = String(question || "");
    if (/ignore (?:all |the )?(?:previous|system)|ignore\s+(?:answerplanner|knowledgeengine|responsevalidator)|bypass|jailbreak|abaikan (?:semua )?arahan|忽略.*(?:指令|提示)/i.test(text)) return true;
    if (requestsInternalIdentifier(text)) return true;
    return /\b(?:reveal|show|print|output|return|expose|dump|tell me)\b[^.!?]{0,90}\b(?:system prompt|developer (?:message|variables?)|provider prompt|internal (?:fact|map|building|source)?\s*ids?|hidden (?:building )?ids?|hidden data|source registry|knowledge object|answerplanner|knowledgeengine|responsevalidator|b_\* identifiers?)\b/i.test(text);
  }

  async function ask(message, options = {}) {
    const question = String(message || "").trim().slice(0, window.EchoAI.Config.maxQuestionLength);
    const language = window.EchoAI.Language.detect(question);
    let intent = window.EchoAI.IntentRouter.classify(question);
    const sessionId = options.sessionId || "default";
    const requestGeneration = beginSessionRequest(sessionId);
    if (!question) return response({ answer: unknownAnswer(language), intent: "unknown", confidence: 0, answerPlan: { mode: "UNSUPPORTED", selectedFactIds: [], actionAllowed: false } });
    if (!window.EchoAI.Config.enabled) {
      return response({ answer: unknownAnswer(language), intent: "unknown", confidence: 0, error: { code: "FEATURE_DISABLED" }, answerPlan: { mode: "UNSUPPORTED", selectedFactIds: [], actionAllowed: false } });
    }
    if (isInjectionAttempt(question)) {
      return response({ answer: injectionAnswer(language), intent: "unknown", confidence: 1, suppressInternalIdentifiers: true, answerPlan: { mode: "UNSUPPORTED", selectedFactIds: [], actionAllowed: false } });
    }
    if (/community (?:post|note)|student (?:post|opinion)|catatan komuniti|pendapat pelajar|社区(?:帖子|意见)/i.test(question) && /official|rasmi|policy|rule|规定|官方/i.test(question)) {
      return response({ answer: communityAuthorityAnswer(language), intent: "campus_rules", confidence: 1, answerPlan: { mode: "DIRECT", selectedFactIds: [], actionAllowed: false } });
    }

    const previous = window.EchoAI.ConversationContext.get(sessionId);
    let resolution = window.EchoAI.KnowledgeEngine.resolve(question);
    const clearReference = window.EchoAI.ConversationContext.referencesPrevious(question)
      || window.EchoAI.ConversationContext.isEllipticalFollowUp(question);
    const independentReferent = (resolution.status === "resolved" && resolution.confidence >= 0.95)
      || ["dining", "discovery"].includes(resolution.status);
    if (previous && clearReference && !independentReferent) {
      const contextPlace = window.EchoAI.KnowledgeEngine.getEntity(previous.activeEntityId || previous.entityId);
      if (contextPlace) {
        resolution = Object.freeze({
          status: "resolved_context",
          place: contextPlace,
          candidates: Object.freeze([contextPlace]),
          confidence: 0.82,
          resolutionType: contextPlace.mapState || "UNMAPPED",
        });
      }
    }

    if (intent === "campus_comparison") {
      const places = window.EchoAI.KnowledgeEngine.resolveMany(question);
      if (places.length < 2) return response({ answer: ambiguousAnswer(language, places), intent, confidence: 0.35, places: places.map(resolvedPlace), answerPlan: { mode: "AMBIGUOUS", selectedFactIds: [], actionAllowed: false } });
      if (isLatestSessionRequest(sessionId, requestGeneration)) {
        window.EchoAI.ConversationContext.clear(sessionId);
      }
      return response({ answer: comparisonAnswer(language, places), intent, confidence: 0.88, premise: "SUPPORTED", places: places.slice(0, 2).map(resolvedPlace), grounding: places.slice(0, 2).flatMap(grounding), answerPlan: { mode: "COMPARISON", selectedFactIds: [], actionAllowed: false } });
    }

    const place = resolution.place;
    if (resolution.status === "dining") intent = "campus_services";
    else if (resolution.status === "discovery") intent = "campus_discovery";
    else if (place && intent === "general") intent = (window.EchoAI.ConversationContext.isMoreFollowUp(question) || window.EchoAI.ConversationContext.isEllipticalFollowUp(question)) && previous
      ? previous.activeIntent || previous.intent || "campus_info"
      : "campus_info";
    if (place && intent === "campus_nearby") {
      const contextState = isLatestSessionRequest(sessionId, requestGeneration)
        ? window.EchoAI.ConversationContext.update(sessionId, place.canonicalId, intent)
        : previous;
      return response({
        answer: nearbyAnswer(language, place), intent, confidence: resolution.confidence || 0.8, premise: "SUPPORTED",
        places: [resolvedPlace(place)], grounding: grounding(place), context: contextState,
        answerPlan: { mode: "DIRECT", selectedFactIds: [], actionAllowed: false },
      });
    }
    const premise = place ? window.EchoAI.PremiseChecker.check(question, place, []) : { status: "UNKNOWN", day: "" };
    let plan = window.EchoAI.AnswerPlanner.plan({ question, language, intent, resolution, previous, premise, asOf: options.asOf });
    const rendered = await window.EchoAI.FactLockedRenderer.render(plan, language, { day: premise.day });
    let answer = rendered.text;
    if (place && plan.answerMode === "UNSUPPORTED" && plan.content.primary === "UNSUPPORTED_ENTITY_FACT" && !blocksLegacyFallback(question, intent)) {
      const legacyAnswer = intent === "campus_location" || intent === "campus_navigation" ? locationAnswer(language, place)
        : intent === "campus_rules" || intent === "campus_services" ? detailsAnswer(language, place, intent)
          : detailsAnswer(language, place, "campus_info");
      if (legacyAnswer && legacyAnswer !== unknownAnswer(language)) {
        const legacyAction = window.EchoAI.IntentRouter.requestsMapAction(intent) ? window.EchoAI.MapAction.create(place, language) : null;
        plan = Object.freeze({ ...plan, answerMode: "DIRECT", action: legacyAction, premise: "SUPPORTED" });
        answer = legacyAnswer;
      }
    }
    let contextState = previous;
    if (isLatestSessionRequest(sessionId, requestGeneration)) {
      if (place && plan.answerMode !== "UNSUPPORTED") contextState = window.EchoAI.ConversationContext.markServed(sessionId, place.canonicalId, intent, plan.facts);
      else if (!place && ["dining", "discovery"].includes(resolution.status)) {
        window.EchoAI.ConversationContext.clear(sessionId);
        contextState = null;
      } else if (!place && resolution.status !== "ambiguous") window.EchoAI.ConversationContext.clear(sessionId);
    }

    const answerPremise = plan.answerMode === "CORRECTION" ? "CONTRADICTED"
      : plan.answerMode === "CONFLICT" || plan.answerMode === "AMBIGUOUS" ? "AMBIGUOUS"
        : plan.answerMode === "UNSUPPORTED" ? "UNKNOWN" : "SUPPORTED";
    return response({
      answer,
      intent,
      confidence: resolution.confidence || (place ? 0.9 : 0.2),
      premise: answerPremise,
      places: place ? [Object.freeze({ ...resolvedPlace(place), mapState: place.mapState || "UNMAPPED", parentTitle: place.parentTitle || "" })]
        : (resolution.candidates || []).filter(candidate => candidate && typeof candidate === "object").map(resolvedPlace),
      grounding: atomicGrounding(plan.facts),
      conflicts: plan.conflicts,
      facts: plan.facts,
      answerPlan: answerPlanContract(plan),
      resolution: place ? { entityId: place.canonicalId, canonicalName: title(place), resolutionType: place.mapState || resolution.resolutionType || "UNMAPPED", confidence: resolution.confidence >= 0.95 ? "high" : resolution.confidence >= 0.7 ? "medium" : "low" } : null,
      context: contextState,
      actions: plan.action ? [plan.action] : [],
    });
  }

  window.CampusAI = Object.freeze({ ask });
}());
