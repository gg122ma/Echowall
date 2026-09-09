(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

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
    return window.EchoAI.ResponseValidator.validate({
      answer: base.answer,
      intent: base.intent,
      confidence: base.confidence,
      premise: base.premise || "UNKNOWN",
      resolvedPlaces: base.places || [],
      grounding: base.grounding || [],
      conflicts: base.conflicts || [],
      actions: base.actions || [],
      error: base.error || null,
    });
  }

  async function ask(message, options = {}) {
    const question = String(message || "").trim().slice(0, window.EchoAI.Config.maxQuestionLength);
    const language = window.EchoAI.Language.detect(question);
    const intent = window.EchoAI.IntentRouter.classify(question);
    const sessionId = options.sessionId || "default";
    if (!question) return response({ answer: unknownAnswer(language), intent: "unknown", confidence: 0 });
    if (!window.EchoAI.Config.enabled) {
      return response({ answer: unknownAnswer(language), intent: "unknown", confidence: 0, error: { code: "FEATURE_DISABLED" } });
    }
    if (/ignore (?:all |the )?(?:previous|system)|reveal (?:the )?(?:prompt|instructions)|bypass|jailbreak|abaikan (?:semua )?arahan|忽略.*(?:指令|提示)/i.test(question)) {
      return response({ answer: injectionAnswer(language), intent: "unknown", confidence: 1 });
    }
    if (/community (?:post|note)|student (?:post|opinion)|catatan komuniti|pendapat pelajar|社区(?:帖子|意见)/i.test(question) && /official|rasmi|policy|rule|规定|官方/i.test(question)) {
      return response({ answer: communityAuthorityAnswer(language), intent: "campus_rules", confidence: 1 });
    }

    const previous = window.EchoAI.ConversationContext.get(sessionId);
    let resolution = window.EchoAI.Retriever.resolve(question);
    const clearReference = window.EchoAI.ConversationContext.referencesPrevious(question)
      || window.EchoAI.ConversationContext.isEllipticalFollowUp(question);
    if (resolution.status === "unknown" && previous && clearReference) {
      resolution = window.EchoAI.Retriever.resolve(question, previous.entityId);
    }

    if (intent === "campus_comparison") {
      const places = window.EchoAI.Retriever.resolveMany(question);
      if (places.length < 2) return response({ answer: ambiguousAnswer(language, places), intent, confidence: 0.35, places: places.map(resolvedPlace) });
      places.slice(0, 2).forEach(place => window.EchoAI.ConversationContext.update(sessionId, place.canonicalId, intent));
      return response({ answer: comparisonAnswer(language, places), intent, confidence: 0.88, premise: "SUPPORTED", places: places.slice(0, 2).map(resolvedPlace), grounding: places.slice(0, 2).flatMap(grounding) });
    }

    if (resolution.status === "ambiguous") {
      return response({ answer: ambiguousAnswer(language, resolution.candidates), intent, confidence: resolution.confidence, premise: "AMBIGUOUS", places: resolution.candidates.map(resolvedPlace) });
    }

    const place = resolution.place;
    if (!place) {
      if (intent === "general") {
        window.EchoAI.ConversationContext.clear(sessionId);
        const provider = await window.EchoAI.ProviderAdapter.sendGeneral(question);
        if (provider.status === "ok") return response({ answer: provider.answer, intent, confidence: 0.55 });
        return response({
          answer: language === "ms" ? "Saya boleh membantu dengan tempat, waktu, peraturan dan perkhidmatan kampus KMK."
            : language === "zh" ? "我可以协助查询 KMK 校园地点、时间、规定和服务。"
              : "I can help with KMK campus places, hours, rules, and services.",
          intent,
          confidence: 0.5,
          error: provider.error,
        });
      }
      window.EchoAI.ConversationContext.clear(sessionId);
      return response({ answer: unknownAnswer(language), intent, confidence: 0.1, premise: "UNKNOWN" });
    }

    const conflicts = window.EchoAI.ConflictDetector.detect(place.sourceRecords || []).filter(item => item.status === "UNRESOLVED");
    if (conflicts.length) {
      return response({ answer: conflictAnswer(language, place), intent, confidence: 0.2, premise: "AMBIGUOUS", places: [resolvedPlace(place)], grounding: grounding(place), conflicts });
    }

    window.EchoAI.ConversationContext.update(sessionId, place.canonicalId, intent);
    const premise = window.EchoAI.PremiseChecker.check(question, place, conflicts);
    let answer;
    if (intent === "campus_hours") answer = hoursAnswer(language, place, premise.day, premise.status);
    else if (intent === "campus_location" || intent === "campus_navigation") answer = locationAnswer(language, place);
    else if (intent === "campus_nearby") answer = nearbyAnswer(language, place);
    else if (intent === "campus_rules" || intent === "campus_services") answer = detailsAnswer(language, place, intent);
    else answer = detailsAnswer(language, place, "campus_info");

    const action = window.EchoAI.IntentRouter.requestsMapAction(intent) ? window.EchoAI.MapAction.create(place) : null;
    return response({
      answer,
      intent,
      confidence: Math.min(resolution.confidence, premise.status === "CONTRADICTED" ? 0.96 : 0.98),
      premise: premise.status,
      places: [resolvedPlace(place)],
      grounding: grounding(place),
      actions: action ? [action] : [],
    });
  }

  window.CampusAI = Object.freeze({ ask });
}());
